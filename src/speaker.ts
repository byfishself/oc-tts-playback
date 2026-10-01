import { VoicevoxProvider } from "./tts/voicevox.js";
import type { TtsProvider } from "./tts/types.js";
import { playWav } from "./playback/player.js";

export interface SpeakerAwareTtsProvider extends TtsProvider {
  synthesizeWithSpeaker(text: string, speakerId: number): Promise<Buffer>;
}

export interface TtsSpeakerOptions {
  provider?: TtsProvider;
}

function splitJapaneseSentences(text: string): string[] {
  const sentences = text
    .trim()
    .split(/(?<=[。！？!?])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length > 1) {
    const last = sentences[sentences.length - 1];

    if (last && !/[\p{L}\p{N}]/u.test(last)) {
      sentences[sentences.length - 2] += last;
      sentences.pop();
    }
  }

  return sentences;
}

export class TtsSpeaker {
  private readonly tts: TtsProvider;
  private queue: Promise<void> = Promise.resolve();

  constructor(options: TtsSpeakerOptions = {}) {
    this.tts = options.provider ?? new VoicevoxProvider();
  }

  speak(text: string, speakerId?: number): Promise<void> {
    return this.enqueueText(text, speakerId);
  }

  enqueueText(text: string, speakerId?: number): Promise<void> {
    const sentences = splitJapaneseSentences(text);

    if (sentences.length === 0) {
      return Promise.resolve();
    }

    const task = this.queue.then(async () => {
      let currentAudio = await this.synthesize(sentences[0]!, speakerId);

      for (let i = 0; i < sentences.length; i++) {
        const nextAudioPromise =
          i + 1 < sentences.length
            ? this.synthesize(sentences[i + 1]!, speakerId).then(
                (audio) => ({ ok: true as const, audio }),
                (error: unknown) => ({ ok: false as const, error }),
              )
            : undefined;

        await playWav(currentAudio);

        if (nextAudioPromise) {
          const result = await nextAudioPromise;

          if (!result.ok) {
            throw result.error;
          }

          currentAudio = result.audio;
        }
      }
    });

    this.queue = task.catch(() => {});
    return task;
  }

  private async synthesize(text: string, speakerId?: number): Promise<Buffer> {
    if (
      speakerId !== undefined &&
      this.isSpeakerAwareProvider(this.tts)
    ) {
      return this.tts.synthesizeWithSpeaker(text, speakerId);
    }

    return this.tts.synthesize(text);
  }

  private isSpeakerAwareProvider(
    provider: TtsProvider,
  ): provider is SpeakerAwareTtsProvider {
    return (
      "synthesizeWithSpeaker" in provider &&
      typeof provider.synthesizeWithSpeaker === "function"
    );
  }
}

import { VoicevoxProvider } from "./tts/voicevox.js";
import type { TtsProvider } from "./tts/types.js";
import { playWav } from "./playback/player.js";

export interface SpeakerAwareTtsProvider extends TtsProvider {
  synthesizeWithSpeaker(text: string, speakerId: number): Promise<Buffer>;
}

export interface TtsSpeakerOptions {
  provider?: TtsProvider;
}

export class TtsSpeaker {
  private readonly tts: TtsProvider;
  private queue: Promise<void> = Promise.resolve();

  constructor(options: TtsSpeakerOptions = {}) {
    this.tts = options.provider ?? new VoicevoxProvider();
  }

  speak(text: string, speakerId?: number): Promise<void> {
    const task = this.queue.then(async () => {
      const audio = await this.synthesize(text, speakerId);
      await playWav(audio);
    });

    this.queue = task.catch(() => {});

    return task;
  }

  private async synthesize(
    text: string,
    speakerId?: number,
  ): Promise<Buffer> {
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

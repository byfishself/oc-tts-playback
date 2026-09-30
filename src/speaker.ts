import { VoicevoxProvider } from "./tts/voicevox.js";
import type { TtsProvider } from "./tts/types.js";
import { playWav } from "./playback/player.js";

export interface TtsSpeakerOptions {
  provider?: TtsProvider;
}

export class TtsSpeaker {
  private readonly tts: TtsProvider;
  private queue: Promise<void> = Promise.resolve();

  constructor(options: TtsSpeakerOptions = {}) {
    this.tts = options.provider ?? new VoicevoxProvider();
  }

  speak(text: string): Promise<void> {
    const task = this.queue.then(async () => {
      const audio = await this.tts.synthesize(text);
      await playWav(audio);
    });

    this.queue = task.catch(() => {});

    return task;
  }
}
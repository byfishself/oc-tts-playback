import { VoicevoxProvider } from "./tts/voicevox.js";
import { playWav } from "./playback/player.js";

export class TtsSpeaker {
  private readonly tts = new VoicevoxProvider(1);

  async speak(text: string): Promise<void> {
    const audio = await this.tts.synthesize(text);
    await playWav(audio);
  }
}
import {
  DEFAULT_TTS_SPEAKER_CONFIG,
} from "../tts/config.js";
import { VoicevoxProvider } from "../tts/voicevox.js";

const provider = new VoicevoxProvider({
  speaker: DEFAULT_TTS_SPEAKER_CONFIG.defaultSpeakerId,
  fallbackSpeaker: DEFAULT_TTS_SPEAKER_CONFIG.fallbackSpeakerId,
  speedScale: DEFAULT_TTS_SPEAKER_CONFIG.speedScale,
});

export default {
  speechProviders: [
    {
      id: "tts-speaker",
      label: "TTS Speaker",
      isConfigured: () => true,
      async synthesize(req: { text: string }) {
        const audioBuffer = await provider.synthesize(req.text);

        return {
          audioBuffer,
          outputFormat: "wav",
          fileExtension: ".wav",
          voiceCompatible: false,
        };
      },
    },
  ],
};

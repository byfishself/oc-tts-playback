import { TTS_SETTINGS } from "../tts/settings.js";
import { VoicevoxProvider } from "../tts/voicevox.js";

const provider = new VoicevoxProvider({
  speaker: TTS_SETTINGS.defaultSpeakerId,
  fallbackSpeaker: TTS_SETTINGS.fallbackSpeakerId,
  speedScale: TTS_SETTINGS.speedScale,
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
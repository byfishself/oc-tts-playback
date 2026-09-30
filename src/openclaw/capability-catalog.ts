import { VoicevoxProvider } from "../tts/voicevox.js";

const provider = new VoicevoxProvider({
  speaker: 122,
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


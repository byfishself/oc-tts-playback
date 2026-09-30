import { TTS_SETTINGS } from "../tts/settings.js";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { TtsSpeaker } from "../speaker.js";
import { VoicevoxProvider } from "../tts/voicevox.js";

const provider = new VoicevoxProvider({
  speaker: TTS_SETTINGS.defaultSpeakerId,
  fallbackSpeaker: TTS_SETTINGS.fallbackSpeakerId,
  speedScale: TTS_SETTINGS.speedScale,
});

const speaker = new TtsSpeaker({
  provider,
});

// Prevents duplicate playback if `agent_end` is called multiple times within the same run.
// Memory is automatically freed after a certain amount of time.
const processedRuns = new Set<string>();

function markRunProcessed(runId?: string): boolean {
  if (!runId) {
    return true;
  }

  if (processedRuns.has(runId)) {
    return false;
  }

  processedRuns.add(runId);

  const timer = setTimeout(() => {
    processedRuns.delete(runId);
  }, 10 * 60 * 1000);

  timer.unref?.();

  return true;
}

function extractAssistantText(messages: unknown[]): string {
  const message = [...messages]
    .reverse()
    .find(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        (item as { role?: unknown }).role === "assistant",
    );

  if (!message || typeof message !== "object") {
    return "";
  }

  const content = (message as { content?: unknown }).content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter(
      (item): item is { type?: unknown; text?: unknown } =>
        typeof item === "object" &&
        item !== null &&
        (item as { type?: unknown }).type === "text" &&
        typeof (item as { text?: unknown }).text === "string",
    )
    .map((item) => item.text as string)
    .join("\n")
    .trim();
}

export default definePluginEntry({
  id: "tts-speaker",
  name: "TTS Speaker",
  description: "Japanese text-to-speech provider",
  register(api) {
    api.registerSpeechProvider({
      id: "tts-speaker",
      label: "TTS Speaker",
      isConfigured: () => true,
      async synthesize(req) {
        const audioBuffer = await provider.synthesize(req.text);

        return {
          audioBuffer,
          outputFormat: "wav",
          fileExtension: ".wav",
          voiceCompatible: false,
        };
      },
    });

    api.on("agent_end", (event) => {
      // Failed agent runs are not read.
      if (!event.success) {
        return;
      }

      // Prevent duplicate `agent_end` events within the same run.
      if (!markRunProcessed(event.runId)) {
        return;
      }

      const text = extractAssistantText(event.messages);

      if (!text) {
        return;
      }

      // TTS does not cause the OpenClaw agent to wait.
      // The internal queue in TtsSpeaker ensures the playback request.
      void speaker.speak(text).catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : String(error);

        console.error("[TTS Speaker] playback failed:", message);
      });
    });
  },
});

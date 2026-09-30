import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { TtsSpeaker } from "../speaker.js";
import { resolveTtsSpeakerConfig } from "../tts/config.js";
import { VoicevoxProvider } from "../tts/voicevox.js";

function markRunProcessedFactory() {
  const processedRuns = new Set<string>();

  return (runId?: string): boolean => {
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
  };
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
  description: "Local text-to-speech speaker playback",
  register(api: OpenClawPluginApi) {
    const config = resolveTtsSpeakerConfig(api.pluginConfig);

    const provider = new VoicevoxProvider({
      speaker: config.defaultSpeakerId,
      fallbackSpeaker: config.fallbackSpeakerId,
      speedScale: config.speedScale,
    });

    const speaker = new TtsSpeaker({
      provider,
    });

    const markRunProcessed = markRunProcessedFactory();

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

      // Prevent duplicate playback for the same agent run.
      if (!markRunProcessed(event.runId)) {
        return;
      }

      const text = extractAssistantText(event.messages);

      if (!text) {
        return;
      }

      // Keep TTS playback outside the agent lifecycle.
      // TtsSpeaker handles sequential playback through its internal queue.
      void speaker.speak(text).catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : String(error);

        api.logger.error?.(`[TTS Speaker] playback failed: ${message}`);
      });
    });
  },
});

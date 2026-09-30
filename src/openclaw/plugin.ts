import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { TtsSpeaker } from "../speaker.js";
import { VoicevoxProvider } from "../tts/voicevox.js";

const provider = new VoicevoxProvider({
  speaker: 122,
});

const speaker = new TtsSpeaker({
  provider,
});

// agent_end가 같은 run에 중복 호출되는 경우 중복 재생을 방지한다.
// 메모리는 일정 시간 후 자동으로 정리한다.
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
      // 실패한 agent run은 읽지 않는다.
      if (!event.success) {
        return;
      }

      // 같은 run의 중복 agent_end 방지.
      if (!markRunProcessed(event.runId)) {
        return;
      }

      const text = extractAssistantText(event.messages);

      if (!text) {
        return;
      }

      // TTS가 OpenClaw agent lifecycle을 기다리게 하지 않는다.
      // TtsSpeaker 내부 queue가 재생 순서를 보장한다.
      void speaker.speak(text).catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : String(error);

        console.error("[TTS Speaker] playback failed:", message);
      });
    });
  },
});

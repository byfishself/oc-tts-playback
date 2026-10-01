import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { TtsSpeaker } from "../speaker.js";
import {
  BUILTIN_VOICES,
  DEFAULT_TTS_SPEAKER_CONFIG,
  resolveTtsSpeakerConfig,
  type TtsVoiceDefinition,
} from "../tts/config.js";
import { VoicevoxProvider } from "../tts/voicevox.js";

interface ExtractedSpeech {
  text: string;
  speakerId: number;
}

interface StreamingRun {
  snapshot: string;
  buffer: string;
  speakerId: number;
  received: boolean;
}

const VOICE_SELECTION_WAIT_MS = 750;
const VOICE_SELECTION_SETTLE_MS = 75;

function mergeVoices(
  builtinVoices: TtsVoiceDefinition[],
  additionalVoices: TtsVoiceDefinition[],
): TtsVoiceDefinition[] {
  const voices = new Map<number, TtsVoiceDefinition>();

  for (const voice of builtinVoices) voices.set(voice.id, voice);
  for (const voice of additionalVoices) voices.set(voice.id, voice);

  return [...voices.values()];
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

  if (!message || typeof message !== "object") return "";

  const content = (message as { content?: unknown }).content;

  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

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

function extractSpeakerDirective(
  text: string,
  allowedSpeakerIds: Set<number>,
): number | undefined {
  const match = text.match(/\[\[tts:([^\]]*)\]\]/i);
  if (!match) return undefined;

  const speakerMatch = match[1].match(
    /(?:^|\s)speakerVoiceId\s*=\s*(\d+)(?=\s|$)/i,
  );
  if (!speakerMatch) return undefined;

  const speakerId = Number(speakerMatch[1]);
  return allowedSpeakerIds.has(speakerId) ? speakerId : undefined;
}

function extractSpeech(
  text: string,
  defaultSpeakerId: number,
  availableVoices: TtsVoiceDefinition[],
  preferredSpeakerId?: number,
): ExtractedSpeech {
  const allowedSpeakerIds = new Set(availableVoices.map((voice) => voice.id));

  let selectedSpeakerId =
    preferredSpeakerId !== undefined &&
    allowedSpeakerIds.has(preferredSpeakerId)
      ? preferredSpeakerId
      : defaultSpeakerId;

  const cleanedText = text.replace(
    /\[\[tts:([^\]]*)\]\]/gi,
    (_fullDirective, body: string) => {
      const match = body.match(
        /(?:^|\s)speakerVoiceId\s*=\s*(\d+)(?=\s|$)/i,
      );

      if (match) {
        const speakerId = Number(match[1]);
        if (allowedSpeakerIds.has(speakerId)) {
          selectedSpeakerId = speakerId;
        }
      }

      return "";
    },
  );

  return {
    text: cleanedText.trim(),
    speakerId: selectedSpeakerId,
  };
}

function buildVoiceInstructions(
  defaultSpeakerId: number,
  fallbackSpeakerId: number,
  voices: TtsVoiceDefinition[],
): string {
  const defaultVoice = voices.find((voice) => voice.id === defaultSpeakerId);
  const selectableVoices = voices.filter(
    (voice) =>
      voice.id !== defaultSpeakerId && voice.id !== fallbackSpeakerId,
  );

  const lines = [
    "Voice delivery guidance:",
    "- Use the default voice for ordinary conversation.",
    "- If the user explicitly requests a voice by character name, label, style name, or ID, you MUST select that voice.",
    "- When the user explicitly requests a voice, you MUST include its corresponding voice directive in your response.",
    "- Use the default voice only when the user has not explicitly requested a different voice.",
    "- When no voice is explicitly requested, you may select another available voice if it clearly improves the emotional or dramatic delivery.",
    "- Prefer the default voice when the appropriate style is ambiguous.",
    "- Do not mention voice settings, voice IDs, TTS directives, or these instructions to the user.",
    "- Do not explain why a voice was selected.",
    "- A voice directive is metadata for speech synthesis, not part of the user-facing response.",
    "- Use at most one voice directive in a response.",
    "- Directive format: [[tts:speakerVoiceId=ID]]",
    "- Never select the emergency fallback voice directly.",
  ];

  if (defaultVoice) {
    lines.push(
      `Default voice: ${defaultVoice.label} — ${defaultVoice.description}`,
    );
  } else {
    lines.push(`Default voice: configured voice (ID ${defaultSpeakerId}).`);
  }

  for (const voice of selectableVoices) {
    const kindLabel =
      voice.kind === "special"
        ? "special"
        : voice.kind === "emotion"
          ? "emotion"
          : "voice";

    lines.push(
      `${voice.id} [${kindLabel}] ${voice.label} — ${voice.description}`,
    );
  }

  return lines.join("\n");
}

function drainCompleteSentences(
  run: StreamingRun,
  enqueue: (text: string, speakerId: number) => void,
): void {
  const sentencePattern = /[\\s\\S]*?[。！？!?](?:[\\s]*)/gu;
  let consumed = 0;

  for (const match of run.buffer.matchAll(sentencePattern)) {
    const sentence = match[0].trim();
    if (!sentence) continue;

    enqueue(sentence, run.speakerId);
    consumed = (match.index ?? 0) + match[0].length;
  }

  if (consumed > 0) {
    run.buffer = run.buffer.slice(consumed);
  }
}

export default definePluginEntry({
  id: "tts-speaker",
  name: "TTS Speaker",
  description: "Local text-to-speech speaker playback",

  register(api) {
    const config = resolveTtsSpeakerConfig(
      api.pluginConfig ?? DEFAULT_TTS_SPEAKER_CONFIG,
    );

    const voices = mergeVoices(BUILTIN_VOICES, config.additionalVoices);
    const allowedSpeakerIds = new Set(voices.map((voice) => voice.id));

    const provider = new VoicevoxProvider({
      speaker: config.defaultSpeakerId,
      fallbackSpeaker: config.fallbackSpeakerId,
      speedScale: config.speedScale,
    });

    const speaker = new TtsSpeaker({ provider });
    const streamingRuns = new Map<string, StreamingRun>();

    const selectedSpeakersByRun = new Map<string, number>();
    const pendingRuns = new Map<
      string,
      { text: string; timer: ReturnType<typeof setTimeout> }
    >();

    const enqueueSentence = (text: string, speakerId: number) => {
      const speech = extractSpeech(
        text,
        config.defaultSpeakerId,
        voices,
        speakerId,
      );

      if (!speech.text) return;

      void speaker.enqueueText(speech.text, speech.speakerId).catch((error: unknown) => {
        api.logger.error?.(
          `[TTS Speaker] playback failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    };

    api.on("before_prompt_build", () => ({
      appendSystemContext: buildVoiceInstructions(
        config.defaultSpeakerId,
        config.fallbackSpeakerId,
        voices,
      ),
    }));

    /*
     * Gateway bridge:
     * OpenClaw's Gateway exposes assistant deltas through the host-owned
     * agent-event subscription API. No separate Gateway authentication is
     * required because this runs inside the Gateway process.
     */
    api.agent.events.registerAgentEventSubscription({
      id: "tts-streaming-bridge",
      description: "Stream assistant text into the local TTS sentence queue",
      streams: ["assistant"],
      handle: (event) => {
        const runId = event.runId;
        if (!runId) return;

        const text = typeof event.data.text === "string" ? event.data.text : "";
        const delta = typeof event.data.delta === "string" ? event.data.delta : "";

        if (!text && !delta) return;

        let run = streamingRuns.get(runId);
        if (!run) {
          run = {
            snapshot: "",
            buffer: "",
            speakerId: selectedSpeakersByRun.get(runId) ?? config.defaultSpeakerId,
            received: false,
          };
          streamingRuns.set(runId, run);
        }

        const nextText = text || run.snapshot + delta;

        let appended = "";
        if (nextText.startsWith(run.snapshot)) {
          appended = nextText.slice(run.snapshot.length);
        } else if (!run.snapshot.startsWith(nextText)) {
          // Replacement/reset event: use the new snapshot as authoritative.
          appended = nextText;
        }

        run.snapshot = nextText;
        if (!appended) return;

        run.received = true;
        run.buffer += appended;

        const selected = extractSpeakerDirective(run.buffer, allowedSpeakerIds);
        if (selected !== undefined) {
          run.speakerId = selected;
          selectedSpeakersByRun.set(runId, selected);
        }

        const cleaned = extractSpeech(
          run.buffer,
          config.defaultSpeakerId,
          voices,
          run.speakerId,
        );
        run.speakerId = cleaned.speakerId;
        run.buffer = cleaned.text;

        drainCompleteSentences(run, enqueueSentence);
      },
    });

    api.on("llm_output", (event) => {
      const runId = event.runId;
      if (!runId) return;

      const outputs: string[] = [];
      if (Array.isArray(event.assistantTexts)) outputs.push(...event.assistantTexts);
      if (typeof event.lastAssistant === "string") outputs.push(event.lastAssistant);

      for (const output of outputs) {
        const directiveSpeakerId = extractSpeakerDirective(
          output,
          allowedSpeakerIds,
        );

        if (directiveSpeakerId !== undefined) {
          selectedSpeakersByRun.set(runId, directiveSpeakerId);

          const streamRun = streamingRuns.get(runId);
          if (streamRun) streamRun.speakerId = directiveSpeakerId;

          const pending = pendingRuns.get(runId);
          if (pending) {
            clearTimeout(pending.timer);
            pending.timer = setTimeout(() => {
              pendingRuns.delete(runId);
              const speech = extractSpeech(
                pending.text,
                config.defaultSpeakerId,
                voices,
                directiveSpeakerId,
              );
              if (speech.text) enqueueSentence(speech.text, speech.speakerId);
            }, VOICE_SELECTION_SETTLE_MS);
          }
        }
      }
    });

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
      const runId = event.runId;
      const streamRun = runId ? streamingRuns.get(runId) : undefined;

      if (streamRun?.received) {
        // Streaming already queued complete sentences. Only flush the
        // final incomplete sentence here; never replay the full response.
        if (streamRun.buffer.trim()) {
          enqueueSentence(streamRun.buffer, streamRun.speakerId);
        }

        streamingRuns.delete(runId!);
        selectedSpeakersByRun.delete(runId!);
        const pending = pendingRuns.get(runId!);
        if (pending) {
          clearTimeout(pending.timer);
          pendingRuns.delete(runId!);
        }
        return;
      }

      const assistantText = extractAssistantText(event.messages);
      if (!assistantText) return;

      const playFallback = () => {
        if (runId) pendingRuns.delete(runId);

        const selectedSpeakerId = runId
          ? selectedSpeakersByRun.get(runId)
          : undefined;

        const speech = extractSpeech(
          assistantText,
          config.defaultSpeakerId,
          voices,
          selectedSpeakerId,
        );

        if (runId) selectedSpeakersByRun.delete(runId);

        if (speech.text) {
          enqueueSentence(speech.text, speech.speakerId);
        }
      };

      if (!runId) {
        playFallback();
        return;
      }

      const existingPending = pendingRuns.get(runId);
      if (existingPending) clearTimeout(existingPending.timer);

      const timer = setTimeout(playFallback, VOICE_SELECTION_WAIT_MS);
      timer.unref?.();

      pendingRuns.set(runId, { text: assistantText, timer });

      if (selectedSpeakersByRun.has(runId)) {
        clearTimeout(timer);

        const settleTimer = setTimeout(
          playFallback,
          VOICE_SELECTION_SETTLE_MS,
        );
        settleTimer.unref?.();

        pendingRuns.set(runId, {
          text: assistantText,
          timer: settleTimer,
        });
      }
    });
  },
});

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import fs from "node:fs";
import path from "node:path";
import { TtsSpeaker } from "../speaker.js";
import {
  DEFAULT_TTS_SPEAKER_CONFIG,
  DEFAULT_VOICE_CONFIG,
  resolveTtsSpeakerConfig,
  resolveVoiceConfig,
  type TtsVoiceDefinition,
} from "../tts/config.js";
import { VoicevoxProvider } from "../tts/voicevox.js";

interface ExtractedSpeech {
  text: string;
  speakerId: number;
}

interface PendingRun {
  text: string;
  timer: ReturnType<typeof setTimeout>;
}

const VOICE_SELECTION_WAIT_MS = 750;
const VOICE_SELECTION_SETTLE_MS = 75;

function loadVoiceConfig(stateDir: string) {
  const dataDir = path.join(stateDir, "TTS Speaker", "tts-speaker");
  const voicesPath = path.join(dataDir, "voices.json");

  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(voicesPath)) {
    fs.writeFileSync(
      voicesPath,
      JSON.stringify(DEFAULT_VOICE_CONFIG, null, 2) + "\n",
      "utf8",
    );
    return resolveVoiceConfig(DEFAULT_VOICE_CONFIG);
  }

  try {
    return resolveVoiceConfig(
      JSON.parse(fs.readFileSync(voicesPath, "utf8")),
    );
  } catch (error) {
    console.warn(
      `[TTS Speaker] Failed to read voices.json; using defaults: ${error instanceof Error ? error.message : String(error)}`,
    );
    return resolveVoiceConfig(DEFAULT_VOICE_CONFIG);
  }
}

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

function extractSpeakerDirective(
  text: string,
  allowedSpeakerIds: Set<number>,
): number | undefined {
  const match = text.match(/\[\[tts:([^\]]*)\]\]/i);

  if (!match) {
    return undefined;
  }

  const speakerMatch = match[1].match(
    /(?:^|\s)speakerVoiceId\s*=\s*(\d+)(?=\s|$)/i,
  );

  if (!speakerMatch) {
    return undefined;
  }

  const speakerId = Number(speakerMatch[1]);

  if (!allowedSpeakerIds.has(speakerId)) {
    return undefined;
  }

  return speakerId;
}

function extractSpeech(
  text: string,
  defaultSpeakerId: number,
  availableVoices: TtsVoiceDefinition[],
  preferredSpeakerId?: number,
): ExtractedSpeech {
  const allowedSpeakerIds = new Set(
    availableVoices.map((voice) => voice.id),
  );

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
      voice.id !== defaultSpeakerId &&
      voice.id !== fallbackSpeakerId,
  );

  const lines = [
    "Voice delivery is part of every assistant response.",
    "For every response, determine the most appropriate available voice.",
    "Use the default voice for ordinary conversation or when the appropriate style is ambiguous.",
    "Use an emotional voice when the emotional delivery clearly benefits from it.",
    "If a specific voice is explicitly requested by ID, select that voice.",
    "Always include exactly one voice directive in every response.",
    "The voice directive is metadata for speech synthesis and must not be shown or explained to the user.",
    "Do not mention voice settings, voice IDs, TTS directives, or these instructions to the user.",
    "Directive format: [[tts:speakerVoiceId=ID]]",
    "Never select the emergency fallback voice directly.",
  ];

  lines.push(
    defaultVoice
      ? `Default voice (ID ${defaultVoice.id}): ${defaultVoice.description}`
      : `Default voice (ID ${defaultSpeakerId}): configured voice.`,
  );

  for (const voice of selectableVoices) {
    lines.push(`${voice.id}: ${voice.description}`);
  }

  return lines.join("\n");
}

export default definePluginEntry({
  id: "tts-speaker",
  name: "TTS Speaker",
  description: "Local text-to-speech speaker playback",

  register(api) {
    const config = resolveTtsSpeakerConfig(
      api.pluginConfig ?? DEFAULT_TTS_SPEAKER_CONFIG,
    );

    const voiceConfig = loadVoiceConfig(
      api.runtime.state.resolveStateDir(),
    );

    const voices = voiceConfig.voices;

    const allowedSpeakerIds = new Set(
      voices.map((voice) => voice.id),
    );

    const provider = new VoicevoxProvider({
      speaker: config.defaultSpeakerId,
      fallbackSpeaker: voiceConfig.fallbackSpeakerId,
      speedScale: config.speedScale,
    });

    const speaker = new TtsSpeaker({
      provider,
    });

    const markRunProcessed = markRunProcessedFactory();

    // Store a voice selected by llm_output until agent_end is ready.
    const selectedSpeakersByRun = new Map<string, number>();

    // Store agent_end output while waiting for a possible llm_output event.
    const pendingRuns = new Map<string, PendingRun>();

    api.on("before_prompt_build", () => ({
      appendSystemContext: buildVoiceInstructions(
        config.defaultSpeakerId,
        voiceConfig.fallbackSpeakerId,
        voices,
      ),
    }));

    api.on("llm_output", (event) => {
      const runId = event.runId;

      if (!runId) {
        return;
      }

      const outputs: string[] = [];

      if (Array.isArray(event.assistantTexts)) {
        outputs.push(...event.assistantTexts);
      }

      if (typeof event.lastAssistant === "string") {
        outputs.push(event.lastAssistant);
      }

      let selectedSpeakerId: number | undefined;

      for (const output of outputs) {
        console.log(
            `[TTS Speaker] LLM_OUTPUT run=${runId}: ${output}`,
        );
        const directiveSpeakerId = extractSpeakerDirective(
          output,
          allowedSpeakerIds,
        );

        if (directiveSpeakerId !== undefined) {
          selectedSpeakerId = directiveSpeakerId;
        }
      }

    if (selectedSpeakerId === undefined) {
        console.log(
            `[TTS Speaker] LLM_NO_VOICE run=${runId}`,
        );
        return;
    }

    selectedSpeakersByRun.set(runId, selectedSpeakerId);

      console.log(
        `[TTS Speaker] LLM_SELECTED run=${runId} speaker=${selectedSpeakerId}`,
      );

      const pending = pendingRuns.get(runId);

      if (!pending) {
        return;
      }

      // Give any immediately following LLM output events a short chance to arrive.
      clearTimeout(pending.timer);

      pending.timer = setTimeout(() => {
        pendingRuns.delete(runId);

        const selectedSpeaker = selectedSpeakersByRun.get(runId);

        const speech = extractSpeech(
          pending.text,
          config.defaultSpeakerId,
          voices,
          selectedSpeaker,
        );

        console.log(
          `[TTS Speaker] SELECTED_VOICE run=${runId} speaker=${speech.speakerId}`,
        );

        selectedSpeakersByRun.delete(runId);

        if (!speech.text) {
          return;
        }

        void speaker
          .speak(speech.text, speech.speakerId)
          .catch((error: unknown) => {
            const message =
              error instanceof Error ? error.message : String(error);

            api.logger.error?.(
              `[TTS Speaker] playback failed: ${message}`,
            );
          });
      }, VOICE_SELECTION_SETTLE_MS);
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
  if (!markRunProcessed(event.runId)) return;

  const assistantText = extractAssistantText(event.messages);
  if (!assistantText) {
    // Nothing usable was generated, so there is nothing to speak.
    if (event.runId) {
      pendingRuns.delete(event.runId);
      selectedSpeakersByRun.delete(event.runId);
    }
    return;
  }

  if (!event.success) {
    // OpenClaw may report an incomplete turn even when a usable assistant
    // response was already generated. Speak that response instead of
    // discarding it.
    console.warn(
      `[TTS Speaker] agent_end reported failure, but assistant output exists; playing it anyway. run=${event.runId ?? "unknown"}`,
    );
  }

  const runId = event.runId;

  const playSpeech = () => {
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

    console.log(
      `[TTS Speaker] SELECTED_VOICE run=${runId ?? "unknown"} speaker=${speech.speakerId}`,
    );

    if (runId) selectedSpeakersByRun.delete(runId);

    if (!speech.text) return;

    void speaker.speak(speech.text, speech.speakerId).catch((error: unknown) => {
      console.error("[TTS Speaker] playback failed.", error);
    });
  };

  if (!runId) {
    playSpeech();
    return;
  }

  const existingPending = pendingRuns.get(runId);
  if (existingPending) {
    clearTimeout(existingPending.timer);
  }

  const timer = setTimeout(playSpeech, VOICE_SELECTION_WAIT_MS);
  timer.unref?.();

  pendingRuns.set(runId, {
    text: assistantText,
    timer,
  });

  if (selectedSpeakersByRun.has(runId)) {
    clearTimeout(timer);

    const settleTimer = setTimeout(
      playSpeech,
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

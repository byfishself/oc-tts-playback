export type TtsVoiceKind = "normal" | "emotion" | "special";

export interface TtsVoiceDefinition {
  id: number;
  key: string;
  label: string;
  description: string;
  kind: TtsVoiceKind;
}

export interface TtsSpeakerConfig {
  defaultSpeakerId: number;
  fallbackSpeakerId: number;
  additionalVoices: TtsVoiceDefinition[];
  speedScale: number;
}

// Built-in voice definitions shipped with the plugin.
export const BUILTIN_VOICES: TtsVoiceDefinition[] = [
  {
    id: 3,
    key: "zundamon-normal",
    label: "ずんだもん ノーマル",
    description: "Normal/default voice for ordinary conversation.",
    kind: "normal",
  },
  {
    id: 1,
    key: "zundamon-sweet",
    label: "ずんだもん あまあま",
    description: "Sweet, affectionate, soft, gentle.",
    kind: "emotion",
  },
  {
    id: 7,
    key: "zundamon-tsuntsun",
    label: "ずんだもん ツンツン",
    description: "Tsundere, prickly, teasing, playful.",
    kind: "emotion",
  },
  {
    id: 5,
    key: "zundamon-sexy",
    label: "ずんだもん セクシー",
    description: "Confident, mature, playful, seductive.",
    kind: "emotion",
  },
  {
    id: 22,
    key: "zundamon-whisper",
    label: "ずんだもん ささやき",
    description: "Whispering, quiet, intimate.",
    kind: "emotion",
  },
  {
    id: 38,
    key: "zundamon-hush",
    label: "ずんだもん ヒソヒソ",
    description: "Very quiet, secretive, hushed.",
    kind: "emotion",
  },
  {
    id: 75,
    key: "zundamon-exhausted",
    label: "ずんだもん ヘロヘロ",
    description: "Weak, exhausted, worn out.",
    kind: "emotion",
  },
  {
    id: 76,
    key: "zundamon-teary",
    label: "ずんだもん なみだめ",
    description: "Teary, emotionally vulnerable, about to cry.",
    kind: "emotion",
  },
];

// Default configuration shipped with the plugin.
export const DEFAULT_TTS_SPEAKER_CONFIG: TtsSpeakerConfig = {
  // Normal voice used by default.
  defaultSpeakerId: 3,

  // Final emergency fallback voice.
  fallbackSpeakerId: 3,

  // Additional voices configured by the user.
  additionalVoices: [],

  // VOICEVOX speech speed multiplier.
  speedScale: 1.0,
};

function isValidVoiceDefinition(value: unknown): value is TtsVoiceDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const voice = value as Partial<TtsVoiceDefinition>;

  return (
    typeof voice.id === "number" &&
    Number.isInteger(voice.id) &&
    voice.id >= 0 &&
    typeof voice.key === "string" &&
    voice.key.length > 0 &&
    typeof voice.label === "string" &&
    voice.label.length > 0 &&
    typeof voice.description === "string" &&
    voice.description.length > 0 &&
    (voice.kind === "normal" ||
      voice.kind === "emotion" ||
      voice.kind === "special")
  );
}

export function resolveTtsSpeakerConfig(
  rawConfig: unknown,
): TtsSpeakerConfig {
  if (typeof rawConfig !== "object" || rawConfig === null) {
    return {
      ...DEFAULT_TTS_SPEAKER_CONFIG,
      additionalVoices: [],
    };
  }

  const config = rawConfig as Record<string, unknown>;

  const defaultSpeakerId =
    typeof config.defaultSpeakerId === "number" &&
    Number.isInteger(config.defaultSpeakerId) &&
    config.defaultSpeakerId >= 0
      ? config.defaultSpeakerId
      : DEFAULT_TTS_SPEAKER_CONFIG.defaultSpeakerId;

  const fallbackSpeakerId =
    typeof config.fallbackSpeakerId === "number" &&
    Number.isInteger(config.fallbackSpeakerId) &&
    config.fallbackSpeakerId >= 0
      ? config.fallbackSpeakerId
      : DEFAULT_TTS_SPEAKER_CONFIG.fallbackSpeakerId;

  const additionalVoices =
    Array.isArray(config.additionalVoices) &&
    config.additionalVoices.every(isValidVoiceDefinition)
      ? config.additionalVoices.map((voice) => ({ ...voice }))
      : [];

  const speedScale =
    typeof config.speedScale === "number" &&
    Number.isFinite(config.speedScale) &&
    config.speedScale > 0
      ? config.speedScale
      : DEFAULT_TTS_SPEAKER_CONFIG.speedScale;

  return {
    defaultSpeakerId,
    fallbackSpeakerId,
    additionalVoices,
    speedScale,
  };
}

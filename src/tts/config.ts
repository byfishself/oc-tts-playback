export interface TtsVoiceDefinition {
  id: number;
  description: string;
}

export interface TtsVoiceConfig {
  fallbackSpeakerId: number;
  voices: TtsVoiceDefinition[];
}

export interface TtsSpeakerConfig {
  defaultSpeakerId: number;
  speedScale: number;
}

export const DEFAULT_VOICE_CONFIG: TtsVoiceConfig = {
  fallbackSpeakerId: 3,
  voices: [
    {
      id: 102,
      description: "Normal voice for ordinary conversation.",
    },
    {
      id: 103,
      description:
        "Sweet, affectionate, soft, gentle emotional tone.",
    },
    {
      id: 104,
      description:
        "Sad, sorrowful, disappointed, sympathetic emotional tone.",
    },
    {
      id: 105,
      description:
        "Quiet, intimate, whispering emotional tone.",
    },
    {
      id: 106,
      description:
        "Special voice for special occasions, such as birthdays.",
    },
  ],
};

export const DEFAULT_TTS_SPEAKER_CONFIG: TtsSpeakerConfig = {
  defaultSpeakerId: 102,
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
    typeof voice.description === "string" &&
    voice.description.length > 0
  );
}

function isValidVoiceConfig(value: unknown): value is TtsVoiceConfig {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const config = value as Partial<TtsVoiceConfig>;

  return (
    typeof config.fallbackSpeakerId === "number" &&
    Number.isInteger(config.fallbackSpeakerId) &&
    config.fallbackSpeakerId >= 0 &&
    Array.isArray(config.voices) &&
    config.voices.every(isValidVoiceDefinition)
  );
}

export function resolveVoiceConfig(rawConfig: unknown): TtsVoiceConfig {
  if (!isValidVoiceConfig(rawConfig)) {
    return {
      fallbackSpeakerId: DEFAULT_VOICE_CONFIG.fallbackSpeakerId,
      voices: DEFAULT_VOICE_CONFIG.voices.map((voice) => ({ ...voice })),
    };
  }

  return {
    fallbackSpeakerId: rawConfig.fallbackSpeakerId,
    voices: rawConfig.voices.map((voice) => ({ ...voice })),
  };
}

export function resolveTtsSpeakerConfig(
  rawConfig: unknown,
): TtsSpeakerConfig {
  if (typeof rawConfig !== "object" || rawConfig === null) {
    return { ...DEFAULT_TTS_SPEAKER_CONFIG };
  }

  const config = rawConfig as Record<string, unknown>;

  const defaultSpeakerId =
    typeof config.defaultSpeakerId === "number" &&
    Number.isInteger(config.defaultSpeakerId) &&
    config.defaultSpeakerId >= 0
      ? config.defaultSpeakerId
      : DEFAULT_TTS_SPEAKER_CONFIG.defaultSpeakerId;

  const speedScale =
    typeof config.speedScale === "number" &&
    Number.isFinite(config.speedScale) &&
    config.speedScale > 0
      ? config.speedScale
      : DEFAULT_TTS_SPEAKER_CONFIG.speedScale;

  return {
    defaultSpeakerId,
    speedScale,
  };
}

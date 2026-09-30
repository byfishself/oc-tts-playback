export interface TtsSpeakerConfig {
  defaultSpeakerId: number;
  fallbackSpeakerId: number;
  emotionSpeakerIds: number[];
  speedScale: number;
}

export const DEFAULT_TTS_SPEAKER_CONFIG: TtsSpeakerConfig = {
  defaultSpeakerId: 23,
  fallbackSpeakerId: 3,
  emotionSpeakerIds: [24, 25, 26],
  speedScale: 1.0,
};

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

  const fallbackSpeakerId =
    typeof config.fallbackSpeakerId === "number" &&
    Number.isInteger(config.fallbackSpeakerId) &&
    config.fallbackSpeakerId >= 0
      ? config.fallbackSpeakerId
      : DEFAULT_TTS_SPEAKER_CONFIG.fallbackSpeakerId;

  const emotionSpeakerIds =
    Array.isArray(config.emotionSpeakerIds) &&
    config.emotionSpeakerIds.every(
      (id) => typeof id === "number" && Number.isInteger(id) && id >= 0,
    )
      ? [...config.emotionSpeakerIds]
      : [...DEFAULT_TTS_SPEAKER_CONFIG.emotionSpeakerIds];

  const speedScale =
    typeof config.speedScale === "number" &&
    Number.isFinite(config.speedScale) &&
    config.speedScale > 0
      ? config.speedScale
      : DEFAULT_TTS_SPEAKER_CONFIG.speedScale;

  return {
    defaultSpeakerId,
    fallbackSpeakerId,
    emotionSpeakerIds,
    speedScale,
  };
}

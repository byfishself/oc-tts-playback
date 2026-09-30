export const TTS_SETTINGS = {
  // Lowest-level fallback speaker.
  fallbackSpeakerId: 3,

  // Normal speaker used by default.
  defaultSpeakerId: 23,

  // Emotion styles available to the model.
  emotionSpeakerIds: [24, 25, 26],

  // VOICEVOX speech speed multiplier.
  speedScale: 1.0,
} as const;
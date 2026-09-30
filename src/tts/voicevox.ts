import type { TtsProvider } from "./types.js";

const VOICEVOX_URL = "http://127.0.0.1:50021";
const DEFAULT_SPEAKER = 1;

export class VoicevoxProvider implements TtsProvider {
  constructor(
    private readonly speaker = DEFAULT_SPEAKER,
  ) {}

  async synthesize(text: string): Promise<Buffer> {
    if (!text.trim()) {
      throw new Error("TTS text must not be empty.");
    }

    const queryUrl = new URL("/audio_query", VOICEVOX_URL);
    queryUrl.searchParams.set("text", text);
    queryUrl.searchParams.set("speaker", String(this.speaker));

    const queryResponse = await fetch(queryUrl, {
      method: "POST",
    });

    if (!queryResponse.ok) {
      throw new Error(
        `VOICEVOX audio_query failed: ${queryResponse.status} ${queryResponse.statusText}`,
      );
    }

    const query = await queryResponse.json();

    const synthesisUrl = new URL("/synthesis", VOICEVOX_URL);
    synthesisUrl.searchParams.set("speaker", String(this.speaker));

    const synthesisResponse = await fetch(synthesisUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(query),
    });

    if (!synthesisResponse.ok) {
      throw new Error(
        `VOICEVOX synthesis failed: ${synthesisResponse.status} ${synthesisResponse.statusText}`,
      );
    }

    return Buffer.from(await synthesisResponse.arrayBuffer());
  }
}
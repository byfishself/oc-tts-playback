import type { TtsProvider } from "./types.js";

const VOICEVOX_URL = "http://127.0.0.1:50021";

export interface VoicevoxOptions {
  speaker?: number;
  baseUrl?: string;
}

export class VoicevoxProvider implements TtsProvider {
  private readonly speaker: number;
  private readonly baseUrl: string;

  constructor(options: VoicevoxOptions = {}) {
    this.speaker = options.speaker ?? 1;
    this.baseUrl = options.baseUrl ?? VOICEVOX_URL;
  }

  async synthesize(text: string): Promise<Buffer> {
    if (!text.trim()) {
      throw new Error("TTS text must not be empty.");
    }

    const queryUrl = new URL("/audio_query", this.baseUrl);
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

    const synthesisUrl = new URL("/synthesis", this.baseUrl);
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
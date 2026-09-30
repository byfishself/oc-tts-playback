import type { TtsProvider } from "./types.js";

const VOICEVOX_URL = "http://127.0.0.1:50021";
const DEFAULT_TIMEOUT_MS = 30_000;

export interface VoicevoxOptions {
  speaker?: number;
  fallbackSpeaker?: number;
  baseUrl?: string;
  timeoutMs?: number;
  speedScale?: number;
}

export class VoicevoxProvider implements TtsProvider {
  private readonly speaker: number;
  private readonly fallbackSpeaker?: number;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly speedScale: number;

  constructor(options: VoicevoxOptions = {}) {
    this.speaker = options.speaker ?? 3;
    this.fallbackSpeaker = options.fallbackSpeaker;
    this.baseUrl = options.baseUrl ?? VOICEVOX_URL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.speedScale = options.speedScale ?? 1.0;

    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) {
      throw new Error("VOICEVOX timeoutMs must be a positive number.");
    }

    if (!Number.isFinite(this.speedScale) || this.speedScale <= 0) {
      throw new Error("VOICEVOX speedScale must be a positive number.");
    }
  }

  async synthesize(text: string): Promise<Buffer> {
    return this.synthesizeWithSpeaker(text, this.speaker);
  }

  async synthesizeWithSpeaker(
    text: string,
    speakerId: number,
  ): Promise<Buffer> {
    const cleanText = text.trim();

    if (!cleanText) {
      throw new Error("TTS text must not be empty.");
    }

    try {
      return await this.synthesizeUsingSpeaker(cleanText, speakerId);
    } catch (error: unknown) {
      if (
        this.fallbackSpeaker === undefined ||
        speakerId === this.fallbackSpeaker
      ) {
        throw error;
      }

      console.error(
        `[TTS Speaker] speaker ${speakerId} failed, falling back to ${this.fallbackSpeaker}.`,
        error,
      );

      return this.synthesizeUsingSpeaker(cleanText, this.fallbackSpeaker);
    }
  }

  private async synthesizeUsingSpeaker(
    text: string,
    speakerId: number,
  ): Promise<Buffer> {
    const queryUrl = new URL("/audio_query", this.baseUrl);
    queryUrl.searchParams.set("text", text);
    queryUrl.searchParams.set("speaker", String(speakerId));

    const queryResponse = await this.fetchWithTimeout(queryUrl, {
      method: "POST",
    });

    if (!queryResponse.ok) {
      throw new Error(
        `VOICEVOX audio_query failed: ${queryResponse.status} ${queryResponse.statusText}`,
      );
    }

    const query = (await queryResponse.json()) as Record<string, unknown>;
    query.speedScale = this.speedScale;

    const synthesisUrl = new URL("/synthesis", this.baseUrl);
    synthesisUrl.searchParams.set("speaker", String(speakerId));

    const synthesisResponse = await this.fetchWithTimeout(synthesisUrl, {
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

  private async fetchWithTimeout(
    input: string | URL,
    init: RequestInit,
  ): Promise<Response> {
    try {
      return await fetch(input, {
        ...init,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new Error(
          `VOICEVOX request timed out after ${this.timeoutMs}ms.`,
        );
      }

      throw error;
    }
  }
}

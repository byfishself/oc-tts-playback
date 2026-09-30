export interface TtsProvider {
  synthesize(text: string): Promise<Buffer>;
}
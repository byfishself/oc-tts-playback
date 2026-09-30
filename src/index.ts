import { TtsSpeaker } from "./speaker.js";

async function main(): Promise<void> {
  const speaker = new TtsSpeaker();

  await speaker.speak("こんにちは。これはTTS Speakerのテストです。");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
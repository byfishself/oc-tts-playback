import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export async function playWav(audio: Buffer): Promise<void> {
  const filePath = path.join(
    os.tmpdir(),
    `oc-tts-speaker-${randomUUID()}.wav`,
  );

  await fs.writeFile(filePath, audio);

  try {
    await new Promise<void>((resolve, reject) => {
      const player = spawn(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `$player = New-Object System.Media.SoundPlayer '${filePath}'; $player.PlaySync()`,
        ],
        {
          windowsHide: true,
        },
      );

      player.on("error", reject);

      player.on("exit", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Audio playback exited with code ${code}.`));
        }
      });
    });
  } finally {
    await fs.rm(filePath, { force: true });
  }
}
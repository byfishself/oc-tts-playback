# TTS Speaker (`oc-tts-playback`)

English | [日本語](README.ja.md)

**TTS Speaker** is a local text-to-speech playback extension for [OpenClaw](https://github.com/openclaw/openclaw). It converts assistant responses into speech using a locally running TTS engine and plays the generated audio on the computer.

> **Supported TTS engine:** VOICEVOX Engine only. Other TTS engines are not currently supported.

## Goals

- Play OpenClaw assistant responses aloud through the local audio output.
- Keep synthesis local by sending text to a local VOICEVOX Engine instance.
- Queue playback sequentially so responses do not overlap.
- Allow the default voice, fallback voice, speech speed, and additional voice definitions to be configured through OpenClaw.
- Support VOICEVOX style selection through the `[[tts:speakerVoiceId=ID]]` directive when that directive is present in the assistant output.

TTS Speaker uses its own playback flow. Disable OpenClaw's built-in automatic TTS if you do not want the same response to be spoken twice.

## Requirements

- OpenClaw
- Node.js `>=24.16.0 <25`
- VOICEVOX Engine running locally (default URL: `http://127.0.0.1:50021`)
- A VOICEVOX speaker/style ID that exists in your installed Engine version

## Installation

Clone the repository and build the TypeScript source:

```powershell
git clone https://github.com/byfishself/oc-tts-playback.git
cd oc-tts-playback
npm ci
npm run build
```

Link the local extension to OpenClaw:

```powershell
openclaw plugins install --link . --force
```

If the extension is already linked, rebuild after source changes and reload the plugin or restart the OpenClaw Gateway as appropriate for your setup.

## Configuration

Configure the plugin under `plugins.entries.tts-speaker` in your OpenClaw configuration. Merge the following into your existing configuration rather than replacing the whole file:

```json
{
  "plugins": {
    "entries": {
      "tts-speaker": {
        "enabled": true,
        "hooks": {
          "allowConversationAccess": true
        },
        "config": {
          "defaultSpeakerId": 3,
          "fallbackSpeakerId": 3,
          "speedScale": 1.0,
          "additionalVoices": []
        }
      }
    }
  }
}
```

### Settings

| Setting | Description |
| --- | --- |
| `defaultSpeakerId` | VOICEVOX style ID used for ordinary speech. The built-in default is `3`. |
| `fallbackSpeakerId` | Final fallback style ID if synthesis with the selected/default voice fails. The built-in default is `3`. |
| `speedScale` | VOICEVOX speech speed multiplier. The built-in default is `1.0`. |
| `additionalVoices` | Extra voice definitions made available for voice selection. The built-in list includes several Zundamon styles. |

Each item in `additionalVoices` requires `id`, `key`, `label`, `description`, and `kind` (`normal`, `emotion`, or `special`). The `id` must be a valid style ID exposed by the installed VOICEVOX Engine.

Example additional voice:

```json
{
  "id": 103,
  "key": "example-sweet",
  "label": "Example Voice — Sweet",
  "description": "A soft, affectionate delivery.",
  "kind": "emotion"
}
```

Replace the example ID and details with a style that exists in your VOICEVOX Engine.

## Voice selection

The extension recognizes this directive in assistant output:

```text
[[tts:speakerVoiceId=103]]
```

The numeric value is a VOICEVOX **style ID** (`styles[].id`), not a character ID. If no valid voice directive is found, the configured default voice is used. Since directive generation currently depends on the assistant output, voice selection is best-effort rather than guaranteed for every response.

## Playback behavior and current scope

- Assistant output is handled after the OpenClaw agent turn completes.
- Audio is synthesized by VOICEVOX Engine and played locally.
- Playback requests are queued sequentially, and multi-sentence responses are split for sequential playback.
- **Real-time sentence-by-sentence playback while the model is still generating a response is not implemented yet.**

## Development

```powershell
npm install
npm run build
```

The project uses TypeScript and outputs compiled files under `dist/`. Do not commit local secrets, tokens, or personal OpenClaw configuration to this repository.

## License

This project is distributed under the terms in the [LICENSE](LICENSE) file.

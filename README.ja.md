# TTS Speaker (`oc-tts-playback`)

[English](README.md) | 日本語

**TTS Speaker** は、[OpenClaw](https://github.com/openclaw/openclaw) 用のローカル音声読み上げ拡張機能です。OpenClaw のアシスタント応答を、ローカルで起動している TTS エンジンで音声に変換し、コンピューターの音声出力から再生します。

> **対応 TTS エンジン：** 現在は VOICEVOX Engine のみです。ほかの TTS エンジンには対応していません。

## 目的

- OpenClaw のアシスタント応答をローカルの音声出力から読み上げる。
- ローカルで起動している VOICEVOX Engine にテキストを送信し、音声合成をローカルで行う。
- 再生リクエストをキューに入れ、複数の応答が重なって再生されないようにする。
- デフォルト音声、フォールバック音声、読み上げ速度、追加音声の定義を OpenClaw の設定から変更できるようにする。
- アシスタントの出力に `[[tts:speakerVoiceId=ID]]` ディレクティブが含まれる場合、VOICEVOX のスタイルを選択する。

TTS Speaker は独自の再生処理を使用します。同じ応答が二重に読み上げられないようにするには、OpenClaw 標準の自動 TTS を無効にしてください。

## 必要環境

- OpenClaw
- Node.js `>=24.16.0 <25`
- ローカルで起動した VOICEVOX Engine（既定 URL：`http://127.0.0.1:50021`）
- 使用中の VOICEVOX Engine に存在するスピーカー／スタイル ID

## インストール

リポジトリを clone し、TypeScript をビルドします。

```powershell
git clone https://github.com/byfishself/oc-tts-playback.git
cd oc-tts-playback
npm ci
npm run build
```

OpenClaw にローカル拡張機能としてリンクします。

```powershell
openclaw plugins install --link . --force
```

すでにリンク済みの場合、ソースを変更した後に再ビルドし、環境に応じてプラグインを reload するか OpenClaw Gateway を再起動してください。

## 設定

OpenClaw の設定にある `plugins.entries.tts-speaker` で設定します。設定ファイル全体を置き換えず、既存の設定に次の内容を統合してください。

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

### 設定項目

| 項目 | 説明 |
| --- | --- |
| `defaultSpeakerId` | 通常の会話で使用する VOICEVOX のスタイル ID。組み込みの既定値は `3` です。 |
| `fallbackSpeakerId` | 選択した音声／デフォルト音声での合成に失敗した場合に使用する最終フォールバック ID。既定値は `3` です。 |
| `speedScale` | VOICEVOX の読み上げ速度倍率。既定値は `1.0` です。 |
| `additionalVoices` | 音声選択に追加する音声定義。組み込みリストには、ずんだもんの複数のスタイルが含まれます。 |

`additionalVoices` の各要素には `id`、`key`、`label`、`description`、`kind`（`normal`、`emotion`、`special` のいずれか）が必要です。`id` には、使用中の VOICEVOX Engine が公開している有効なスタイル ID を指定してください。

追加音声の例：

```json
{
  "id": 103,
  "key": "example-sweet",
  "label": "Example Voice — Sweet",
  "description": "A soft, affectionate delivery.",
  "kind": "emotion"
}
```

ID と各項目は、VOICEVOX Engine に存在する実際のスタイルに合わせて変更してください。

## 音声の選択

アシスタントの出力に含まれる次のディレクティブを認識します。

```text
[[tts:speakerVoiceId=103]]
```

数値はキャラクター ID ではなく、VOICEVOX の **スタイル ID**（`styles[].id`）です。有効な音声ディレクティブが見つからない場合は、設定されたデフォルト音声を使用します。現在、ディレクティブの生成はアシスタントの出力に依存するため、すべての応答で音声選択が保証されるわけではありません。

## 再生方式と現在の対応範囲

- OpenClaw のエージェントターンが完了した後に、アシスタントの出力を処理します。
- VOICEVOX Engine で音声を合成し、ローカルで再生します。
- 再生リクエストはキューに入れ、複数文の応答は文ごとに分割して順番に再生します。
- **モデルが応答を生成している最中に、文単位でリアルタイム再生する機能はまだ実装されていません。**

## 開発

```powershell
npm install
npm run build
```

このプロジェクトは TypeScript を使用し、コンパイル済みファイルを `dist/` に出力します。ローカルのシークレット、トークン、個人用 OpenClaw 設定をリポジトリにコミットしないでください。

## ライセンス

本プロジェクトは、リポジトリの [LICENSE](LICENSE) ファイルに記載された条件に従って配布されます。

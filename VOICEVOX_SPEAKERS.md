# VOICEVOX Speakers and Style IDs

[日本語](#日本語)

This document lists the VOICEVOX style IDs referenced by TTS Speaker and explains how to view all styles available in your own VOICEVOX Engine installation.

**Important:** IDs are **style IDs** (`styles[].id`), not character IDs. The styles exposed by `GET /speakers` depend on your installed VOICEVOX Engine, its available voice libraries, and any additional voice packages. The local `/speakers` endpoint is the source of truth for your installation.

## Styles included in TTS Speaker's built-in voice definitions

These definitions are included in `src/tts/config.ts`. They are available to voice selection by default, provided the corresponding styles exist in your VOICEVOX Engine.

| Style ID | Character | Style | Purpose |
| ---: | --- | --- | --- |
| `1` | ずんだもん (Zundamon) | あまあま | Sweet, gentle, affectionate |
| `3` | ずんだもん (Zundamon) | ノーマル | Default/ordinary conversation |
| `5` | ずんだもん (Zundamon) | セクシー | Confident, mature, playful delivery |
| `7` | ずんだもん (Zundamon) | ツンツン | Tsundere, prickly, teasing |
| `22` | ずんだもん (Zundamon) | ささやき | Whispering, quiet delivery |
| `38` | ずんだもん (Zundamon) | ヒソヒソ | Very quiet, hushed delivery |
| `75` | ずんだもん (Zundamon) | ヘロヘロ | Weak, exhausted delivery |
| `76` | ずんだもん (Zundamon) | なみだめ | Teary, emotionally vulnerable delivery |

The built-in default and emergency fallback style IDs are both `3` unless overridden in the OpenClaw plugin configuration.

## Additional voice examples

The following styles were used as additional voice definitions in one tested setup. They are **not included in the plugin's built-in voice list**. Add them to `additionalVoices` only if the same style IDs are present in your own Engine.

| Style ID | Character | Style | Suggested kind |
| ---: | --- | --- | --- |
| `102` | ユーレイちゃん (Yurei-chan) | ノーマル | `normal` |
| `103` | ユーレイちゃん (Yurei-chan) | 甘々 | `emotion` |
| `104` | ユーレイちゃん (Yurei-chan) | 哀しみ | `emotion` |
| `105` | ユーレイちゃん (Yurei-chan) | ささやき | `emotion` |
| `106` | ユーレイちゃん (Yurei-chan) | ツクモちゃん | `special` |

These IDs are installation-dependent examples, not a promise that every VOICEVOX distribution includes them.

## List every style available in your local Engine

Start VOICEVOX Engine, then run the following in PowerShell. The default local API URL is `http://127.0.0.1:50021`.

```powershell
$baseUrl = "http://127.0.0.1:50021"
$speakers = Invoke-RestMethod "$baseUrl/speakers"

$styleList = foreach ($speaker in $speakers) {
    foreach ($style in $speaker.styles) {
        [PSCustomObject]@{
            Character = $speaker.name
            Style     = $style.name
            StyleId   = $style.id
        }
    }
}

$styleList |
    Sort-Object Character, StyleId |
    Format-Table -AutoSize
```

To export the result to a UTF-8 CSV file on your Desktop:

```powershell
$styleList |
    Sort-Object Character, StyleId |
    Export-Csv "$env:USERPROFILE\Desktop\voicevox-styles.csv" -NoTypeInformation -Encoding utf8
```

If your Engine uses a different port, update `$baseUrl`.

## Add a style to TTS Speaker

Add a definition under `plugins.entries.tts-speaker.config.additionalVoices` in your OpenClaw configuration:

```json
{
  "id": 103,
  "key": "example-sweet",
  "label": "Example Voice — Sweet",
  "description": "A soft, affectionate delivery.",
  "kind": "emotion"
}
```

Replace the example values with a style ID and details from your own `/speakers` result. Supported `kind` values are `normal`, `emotion`, and `special`.

In an assistant response, the directive `[[tts:speakerVoiceId=103]]` selects style ID `103`. If no valid directive is present, TTS Speaker uses the configured default style.

---

## 日本語

このドキュメントでは、TTS Speaker が参照する VOICEVOX のスタイル ID と、使用中の VOICEVOX Engine で利用できる全スタイルを確認する方法を説明します。

**重要：** ここで示す ID はキャラクター ID ではなく、`styles[].id` にあたる **スタイル ID** です。`GET /speakers` で取得できるスタイルは、インストールされている VOICEVOX Engine、利用可能な音声ライブラリ、追加音声パッケージによって異なります。実際に使用できるかどうかは、ローカルの `/speakers` の結果で確認してください。

## TTS Speaker に組み込まれているスタイル

以下は `src/tts/config.ts` に組み込まれている音声定義です。使用中の VOICEVOX Engine に該当スタイルが存在すれば、追加設定なしで音声選択に使用できます。

| スタイル ID | キャラクター | スタイル | 用途 |
| ---: | --- | --- | --- |
| `1` | ずんだもん | あまあま | 甘く、やさしい話し方 |
| `3` | ずんだもん | ノーマル | 通常会話・デフォルト |
| `5` | ずんだもん | セクシー | 大人っぽく、自信のある話し方 |
| `7` | ずんだもん | ツンツン | ツンデレ、挑発的な話し方 |
| `22` | ずんだもん | ささやき | 静かなささやき声 |
| `38` | ずんだもん | ヒソヒソ | とても小さな声、ひそひそ話 |
| `75` | ずんだもん | ヘロヘロ | 疲れ切った、弱々しい話し方 |
| `76` | ずんだもん | なみだめ | 涙ぐんだ、感情的な話し方 |

OpenClaw の設定で変更しない限り、デフォルト音声と最終フォールバック音声はどちらも `3` です。

## 追加音声の例

以下は、ある動作確認環境で追加音声として設定したスタイルです。**プラグイン組み込みの音声一覧には含まれていません。** 使用中の Engine で同じスタイル ID を確認できた場合のみ、`additionalVoices` に追加してください。

| スタイル ID | キャラクター | スタイル | 推奨 kind |
| ---: | --- | --- | --- |
| `102` | ユーレイちゃん | ノーマル | `normal` |
| `103` | ユーレイちゃん | 甘々 | `emotion` |
| `104` | ユーレイちゃん | 哀しみ | `emotion` |
| `105` | ユーレイちゃん | ささやき | `emotion` |
| `106` | ユーレイちゃん | ツクモちゃん | `special` |

これらの ID は特定の環境での例であり、すべての VOICEVOX 配布版に含まれることを保証するものではありません。

## 使用中の Engine の全スタイルを一覧表示する

VOICEVOX Engine を起動してから、PowerShell で次のコマンドを実行してください。既定のローカル API URL は `http://127.0.0.1:50021` です。

```powershell
$baseUrl = "http://127.0.0.1:50021"
$speakers = Invoke-RestMethod "$baseUrl/speakers"

$styleList = foreach ($speaker in $speakers) {
    foreach ($style in $speaker.styles) {
        [PSCustomObject]@{
            Character = $speaker.name
            Style     = $style.name
            StyleId   = $style.id
        }
    }
}

$styleList |
    Sort-Object Character, StyleId |
    Format-Table -AutoSize
```

結果をデスクトップ上の UTF-8 CSV ファイルに保存する場合：

```powershell
$styleList |
    Sort-Object Character, StyleId |
    Export-Csv "$env:USERPROFILE\Desktop\voicevox-styles.csv" -NoTypeInformation -Encoding utf8
```

Engine のポートを変更している場合は、`$baseUrl` を変更してください。

## TTS Speaker にスタイルを追加する

OpenClaw の設定にある `plugins.entries.tts-speaker.config.additionalVoices` に、次の形式で定義を追加します。

```json
{
  "id": 103,
  "key": "example-sweet",
  "label": "Example Voice — Sweet",
  "description": "A soft, affectionate delivery.",
  "kind": "emotion"
}
```

例の値を、使用中の `/speakers` の結果に合わせて置き換えてください。`kind` には `normal`、`emotion`、`special` を指定できます。

アシスタントの応答に `[[tts:speakerVoiceId=103]]` が含まれると、スタイル ID `103` が選択されます。有効なディレクティブがない場合は、設定されたデフォルト音声が使用されます。

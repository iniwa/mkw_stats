# MKWorld Stats Manager ドキュメント索引 v0.1

## ドキュメント構成

| ファイル | 役割 |
|---|---|
| 01_design.md | 全体設計・方針の正本 |
| 02_requirements.md | 要件定義 |
| 03_playing_ui.md | プレイ中表示設計 |
| 04_db_design.md | DB設計 |
| 05_api_design.md | API設計 |
| 06_screen_design.md | 画面設計 |
| 07_implementation_tasks.md | 実装タスク分解 |
| 08_initial_implementation_prompt.md | Claude Code / Codex 向け初回実装プロンプト |

## 実装時の参照順

1. 01_design.md
2. 04_db_design.md
3. 05_api_design.md
4. 06_screen_design.md
5. 07_implementation_tasks.md
6. 08_initial_implementation_prompt.md

## 最新方針

- 野良VRとLoungeは、共通のプレイ中UIを使う
- VRはAPI取得不可前提で手入力
- Lounge APIはTable単位・プレイヤー単位の同期を基本とする
- Loungeのレース単位コース情報は、必要に応じてプレイ中UIで手入力
- コース選択は、全体マップ上の「出発地点 → 到着地点」クリック方式
- 3周コースは同じ地点を2回クリック
- Loungeでは1マッチ12レースを記録し、リピック警告を表示する
- 警告は出すが、記録は可能
- コースメモは付箋型で、優先度・タグを持つ
- マップ上ピンはホバーで対応メモを表示する
- 初期段階ではスマホ最適化は強く優先しない

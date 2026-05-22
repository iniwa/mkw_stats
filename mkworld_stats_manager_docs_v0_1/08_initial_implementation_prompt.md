# MKWorld Stats Manager 初回実装プロンプト v0.1

以下の依頼文を Claude Code / Codex に渡す。

```text
MKWorld Stats Manager のMVP初回実装を行ってください。

目的は、Raspberry Pi上でDocker Compose起動できるWebアプリ基盤を作り、
プレイ中UIの中核である「全体マップ上で出発地点→到着地点を選択し、コースを解決し、野良VRまたはLoungeのレース記録を作成する」フローを動かすことです。

技術スタックは以下です。
- Backend: FastAPI + SQLAlchemy + Alembic + PostgreSQL
- Frontend: React系 + TypeScript
- Infra: Docker Compose

まず以下を実装してください。

1. リポジトリ構成
2. Docker Compose
3. FastAPI backend基盤
4. React frontend基盤
5. PostgreSQL migration
6. seedデータ
7. コース/道中/マップ地点API
8. コース選択resolve API
9. play_session API
10. race_record API
11. Loungeリピック警告ロジック
12. VRアカウント管理API
13. 最小の設定画面
14. 最小のプレイ中表示
15. 最小のダッシュボード

初回実装では、OCR、動画解析、Discord Bot、外部公開、画像アップロード、Lounge API本接続、本格的なグラフ、ビルド研究、アイテムテーブルは実装しなくて構いません。

重要仕様:
- 野良VRとLoungeでプレイ中UIを大きく分けない
- コース選択は全体マップ上の出発地点→到着地点クリックで行う
- 同じ地点を2回クリックした場合は通常3周コース
- 異なる地点をクリックした場合は道中コース
- 確定前に「〇〇 → 〇〇でいいですか？」を表示する
- 野良VRではレース後に参加人数・順位帯・VR増減を入力する
- Loungeでは1マッチ12レースのコース履歴を記録する
- Loungeではリピック警告を出すが、記録は可能にする
- Loungeは12レース目完了時に自動でマッチ終了する
- VRは複数アカウント対応し、activeなアカウントを1つ持つ

設計ドキュメントに沿って、まず動作するMVP基盤を作ってください。
```

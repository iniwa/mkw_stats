# MKWorld Stats Manager 実装タスク分解 v0.1

## Phase 0: リポジトリ初期化

### TASK-0001: リポジトリ構成

```text
mkworld-stats/
├─ docker-compose.yml
├─ .env.example
├─ backend/
├─ frontend/
├─ data/
│  ├─ postgres/
│  └─ uploads/
└─ backups/
```

### TASK-0002: Docker Compose基盤

- PostgreSQL
- backend
- frontend
- volume永続化

### TASK-0003: Backend FastAPI基盤

- `/api/v1/health`
- CORS
- DB接続
- `.env`

### TASK-0004: Frontend基盤

- React系
- ルーティング
- API client
- 共通レイアウト

## Phase 1: DBスキーマ

- Alembic導入
- Enum作成
- 基本テーブル
- コース関連テーブル
- メモ/注釈/ファイルテーブル
- Lounge関連テーブル
- キャラ/マシン/アイテムテーブル

## Phase 2: マスターデータ

- コースマスターデータ形式
- 初期コースデータ
- リピック判定用データ
- キャラ/マシン初期データ
- アイテムテーブル初期データ

## Phase 3: Backend API

- 設定API
- VRアカウントAPI
- コースAPI
- コース選択resolve API
- play_session API
- race_record API
- Loungeリピック警告ロジック
- コースメモAPI
- マップ注釈API
- ファイルAPI
- Lounge同期API
- Lounge継続更新API
- 戦績/分析API
- キャラ/マシンAPI
- アイテムテーブルAPI

## Phase 4: Frontend基盤

- 共通レイアウト
- API client
- 共通UIコンポーネント

## Phase 5: プレイ中UI

- セッション開始画面
- 全体マップ表示
- map pointクリック
- コース選択確認
- コース確定後表示
- 野良VR結果入力
- Loungeコース履歴
- マップ注釈ホバー表示

## Phase 6: ダッシュボード・設定

- ダッシュボード
- 設定画面

## Phase 7: 戦績・分析

- 戦績一覧
- レート推移グラフ
- コース別成績

## Phase 8: コース図鑑・メモ編集

- コース図鑑
- コースメモ編集
- マップ注釈編集
- 画像アップロード

## Phase 9: Lounge同期

- Lounge同期画面
- 継続更新UI

## Phase 10: ビルド研究・アイテムテーブル

- キャラ/マシン一覧
- マシン差分比較
- アイテムテーブル画面

## Phase 11: テスト・仕上げ

Backend tests:

- コース選択解決
- VR増減計算
- リピック警告
- Lounge継続更新停止条件
- コース別成績集計

Frontend確認:

- 野良VRを開始して1レース保存
- Loungeを開始して12レース記録
- リピック警告を確認
- メモを作成してプレイ中表示に出す
- Lounge同期を実行

Raspberry Pi確認:

- docker compose up -d
- DB永続化
- 画像保存
- 再起動後の復旧
- LAN内アクセス

## 推奨実装順

```text
1. リポジトリ構成
2. Docker Compose
3. Backend基盤
4. Frontend基盤
5. DBスキーマ
6. コース・リピック用マスターデータ
7. コース選択・プレイ中API
8. プレイ中UI
9. VR記録
10. ダッシュボード・設定
```

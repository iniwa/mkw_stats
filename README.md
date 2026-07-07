# MKWorld Stats Manager

Mario Kart World の対戦記録、レート推移、コース情報をまとめて管理する個人向けWebアプリです。

ランク戦のVRとLoungeのMMRを別の指標として扱いながら、プレイ中のコース選択、結果入力、履歴確認、分析までを1つの画面で行えます。Raspberry Pi 4上のDocker環境で、LAN内から利用することを前提にしています。

## 主な機能

- ランク戦
  - VRアカウント管理
  - コース、順位、参加人数、結果VRの記録
  - VR増減の自動計算と推移表示
- Lounge
  - 12人・24人、各フォーマットの記録
  - 1試合12レースの進行管理
  - 順位、スコア、MMRの記録と分析
  - MKCentral APIを利用したMMR同期
  - リピックなどの警告表示（記録はブロックしません）
- プレイ支援
  - ワールドマップ上の出発地点・到着地点からコースを選択
  - コース・ルート画像、ノート、マップ注釈の表示
  - アイテムテーブルとLounge主催者向けガイド
- 記録管理
  - セッション・レース履歴の検索
  - 記録の修正、取消、非表示、復元
  - VRおよびLoungeの集計・ランキング
- 配信支援
  - VR/MMRを表示するOBSブラウザソース向けオーバーレイ

## 画面構成

| 画面 | 用途 |
|---|---|
| Dashboard | 現在のレート、進行中セッション、直近記録の確認 |
| Playing | ランク戦・Loungeのセッション開始とレース入力 |
| VR | VR推移とアカウント別の記録確認 |
| Lounge | MMR同期、推移、Lounge成績の確認 |
| Host | Lounge主催時の進行ガイド |
| Analytics | ランク戦の順位・コース・ルート分析 |
| Items | 12人・24人用アイテムテーブル |
| Courses | コース・ルート単位のノートとマップ注釈 |
| TA | NITA・アイテムありのPB、WR、目標タイム管理 |
| Records | セッション・レース履歴の確認と修正 |
| Settings | VRアカウント、Lounge、表示設定の管理 |

## 技術構成

| レイヤー | 技術 |
|---|---|
| Frontend | React 18、TypeScript、Vite、nginx |
| Backend | FastAPI、SQLAlchemy、Alembic |
| Database | PostgreSQL 16 |
| Runtime | Docker Compose / Portainer Stack |
| Deployment target | Raspberry Pi 4、`linux/arm64` |
| Container registry | GitHub Container Registry (GHCR) |

## ローカル起動

### 必要環境

- Docker Engine
- Docker Compose

### 初回セットアップ

PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.seed.initial_data
```

macOS / Linux:

```sh
cp .env.example .env
docker compose up -d --build
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.seed.initial_data
```

`python -m app.seed.initial_data` は冪等です。再実行してもプレイ記録は削除されません。

起動後のURL:

| 対象 | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend health | http://localhost:8000/api/v1/health |
| OpenAPI / Swagger UI | http://localhost:8000/docs |
| PostgreSQL | `localhost:5432` |

停止:

```sh
docker compose down
```

データベースはデフォルトで `./data/postgres/` に保存されます。永続データも削除する操作は慎重に行ってください。

## 開発と検証

### Backend

Python 3.12を推奨します。

```sh
cd backend
python -m venv .venv
```

仮想環境を有効化してから:

```sh
pip install -r requirements.txt
python -m pytest
```

通常のテストはインメモリSQLiteを使用します。Alembicのマイグレーション自体を検証する場合はPostgreSQLが必要です。

### Frontend

Node.js 20を推奨します。

```sh
cd frontend
npm ci
npm run typecheck
npm run build
```

開発サーバー:

```sh
npm run dev
```

Frontendは通常、同一オリジンの `/api/` を通してBackendへアクセスします。Docker構成ではnginxが `backend:8000` にプロキシします。

### 開発ワークフロー

- 設計判断と作業指示（handoff）はCodexが担当し、`docs/handoffs/` に保存します。Claude Codeはhandoffに従って実装・検証・報告を行います（詳細は `AGENTS.md` / `CLAUDE.md`）。
- 既存コードの改善候補（保守性・安定性）は [`docs/improvements.md`](docs/improvements.md) のチェックリストで管理します。
- 機能追加の要望・アイデアはルートの [`issues.md`](issues.md) で管理します。
- 検証は上記のBackend / Frontendのコマンド（`python -m pytest` / `npm run typecheck` / `npm run build`）を実行します。

## OBSオーバーレイ

Frontend URLにクエリを付けると、ブラウザソース用のレート表示を利用できます。

```text
/?view=overlay&mode=vr
/?view=overlay&mode=mmr
/?view=overlay&mode=auto
```

主なオプション:

| パラメーター | 内容 |
|---|---|
| `mode=vr` | 現在のVRを表示 |
| `mode=mmr` | 設定に応じたLounge MMRを表示 |
| `mode=mmr12` | 12人戦MMRを表示 |
| `mode=mmr24` | 24人戦MMRを表示 |
| `mode=auto` | 進行中セッションに応じてVR/MMRを切り替え |
| `compact=1` | 操作用UIを非表示 |
| `bg=solid` | 単色背景を使用 |

例:

```text
http://localhost:3000/?view=overlay&mode=auto&compact=1
```

## Raspberry Piへの配備

本番運用はRaspberry Pi 4上のPortainer Stackを前提とします。ルートの `docker-compose.yml` はローカル開発用です。Portainerには [`deploy/portainer-stack.yml`](deploy/portainer-stack.yml) を使用してください。

Portainer Stackに設定する環境変数:

```text
DATA_DIR=/home/iniwa/docker/mkw-stats
POSTGRES_DB=mkw_stats
POSTGRES_USER=mkw
POSTGRES_PASSWORD=<安全なパスワード>
FRONTEND_PORT=3030
BACKEND_PORT=8001
```

配備後:

```sh
docker exec mkw-backend alembic upgrade head
docker exec mkw-backend python -m app.seed.initial_data
```

Piでの標準URL:

```text
http://<pi-host>:3030
http://<pi-host>:8001/api/v1/health
```

使用イメージ:

```text
ghcr.io/iniwa/mkw-stats-backend:latest
ghcr.io/iniwa/mkw-stats-frontend:latest
```

GitHubの`main`ブランチへのpushを契機に、GitHub Actionsが`linux/arm64`イメージをGHCRへ公開します。Portainerは新しいイメージを自動取得しないため、更新時は **Pull latest image** を有効にして手動で再配備します。

詳しい手順は以下を参照してください。

- [配備手順](docs/design/deployment.md)
- [運用・バックアップ・復元](docs/design/operations.md)
- [日常操作ガイド](docs/design/user-guide.md)

## ディレクトリ構成

```text
backend/                         FastAPI、DBモデル、マイグレーション、テスト
frontend/                        React UI、nginx設定、画像アセット
deploy/portainer-stack.yml       Raspberry Pi用Portainer Stack
scripts/                         保守用SQL
docs/design/                     現行設計と運用資料
docs/decisions/                  維持すべき設計判断
docs/handoffs/                   実装・レビュー中の作業指示
mkworld_stats_manager_docs_v0_1/ 初期設計スナップショット
```

ドキュメントの役割とライフサイクルは [`docs/README.md`](docs/README.md) を参照してください。

## 運用上の前提

- 単一ユーザーのLAN内利用を想定しています。
- 認証や外部公開を前提とした構成ではありません。
- ランク戦VRは手動入力です。公式VR APIの存在を前提にしていません。
- Lounge API同期はMMRを対象とし、各レースのコース・順位・スコアはPlaying画面から記録します。
- ランク戦のVRとLoungeのMMRは異なる`source`として保存し、同一指標として統合しません。
- データ削除やスキーマ更新の前にはPostgreSQLのバックアップを取得してください。

## ライセンスと権利表記

このリポジトリは個人利用を目的とした非公式ツールです。NintendoおよびMario Kart Worldの公式プロジェクトではありません。ゲーム名、画像、その他の商標・著作物に関する権利は各権利者に帰属します。

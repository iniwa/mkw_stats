# MKWorld Stats Manager API設計 v0.1

## 1. 基本

Base URL:

```text
/api/v1
```

JSON APIを基本とする。  
画像アップロードのみ multipart/form-data。

## 2. 共通型

```ts
type SourceType = "ranked" | "lounge";
type RaceStatus = "draft" | "completed" | "cancelled";
type SessionStatus = "active" | "completed" | "cancelled";
type PlacementBand = "top" | "middle" | "bottom";
```

## 3. 主要API

### Health

```text
GET /health
```

### Settings

```text
GET /settings
PATCH /settings
```

### VR Accounts

```text
GET    /vr-accounts
POST   /vr-accounts
PATCH  /vr-accounts/{account_id}
POST   /vr-accounts/{account_id}/activate
DELETE /vr-accounts/{account_id}
```

### Courses / Routes / Map

```text
GET /courses
GET /routes
GET /map-points
GET /course-search
POST /course-selection/resolve
```

`POST /course-selection/resolve` は、出発地点・到着地点から通常コースまたは道中コースを解決する。

Request:

```json
{
  "from_map_point_id": "dk_pass",
  "to_map_point_id": "dk_pass"
}
```

Response例:

```json
{
  "kind": "course",
  "course": {
    "id": "dk_pass",
    "name_ja": "DKスノーマウンテン",
    "name_en": "DK Pass"
  },
  "display_name": "DK Pass → DK Pass",
  "confirm_message": "DK Pass → DK Pass でいいですか？"
}
```

### Play Sessions

```text
POST /play-sessions
GET  /play-sessions/active
GET  /play-sessions/{session_id}
POST /play-sessions/{session_id}/finish
```

### Race Records

```text
POST  /play-sessions/{session_id}/races/draft
PATCH /race-records/{race_id}/complete-ranked
PATCH /race-records/{race_id}
POST  /race-records/{race_id}/cancel
POST  /play-sessions/{session_id}/undo-last-race
```

野良VRではdraft作成後、complete-rankedで結果入力する。  
Loungeではコース記録時に即completed扱いでよい。

### Course Notes

```text
GET    /course-notes
POST   /course-notes
PATCH  /course-notes/{note_id}
DELETE /course-notes/{note_id}
```

### Map Annotations

```text
GET    /map-annotations
POST   /map-annotations
PATCH  /map-annotations/{annotation_id}
DELETE /map-annotations/{annotation_id}
```

### Files

```text
POST /files
POST /course-notes/{note_id}/files
```

### Lounge Sync

```text
POST /lounge/sync
POST /lounge/continuous-sync/start
GET  /lounge/continuous-sync/status
POST /lounge/continuous-sync/stop
GET  /lounge/tables
GET  /lounge/tables/{table_id}
```

継続更新の停止条件:

- 新規TableまたはMMR更新を検知
- 1時間更新なし
- 手動停止
- 連続3回APIエラー

### Analytics

```text
GET /race-records
GET /analytics/rating-series
GET /analytics/course-stats
```

### Characters / Vehicles

```text
GET /characters
GET /vehicles
GET /vehicles/compare
```

### Item Tables

```text
GET /item-tables
```

## 4. 主要フロー

### 野良VR

```text
GET /settings
GET /vr-accounts
POST /play-sessions { source: ranked }
GET /map-points
POST /course-selection/resolve
POST /play-sessions/{session_id}/races/draft
GET /course-notes
GET /map-annotations
PATCH /race-records/{race_id}/complete-ranked
次レースへ戻る
```

### Lounge

```text
POST /play-sessions { source: lounge, player_count: 12 }
GET /map-points
POST /course-selection/resolve
POST /play-sessions/{session_id}/races/draft
警告表示
次レースへ戻る
12レースで自動終了
POST /lounge/sync or POST /lounge/continuous-sync/start
```

## 5. API設計結論

- `play-sessions` と `race-records` を中心にする
- コース選択は `/course-selection/resolve`
- 野良VRでは `complete-ranked`
- Loungeでは記録時にリピック警告を返す
- Loungeは12レースで自動終了
- Lounge API同期は手動更新と継続更新を分ける

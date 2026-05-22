# MKWorld Stats Manager DB設計 v0.1

## 1. DB方針

DBはPostgreSQLを想定する。

重要方針:

- VRとLoungeは `source` で分離
- 通常コースと道中コースは別管理
- プレイ中の一連の記録は `play_sessions`
- 1レース単位は `race_records`
- Lounge API同期データと手入力レース情報は分ける
- 画像本体はDBに保存せず、パスだけ持つ

## 2. 主要Enum

```sql
CREATE TYPE source_type AS ENUM ('ranked', 'lounge');
CREATE TYPE race_status AS ENUM ('draft', 'completed', 'cancelled');
CREATE TYPE session_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE placement_band AS ENUM ('top', 'middle', 'bottom');
CREATE TYPE annotation_type AS ENUM ('pin', 'icon', 'arrow', 'text', 'area');
```

## 3. 主要テーブル

### 3.1 vr_accounts

複数VRアカウントを管理する。

主なカラム:

- id
- name
- display_name
- initial_vr
- current_vr
- is_active
- sort_order
- created_at
- updated_at

activeなVRアカウントは原則1件のみ。

### 3.2 app_settings

アプリ全体の設定。

- selected_vr_account_id
- selected_character_id
- selected_vehicle_id
- lounge_player_id
- Lounge継続更新設定

### 3.3 play_sessions

野良VR・Lounge共通のプレイ中セッション。

主なカラム:

- id
- source
- status
- title
- vr_account_id
- lounge_table_id
- player_count
- format
- started_at
- completed_at

野良VR:

- source = ranked
- vr_account_id を持つ

Lounge:

- source = lounge
- player_count = 12 or 24
- format = FFA / 2v2 / 3v3 / 4v4 / 6v6 / 8v8 / 12v12
- 1セッション12レースを基本とする

### 3.4 race_records

1レース単位の記録。

野良VR:

- コース選択時にdraft作成
- レース後に結果入力してcompleted

Lounge:

- コース記録時にcompleted
- warning_flagsを持つ

主なカラム:

- id
- session_id
- source
- status
- race_no
- course_id
- route_id
- player_count
- placement_band
- vr_account_id
- rating_before
- rating_after
- rating_delta
- character_id
- vehicle_id
- memo
- warning_flags
- created_at
- updated_at

制約:

```text
course_id と route_id はどちらか一方のみ
```

### 3.5 rating_snapshots

VR/MMRグラフ用。

- source
- vr_account_id
- lounge_player_id
- value
- delta
- captured_at
- race_record_id
- lounge_table_id

### 3.6 courses

通常3周コース。

- id
- name_ja
- name_en
- short_name
- map_point_id
- tags
- sort_order
- is_active

### 3.7 routes

道中コース。

- id
- from_course_id
- to_course_id
- name_ja
- name_en
- short_name
- is_lounge_12p_banned
- repick_group_key
- tags
- sort_order
- is_active

### 3.8 route_repick_equivalents

Rainbow Road特例など、通常コースと道中コースが同一扱いになるケースを管理する。

### 3.9 map_points

全体マップ上のクリック可能地点。

- id
- course_id
- label_ja
- label_en
- x
- y
- radius

x/yは0〜1の正規化座標を推奨。

### 3.10 course_aliases

検索用の別名・略称。

- course_id または route_id
- alias
- alias_type

### 3.11 course_notes

付箋型メモ。

- id
- course_id または route_id
- title
- body_markdown
- priority
- tags
- is_pinned
- is_active

### 3.12 map_annotations

マップ上のピン・アイコン・矢印・注釈。

- id
- course_id または route_id
- note_id
- type
- icon_type
- x
- y
- width
- height
- rotation
- label
- hover_text
- priority
- style

### 3.13 uploaded_files

アップロード画像のメタデータ。

- original_filename
- stored_path
- mime_type
- size_bytes
- width
- height
- checksum_sha256

### 3.14 lounge_tables

Lounge APIから取得したTable単位データ。

- id
- season
- played_at
- format
- player_count
- tier
- raw_data
- synced_at

### 3.15 lounge_table_players

Lounge Table内のプレイヤー別データ。

- lounge_table_id
- lounge_player_id
- player_name
- score
- mmr_before
- mmr_after
- mmr_delta
- raw_data

### 3.16 characters / vehicles

キャラ・マシン性能。

- speed
- acceleration
- weight
- handling
- traction
- mini_turbo
- invincibility
- source_url
- game_version

### 3.17 item_tables

アイテムテーブル。

- game_version
- mode
- player_count
- placement_band
- rank_from
- rank_to
- item_name
- probability
- tendency
- source_url
- notes

## 4. リピック判定

### 通常コース

同一session内で同じcourse_idが存在すれば警告。

### 道中コース

同じrepick_group_keyのrouteが既走なら警告。

### Rainbow Road特例

route_repick_equivalentsで管理。

### 12人Loungeの道中禁止

source=lounge かつ player_count=12 で route_id が選択されたら警告。

## 5. 警告保存

warning_flags例:

```json
[
  "repick",
  "route_banned_12p",
  "same_route_destination",
  "rainbow_road_special"
]
```

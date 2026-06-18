# Time Attack Feature Design

## 1. Purpose

Time Attack機能は、Mario Kart Worldの30コースについて、NITAおよびアイテムありTAのタイム管理を行う機能である。

この機能は、ランク戦やLoungeの対戦記録とは独立した、コース別の練習・目標管理機能として扱う。

主な目的は以下の通り。

- 自分のTA自己ベストを記録する
- WRを参考値として記録する
- 目標タイムを記録する
- 自分のタイムとWR、目標タイムとの差分を確認する
- NITAとアイテムありTAを分けて管理する

## 2. Scope

初期実装の対象は、既存の `courses` に登録されている30コースとする。

対象:

- `courses` の30コース
- NITA
- アイテムありTA
- 自分の自己ベスト
- WR
- 目標タイム
- 各タイムに関する任意メモ
- WRとの差分表示
- 目標タイムとの差分表示

対象外:

- `routes` 単位のTA
- 出発地点から到着地点までのルートTA
- ランク戦・Loungeの `RaceRecord` との統合
- キャラ別TA
- マシン別TA
- OBSオーバーレイ表示
- 外部スプレッドシートからの自動取得
- WR Top 10管理

## 3. Core Concepts

### Time Attack Category

TAカテゴリは以下の2種類とする。

| UI Display | Internal Value |
|---|---|
| `NITA` | `nita` |
| `アイテムあり` | `item` |

Backendでは `TimeAttackCategory` enum として定義する。

```py
class TimeAttackCategory(str, enum.Enum):
    nita = "nita"
    item = "item"
```

### Personal Best

自分のタイムは、各コース・カテゴリごとの現在の自己ベストとして扱う。

内部名は `personal_best_ms` とする。

UI上の表示名は `自分PB` とする。

### World Record / WR

WRは、各コース・カテゴリごとの参考世界タイムとして扱う。

初期実装では、WRはユーザーが手入力する。

内部名は `world_record_ms` とする。

WRの出典、参照元、確認日、補足情報は `world_record_note` に記録する。

UI上の表示名は `WR` で統一する。
`世界タイム` という表示名は使用しない。

### Target Time

目標タイムは、各コース・カテゴリごとにユーザーが任意で設定するタイムである。

内部名は `target_time_ms` とする。

UI上の表示名は `目標` または `目標タイム` とする。

## 4. Time Representation

タイムはDB上ではミリ秒整数で保存する。

例:

| Display | Stored Value |
|---|---:|
| `1:42.350` | `102350` |
| `0:58.721` | `58721` |
| `2:03.000` | `123000` |

理由:

- 差分計算が単純
- 並び替えが容易
- 小数誤差を避けられる
- UI表示形式を後から変更しやすい

Frontendでは `m:ss.mmm` を基本表示とする。

## 5. Time Input Format

タイム入力は、明確なタイム形式のみを許容する。

許容形式:

- `m:ss.mmm`

例:

- `0:58.721`
- `1:23.456`
- `2:03.000`

入力ルール:

- 分は1桁以上の整数
- 秒は必ず2桁
- 秒は `00` から `59` の範囲
- ミリ秒は必ず3桁
- 1分未満のタイムも `0:58.721` のように入力する
- 空欄は `null` として扱う

不許可例:

- `123456`
- `83.456`
- `1:23`
- `1:23.45`
- `1:3.456`

Frontendでは、この形式に一致する入力のみをミリ秒整数へ変換してAPIへ送信する。
形式が不正な場合は保存せず、該当行に入力エラーを表示する。

## 6. Empty Value Display

未入力値はUI上では `-` と表示する。

対象:

- 自分PB
- WR
- 目標タイム
- WR差分
- 目標差分
- 各メモ欄の未入力表示

表示ルール:

- DB上の値が `null` の場合、UIでは `-` と表示する
- 差分計算に必要な値が不足している場合、差分欄は `-` と表示する
- 編集フォーム上では、未入力値は空欄として扱う
- 表示モードでは `-`、編集モードでは空欄を基本とする

例:

| 自分PB | WR | 目標タイム | WR差分 | 目標差分 |
|---:|---:|---:|---:|---:|
| `1:42.350` | `1:38.100` | `1:40.000` | `+4.250` | `+2.350` |
| `-` | `1:38.100` | `1:40.000` | `-` | `-` |
| `1:42.350` | `-` | `-` | `-` | `-` |

## 7. Data Model

### time_attack_records

`time_attack_records` は、自分の自己ベスト、WR、目標タイムを管理する。

想定カラム:

- `id`
- `course_id`
- `category`
- `personal_best_ms`
- `world_record_ms`
- `target_time_ms`
- `personal_best_note`
- `world_record_note`
- `target_note`
- `created_at`
- `updated_at`

一意制約:

- `course_id`
- `category`

この制約により、1コース・1カテゴリにつき1行のみを持つ。

DB制約:

- `personal_best_ms` は `null` または1以上
- `world_record_ms` は `null` または1以上
- `target_time_ms` は `null` または1以上

最大件数は、30コース × 2カテゴリ = 60行程度となる。

### Record Creation Policy

TAレコードは初期seedでは作成しない。

Frontendは `courses` の30コース一覧と、指定カテゴリの `time_attack_records` を結合して表示する。

該当するTAレコードが存在しないコースは、未入力行として表示する。
その行を保存した時点で、`PUT /api/v1/time-attack-records/{course_id}/{category}` によってレコードを作成する。

### SQLAlchemy Model Sketch

```py
class TimeAttackRecord(Base):
    __tablename__ = "time_attack_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    course_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("courses.id"),
        nullable=False,
    )

    category: Mapped[TimeAttackCategory] = mapped_column(
        Enum(TimeAttackCategory, name="time_attack_category"),
        nullable=False,
    )

    personal_best_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    world_record_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    personal_best_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    world_record_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("course_id", "category", name="uq_ta_record_course_category"),
    )
```

## 8. World Record Source Policy

当初は、外部GoogleスプレッドシートからWRを自動取得する案を検討した。

しかし、参照元シートはコピー・ダウンロードが制限されており、かつ単純な表ではなくカード型レイアウトであるため、初期実装では自動取得を行わない。

初期実装では、WRは手入力する。

参照元、確認日、補足情報、URLなどは `world_record_note` に記載する。

初期実装では以下を行わない。

- Googleスプレッドシートからの直接取得
- Google Sheets API連携
- 公開CSV取得
- WR Top 10の保存
- WR自動更新
- WR更新ボタン

## 9. API Design

### List Time Attack Records

```http
GET /api/v1/time-attack-records
GET /api/v1/time-attack-records?category=nita
GET /api/v1/time-attack-records?category=item
```

レスポンスは `TimeAttackRecordRead[]` とする。

一覧APIは、保存済みのTAレコードのみを返す。
30コース分の空行生成はFrontend側で `courses` と結合して行う。

カテゴリ未指定時は `courses.sort_order`, `courses.id`, `category` の順、カテゴリ指定時は `courses.sort_order`, `courses.id` の順で返す。

### Upsert Time Attack Record

```http
PUT /api/v1/time-attack-records/{course_id}/{category}
```

`PUT` はupsertとして扱う。

既存レコードがある場合は更新し、存在しない場合は作成する。

Request example:

```json
{
  "personal_best_ms": 102350,
  "world_record_ms": 98100,
  "target_time_ms": 100000,
  "personal_best_note": "SC安定しない",
  "world_record_note": "NITA leaderboard 参考",
  "target_note": "まず1:40切り"
}
```

Response example:

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "course_id": "dk_pass",
  "category": "nita",
  "personal_best_ms": 102350,
  "world_record_ms": 98100,
  "target_time_ms": 100000,
  "personal_best_note": "SC安定しない",
  "world_record_note": "NITA leaderboard 参考",
  "target_note": "まず1:40切り",
  "created_at": "2026-06-18T00:00:00+09:00",
  "updated_at": "2026-06-18T00:00:00+09:00"
}
```

## 10. Pydantic Schema Sketch

```py
class TimeAttackRecordRead(BaseModel):
    model_config = _orm

    id: uuid.UUID
    course_id: str
    category: TimeAttackCategory
    personal_best_ms: int | None
    world_record_ms: int | None
    target_time_ms: int | None
    personal_best_note: str | None
    world_record_note: str | None
    target_note: str | None
    created_at: datetime
    updated_at: datetime


class TimeAttackRecordUpdate(BaseModel):
    personal_best_ms: int | None = Field(default=None, gt=0)
    world_record_ms: int | None = Field(default=None, gt=0)
    target_time_ms: int | None = Field(default=None, gt=0)
    personal_best_note: str | None = None
    world_record_note: str | None = None
    target_note: str | None = None
```

更新処理では、未指定フィールドと明示的な `null` を区別する必要がある。

そのため、実装では `model_fields_set` を使い、以下の挙動にする。

- リクエストに含まれるフィールド: 更新対象
- リクエストに含まれないフィールド: 既存値を維持
- リクエストに `null` として含まれるフィールド: 値を削除

Frontendの行単位保存では、原則としてその行の全入力値を送信する。
Backendは部分更新にも耐える実装にする。

## 11. Frontend Design

### Navigation

TA画面は `Courses` と `Records` の間に配置する。

想定ナビゲーション:

```text
Dashboard
Playing
VR
Lounge
Host
Analytics
Items
Courses
TA
Records
Settings
```

### TA View

TA画面は以下の構成とする。

```text
TA
├─ カテゴリ切替
│   ├─ NITA
│   └─ アイテムあり
│
├─ 概要カード
│   ├─ 自分PB入力済みコース数
│   ├─ WR入力済みコース数
│   ├─ 目標タイム入力済みコース数
│   └─ 目標達成数
│
└─ コース別テーブル
    ├─ コース名
    ├─ 自分PB
    ├─ WR
    ├─ 目標タイム
    ├─ WR差分
    ├─ 目標差分
    ├─ メモ展開ボタン
    └─ 保存ボタン
```

目標達成数は、`personal_best_ms` と `target_time_ms` の両方が存在し、`personal_best_ms <= target_time_ms` のコース数とする。

### Table Behavior

各行は1コースを表す。

カテゴリ切替により、同じコース一覧のまま `nita` / `item` のレコードを切り替える。

未保存の入力内容は `course_id + category` ごとに画面内で保持する。
カテゴリを切り替えて戻った場合も、その画面を開いている間は未保存編集を復元する。ページ再読み込みや画面離脱をまたぐ永続化は行わない。

初期表示では、タイム入力と差分確認を優先し、メモ欄は常時表示しない。

表示項目:

- コース名
- 自分PB
- WR
- 目標タイム
- WR差分
- 目標差分
- メモ展開ボタン
- 保存ボタン

メモ欄は行ごとの展開式とする。

展開時に表示する項目:

- 自分PBメモ
- WRメモ
- 目標メモ

保存方式:

- 行単位で保存する
- 各行に保存ボタンを配置する
- 保存時に `PUT /api/v1/time-attack-records/{course_id}/{category}` を呼ぶ
- 未入力欄は `null` として送信する
- 保存成功後、その行の表示状態を最新レスポンスで更新する
- 保存失敗時は、その行にエラーを表示し、他の行の編集状態には影響させない

読込・保存状態:

- 初回読込中はローディング表示を出す
- コース一覧またはTA一覧の読込に失敗した場合は、画面単位のエラーと再試行ボタンを表示する
- 保存中は対象行の保存ボタンだけを無効化する
- 保存成功後は対象行に短い成功表示を出し、次の編集開始時に消す
- 保存失敗後も入力内容を保持する

行単位保存を採用する理由:

- 1コースだけ更新したい場面が多い
- 全体保存より実装とエラー処理が単純
- 保存失敗時の影響範囲を1行に限定できる
- 30コース分の入力途中でも、必要な行だけ確定できる

メモ欄を展開式にする理由:

- 30コース一覧の視認性を保てる
- タイム比較と差分確認を主表示にできる
- メモを使わないコースで画面が縦に伸びすぎるのを避けられる
- 必要なコースだけ詳細情報を編集できる

### Responsive Behavior

- 画面全体に横スクロールを発生させない
- 狭幅画面では、コース別テーブルを専用の横スクロール領域に入れる
- コース名列は識別できる幅を保つ
- 保存ボタン、メモ展開ボタン、入力エラーは横スクロール領域内で操作・確認できる
- 375px幅でナビゲーションや他画面を壊すCSS変更を行わない

### Time Input

Frontendでは入力文字列をミリ秒整数に変換してからAPIへ送信する。

表示時はミリ秒整数を `m:ss.mmm` に変換する。

パース不能な入力は保存前にエラー表示する。

## 12. Difference Calculation

### Target Difference

```text
personal_best_ms - target_time_ms
```

- `> 0`: 目標より遅い
- `<= 0`: 目標達成

### WR Difference

```text
personal_best_ms - world_record_ms
```

- `> 0`: WRより遅い
- `= 0`: WRと同タイム
- `< 0`: WRより速い

通常はWRより速いケースは想定しないが、計算上は許容する。

### Difference Display

差分は `+x.xxx` / `-x.xxx` 形式で表示する。

例:

| personal_best_ms | target_time_ms | 目標差分 |
|---:|---:|---:|
| `102350` | `100000` | `+2.350` |
| `99500` | `100000` | `-0.500` |
| `100000` | `100000` | `0.000` |

必要な値が不足している場合は `-` と表示する。

## 13. Validation Rules

### Backend Validation

- `course_id` は既存の `courses.id` に存在する必要がある
- `category` は `nita` または `item`
- `personal_best_ms` は `null` または1以上の整数
- `world_record_ms` は `null` または1以上の整数
- `target_time_ms` は `null` または1以上の整数
- `personal_best_note` は任意
- `world_record_note` は任意
- `target_note` は任意

### Frontend Validation

- タイム入力が空欄の場合は `null`
- タイム入力が不正な場合は保存しない
- タイム入力は `m:ss.mmm` 形式のみ許容する
- 秒は `00` から `59` の範囲のみ許容する
- `m:ss.mmm` 形式以外は不正入力として扱う
- `personal_best_ms` がない場合、差分表示は `-`
- `world_record_ms` がない場合、WR差分は `-`
- `target_time_ms` がない場合、目標差分は `-`

## 14. Explicit Non-goals

以下はTA機能の設計対象外とする。

### Character / Vehicle Specific Time Attack

キャラクター別・マシン別のTA管理は行わない。

TA機能は、コースごとの自己ベスト、WR、目標タイムを管理するための機能であり、キャラクターやマシンごとの細分化は扱わない。

### OBS Overlay

TA情報をOBSブラウザソース向けに表示する機能は実装しない。

既存アプリにはVR/MMR用の配信支援オーバーレイが存在するが、TA機能は配信表示ではなく、練習・目標管理のための内部画面として扱う。

### Automatic External Import

初期実装では、外部スプレッドシートや外部ランキングサイトからの自動取得は行わない。

WRは手入力値として扱う。

### WR Top 10

初期実装では、WRの1位〜10位管理は行わない。

WRは、各コース・カテゴリごとに1つの参考タイムとして保存する。

## 15. Future Extensions

以下は将来実装として扱う。

### Personal Best History

現在の `personal_best_ms` は各コース・カテゴリごとの最新PBとして管理する。

将来的には、PB更新履歴を別テーブルとして保存し、過去の自己ベスト推移を確認できるようにする。

想定する追加情報:

- 更新前タイム
- 更新後タイム
- 更新日時
- メモ
- 参考動画URL

### Recorded Date

初期実装では、各TAレコードの `updated_at` のみを保持する。

将来的には、自己ベスト、WR、目標タイムごとに個別の記録日を持たせることを検討する。

例:

- `personal_best_recorded_at`
- `world_record_confirmed_at`
- `target_set_at`

### Video URL / Reference URL

将来的には、自己ベスト動画、WR参考動画、攻略メモなどへのURLを保存できるようにする。

初期実装ではURL専用カラムは持たず、必要であれば note フィールドに記載する。

### WR Top 10 Management

将来的には、WRを1位〜10位まで管理できるようにする。

ただし、初期実装ではTop 10は扱わず、WRは1つの参考タイムのみを保存する。

### External Ranking Import

将来的には、外部ランキングデータの取り込みを検討する。

取り込み元は、以下のような安定して取得可能な形式を想定する。

- 公開CSV
- 許可されたAPI
- 手動で整形したCSV
- 手動で整形したJSON

Googleスプレッドシートからの直接取得は、安定して取得可能であり、かつ利用上問題がないことを確認できた場合のみ実装する。

### Route-based Time Attack

初期実装では、TA対象は `courses` に登録されている30コースのみとする。

将来的に必要になった場合のみ、`routes` に紐づくルート別TAを検討する。ただし、現時点では優先度は低い。

### Ranking / Progress Analytics

将来的には、以下のような集計表示を追加できる。

- 目標達成コース数
- NITA / アイテムあり別の達成率
- WRとの差分ランキング
- 目標タイムとの差分ランキング
- 未入力コース一覧
- PB入力済みコース一覧

## 16. Data Lifecycle

- TAレコードはランク戦・Loungeの対戦記録とは独立したユーザーデータとして扱う
- `scripts/record_only_cleanup.sql` による対戦記録クリーンアップではTAレコードを削除しない
- PostgreSQL全体のバックアップ・復元にはTAレコードを含める
- 初期seedはTAレコードを作成・更新・削除しない

## 17. Testing Strategy

Backendでは以下をテストする。

- `GET /time-attack-records` が取得できる
- `GET /time-attack-records?category=nita` で絞り込みできる
- `GET /time-attack-records?category=item` で絞り込みできる
- `PUT /time-attack-records/{course_id}/{category}` で作成できる
- 同じ `course_id + category` に再PUTすると更新になる
- 存在しない `course_id` は404になる
- 不正な `category` は422になる
- `personal_best_ms` を保存できる
- `world_record_ms` を保存できる
- `target_time_ms` を保存できる
- 各noteを保存できる
- 明示的な `null` で値を削除できる
- 未指定フィールドは既存値を維持する

Frontendでは以下を確認する。

- TA画面が表示される
- NITA / アイテムありを切り替えられる
- 30コースが表示される
- 自分PBを入力・保存できる
- WRを入力・保存できる
- 目標タイムを入力・保存できる
- 各メモを展開して入力・保存できる
- 目標差分が表示される
- WR差分が表示される
- 未入力値が `-` で表示される
- 不正なタイム入力時に保存されない
- 秒が `60` 以上の入力は保存されない
- カテゴリ切替後も画面内の未保存編集が保持される
- 保存失敗後も対象行の入力内容が保持される
- 375px幅で画面全体の横スクロールが発生せず、テーブル専用領域をスクロールして操作できる

Frontendに自動テスト基盤を新規導入することは必須としない。既存の `npm run typecheck` と `npm run build` に加え、上記のUI動作を手動確認する。

## 18. Resolved Decisions

- UI上のカテゴリ表示名は `NITA` / `アイテムあり` とする
- 保存方式は行単位保存とする
- メモ欄は行ごとの展開式とする
- WR表示は `WR` で統一する
- 未入力値は `-` で表示する
- タイム入力は `m:ss.mmm` 形式のみ許容する
- `123456` のような数字のみ入力は許容しない
- WRの自動取得はMVPでは行わない
- WR Top 10管理はMVPでは行わない
- キャラ別・マシン別TAは行わない
- OBSオーバーレイ表示は行わない
- カテゴリ切替時の未保存編集は、カテゴリごとに画面内保持する
- 狭幅画面ではテーブル専用の横スクロール領域を使用する
- 対戦記録クリーンアップではTAレコードを保持する

## 19. Open Questions

なし。

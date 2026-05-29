## 共通
- [ ] タブの順番を調整
  - [ ] 左から「Dashborard」「Playing」「VR」「Lounge」「Analytics（後述）」「Records」「Settings」  


## Records
- [x] セッション自体を削除する機能も欲しい
  - [x] 削除を押してもエラーが発生する
    ~~→古いデータがそうなってる？新しいデータは問題なく削除できてそう~~
    ~~→一旦全削除するだけでok~~
    - 新しいレコードでも発生。調査必要
    → 原因: ORM relationship 未定義のため SQLAlchemy が親 play_sessions を子 race_records より
      先に DELETE し、PostgreSQL で FK 違反。delete_session に flush を挿入し
      snapshots→races→session の順で削除するよう修正。テストでも SQLite の FK 強制を有効化。

## VR/Lounge/Analytics
- [x] 「VR」「Lounge」「Analytics」の3つに分割
  - [x] 「VR」「Lounge」はそれぞれレート推移をベースに掲載
  - [x] 「Lounge」では平均順位等も掲載。VR
  - [x] 「Analytics」ではコース毎の勝率等を掲載
    → 勝率は「参加人数を3等分し上位/中位/下位の分布」で表現

### Lounge
- [x] 12p/24pのデータが正しく取得できていない（今は24pのMMRが両方に入っている？）
  → 原因: season2の12pは `mkworld12p` が正しい game 文字列。旧コードは `mkworld` を使用し、
    APIが無効な game を黙って `mkworld24p` にフォールバックするため両方に24p値が入っていた。
    12p=`mkworld12p` / 24p=`mkworld24p`（season0/1は統合 `mkworld`）に修正。
- [x] MMR同期、押した瞬間は今のMMR等がロードされるが、別タブ等にいくとなくなっている
  - 保存されてない？Recordsと抱合せ保存のためレース直後じゃないとだめ？
  - 現在Loungeセッション記録が0な影響？
  → 原因: 現在MMRはセッションにマッチした時のみ保存され、マッチ無し/0件だと表示が揮発していた。
    app_settings に lounge_mmr_12p/24p/synced_at を永続化し、Loungeビューがそこから復元するよう修正。
    0セッションでも MMR パネル＋同期ボタンを表示。

### Analytics
- [x] VR/Lounge/両方で切り替え可能
- [x] コース毎の勝率、平均順位等を掲載
- [x] 下記項目の上位/下位をトップに表示（詳細表示等で全項目表示可）
  - ピック率･ピック数
  - 平均順位
- [x] Loungeタブでは警告レコードは不要（Loungeから削除済み）
  - Playingの時のみ表示。「リピックだよ！」という通知はあってもよい。
  - しかしここに入力するのは「コースが確定した後」という仕様前提は踏まえて設計

## Courses
- [x] コース画像表示が非常に大きく見にくい
  - 道表示時の「道と最終コース」が横に並んでるぐらいのサイズ感がちょうどよく見える
  → 単体表示（コース単体・3周ルートの最終コースのみ）が全幅(~1068px)で出ていた。
    `.route-image` に max-width:min(100%,520px) を付与し、ペア1枚分(~520px)に統一。
    マーカー位置(left/top %)がズレないよう `.target-image-with-markers` を
    width:fit-content で画像にシュリンクラップ。ペア表示(横並び)のサイズ感は維持。
  - [ ] マップアノテーションの表示が相変わらずデカい。
    - 横幅か縦幅に表示制限を入れて欲しい。
- [x] 道後のコースへアノテーションの追加ができない
  → 原因: AnnotationEditor が通常ルートで道中画像しか編集サーフェスに出さず、
    MapAnnotation モデルにもどちらの画像か判別するフィールドが無かった。
    対応:
    1. マイグレーション線形化: 重複していた revision="005" を 006 にリネームし
       005→006→007 と線形化（005 は completion_reason で固定）。
    2. MapAnnotation に is_goal_image bool カラム追加 (migration 007)。
       既存3周ルート注釈は is_goal_image=true にバックフィル。
    3. AnnotationEditor: 通常ルートで「道中/道後」セグメント切替を追加。
       サーフェスは選択側の画像を表示し、マーカーも側ごとにフィルタ。
       作成時に is_goal_image をセット。編集クリックで正しい側に自動切替。
    4. TargetImage: mid/goal アノテーションを分割して各画像の WithMarkers に渡す。
       goal 画像も WithMarkers で包むよう修正。goalFallbackCourseId prop 追加。
    5. NotesView: annotations を親で一括管理し AnnotationEditor・TargetImage 両方に
       供給。プレビュー（TargetImage）にもマーカーが表示されるように。
- [x] アノテーションに画像付与
  - キノコ/キラー/金キノ/羽あたり
  → バックエンド（icon_type カラム・スキーマ）は001初期マイグレーションから実装済みだったため変更不要。
    フロントエンドのみ実装:
    1. api.ts に ANNOTATION_ICONS（mushroom/bullet/golden_mushroom/feather）定数と
       annotationIconSrc() ヘルパーを追加。
    2. AnnotationEditor: createType/editType が 'icon' のときアイコンピッカー（セグボタン）を表示。
       作成・保存時に icon_type を API へ送信。
    3. AnnotationSurface・TargetImage の Markers: type==='icon' かつ icon_type がある場合は
       ドットの代わりにアイコン画像を表示（失敗時はドットへフォールバック）。
       作成プレビューピンもアイコン選択中は画像プレビューで表示。
    4. App.css に .ann__marker-icon (26×26px, drop-shadow) を追加。
    5. 画像配置先: frontend/public/assets/annotation-icons/{value}.png
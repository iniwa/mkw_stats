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
- [ ] 道後のコースへアノテーションの追加ができない
- [ ] アノテーションに画像付与
  - キノコ/キラー/金キノ/羽あたり
  - 画像の取得元探す（私が渡してAIで設置でも可）
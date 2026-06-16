# Issues / 改善タスク

> 整理: 2026-06-16（Claude Code 単体運用フェーズ）
> 凡例: `[ ]` 未着手 / `[~]` 実装中 / `[x]` 完了 / `(P1)` 優先度

共通テーマ: **Lounge の 12人(12p)/24人(24p) を全面的に分離**して扱えるようにする。
バックエンドは既に `PlaySession.player_count` と `lounge_mmr_game`("mkworld12p"/"mkworld24p") で
12p/24p を分離保持済みのため、多くはフロント側の表示・集計の対応となる。

---

## A. Playing 画面

### A-1. コース選択ボタンを最上部へ (P1) — 元: Playing/共通① ✅
- [x] 「コースオンリー」「⇄ 入れ替え」「コースを確認」を `CourseSelector` 最上部へ移動
- [x] 追加要望(2026-06-16): コース確認画面の「選び直す/結果を入力する」もタイトル直下へ移動
- 対象: `frontend/src/PlayingView.tsx` `CourseSelector` / `SelectionConfirm`

### A-2. コースオンリーモード (P1) — 元: Playing/共通② ✅
- [x] 「到着を出発と同じにする」ボタンを、ワンクリック切り替えの**モード**に変更
- ON の間は「到着 = 出発」を自動同期(`useEffect`)し、到着ピッカーを非表示・⇄入れ替えを無効化
- 仮名: コースオンリー

### A-3. VR の参加人数をコース選択時点から入力 (P2) — 元: Playing/共通③ ✅
- [x] 野良VR(ranked)時、参加人数を選択ステップにも stepper で表示（確認/結果画面と同じ state を共有）
- 対象: `PlayingView.tsx` `CourseSelector`

### A-4. プレイ中のコースメモ追加（メモ追加モード） (P3) — 元: Playing/共通④ ✅
- [x] 再利用 `NoteAddPanel`(タイトル/本文/ピン留めの折りたたみフォーム)を追加
- コース確認・VR結果入力・Lounge結果入力の各フェーズに配置。`api.createNote` で対象コース/道中へ追加
- 確認画面では追加メモを表示リストへ即反映。既存CSSクラスのみ使用
- 対象: `PlayingView.tsx`

### A-6. Lounge プレイ中の中央値(目安スコア)表示 (P2・新機能) — 元: ユーザー追加 2026-06-16 ✅
- [x] `SessionSidebar` に「現在の中央値(目安)」と「12レース時の中央値(目安)」を表示
- 算出方法(**ユーザー確認済**): 平均(期待値)par = 配点合計÷人数×レース数（24p:6.0/race、12p:6.83/race）
- 現在の合計スコアとの差分(+/-)も色付きで表示。`loungeParPerRace()` を追加
- 対象: `PlayingView.tsx`

### A-5. Lounge スコア自動計算の 12p/24p 分離 (P1・データ正確性) — 元: Playing/Lounge① ✅
- [x] `LOUNGE_SCORE_TABLE_24P` / `LOUNGE_SCORE_TABLE_12P` に分割し、`loungeScoreTable(playerCount)` で選択
- 12人以下→12p表 / それ以外(24人)→24p表。`LoungeResultForm` の初期値・自動入力を切替
- 24p表(確定): 15,12,10,9,9,8,8,7,7,6,6,6,5,5,5,4,4,4,3,3,3,2,2,1（合計144）
- 12p表(**ユーザー確認済 2026-06-16**): 15,12,10,9,8,7,6,5,4,3,2,1（合計82）
- 対象: `PlayingView.tsx`

---

## B. Lounge 画面

### B-1. 共通/24人/12人 の表示切り替え (P2) — 元: Lounge① ✅
- [x] `viewMode`('both'|'24p'|'12p') セグメントを追加。MMRパネル/トレンド/同期履歴/セッション一覧を絞り込み
- MMRは `mmrGameKind()`、セッション行は `player_count` で分類
- 既知の判断保留: Loungeサマリ指標と「前回変動/同期済み」行は全体集計のまま(要望あれば絞り込み可)
- 対象: `frontend/src/LoungeView.tsx`

---

## C. Analytics 画面

### C-1. Lounge データの 12p/24p 分離 (P2) — 元: Analytics① ✅
- [x] `fieldFilter`('all'|'24p'|'12p') サブセグメントを追加（`mode==='lounge'` 時のみ表示）
- `player_count>=13`→24p / `<=12`→12p で集計を絞り込み。VR は影響なし
- 対象: `frontend/src/AnalyticsView.tsx`

---

## D. オーバーレイ (OBS)

### D-1. 表示MMRの 12p/24p 明示 (P2) — 元: オーバーレイ① ✅
- [x] メインラベルを `12pMMR`/`24pMMR` に強化。`getMmr(settings, format)` に分離
- auto/mmr 時はアクティブ Lounge セッションの `player_count` で 12p/24p を自動選択（無ければ `settings.lounge_game`）
- 対象: `frontend/src/RateOverlayView.tsx`

### D-2. MMR/24p・MMR/12p のモード細分化 (P3) — 元: オーバーレイ② ✅
- [x] `OverlayMode` に `mmr12`/`mmr24` を追加。オーバーレイ内セグメント・App.tsx の query param・Settings の OBS URL パネルに反映
- 対象: `RateOverlayView.tsx` + `App.tsx` + `SettingsView.tsx`

---

## E. その他

### E-1. SG タブの削除/非表示 (P1) — 元: SG① ✅
- [x] NAV から SG を削除。`?view=styleguide` で引き続き確認可能に配線
- 対象: `frontend/src/App.tsx`（StyleguideView 本体は残置）

---

## 実装ウェーブ（計画）

- Wave 1（低リスク・即実装）: E-1 ✅, A-1 ✅, A-2 ✅, A-3 ✅
- Wave 2（データ正確性・要確認）: A-5 ✅（12p表ユーザー確認済）
- Wave 3（12p/24p 表示分離）: B-1 ✅, C-1 ✅, D-1 ✅, D-2 ✅
- 追加（新機能）: A-6 ✅（プレイ中の中央値/par 表示）
- Wave 4（残・新機能）: A-4（プレイ中メモ追加）← 次の候補

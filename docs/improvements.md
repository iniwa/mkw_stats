# プログラム改善チェックリスト

コードベースを調査して洗い出した改善候補の一覧（初回調査: 2026-07-07）。

**運用方法**: 着手したい項目にチェック `[x]` を入れる → Codex が handoff
（`docs/handoffs/`）を作成し、Claude Code（auto モード）が実装する。
handoff を挟むまでもない小粒な項目は Claude Code に直接依頼してもよい。
実装完了した項目は「完了アーカイブ」へ移動する。

- 機能追加・未検証項目はこのファイルの対象外（ルートの `issues.md` で管理）。
- 優先度: **高** = 稼働中の安定性に直結 / **中** = 保守性・性能 / **低** = 任意。

調査時ベースライン（2026-07-07）: backend `python -m pytest` 169 passed、
カバレッジ 94%（1518 stmts / 96 miss）。frontend `npm run typecheck` パス。

追加調査: **2026-08-31**。以下の未チェック項目は候補の記録であり、実装はまだ行っていない。
frontend/backend を独立して読み取り調査し、Records の2件はローカルのブラウザーで
仮API応答を使って再現した。実データ・本番環境への書き込みは行っていない。
実装経路は現行 `AGENTS.md` に従う（この文書などに残る旧経路の記述は C-02 を参照）。

---

## 1. Frontend

- [ ] **【高 / F-01】古いAPI応答で、選択中のセッション・条件と違う内容が表示される問題を防ぐ**
  - 根拠: [RecordsView.tsx](../frontend/src/RecordsView.tsx) の `loadRaces`（69〜79行）は要求時のセッションと現在の選択を照合せず、結果・エラー・loading を適用する。セッション選択（113〜123行）と「非表示も表示」（390〜394行）から要求を重ねられる。
  - 再現: Aのレース応答を保留してBを選択し、B表示後にAを返す。選択状態と詳細見出しはBの日付のまま、レース一覧がAへ置き換わり、「編集」も有効だった。誤った記録を操作するおそれがある。
  - 改善案: セッション・表示条件の変更と選択解除で要求世代を更新し、最新の結果・エラー・loading 状態だけを適用する。保存後の再取得にも同じ条件確認を使う。
  - 関連範囲: [AnalyticsView.tsx](../frontend/src/AnalyticsView.tsx) の85〜136行、[LoungeView.tsx](../frontend/src/LoungeView.tsx) の170〜206行、[TargetAssist.tsx](../frontend/src/TargetAssist.tsx) の31〜44行にも、条件変更後に古い応答を破棄しない処理がある。こちらは静的確認のみで、個別のブラウザー再現は未実施。
  - 検証: 現行のRecords UIを仮APIで動かし、応答順を制御して再現。実際の記録変更は行っていない。

- [ ] **【中 / F-02】Recordsの不正な数値入力を、無視して保存完了にせず画面で知らせる**
  - 根拠: [RecordsView.tsx](../frontend/src/RecordsView.tsx) の134〜154行では、人数・順位・VR・スコアが下限未満のとき、その値を更新リクエストから除外する。467〜469行の順位入力には `min=1` があるが、保存は493行のクリックハンドラーで行われ、入力の妥当性を確認しない。
  - 再現: 順位3のレースを編集して `0` を入力すると、入力要素の `validity` は不正になる。それでも保存で `placement` のない更新リクエストが送られ、エラー表示なく編集を閉じ、元の3位が残った。
  - 改善案: 変更した数値の妥当性を保存前に検査し、不正な欄を明示して入力内容を保持する。空欄を「変更なし」とする仕様とは区別し、0や負数を黙って省略しない。
  - 検証: ローカルブラウザーで実際に入力・保存し、仮APIが受け取る本文に `placement` がなく、編集終了・エラーなしとなることを確認。保存先はブラウザー内の仮データのみ。

## 2. Backend

今回確認したセッション削除・Undo・Lounge MMR照合の範囲では、追加の明確な不具合は確認できなかった。
過去の結果VRを編集しても現在VRを自動更新しない動作は、[ユーザーガイド](design/user-guide.md)と
既存の決定記録にある仕様のため、不具合候補から除外した。バックエンドテストの再実行や
本番データによる検証は、この調査では行っていない。

## 3. 横断

- [ ] **【中 / C-01】イメージ公開前に、変更対象の既存テストを自動実行する**
  - 根拠: [.github/workflows/docker-publish.yml](../.github/workflows/docker-publish.yml) のジョブはDockerビルドとGHCR公開のみで、`pytest` / `npm test` の実行工程がない。[frontend/Dockerfile](../frontend/Dockerfile) のビルドでは型チェックが実行されるが、既存Vitestテストは実行されない。[backend/Dockerfile](../backend/Dockerfile) にもテスト実行はない。
  - 影響: ビルドが通る動作上の回帰を、既存テストで検知しないままイメージを公開できる。今回のテスト失敗を発見したという意味ではない。
  - 改善案: 変更対象の既存テストを公開前に実行し、失敗時に公開しない。新しいテスト基盤や無関係な全件検証は前提にしない。CI/CD変更なので、実装する場合は別途その範囲を承認する。
  - 検証: リポジトリ内のworkflow/Dockerfileを静的確認。GitHub側の設定や実行結果は未確認。

- [ ] **【低 / C-02】作業案内に残っている旧Claude Code経路の説明を現行方針へそろえる**
  - 根拠: [docs/README.md](README.md) のhandoff lifecycle、[docs/handoffs/README.md](handoffs/README.md)、および本書冒頭にはClaude Codeへの委任を前提にした案内が残る。現行 `AGENTS.md` はnative Codex roleを使い、Claude Code経路は未承認としている。
  - 影響: 次回の実装依頼で、現在の作業ルールと矛盾する案内を参照する可能性がある。
  - 改善案: 作業案内だけを現在の `AGENTS.md` と整合させ、当時の作業履歴・完了済みhandoffは書き換えない。新しい委任ルールは追加しない。
  - 検証: 現行文書間の比較のみ。ポリシー自体の変更は行っていない。

---

## 完了アーカイブ

- [x] **【中】`PlayingView.tsx`（1,639行）をコンポーネント単位のファイルに分割する**
  - 完了日: 2026-07-07
  - 対応: `frontend/src/playing/components.tsx` に下部の Playing UI コンポーネント群を移動。親の状態管理と API 呼び出しは `PlayingView.tsx` に残し、挙動不変の機械的分割にした。
  - 検証: `frontend` で `npm run typecheck` / `npm run build` パス。

- [x] **【低】日時・数値フォーマッタの重複を共通モジュールへ抽出する**
  - 完了日: 2026-07-07
  - 対応: `frontend/src/format.ts` に `fmtTime` / `fmtValue` を追加し、各ビューから import する形に変更。Records の日時表示差分は `record` style で保持。
  - 検証: `frontend` で `npm run typecheck` / `npm run build` / `npm test` パス。

- [x] **【低】OBS オーバーレイのポーリング負荷を下げる**
  - 完了日: 2026-07-07
  - 対応: 既定2秒は維持しつつ、overlay URL の `pollMs` または `poll` クエリパラメーターで 1000〜60000ms の範囲に調整可能にした。
  - 検証: `frontend` で `npm run typecheck` / `npm run build` / `npm test` パス。

- [x] **【低】カバレッジの低いモジュールへユニットテストを追加する**
  - 完了日: 2026-07-07
  - 対応: VR アカウント API と ranked/lounge race completion の 4xx エラーパステストを追加。
  - 検証: `backend` で `python -m pytest` パス（173 passed）。

- [x] **【低】フロントエンドの自動テスト基盤を導入する**
  - 完了日: 2026-07-07
  - 対応: Vitest を devDependency として追加し、`npm test` script と formatter / overlay helper のテストを追加。
  - 検証: `frontend` で `npm test` パス（2 files, 10 tests）。

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

---

## 1. Frontend

（未着手項目なし）

## 2. Backend

（未着手項目なし）

## 3. 横断

（未着手項目なし）

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
/**
 * StyleguideView — デザイン確認用ビュー（Step 1: 方針可視化）
 * URL: ?view=styleguide または NAV の「SG」タブ
 * 確認完了後、削除するか開発用として残すか選択してください。
 */
export default function StyleguideView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ヘッダー */}
      <div>
        <h1 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: '0.25rem' }}>
          スタイルガイド
        </h1>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-dim)', lineHeight: 1.6 }}>
          UI全体調整の方針確認用ビュー。配色・余白・コンポーネントの現状と変更案を確認してください。<br />
          フィードバックを伝えると、Step 2 以降で全ビューへ一括反映します。
        </p>
      </div>

      {/* ── 1. カラーパレット ──────────────────────────────────────── */}
      <section className="panel">
        <div className="panel__title">1. カラーパレット（現在の :root トークン）</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {([
            ['--bg',           '#111119', 'bg'],
            ['--bg-panel',     '#1a1a26', 'bg-panel'],
            ['--bg-input',     '#14141d', 'bg-input'],
            ['--border',       '#2e2e3e', 'border'],
            ['--border-strong','#44445a', 'border-strong'],
            ['--text',         '#e8e8ee', 'text'],
            ['--text-dim',     '#9a9aae', 'text-dim'],
            ['--text-faint',   '#6a6a7e', 'text-faint'],
            ['--accent',       '#5b8bf0', 'accent'],
            ['--accent-dim',   '#2a3a5e', 'accent-dim'],
            ['--ok',           '#5fc97a', 'ok'],
            ['--warn',         '#e6b24d', 'warn'],
            ['--danger',       '#e5705f', 'danger'],
          ] as const).map(([token, hex, name]) => (
            <div key={token} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', width: '4rem' }}>
              <div style={{
                width: '3.5rem', height: '3.5rem',
                background: `var(${token})`,
                border: '2px solid var(--border-strong)',
                borderRadius: 'var(--radius)',
              }} />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)', textAlign: 'center', wordBreak: 'break-all' }}>
                {name}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-faint)', fontFamily: 'monospace' }}>
                {hex}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. 新規トークン案 ─────────────────────────────────────── */}
      <section className="panel">
        <div className="panel__title">2. 追加予定トークン（Step 2 で導入）</div>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-dim)', marginBottom: '1rem', lineHeight: 1.6 }}>
          現状は余白・角丸・フォントサイズが直値（<code style={{ background: 'var(--bg-input)', padding: '0.05rem 0.3rem', borderRadius: '3px', fontSize: '0.8rem' }}>0.85rem</code> 等）で各所に散在しています。
          以下のトークンを追加してビュー間の一貫性を高めます。
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* スペーシング */}
          <div>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>スペーシング</p>
            {([
              ['--space-1', '0.25rem', '4px'],
              ['--space-2', '0.5rem',  '8px'],
              ['--space-3', '0.75rem', '12px'],
              ['--space-4', '1rem',    '16px'],
              ['--space-5', '1.5rem',  '24px'],
              ['--space-6', '2rem',    '32px'],
            ] as const).map(([name, val, px]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <div style={{
                  height: '6px', width: val,
                  background: 'var(--accent-dim)', border: '1px solid var(--accent)',
                  borderRadius: '2px', flexShrink: 0,
                }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {name} = {val} ({px})
                </span>
              </div>
            ))}
          </div>

          {/* 角丸 */}
          <div>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>角丸</p>
            {([
              ['--radius-sm', '3px'],
              ['--radius',    '5px'],
              ['--radius-lg', '8px'],
            ] as const).map(([name, val]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <div style={{
                  width: '2.5rem', height: '2.5rem',
                  background: 'var(--bg-input)', border: '1.5px solid var(--border-strong)',
                  borderRadius: val, flexShrink: 0,
                }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontFamily: 'monospace' }}>
                  {name} = {val}
                </span>
              </div>
            ))}
          </div>

          {/* フォントサイズ */}
          <div>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>フォントサイズ</p>
            {([
              ['--fs-xs',   '0.72rem', '見出しラベル・角注'],
              ['--fs-sm',   '0.82rem', 'メタ情報・補足'],
              ['--fs-base', '0.88rem', '本文・フォーム'],
              ['--fs-md',   '1rem',    'body基準'],
              ['--fs-lg',   '1.1rem',  'ビュータイトル'],
            ] as const).map(([name, val, desc]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: val, color: 'var(--text)', minWidth: '5rem', flexShrink: 0 }}>サンプル</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontFamily: 'monospace' }}>
                  {name}={val} — {desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. タイポグラフィ ─────────────────────────────────────── */}
      <section className="panel">
        <div className="panel__title">3. タイポグラフィ</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700 }}>ビュータイトル（fs-lg, 700）</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>パネルタイトル（0.95rem, 600）</div>
          <div style={{ fontSize: 'var(--fs-base)' }}>本文テキスト — Body text（fs-base = 0.88rem）</div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-dim)' }}>補足・メタ情報（fs-sm = 0.82rem, text-dim）</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-faint)' }}>角注・ラベル（fs-xs = 0.72rem, text-faint）</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ok)' }}>9,999 VR（metric value）</div>
          <div style={{ fontSize: '1.95rem', fontWeight: 800, color: 'white' }}>9,999（overlay value）</div>
        </div>
      </section>

      {/* ── 4. ボタン ────────────────────────────────────────────── */}
      <section className="panel">
        <div className="panel__title">4. ボタン</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="btn-row">
            <button className="btn">デフォルト</button>
            <button className="btn btn--primary">プライマリ</button>
            <button className="btn btn--danger">危険</button>
            <button className="btn btn--sm">小サイズ</button>
            <button className="btn" disabled>無効</button>
            <button className="btn btn--primary" disabled>無効(primary)</button>
          </div>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-faint)' }}>
            hover/focus 状態はブラウザで確認してください
          </p>
        </div>
      </section>

      {/* ── 5. フォーム要素 ───────────────────────────────────────── */}
      <section className="panel">
        <div className="panel__title">5. フォーム要素</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <div className="field">
              <label className="field__label">テキスト入力</label>
              <input className="input" placeholder="入力してください…" readOnly />
            </div>
            <div className="field">
              <label className="field__label">テキストエリア</label>
              <textarea className="input" rows={3} placeholder="複数行テキスト…" readOnly />
            </div>
          </div>
          <div>
            <div className="field">
              <label className="field__label">セグメントコントロール</label>
              <div className="seg">
                <button className="seg__btn seg__btn--on">VR</button>
                <button className="seg__btn">MMR</button>
                <button className="seg__btn">Auto</button>
              </div>
            </div>
            <div className="field">
              <label className="field__label">ステッパー</label>
              <div className="stepper">
                <button className="btn stepper__btn">−</button>
                <input className="input stepper__input" defaultValue={42} readOnly />
                <button className="btn stepper__btn">＋</button>
              </div>
            </div>
            <div className="toggle-row">
              <input type="checkbox" id="sg-chk" defaultChecked readOnly />
              <label htmlFor="sg-chk" style={{ fontSize: 'var(--fs-base)' }}>チェックボックス</label>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. タグ / バッジ ──────────────────────────────────────── */}
      <section className="panel">
        <div className="panel__title">6. タグ / バッジ</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <span className="tag tag--ranked">Ranked</span>
          <span className="tag tag--lounge">Lounge</span>
          <span className="tag tag--route">Route</span>
          <span className="tag tag--course">Course</span>
          <span className="tag tag--status-active">active</span>
          <span className="tag tag--status-completed">completed</span>
          <span className="tag tag--status-cancelled">cancelled</span>
          <span className="tag tag--pinned">pinned</span>
          <span className="tag tag--hidden">hidden</span>
          <span className="tag tag--mmr12">12試合</span>
          <span className="tag tag--mmr24">24試合</span>
          <span className="tag tag--account-active">アクティブ</span>
        </div>
      </section>

      {/* ── 7. 通知 ──────────────────────────────────────────────── */}
      <section className="panel">
        <div className="panel__title">7. 通知 / アラート</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="notice">通常の通知：情報や補足を表示します。</div>
          <div className="notice notice--warn">⚠ 警告：確認が必要な操作があります。</div>
          <div className="notice notice--error">✕ エラー：処理に失敗しました。再試行してください。</div>
        </div>
      </section>

      {/* ── 8. カード / パネル ────────────────────────────────────── */}
      <section className="panel">
        <div className="panel__title">8. カード / パネル / リスト</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>

          {/* メトリクスカード */}
          <div>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-faint)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>メトリクス</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[['9,999', 'VR'], ['42', 'セッション'], ['+120', '先週比'], ['1位', '最高順位']].map(([val, label]) => (
                <div key={label} className="dashboard__metric">
                  <div className="dashboard__metric-value">{val}</div>
                  <div className="dashboard__metric-label">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* セッションリスト */}
          <div>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-faint)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>セッションリスト</p>
            <ul className="session-list">
              {[
                { label: 'ランキング対戦', meta: '12レース', time: '14:30' },
                { label: 'ラウンジ 12試合', meta: '完了', time: '13:00' },
              ].map(s => (
                <li key={s.label} className="session-list__item">
                  <span style={{ fontSize: 'var(--fs-base)' }}>{s.label}</span>
                  <span className="session-list__meta">{s.meta}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)', marginLeft: 'auto' }}>{s.time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ステップインジケーター */}
          <div>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-faint)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ステップインジケーター</p>
            <nav className="step-indicator">
              <span className="step-indicator__step step-indicator__step--done">開始</span>
              <span className="step-indicator__step step-indicator__step--done">コース</span>
              <span className="step-indicator__step step-indicator__step--active">レース中</span>
              <span className="step-indicator__step">結果</span>
            </nav>
          </div>
        </div>
      </section>

      {/* ── 9. 変更案プレビュー ───────────────────────────────────── */}
      <section className="panel" style={{ borderColor: 'var(--accent)', background: 'rgba(91,139,240,0.04)' }}>
        <div className="panel__title" style={{ color: 'var(--accent)' }}>9. 変更案（検討中）</div>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-dim)', marginBottom: '1rem', lineHeight: 1.6 }}>
          以下は Step 3 で適用を検討している変更例です。現在のスタイルと比較してフィードバックをください。
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>

          {/* ボタン変更案 */}
          <div>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-faint)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ボタン — 余白・角丸を統一</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              {/* 現在 */}
              <button className="btn">現在</button>
              <button className="btn btn--primary">現在Primary</button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* 案: padding と radius を少し増やす */}
              <button style={{
                padding: '0.5rem 1rem', fontSize: '0.86rem', minHeight: '2.2rem',
                background: 'var(--bg-input)', color: 'var(--text)',
                border: '1px solid var(--border-strong)', borderRadius: '6px', cursor: 'pointer',
              }}>案A</button>
              <button style={{
                padding: '0.5rem 1rem', fontSize: '0.86rem', minHeight: '2.2rem',
                background: 'var(--accent)', border: '1px solid var(--accent)',
                color: '#0c1424', borderRadius: '6px', fontWeight: 600, cursor: 'pointer',
              }}>案A Primary</button>
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '0.35rem' }}>
              案A: padding + 1px, radius 6px（border-radius-lg相当）
            </p>
          </div>

          {/* パネル変更案 */}
          <div>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-faint)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>パネル — 角丸・padding 調整</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="panel" style={{ flex: 1, fontSize: 'var(--fs-sm)', color: 'var(--text-dim)' }}>
                <div className="panel__title">現在</div>
                padding 0.85rem, radius 6px
              </div>
              <div style={{
                flex: 1,
                background: 'var(--bg-panel)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '1rem',
                fontSize: 'var(--fs-sm)', color: 'var(--text-dim)',
              }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.6rem', color: 'var(--text)' }}>案B</div>
                padding 1rem, radius 8px
              </div>
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '0.35rem' }}>
              案B: 少し余裕のある padding と大きめの角丸
            </p>
          </div>

          {/* アクセントカラー変更案 */}
          <div>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-faint)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>アクセントカラー</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {([
                ['現在', '#5b8bf0'],
                ['案C', '#6495f5'],
                ['案D', '#7c5cfc'],
                ['案E', '#4fa8e8'],
              ] as const).map(([label, color]) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{
                    width: '2.5rem', height: '2.5rem',
                    background: color, borderRadius: '5px',
                    border: label === '現在' ? '2px solid white' : '1px solid var(--border-strong)',
                  }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>{label}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-faint)', fontFamily: 'monospace' }}>{color}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '0.35rem' }}>
              現在のまま維持でも OK。変えたい場合は案を選択してください。
            </p>
          </div>

        </div>
      </section>

      {/* ── 10. ナビゲーション ────────────────────────────────────── */}
      <section className="panel">
        <div className="panel__title">10. ナビゲーション</div>
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', background: 'var(--bg-input)', padding: '0.4rem', borderRadius: '5px' }}>
          {['Dashboard', 'Playing', 'VR', 'Lounge', 'Records'].map((label, i) => (
            <button key={label} className={`nav-btn${i === 0 ? ' nav-btn--active' : ''}`}>{label}</button>
          ))}
        </div>
      </section>

      {/* フッター */}
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-faint)', paddingBottom: '1rem', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--text-dim)' }}>確認後の次のステップ：</strong><br />
        ① 変更案の採否をフィードバック（「案Aのボタンにする」「アクセントは現在のまま」等）<br />
        ② Step 2: :root トークン整備 → Step 3: 共通クラスへ適用（全ビューへ波及） → Step 4: レスポンシブ改善<br />
        ③ このビューは確認後に NAV から外してよければ削除 / 残したければ残置
      </div>

    </div>
  )
}

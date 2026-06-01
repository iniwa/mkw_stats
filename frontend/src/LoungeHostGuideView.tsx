import { useState } from 'react'

type Mode = '12p' | '24p'
type CheckSection = { title: string; items: { id: string; label: string }[] }

const MODE_SUMMARY = {
  '12p': {
    com: 'No COM',
    startBasis: '12人全員が入室してから開始',
    missingStart: '不可（1人でも欠けた状態での開始はNG）',
    invalidRace: '10人未満でレースが開始した場合は無効',
    recommended: '初ホスト・ホスト進行に不慣れ・参加者が少なめ・判断を単純にしたい場合',
  },
  '24p': {
    com: 'Hard COM',
    startBasis: '基本は24人全員の入室を待つ',
    missingStart: '条件付きで可能（条件確認必須、迷う場合はroom threadで確認）',
    invalidRace: '20人未満かつ2つ以上のteamに欠員がある状態でレースが開始した場合は無効',
    recommended: '24p進行に慣れている・sub/reopen判断に慣れている・大人数を管理できる場合',
  },
} as const

function buildSections(mode: Mode): CheckSection[] {
  return [
    {
      title: 'キューに入る前',
      items: [
        { id: 'ch', label: '参加申請に /ch を含めた' },
        { id: 'noban', label: 'Hostbanned / Chat restricted / Media restricted の状態ではない' },
        { id: 'stream', label: '配信・録画画面にRoom IDが映らない状態' },
      ],
    },
    {
      title: 'Room ID投稿前',
      items: [
        { id: 'format', label: 'format / teams設定が確定している' },
        { id: 'uppercase', label: 'Room IDは大文字で投稿する' },
        { id: 'noleak', label: 'Room IDを参加者以外に渡していない' },
      ],
    },
    {
      title: '開始前',
      items: [
        { id: '150cc', label: '150cc' },
        { id: 'normalitems', label: 'Normal Items' },
        { id: 'noteams', label: 'No Teams' },
        { id: '12races', label: '12 Races' },
        { id: '10sec', label: 'Intermission 10 Seconds' },
        {
          id: 'com',
          label: mode === '12p' ? 'No COM（12p）' : 'Hard COM（24p）',
        },
        {
          id: 'startcond',
          label:
            mode === '12p'
              ? '12人全員が入室している'
              : '24人入室済み、または欠員時は開始条件を確認済み',
        },
      ],
    },
    {
      title: '進行中',
      items: [
        {
          id: 'threshold',
          label:
            mode === '12p'
              ? '10人未満でレースが始まっていない'
              : '無効条件（20人未満+2team以上に欠員）を満たしていない',
        },
        { id: 'reopen', label: '有効な接続エラーによるreopen要求がない' },
        { id: 'intruder', label: '非参加者が入室していない' },
        { id: 'screenshot', label: '必要なスクリーンショット・記録を残している' },
      ],
    },
  ]
}

const REOPEN_CASES = [
  '部屋設定を間違えた',
  '開始前または再開前に有効な接続エラーが発生した',
  '非参加者が入室した',
  '無効レース条件を満たした状態でレースが始まった',
  '部屋が閉じた',
  'ホスト交代要求が正当な場合（拒否すると -50 MMR & Strike 対象）',
]

export default function LoungeHostGuideView() {
  const [mode, setMode] = useState<Mode>('12p')
  const [checks, setChecks] = useState<Record<string, boolean>>({})

  function switchMode(m: Mode) {
    setMode(m)
    setChecks({})
  }

  function toggleCheck(id: string) {
    setChecks(c => ({ ...c, [id]: !c[id] }))
  }

  const summary = MODE_SUMMARY[mode]
  const sections = buildSections(mode)

  return (
    <div className="host-guide">
      <div>
        <h2 className="panel__title">ラウンジホストガイド</h2>
        <p className="hint">ホスト進行チェック用ガイド。12p FFA / 24p FFAを選んで使用してください。</p>
      </div>

      <div className="host-guide__mode">
        <span className="field__label">部屋タイプ</span>
        <div className="seg">
          <button
            className={`seg__btn${mode === '12p' ? ' seg__btn--on' : ''}`}
            onClick={() => switchMode('12p')}
          >
            12p FFA
          </button>
          <button
            className={`seg__btn${mode === '24p' ? ' seg__btn--on' : ''}`}
            onClick={() => switchMode('24p')}
          >
            24p FFA
          </button>
        </div>
      </div>

      <section className="panel">
        <h3 className="panel__title">{mode === '12p' ? '12p FFA' : '24p FFA'} — 概要</h3>
        <dl className="host-guide__dl">
          <div className="host-guide__dl-row">
            <dt className="host-guide__dt">COM</dt>
            <dd className="host-guide__dd">{summary.com}</dd>
          </div>
          <div className="host-guide__dl-row">
            <dt className="host-guide__dt">開始条件</dt>
            <dd className="host-guide__dd">{summary.startBasis}</dd>
          </div>
          <div className="host-guide__dl-row">
            <dt className="host-guide__dt">欠員開始</dt>
            <dd className="host-guide__dd">{summary.missingStart}</dd>
          </div>
          <div className="host-guide__dl-row">
            <dt className="host-guide__dt">無効レース</dt>
            <dd className="host-guide__dd">{summary.invalidRace}</dd>
          </div>
          <div className="host-guide__dl-row">
            <dt className="host-guide__dt">推奨場面</dt>
            <dd className="host-guide__dd">{summary.recommended}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <h3 className="panel__title">共通設定</h3>
        <div className="host-guide__settings">
          {(
            [
              { key: 'Class', val: '150cc' },
              { key: 'Teams', val: 'No Teams' },
              { key: 'Items', val: 'Normal Items' },
              { key: 'Race Count', val: '12 Races' },
              { key: 'Intermission', val: '10 Seconds' },
            ] as const
          ).map(row => (
            <div key={row.key} className="host-guide__setting-row">
              <span className="host-guide__setting-key">{row.key}</span>
              <span className="host-guide__setting-val">{row.val}</span>
            </div>
          ))}
          <div className="host-guide__setting-row">
            <span className="host-guide__setting-key">COM</span>
            <span className="host-guide__setting-val host-guide__setting-val--warn">
              {summary.com}
            </span>
          </div>
        </div>
        <p className="host-guide__com-warn">
          {mode === '12p'
            ? '12p は No COM 必須。Hard COM に設定しないこと。'
            : '24p は Hard COM 必須。No COM に設定しないこと。'}
        </p>
      </section>

      <section className="panel">
        <div className="host-guide__checklist-head">
          <h3 className="host-guide__checklist-heading">チェックリスト</h3>
          <button className="btn btn--sm" onClick={() => setChecks({})}>
            リセット
          </button>
        </div>
        {sections.map(sec => (
          <div key={sec.title} className="host-guide__checklist-section">
            <p className="host-guide__checklist-title">{sec.title}</p>
            <ul className="host-guide__checklist">
              {sec.items.map(item => (
                <li key={item.id} className="host-guide__checklist-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={!!checks[item.id]}
                      onChange={() => toggleCheck(item.id)}
                    />
                    <span>{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="panel">
        <h3 className="panel__title">Reopen・ホスト交代が必要になる主な場面</h3>
        <div className="warnbox">
          <p className="warnbox__head">以下の場合は部屋を開き直す可能性があります</p>
          <ul>
            {REOPEN_CASES.map(c => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </section>

      <p className="host-guide__source">
        このガイドは <code>lounge_host_note.md</code> をもとに構成しています。
      </p>
    </div>
  )
}

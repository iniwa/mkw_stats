import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  api,
  ApiError,
  type Course,
  type TimeAttackCategory,
  type TimeAttackRecord,
} from './api'

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function formatMs(ms: number | null): string {
  if (ms === null) return '-'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  const millis = ms % 1000
  return `${min}:${String(sec).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

export function parseTime(input: string): number | null | 'invalid' {
  const trimmed = input.trim()
  if (trimmed === '') return null
  const match = trimmed.match(/^(\d+):([0-5]\d)\.(\d{3})$/)
  if (!match) return 'invalid'
  const min = parseInt(match[1], 10)
  const sec = parseInt(match[2], 10)
  const millis = parseInt(match[3], 10)
  const total = min * 60000 + sec * 1000 + millis
  if (total <= 0) return 'invalid'
  return total
}

export function formatDiff(a: number | null, b: number | null): string {
  if (a === null || b === null) return '-'
  const d = a - b
  const s = d > 0 ? '+' : d < 0 ? '-' : ''
  return s + (Math.abs(d) / 1000).toFixed(3)
}

export function formatWrDiffPercent(
  personalBestMs: number | null,
  worldRecordMs: number | null,
): string {
  if (personalBestMs === null || worldRecordMs === null) return '-'
  const percent = ((worldRecordMs - personalBestMs) / worldRecordMs) * 100
  const rounded = Number(percent.toFixed(3))
  const sign = rounded > 0 ? '+' : ''
  return `${sign}${rounded.toFixed(3)}%`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DraftRow {
  pb: string
  wr: string
  target: string
  pbNote: string
  wrNote: string
  targetNote: string
}

interface RowUiState {
  expanded: boolean
  saving: boolean
  rowError: string | null
  fieldErrors: { pb?: boolean; wr?: boolean; target?: boolean }
  saved: boolean
}

type DraftMap = Record<string, DraftRow>
type UiMap = Record<string, RowUiState>
type RecordMap = Record<string, TimeAttackRecord>

function draftKey(courseId: string, category: TimeAttackCategory): string {
  return `${courseId}|${category}`
}

function initDraft(record: TimeAttackRecord | undefined): DraftRow {
  if (!record) {
    return { pb: '', wr: '', target: '', pbNote: '', wrNote: '', targetNote: '' }
  }
  return {
    pb: record.personal_best_ms !== null ? formatMs(record.personal_best_ms) : '',
    wr: record.world_record_ms !== null ? formatMs(record.world_record_ms) : '',
    target: record.target_time_ms !== null ? formatMs(record.target_time_ms) : '',
    pbNote: record.personal_best_note ?? '',
    wrNote: record.world_record_note ?? '',
    targetNote: record.target_note ?? '',
  }
}

function defaultUiState(): RowUiState {
  return { expanded: false, saving: false, rowError: null, fieldErrors: {}, saved: false }
}

function diffClass(diffStr: string): string {
  if (diffStr === '-') return 'ta__diff'
  if (diffStr.startsWith('+')) return 'ta__diff ta__diff--pos'
  if (diffStr.startsWith('-')) return 'ta__diff ta__diff--neg'
  return 'ta__diff ta__diff--zero'
}

function wrDiffPercentClass(diffStr: string): string {
  if (diffStr === '-') return 'ta__diff'
  if (diffStr.startsWith('-')) return 'ta__diff ta__diff--pos'
  if (diffStr.startsWith('+')) return 'ta__diff ta__diff--neg'
  return 'ta__diff ta__diff--zero'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TimeAttackView() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [courses, setCourses] = useState<Course[]>([])
  const [recordMap, setRecordMap] = useState<RecordMap>({})
  const [drafts, setDrafts] = useState<DraftMap>({})
  const [uiMap, setUiMap] = useState<UiMap>({})

  const [category, setCategory] = useState<TimeAttackCategory>('nita')

  // -------------------------------------------------------------------------
  // Load
  // -------------------------------------------------------------------------

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    Promise.all([api.getCourses(), api.getTimeAttackRecords()])
      .then(([allCourses, records]) => {
        const activeSorted = allCourses
          .filter(c => c.is_active)
          .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
        setCourses(activeSorted)

        const rmap: RecordMap = {}
        for (const rec of records) {
          rmap[draftKey(rec.course_id, rec.category)] = rec
        }
        setRecordMap(rmap)

        const dmap: DraftMap = {}
        const umap: UiMap = {}
        for (const c of activeSorted) {
          for (const cat of ['nita', 'item'] as TimeAttackCategory[]) {
            const key = draftKey(c.id, cat)
            dmap[key] = initDraft(rmap[key])
            umap[key] = defaultUiState()
          }
        }
        setDrafts(dmap)
        setUiMap(umap)
      })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // -------------------------------------------------------------------------
  // Draft helpers
  // -------------------------------------------------------------------------

  function updateDraft(courseId: string, cat: TimeAttackCategory, patch: Partial<DraftRow>) {
    const key = draftKey(courseId, cat)
    setDrafts(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function updateUi(courseId: string, cat: TimeAttackCategory, patch: Partial<RowUiState>) {
    const key = draftKey(courseId, cat)
    setUiMap(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function clearRowState(courseId: string, cat: TimeAttackCategory) {
    updateUi(courseId, cat, { rowError: null, saved: false })
  }

  // -------------------------------------------------------------------------
  // Summary (computed from current category drafts)
  // -------------------------------------------------------------------------

  const summary = useMemo(() => {
    let pbCount = 0, wrCount = 0, targetCount = 0, achievedCount = 0
    for (const c of courses) {
      const key = draftKey(c.id, category)
      const draft = drafts[key]
      if (!draft) continue
      const pb = parseTime(draft.pb)
      const wr = parseTime(draft.wr)
      const target = parseTime(draft.target)
      if (typeof pb === 'number') pbCount++
      if (typeof wr === 'number') wrCount++
      if (typeof target === 'number') targetCount++
      if (typeof pb === 'number' && typeof target === 'number' && pb <= target) achievedCount++
    }
    return { pbCount, wrCount, targetCount, achievedCount }
  }, [courses, drafts, category])

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  async function handleSave(courseId: string) {
    const key = draftKey(courseId, category)
    const draft = drafts[key]
    if (!draft) return

    const pbParsed = parseTime(draft.pb)
    const wrParsed = parseTime(draft.wr)
    const targetParsed = parseTime(draft.target)

    const pbInvalid = pbParsed === 'invalid'
    const wrInvalid = wrParsed === 'invalid'
    const targetInvalid = targetParsed === 'invalid'

    if (pbInvalid || wrInvalid || targetInvalid) {
      updateUi(courseId, category, {
        fieldErrors: { pb: pbInvalid, wr: wrInvalid, target: targetInvalid },
        rowError: 'タイム形式が不正です（m:ss.mmm）',
        saved: false,
      })
      return
    }

    updateUi(courseId, category, { saving: true, rowError: null, fieldErrors: {} })

    try {
      const body = {
        personal_best_ms: typeof pbParsed === 'number' ? pbParsed : null,
        world_record_ms: typeof wrParsed === 'number' ? wrParsed : null,
        target_time_ms: typeof targetParsed === 'number' ? targetParsed : null,
        personal_best_note: draft.pbNote.trim() || null,
        world_record_note: draft.wrNote.trim() || null,
        target_note: draft.targetNote.trim() || null,
      }
      const updated = await api.upsertTimeAttackRecord(courseId, category, body)

      setRecordMap(prev => ({ ...prev, [key]: updated }))
      setDrafts(prev => ({ ...prev, [key]: initDraft(updated) }))
      setUiMap(prev => ({ ...prev, [key]: { ...prev[key], saving: false, saved: true, rowError: null, fieldErrors: {} } }))
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : '保存に失敗しました'
      updateUi(courseId, category, { saving: false, rowError: msg })
    }
  }

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------

  if (loading) return <p className="placeholder">読み込み中...</p>

  if (loadError) {
    return (
      <div className="ta">
        <p className="notice notice--error">{loadError}</p>
        <div className="btn-row">
          <button className="btn btn--primary" onClick={load}>再試行</button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <div className="ta">
      <div className="ta__head">
        <span className="ta__title">タイムアタック</span>
        <div className="seg">
          <button
            className={`seg__btn${category === 'nita' ? ' seg__btn--on' : ''}`}
            onClick={() => setCategory('nita')}
          >
            NITA
          </button>
          <button
            className={`seg__btn${category === 'item' ? ' seg__btn--on' : ''}`}
            onClick={() => setCategory('item')}
          >
            アイテムあり
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="ta__summary">
        <div className="ta__metric">
          <div className="ta__metric-value">{summary.pbCount}</div>
          <div className="ta__metric-label">PB入力済み</div>
        </div>
        <div className="ta__metric">
          <div className="ta__metric-value">{summary.wrCount}</div>
          <div className="ta__metric-label">WR入力済み</div>
        </div>
        <div className="ta__metric">
          <div className="ta__metric-value">{summary.targetCount}</div>
          <div className="ta__metric-label">目標入力済み</div>
        </div>
        <div className="ta__metric">
          <div className="ta__metric-value">{summary.achievedCount}</div>
          <div className="ta__metric-label">目標達成</div>
        </div>
      </div>

      {/* Table */}
      <div className="ta__scroll">
        <table className="ta__table">
          <thead>
            <tr>
              <th>コース名</th>
              <th>自分PB</th>
              <th>WR</th>
              <th>目標タイム</th>
              <th>WR差分</th>
              <th>WR差分%</th>
              <th>目標差分</th>
              <th>メモ</th>
              <th>保存</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(course => {
              const key = draftKey(course.id, category)
              const draft = drafts[key] ?? { pb: '', wr: '', target: '', pbNote: '', wrNote: '', targetNote: '' }
              const ui = uiMap[key] ?? defaultUiState()

              const pbParsed = parseTime(draft.pb)
              const wrParsed = parseTime(draft.wr)
              const targetParsed = parseTime(draft.target)

              const pbNum = typeof pbParsed === 'number' ? pbParsed : null
              const wrNum = typeof wrParsed === 'number' ? wrParsed : null
              const targetNum = typeof targetParsed === 'number' ? targetParsed : null

              const wrDiff = formatDiff(pbNum, wrNum)
              const wrDiffPercent = formatWrDiffPercent(pbNum, wrNum)
              const targetDiff = formatDiff(pbNum, targetNum)

              return (
                <Fragment key={key}>
                  <tr>
                    <td>
                      <span className="ta__course-name" title={course.name_ja}>
                        {course.name_ja}
                      </span>
                    </td>
                    <td>
                      <input
                        className={`ta__time-input${ui.fieldErrors.pb ? ' ta__time-input--invalid' : ''}`}
                        value={draft.pb}
                        placeholder="m:ss.mmm"
                        onChange={e => {
                          updateDraft(course.id, category, { pb: e.target.value })
                          clearRowState(course.id, category)
                          if (ui.fieldErrors.pb) {
                            updateUi(course.id, category, { fieldErrors: { ...ui.fieldErrors, pb: false } })
                          }
                        }}
                      />
                      {ui.fieldErrors.pb && (
                        <div className="ta__field-error">形式: m:ss.mmm</div>
                      )}
                    </td>
                    <td>
                      <input
                        className={`ta__time-input${ui.fieldErrors.wr ? ' ta__time-input--invalid' : ''}`}
                        value={draft.wr}
                        placeholder="m:ss.mmm"
                        onChange={e => {
                          updateDraft(course.id, category, { wr: e.target.value })
                          clearRowState(course.id, category)
                          if (ui.fieldErrors.wr) {
                            updateUi(course.id, category, { fieldErrors: { ...ui.fieldErrors, wr: false } })
                          }
                        }}
                      />
                      {ui.fieldErrors.wr && (
                        <div className="ta__field-error">形式: m:ss.mmm</div>
                      )}
                    </td>
                    <td>
                      <input
                        className={`ta__time-input${ui.fieldErrors.target ? ' ta__time-input--invalid' : ''}`}
                        value={draft.target}
                        placeholder="m:ss.mmm"
                        onChange={e => {
                          updateDraft(course.id, category, { target: e.target.value })
                          clearRowState(course.id, category)
                          if (ui.fieldErrors.target) {
                            updateUi(course.id, category, { fieldErrors: { ...ui.fieldErrors, target: false } })
                          }
                        }}
                      />
                      {ui.fieldErrors.target && (
                        <div className="ta__field-error">形式: m:ss.mmm</div>
                      )}
                    </td>
                    <td>
                      <span className={diffClass(wrDiff)}>{wrDiff}</span>
                    </td>
                    <td>
                      <span className={wrDiffPercentClass(wrDiffPercent)}>{wrDiffPercent}</span>
                    </td>
                    <td>
                      <span className={diffClass(targetDiff)}>{targetDiff}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn--sm"
                        onClick={() => updateUi(course.id, category, { expanded: !ui.expanded })}
                      >
                        {ui.expanded ? '閉じる' : 'メモ'}
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn btn--primary btn--sm"
                        onClick={() => handleSave(course.id)}
                        disabled={ui.saving}
                      >
                        {ui.saving ? '保存中…' : '保存'}
                      </button>
                    </td>
                  </tr>
                  {(ui.rowError || ui.saved || ui.expanded) && (
                    <tr className="ta__row-status">
                      <td colSpan={9}>
                        {ui.rowError && (
                          <p className="notice notice--error" style={{ marginBottom: ui.expanded ? '0.5rem' : 0 }}>
                            {ui.rowError}
                          </p>
                        )}
                        {ui.saved && !ui.rowError && (
                          <span className="ta__saved">保存しました</span>
                        )}
                        {ui.expanded && (
                          <div className="ta__notes">
                            <div className="ta__notes-grid">
                              <div>
                                <label className="ta__notes-label">自分PBメモ</label>
                                <textarea
                                  className="ta__notes-textarea"
                                  value={draft.pbNote}
                                  onChange={e => {
                                    updateDraft(course.id, category, { pbNote: e.target.value })
                                    clearRowState(course.id, category)
                                  }}
                                  rows={3}
                                />
                              </div>
                              <div>
                                <label className="ta__notes-label">WRメモ</label>
                                <textarea
                                  className="ta__notes-textarea"
                                  value={draft.wrNote}
                                  onChange={e => {
                                    updateDraft(course.id, category, { wrNote: e.target.value })
                                    clearRowState(course.id, category)
                                  }}
                                  rows={3}
                                />
                              </div>
                              <div>
                                <label className="ta__notes-label">目標メモ</label>
                                <textarea
                                  className="ta__notes-textarea"
                                  value={draft.targetNote}
                                  onChange={e => {
                                    updateDraft(course.id, category, { targetNote: e.target.value })
                                    clearRowState(course.id, category)
                                  }}
                                  rows={3}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

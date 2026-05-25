import { useEffect, useMemo, useState } from 'react'
import {
  api,
  type AnnotationType,
  type Course,
  type CourseNote,
  type MapAnnotation,
  type MapAnnotationCreateBody,
  type MapAnnotationUpdateBody,
  type Route,
} from './api'

const ANNOTATION_TYPES: AnnotationType[] = ['pin', 'icon', 'arrow', 'text', 'area']

function annotationSortComparator(a: MapAnnotation, b: MapAnnotation): number {
  if (a.priority !== b.priority) return b.priority - a.priority
  const cmp = (a.label ?? '').localeCompare(b.label ?? '', 'ja')
  if (cmp !== 0) return cmp
  return a.id.localeCompare(b.id)
}

interface Props {
  routes: Route[]
  notes: CourseNote[]
  courseMap: Map<string, Course>
  selectedTargetType: 'course' | 'route'
  selectedTargetId: string
}

export default function AnnotationEditor({ routes, notes, courseMap, selectedTargetType, selectedTargetId }: Props) {
  const [annotations, setAnnotations] = useState<MapAnnotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createType, setCreateType] = useState<AnnotationType>('pin')
  const [createLabel, setCreateLabel] = useState('')
  const [createHoverText, setCreateHoverText] = useState('')
  const [createX, setCreateX] = useState('')
  const [createY, setCreateY] = useState('')
  const [createPriority, setCreatePriority] = useState(0)
  const [createNoteId, setCreateNoteId] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editType, setEditType] = useState<AnnotationType>('pin')
  const [editLabel, setEditLabel] = useState('')
  const [editHoverText, setEditHoverText] = useState('')
  const [editX, setEditX] = useState('')
  const [editY, setEditY] = useState('')
  const [editPriority, setEditPriority] = useState(0)
  const [editNoteId, setEditNoteId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getMapAnnotations()
      .then(data => setAnnotations([...data].sort(annotationSortComparator)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setEditingId(null)
    setCreateNoteId('')
  }, [selectedTargetType, selectedTargetId])

  const routeMap = useMemo(() => new Map(routes.map(r => [r.id, r])), [routes])

  function routeLabel(r: Route): string {
    if (r.name_ja) return r.name_ja
    const from = courseMap.get(r.from_course_id)?.name_ja ?? r.from_course_id
    const to = courseMap.get(r.to_course_id)?.name_ja ?? r.to_course_id
    return `${from} → ${to}`
  }

  function targetName(a: MapAnnotation): string {
    if (a.course_id) return courseMap.get(a.course_id)?.name_ja ?? a.course_id
    if (a.route_id) {
      const r = routeMap.get(a.route_id)
      return r ? routeLabel(r) : a.route_id
    }
    return '?'
  }

  const createNotesForTarget = useMemo(() => {
    if (!selectedTargetId) return []
    return notes.filter(
      n =>
        n.is_active &&
        (selectedTargetType === 'course'
          ? n.course_id === selectedTargetId
          : n.route_id === selectedTargetId),
    )
  }, [notes, selectedTargetType, selectedTargetId])

  const visibleAnnotations = useMemo(
    () =>
      annotations.filter(a =>
        selectedTargetType === 'course'
          ? a.course_id === selectedTargetId
          : a.route_id === selectedTargetId,
      ),
    [annotations, selectedTargetType, selectedTargetId],
  )

  const positioned = useMemo(
    () => visibleAnnotations.filter(a => a.x !== null && a.y !== null),
    [visibleAnnotations],
  )

  async function handleCreate() {
    if (!selectedTargetId) return
    setCreating(true)
    setCreateError(null)
    try {
      const body: MapAnnotationCreateBody =
        selectedTargetType === 'course'
          ? { course_id: selectedTargetId }
          : { route_id: selectedTargetId }
      body.type = createType
      if (createLabel) body.label = createLabel
      if (createHoverText) body.hover_text = createHoverText
      if (createX !== '') body.x = parseFloat(createX)
      if (createY !== '') body.y = parseFloat(createY)
      body.priority = createPriority
      if (createNoteId) body.note_id = createNoteId
      const ann = await api.createMapAnnotation(body)
      setAnnotations(prev => [...prev, ann].sort(annotationSortComparator))
      setCreateLabel('')
      setCreateHoverText('')
      setCreateX('')
      setCreateY('')
      setCreatePriority(0)
      setCreateNoteId('')
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : '作成に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  function startEdit(a: MapAnnotation) {
    setEditingId(a.id)
    setEditType(a.type)
    setEditLabel(a.label ?? '')
    setEditHoverText(a.hover_text ?? '')
    setEditX(a.x !== null ? String(a.x) : '')
    setEditY(a.y !== null ? String(a.y) : '')
    setEditPriority(a.priority)
    setEditNoteId(a.note_id ?? '')
    setSaveError(null)
  }

  async function handleSave(a: MapAnnotation) {
    setSaving(true)
    setSaveError(null)
    try {
      const body: MapAnnotationUpdateBody = {
        type: editType,
        label: editLabel || null,
        hover_text: editHoverText || null,
        x: editX !== '' ? parseFloat(editX) : null,
        y: editY !== '' ? parseFloat(editY) : null,
        priority: editPriority,
        note_id: editNoteId || null,
      }
      const updated = await api.updateMapAnnotation(a.id, body)
      setAnnotations(prev =>
        prev.map(item => (item.id === a.id ? updated : item)).sort(annotationSortComparator),
      )
      setEditingId(null)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteMapAnnotation(id)
      setAnnotations(prev => prev.filter(a => a.id !== id))
    } catch {
      // silently ignore
    }
  }

  if (loading) return <p className="placeholder">アノテーション読み込み中...</p>
  if (error) return <p className="notice notice--error">{error}</p>

  return (
    <div className="ann">
      <div className="notes__head">
        <span className="notes__title">マップアノテーション</span>
      </div>

      {!selectedTargetId ? (
        <p className="placeholder">コース/ルートを選択してください。</p>
      ) : (
        <>
          <div className="panel">
            <div className="panel__title">アノテーションを作成</div>
            <div className="field">
              <label className="field__label">タイプ</label>
              <select
                className="input"
                value={createType}
                onChange={e => setCreateType(e.target.value as AnnotationType)}
              >
                {ANNOTATION_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field__label">ラベル</label>
              <input
                className="input"
                value={createLabel}
                onChange={e => setCreateLabel(e.target.value)}
                placeholder="（省略可）"
              />
            </div>
            <div className="field">
              <label className="field__label">ホバーテキスト</label>
              <textarea
                className="input"
                rows={2}
                value={createHoverText}
                onChange={e => setCreateHoverText(e.target.value)}
                placeholder="（省略可）"
              />
            </div>
            <div className="ann__xy-row">
              <div className="ann__xy-field">
                <label className="field__label">X (0–1)</label>
                <input
                  type="number"
                  className="input ann__xy-input"
                  value={createX}
                  onChange={e => setCreateX(e.target.value)}
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="省略可"
                />
              </div>
              <div className="ann__xy-field">
                <label className="field__label">Y (0–1)</label>
                <input
                  type="number"
                  className="input ann__xy-input"
                  value={createY}
                  onChange={e => setCreateY(e.target.value)}
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="省略可"
                />
              </div>
              <div className="notes__priority-field">
                <label className="field__label">優先度</label>
                <input
                  type="number"
                  className="input notes__priority-input"
                  value={createPriority}
                  onChange={e => setCreatePriority(Number(e.target.value))}
                />
              </div>
            </div>
            {createNotesForTarget.length > 0 && (
              <div className="field">
                <label className="field__label">ノートリンク</label>
                <select
                  className="input"
                  value={createNoteId}
                  onChange={e => setCreateNoteId(e.target.value)}
                >
                  <option value="">-- なし --</option>
                  {createNotesForTarget.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.title ?? '(無題)'}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="btn-row">
              <button
                className="btn btn--primary"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? '作成中…' : '作成'}
              </button>
            </div>
            {createError && <p className="notice notice--error notes__msg">{createError}</p>}
          </div>

          {positioned.length > 0 && (
            <div className="panel">
              <div className="panel__title">プレビュー（正規化座標）</div>
              <div className="ann__preview">
                {positioned.map(a => (
                  <div
                    key={a.id}
                    className="ann__marker"
                    style={{
                      left: `${((a.x ?? 0) * 100).toFixed(1)}%`,
                      top: `${((a.y ?? 0) * 100).toFixed(1)}%`,
                    }}
                    title={a.hover_text ?? a.label ?? ''}
                  >
                    <span className="ann__marker-dot" />
                    {a.label && <span className="ann__marker-label">{a.label}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {visibleAnnotations.length === 0 ? (
            <p className="placeholder">このターゲットにアノテーションはありません。</p>
          ) : (
            <ul className="notes__list">
              {visibleAnnotations.map(a => {
                const isEditing = editingId === a.id
                const isRoute = a.route_id !== null
                const linkedNote = a.note_id ? notes.find(n => n.id === a.note_id) : null
                const editNotesForTarget = notes.filter(
                  n =>
                    n.is_active &&
                    (isRoute ? n.route_id === a.route_id : n.course_id === a.course_id),
                )
                return (
                  <li key={a.id} className="panel note-item">
                    {isEditing ? (
                      <div className="note-item__edit">
                        <div className="note-item__head">
                          <span className={`tag tag--${isRoute ? 'route' : 'course'}`}>
                            {isRoute ? 'ルート' : 'コース'}
                          </span>
                          <span className="note-item__target">{targetName(a)}</span>
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label className="field__label">タイプ</label>
                          <select
                            className="input"
                            value={editType}
                            onChange={e => setEditType(e.target.value as AnnotationType)}
                          >
                            {ANNOTATION_TYPES.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label className="field__label">ラベル</label>
                          <input
                            className="input"
                            value={editLabel}
                            onChange={e => setEditLabel(e.target.value)}
                          />
                        </div>
                        <div className="field" style={{ marginBottom: 0 }}>
                          <label className="field__label">ホバーテキスト</label>
                          <textarea
                            className="input"
                            rows={2}
                            value={editHoverText}
                            onChange={e => setEditHoverText(e.target.value)}
                          />
                        </div>
                        <div className="ann__xy-row">
                          <div className="ann__xy-field">
                            <label className="field__label">X (0–1)</label>
                            <input
                              type="number"
                              className="input ann__xy-input"
                              value={editX}
                              onChange={e => setEditX(e.target.value)}
                              step="0.01"
                              min="0"
                              max="1"
                            />
                          </div>
                          <div className="ann__xy-field">
                            <label className="field__label">Y (0–1)</label>
                            <input
                              type="number"
                              className="input ann__xy-input"
                              value={editY}
                              onChange={e => setEditY(e.target.value)}
                              step="0.01"
                              min="0"
                              max="1"
                            />
                          </div>
                          <div className="notes__priority-field">
                            <label className="field__label">優先度</label>
                            <input
                              type="number"
                              className="input notes__priority-input"
                              value={editPriority}
                              onChange={e => setEditPriority(Number(e.target.value))}
                            />
                          </div>
                        </div>
                        {editNotesForTarget.length > 0 && (
                          <div className="field" style={{ marginBottom: 0 }}>
                            <label className="field__label">ノートリンク</label>
                            <select
                              className="input"
                              value={editNoteId}
                              onChange={e => setEditNoteId(e.target.value)}
                            >
                              <option value="">-- なし --</option>
                              {editNotesForTarget.map(n => (
                                <option key={n.id} value={n.id}>
                                  {n.title ?? '(無題)'}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {saveError && <p className="notice notice--error">{saveError}</p>}
                        <div className="btn-row">
                          <button
                            className="btn btn--primary"
                            onClick={() => handleSave(a)}
                            disabled={saving}
                          >
                            {saving ? '保存中…' : '保存'}
                          </button>
                          <button className="btn" onClick={() => setEditingId(null)}>
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="note-item__head">
                          <span className={`tag tag--${isRoute ? 'route' : 'course'}`}>
                            {isRoute ? 'ルート' : 'コース'}
                          </span>
                          <span className="tag ann__type-tag">{a.type}</span>
                          <span className="note-item__target">{targetName(a)}</span>
                          <div className="note-item__actions">
                            <button className="btn note-item__btn" onClick={() => startEdit(a)}>
                              編集
                            </button>
                            <button
                              className="btn btn--danger note-item__btn"
                              onClick={() => handleDelete(a.id)}
                            >
                              削除
                            </button>
                          </div>
                        </div>
                        <div
                          className={`note-item__title${!a.label ? ' note-item__title--untitled' : ''}`}
                        >
                          {a.label ?? '(untitled)'}
                        </div>
                        <div className="ann__meta-row">
                          {a.x !== null && a.y !== null && (
                            <span className="ann__meta-item">
                              位置: ({a.x.toFixed(2)}, {a.y.toFixed(2)})
                            </span>
                          )}
                          {a.priority !== 0 && (
                            <span className="ann__meta-item">優先度: {a.priority}</span>
                          )}
                          {linkedNote && (
                            <span className="ann__meta-item">
                              ノート: {linkedNote.title ?? '(無題)'}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

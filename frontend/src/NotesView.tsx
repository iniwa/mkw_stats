import { useEffect, useMemo, useState } from 'react'
import {
  api,
  type Course,
  type CourseNote,
  type CourseNoteCreateBody,
  type CourseNoteUpdateBody,
  type Route,
} from './api'
import AnnotationEditor from './AnnotationEditor'
import { RouteDetail } from './RouteDetail'

type FilterType = 'all' | 'course' | 'route'
type TargetType = 'course' | 'route'

function noteSortComparator(a: CourseNote, b: CourseNote): number {
  if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
  if (a.priority !== b.priority) return b.priority - a.priority
  return b.created_at.localeCompare(a.created_at)
}

export default function NotesView() {
  const [courses, setCourses] = useState<Course[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [notes, setNotes] = useState<CourseNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')

  const [createTargetType, setCreateTargetType] = useState<TargetType>('course')
  const [createTargetId, setCreateTargetId] = useState('')
  const [createTitle, setCreateTitle] = useState('')
  const [createBody, setCreateBody] = useState('')
  const [createPinned, setCreatePinned] = useState(false)
  const [createPriority, setCreatePriority] = useState(0)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editPinned, setEditPinned] = useState(false)
  const [editPriority, setEditPriority] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.getCourses(), api.getRoutes(), api.getNotes()])
      .then(([c, r, n]) => {
        setCourses(c)
        setRoutes(r)
        setNotes(n)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses])
  const routeMap = useMemo(() => new Map(routes.map(r => [r.id, r])), [routes])

  function routeLabel(r: Route): string {
    if (r.name_ja) return r.name_ja
    const from = courseMap.get(r.from_course_id)?.name_ja ?? r.from_course_id
    const to = courseMap.get(r.to_course_id)?.name_ja ?? r.to_course_id
    return `${from} → ${to}`
  }

  function targetDisplayName(note: CourseNote): string {
    if (note.course_id) return courseMap.get(note.course_id)?.name_ja ?? note.course_id
    if (note.route_id) {
      const r = routeMap.get(note.route_id)
      return r ? routeLabel(r) : note.route_id
    }
    return '?'
  }

  const filteredNotes = useMemo(() => {
    if (filter === 'course') return notes.filter(n => n.course_id !== null)
    if (filter === 'route') return notes.filter(n => n.route_id !== null)
    return notes
  }, [notes, filter])

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.sort_order - b.sort_order),
    [courses],
  )

  const sortedRoutes = useMemo(
    () => [...routes].sort((a, b) => routeLabel(a).localeCompare(routeLabel(b), 'ja')),
    [routes, courseMap], // eslint-disable-line react-hooks/exhaustive-deps
  )

  function handleTargetTypeChange(type: TargetType) {
    setCreateTargetType(type)
    setCreateTargetId('')
  }

  async function handleCreate() {
    if (!createTargetId) return
    setCreating(true)
    setCreateError(null)
    try {
      const body: CourseNoteCreateBody =
        createTargetType === 'course'
          ? { course_id: createTargetId }
          : { route_id: createTargetId }
      if (createTitle) body.title = createTitle
      if (createBody) body.body_markdown = createBody
      body.is_pinned = createPinned
      body.priority = createPriority
      const note = await api.createNote(body)
      setNotes(prev => [...prev, note].sort(noteSortComparator))
      setCreateTitle('')
      setCreateBody('')
      setCreatePinned(false)
      setCreatePriority(0)
      setCreateTargetId('')
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : '作成に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  function startEdit(note: CourseNote) {
    setEditingId(note.id)
    setEditTitle(note.title ?? '')
    setEditBody(note.body_markdown ?? '')
    setEditPinned(note.is_pinned)
    setEditPriority(note.priority)
    setSaveError(null)
  }

  async function handleSave(id: string) {
    setSaving(true)
    setSaveError(null)
    try {
      const body: CourseNoteUpdateBody = {
        title: editTitle || null,
        body_markdown: editBody || null,
        is_pinned: editPinned,
        priority: editPriority,
      }
      const updated = await api.updateNote(id, body)
      setNotes(prev => prev.map(n => (n.id === id ? updated : n)).sort(noteSortComparator))
      setEditingId(null)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteNote(id)
      setNotes(prev => prev.filter(n => n.id !== id))
    } catch (e: unknown) {
      // silently ignore for MVP
    }
  }

  if (loading) return <p className="placeholder">読み込み中...</p>
  if (error) return <p className="notice notice--error">{error}</p>

  return (
    <div className="notes">
      <div className="notes__head">
        <span className="notes__title">コースノート</span>
        <div className="seg">
          {(['all', 'course', 'route'] as FilterType[]).map(f => (
            <button
              key={f}
              className={`seg__btn${filter === f ? ' seg__btn--on' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'すべて' : f === 'course' ? 'コース' : 'ルート'}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel__title">ノートを作成</div>
        <div className="field">
          <label className="field__label">対象タイプ</label>
          <div className="seg">
            <button
              className={`seg__btn${createTargetType === 'course' ? ' seg__btn--on' : ''}`}
              onClick={() => handleTargetTypeChange('course')}
            >
              コース
            </button>
            <button
              className={`seg__btn${createTargetType === 'route' ? ' seg__btn--on' : ''}`}
              onClick={() => handleTargetTypeChange('route')}
            >
              ルート
            </button>
          </div>
        </div>
        <div className="field">
          <label className="field__label">対象</label>
          <select
            className="input"
            value={createTargetId}
            onChange={e => setCreateTargetId(e.target.value)}
          >
            <option value="">-- 選択してください --</option>
            {createTargetType === 'course'
              ? sortedCourses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name_ja}
                  </option>
                ))
              : sortedRoutes.map(r => (
                  <option key={r.id} value={r.id}>
                    {routeLabel(r)}
                  </option>
                ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label">タイトル</label>
          <input
            className="input"
            value={createTitle}
            onChange={e => setCreateTitle(e.target.value)}
            placeholder="（省略可）"
          />
        </div>
        <div className="field">
          <label className="field__label">本文</label>
          <textarea
            className="input"
            rows={4}
            value={createBody}
            onChange={e => setCreateBody(e.target.value)}
            placeholder="（省略可）"
          />
        </div>
        <div className="notes__create-row">
          <div className="toggle-row">
            <input
              type="checkbox"
              id="create-pinned"
              checked={createPinned}
              onChange={e => setCreatePinned(e.target.checked)}
            />
            <label htmlFor="create-pinned">ピン留め</label>
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
        <div className="btn-row">
          <button
            className="btn btn--primary"
            onClick={handleCreate}
            disabled={!createTargetId || creating}
          >
            {creating ? '作成中…' : '作成'}
          </button>
        </div>
        {createError && (
          <p className="notice notice--error notes__msg">{createError}</p>
        )}
      </div>

      {filteredNotes.length === 0 ? (
        <p className="placeholder">ノートはありません。</p>
      ) : (
        <ul className="notes__list">
          {filteredNotes.map((note) => {
            const isEditing = editingId === note.id
            const routeForDetail = note.route_id ? (routeMap.get(note.route_id) ?? null) : null
            const isRoute = note.route_id !== null
            return (
              <li key={note.id} className="panel note-item">
                {isEditing ? (
                  <div className="note-item__edit">
                    <div className="note-item__head">
                      {note.is_pinned && <span className="tag tag--pinned">ピン</span>}
                      <span className={`tag tag--${isRoute ? 'route' : 'course'}`}>
                        {isRoute ? 'ルート' : 'コース'}
                      </span>
                      <span className="note-item__target">{targetDisplayName(note)}</span>
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label className="field__label">タイトル</label>
                      <input
                        className="input"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label className="field__label">本文</label>
                      <textarea
                        className="input"
                        rows={4}
                        value={editBody}
                        onChange={e => setEditBody(e.target.value)}
                      />
                    </div>
                    <div className="notes__create-row">
                      <div className="toggle-row">
                        <input
                          type="checkbox"
                          id={`edit-pinned-${note.id}`}
                          checked={editPinned}
                          onChange={e => setEditPinned(e.target.checked)}
                        />
                        <label htmlFor={`edit-pinned-${note.id}`}>ピン留め</label>
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
                    {saveError && <p className="notice notice--error">{saveError}</p>}
                    <div className="btn-row">
                      <button
                        className="btn btn--primary"
                        onClick={() => handleSave(note.id)}
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
                      {note.is_pinned && <span className="tag tag--pinned">ピン</span>}
                      <span className={`tag tag--${isRoute ? 'route' : 'course'}`}>
                        {isRoute ? 'ルート' : 'コース'}
                      </span>
                      <span className="note-item__target">{targetDisplayName(note)}</span>
                      <div className="note-item__actions">
                        <button
                          className="btn note-item__btn"
                          onClick={() => startEdit(note)}
                        >
                          編集
                        </button>
                        <button
                          className="btn btn--danger note-item__btn"
                          onClick={() => handleDelete(note.id)}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                    <div className={`note-item__title${!note.title ? ' note-item__title--untitled' : ''}`}>
                      {note.title ?? '(無題)'}
                    </div>
                    {note.body_markdown && (
                      <pre className="note-item__body">{note.body_markdown}</pre>
                    )}
                    {note.priority !== 0 && (
                      <div className="note-item__meta">優先度: {note.priority}</div>
                    )}
                    {routeForDetail && <RouteDetail route={routeForDetail} compact />}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <AnnotationEditor
        courses={courses}
        routes={routes}
        notes={notes}
        courseMap={courseMap}
      />
    </div>
  )
}

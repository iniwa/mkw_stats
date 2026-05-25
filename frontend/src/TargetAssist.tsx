import { useCallback, useEffect, useState } from 'react'
import { api, type CourseNote, type MapAnnotation } from './api'

function compareNotes(a: CourseNote, b: CourseNote): number {
  if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
  if (a.priority !== b.priority) return b.priority - a.priority
  return b.created_at.localeCompare(a.created_at)
}

function compareAnnotations(a: MapAnnotation, b: MapAnnotation): number {
  if (a.priority !== b.priority) return b.priority - a.priority
  const cmp = (a.label ?? '').localeCompare(b.label ?? '', 'ja')
  if (cmp !== 0) return cmp
  return a.id.localeCompare(b.id)
}

export function TargetAssist({
  kind,
  id,
  displayName,
}: {
  kind: 'course' | 'route'
  id: string
  displayName: string
}) {
  const [notes, setNotes] = useState<CourseNote[]>([])
  const [annotations, setAnnotations] = useState<MapAnnotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const filter = kind === 'course' ? { course_id: id } : { route_id: id }
    Promise.all([api.getNotes(filter), api.getMapAnnotations(filter)])
      .then(([n, a]) => {
        setNotes([...n].sort(compareNotes))
        setAnnotations([...a].sort(compareAnnotations))
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [kind, id])

  useEffect(() => { load() }, [load])

  if (loading) return <p className="target-assist__loading hint">ノート読み込み中…</p>

  if (error) {
    return (
      <div className="target-assist__error">
        <span className="notice notice--error">{error}</span>
        <button className="btn" onClick={load}>再試行</button>
      </div>
    )
  }

  if (notes.length === 0 && annotations.length === 0) {
    return <p className="target-assist__empty hint">ノート・アノテーションなし</p>
  }

  return (
    <div className="target-assist">
      <div className="target-assist__header">
        <span className={`tag tag--${kind}`}>{kind === 'course' ? '通常コース' : '道中コース'}</span>
        <span className="target-assist__title">{displayName} のメモ</span>
      </div>

      {notes.length > 0 && (
        <section className="target-assist__section">
          <div className="target-assist__section-label">ノート</div>
          <ul className="target-assist__list">
            {notes.map(note => (
              <li key={note.id} className="target-assist__note-item">
                <div className="target-assist__note-head">
                  {note.is_pinned && <span className="tag tag--pinned">ピン</span>}
                  <span className={`target-assist__note-title${!note.title ? ' target-assist__note-title--untitled' : ''}`}>
                    {note.title ?? '(無題)'}
                  </span>
                  {note.priority !== 0 && (
                    <span className="target-assist__meta">優先度&nbsp;{note.priority}</span>
                  )}
                </div>
                {note.body_markdown && (
                  <pre className="target-assist__note-body">{note.body_markdown}</pre>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {annotations.length > 0 && (
        <section className="target-assist__section">
          <div className="target-assist__section-label">アノテーション</div>
          <ul className="target-assist__list">
            {annotations.map(ann => {
              const linkedNote = ann.note_id ? notes.find(n => n.id === ann.note_id) : null
              return (
                <li key={ann.id} className="target-assist__ann-item">
                  <div className="target-assist__ann-head">
                    <span className="tag ann__type-tag">{ann.type}</span>
                    <span className={`target-assist__note-title${!ann.label ? ' target-assist__note-title--untitled' : ''}`}>
                      {ann.label ?? '(無題)'}
                    </span>
                    {ann.x !== null && ann.y !== null && (
                      <span className="target-assist__meta">
                        ({ann.x.toFixed(2)},&nbsp;{ann.y.toFixed(2)})
                      </span>
                    )}
                  </div>
                  {ann.hover_text && (
                    <div className="target-assist__hover-text">{ann.hover_text}</div>
                  )}
                  {linkedNote && (
                    <div className="target-assist__meta">→&nbsp;{linkedNote.title ?? '(無題)'}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

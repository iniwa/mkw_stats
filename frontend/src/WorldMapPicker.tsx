import { useEffect, useRef, useState } from 'react'
import { api, type MapPoint } from './api'

type SelectRole = 'from' | 'to'

function MarkerContent({ mp }: { mp: MapPoint }) {
  const [iconFailed, setIconFailed] = useState(!mp.course_id)

  useEffect(() => {
    setIconFailed(!mp.course_id)
  }, [mp.course_id])

  if (mp.course_id && !iconFailed) {
    return (
      <img
        src={`/assets/course-icons/${mp.course_id}.png`}
        alt=""
        className="wmp-marker__icon"
        onError={() => setIconFailed(true)}
      />
    )
  }

  return <span className="wmp-marker__text">{mp.label_ja.slice(0, 2)}</span>
}

export function WorldMapPicker({
  mapPoints,
  fromId,
  toId,
  onSelectFrom,
  onSelectTo,
  onMapPointUpdated,
}: {
  mapPoints: MapPoint[]
  fromId: string
  toId: string
  onSelectFrom: (id: string) => void
  onSelectTo: (id: string) => void
  onMapPointUpdated: (mp: MapPoint) => void
}) {
  const [mapFailed, setMapFailed] = useState(false)
  const [activeRole, setActiveRole] = useState<SelectRole>('from')
  const [calibrating, setCalibrating] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState(false)
  const mapWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fromId) setActiveRole('from')
  }, [fromId])

  if (mapFailed) return null

  const fromLabel = mapPoints.find(mp => mp.id === fromId)?.label_ja
  const toLabel = mapPoints.find(mp => mp.id === toId)?.label_ja

  const computeNormalized = (clientX: number, clientY: number) => {
    if (!mapWrapRef.current) return null
    const rect = mapWrapRef.current.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    }
  }

  const handleMarkerClick = (id: string) => {
    if (calibrating) return
    if (activeRole === 'from') {
      onSelectFrom(id)
      setActiveRole('to')
    } else {
      onSelectTo(id)
    }
  }

  const handlePointerDown = (e: React.PointerEvent, mp: MapPoint) => {
    if (!calibrating) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDraggingId(mp.id)
    setSaveError(false)
    const pos = computeNormalized(e.clientX, e.clientY)
    if (pos) setDragPos(pos)
  }

  const handlePointerMove = (e: React.PointerEvent, mp: MapPoint) => {
    if (!calibrating || draggingId !== mp.id) return
    const pos = computeNormalized(e.clientX, e.clientY)
    if (pos) setDragPos(pos)
  }

  const handlePointerUp = async (e: React.PointerEvent, mp: MapPoint) => {
    if (!calibrating || draggingId !== mp.id) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    const pos = dragPos
    setDraggingId(null)
    setDragPos(null)
    if (!pos) return
    if (Math.abs(pos.x - mp.x) < 0.005 && Math.abs(pos.y - mp.y) < 0.005) return
    setSavingId(mp.id)
    try {
      const updated = await api.updateMapPoint(mp.id, { x: pos.x, y: pos.y })
      onMapPointUpdated(updated)
    } catch {
      setSaveError(true)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="wmp">
      <div className="wmp__controls">
        {!calibrating ? (
          <>
            <button
              className={`wmp__role-btn${activeRole === 'from' ? ' wmp__role-btn--active' : ''}`}
              onClick={() => setActiveRole('from')}
            >
              <span className="wmp__role-label">出発</span>
              <span className={fromLabel ? 'wmp__role-name' : 'wmp__role-empty'}>
                {fromLabel ?? '未選択'}
              </span>
            </button>
            <span className="wmp__arrow">→</span>
            <button
              className={`wmp__role-btn${activeRole === 'to' ? ' wmp__role-btn--active' : ''}`}
              onClick={() => setActiveRole('to')}
            >
              <span className="wmp__role-label">到着</span>
              <span className={toLabel ? 'wmp__role-name' : 'wmp__role-empty'}>
                {toLabel ?? '未選択'}
              </span>
            </button>
            <button className="wmp__calib-btn" onClick={() => setCalibrating(true)}>
              ✎ 調整
            </button>
          </>
        ) : (
          <>
            <span className="wmp__calib-label">座標調整中 — ドラッグして保存</span>
            <button
              className="wmp__calib-btn wmp__calib-btn--exit"
              onClick={() => { setCalibrating(false); setSaveError(false) }}
            >
              完了
            </button>
          </>
        )}
      </div>
      {saveError && (
        <p className="wmp__save-error">座標の保存に失敗しました</p>
      )}
      <div className={`wmp__map-wrap${calibrating ? ' wmp__map-wrap--calib' : ''}`} ref={mapWrapRef}>
        <img
          className="wmp__map"
          src="/assets/maps/world.png"
          alt="ワールドマップ"
          onError={() => setMapFailed(true)}
        />
        {mapPoints.map(mp => {
          const isFrom = mp.id === fromId
          const isTo = mp.id === toId
          const isDragging = draggingId === mp.id
          const isSaving = savingId === mp.id
          const pos = isDragging && dragPos ? dragPos : { x: mp.x, y: mp.y }
          const classes = ['wmp-marker']
          if (isFrom) classes.push('wmp-marker--from')
          if (isTo) classes.push('wmp-marker--to')
          if (calibrating) classes.push('wmp-marker--calib')
          if (isDragging) classes.push('wmp-marker--dragging')
          if (isSaving) classes.push('wmp-marker--saving')

          return (
            <button
              key={mp.id}
              className={classes.join(' ')}
              style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
              onClick={() => handleMarkerClick(mp.id)}
              onPointerDown={e => handlePointerDown(e, mp)}
              onPointerMove={e => handlePointerMove(e, mp)}
              onPointerUp={e => { void handlePointerUp(e, mp) }}
              title={mp.label_ja}
              aria-label={mp.label_ja}
              aria-pressed={!calibrating && (isFrom || isTo)}
            >
              <MarkerContent mp={mp} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

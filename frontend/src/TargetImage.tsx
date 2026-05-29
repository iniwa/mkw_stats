import { useEffect, useState } from 'react'
import { annotationIconSrc } from './api'
import type { MapAnnotation } from './api'

interface ImageWithFallbackProps {
  src: string
  fallback?: string
  alt?: string
  className?: string
  rotate180?: boolean
}

function ImageWithFallback({ src, fallback, alt = '', className, rotate180 }: ImageWithFallbackProps) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setCurrentSrc(src)
    setFailed(false)
  }, [src, fallback])

  if (failed) return null
  return (
    <img
      className={className}
      style={rotate180 ? { transform: 'rotate(180deg)' } : undefined}
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (fallback && currentSrc !== fallback) {
          setCurrentSrc(fallback)
        } else {
          setFailed(true)
        }
      }}
    />
  )
}

function MarkerDotOrIcon({ a }: { a: MapAnnotation }) {
  const [iconFailed, setIconFailed] = useState(false)
  const showIcon = a.type === 'icon' && a.icon_type !== null && !iconFailed
  return showIcon ? (
    <img
      className="ann__marker-icon"
      src={annotationIconSrc(a.icon_type!)}
      alt={a.icon_type ?? ''}
      onError={() => setIconFailed(true)}
    />
  ) : (
    <span className="ann__marker-dot" />
  )
}

function Markers({ annotations }: { annotations?: MapAnnotation[] }) {
  const positioned = (annotations ?? []).filter(a => a.x !== null && a.y !== null)
  if (positioned.length === 0) return null
  return (
    <>
      {positioned.map(a => (
        <div
          key={a.id}
          className="target-marker"
          style={{ left: `${(a.x ?? 0) * 100}%`, top: `${(a.y ?? 0) * 100}%` }}
          title={a.hover_text ?? a.label ?? ''}
        >
          <MarkerDotOrIcon a={a} />
          {a.label && <span className="ann__marker-label">{a.label}</span>}
        </div>
      ))}
    </>
  )
}

function WithMarkers({
  annotations,
  children,
}: {
  annotations?: MapAnnotation[]
  children: React.ReactNode
}) {
  const hasMarkers = (annotations ?? []).some(a => a.x !== null && a.y !== null)
  if (!hasMarkers) return <>{children}</>
  return (
    <div className="target-image-with-markers">
      {children}
      <Markers annotations={annotations} />
    </div>
  )
}

interface TargetImageProps {
  kind: 'course' | 'route'
  id: string
  fallbackCourseId?: string
  /** Fallback course for the goal image; defaults to fallbackCourseId if omitted. */
  goalFallbackCourseId?: string
  isThreeLap?: boolean
  goalReverse?: boolean
  annotations?: MapAnnotation[]
}

export function TargetImage({
  kind,
  id,
  fallbackCourseId,
  goalFallbackCourseId,
  isThreeLap,
  goalReverse,
  annotations,
}: TargetImageProps) {
  if (kind === 'course') {
    return (
      <WithMarkers annotations={annotations}>
        <ImageWithFallback src={`/assets/courses/${id}.png`} className="route-image" />
      </WithMarkers>
    )
  }

  // Split annotations by image side so markers land on the correct image.
  const midAnnotations = (annotations ?? []).filter(a => !a.is_goal_image)
  const goalAnnotations = (annotations ?? []).filter(a => a.is_goal_image)

  const goalFallback =
    goalFallbackCourseId
      ? `/assets/courses/${goalFallbackCourseId}.png`
      : fallbackCourseId
        ? `/assets/courses/${fallbackCourseId}.png`
        : undefined

  const goalImg = (
    <WithMarkers annotations={goalAnnotations}>
      <ImageWithFallback
        src={`/assets/routes/${id}_goal.png`}
        fallback={goalFallback}
        className="route-image"
        alt="最後のコース1周"
        rotate180={goalReverse}
      />
    </WithMarkers>
  )

  if (isThreeLap) {
    return (
      <div className="route-image-pair">
        {goalImg}
      </div>
    )
  }

  return (
    <div className="route-image-pair">
      <WithMarkers annotations={midAnnotations}>
        <ImageWithFallback
          src={`/assets/routes/${id}.png`}
          fallback={fallbackCourseId ? `/assets/courses/${fallbackCourseId}.png` : undefined}
          className="route-image"
          alt="道中の道"
        />
      </WithMarkers>
      {goalImg}
    </div>
  )
}

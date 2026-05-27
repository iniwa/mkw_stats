import { useEffect, useState } from 'react'

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

interface TargetImageProps {
  kind: 'course' | 'route'
  id: string
  fallbackCourseId?: string
  isThreeLap?: boolean
  goalReverse?: boolean
}

export function TargetImage({ kind, id, fallbackCourseId, isThreeLap, goalReverse }: TargetImageProps) {
  if (kind === 'course') {
    return <ImageWithFallback src={`/assets/courses/${id}.png`} className="route-image" />
  }

  const courseFallback = fallbackCourseId ? `/assets/courses/${fallbackCourseId}.png` : undefined
  const goalImg = (
    <ImageWithFallback
      src={`/assets/routes/${id}_goal.png`}
      fallback={courseFallback}
      className="route-image"
      alt="最後のコース1周"
      rotate180={goalReverse}
    />
  )

  if (isThreeLap) {
    return <div className="route-image-pair">{goalImg}</div>
  }

  return (
    <div className="route-image-pair">
      <ImageWithFallback
        src={`/assets/routes/${id}.png`}
        fallback={courseFallback}
        className="route-image"
        alt="道中の道"
      />
      {goalImg}
    </div>
  )
}

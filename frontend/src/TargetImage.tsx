import { useEffect, useState } from 'react'

export function TargetImage({ kind, id }: { kind: 'course' | 'route'; id: string }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [kind, id])

  if (failed) return null
  const src = kind === 'course' ? `/assets/courses/${id}.png` : `/assets/routes/${id}.png`
  return (
    <img
      className="route-image"
      src={src}
      alt=""
      onError={() => setFailed(true)}
    />
  )
}

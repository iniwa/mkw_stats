import { useEffect, useState } from 'react'

export function RouteImage({ routeId }: { routeId: string }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [routeId])

  if (failed) return null
  return (
    <img
      className="route-image"
      src={`/assets/routes/${routeId}.png`}
      alt=""
      onError={() => setFailed(true)}
    />
  )
}

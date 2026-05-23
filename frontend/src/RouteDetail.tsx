import { type Route } from './api'

function getRouteTags(route: Route | null | undefined): Record<string, unknown> | null {
  if (!route?.tags || Array.isArray(route.tags)) return null
  return route.tags as Record<string, unknown>
}

function stringTag(tags: Record<string, unknown> | null, key: string): string | null {
  if (!tags) return null
  const v = tags[key]
  return typeof v === 'string' && v ? v : null
}

function numberTag(tags: Record<string, unknown> | null, key: string): number | null {
  if (!tags) return null
  const v = tags[key]
  return typeof v === 'number' ? v : null
}

function stringArrayTag(tags: Record<string, unknown> | null, key: string): string[] | null {
  if (!tags) return null
  const v = tags[key]
  if (!Array.isArray(v) || v.length === 0) return null
  const filtered = v.filter((x): x is string => typeof x === 'string')
  return filtered.length > 0 ? filtered : null
}

function urlTag(tags: Record<string, unknown> | null, key: string): string | null {
  const value = stringTag(tags, key)
  if (!value) return null
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? value : null
  } catch {
    return null
  }
}

export function RouteDetail({ route, compact = false }: { route: Route; compact?: boolean }) {
  const tags = getRouteTags(route)
  const sections = numberTag(tags, 'sections')
  const goalSimple = stringTag(tags, 'goal_simple')
  const goalShape = stringTag(tags, 'goal_shape')
  const gimmicks = stringArrayTag(tags, 'gimmicks')
  const sourceKey = stringTag(tags, 'source_key')
  const imageUrl = urlTag(tags, 'image_url')

  if (sections === null && !goalSimple && !goalShape && !gimmicks && !sourceKey && !imageUrl) {
    return null
  }

  return (
    <div className={`route-detail${compact ? ' route-detail--compact' : ''}`}>
      {sections !== null && (
        <div className="route-detail__row">
          <span className="route-detail__label">セクション</span>
          <span className="route-detail__text">{sections}</span>
        </div>
      )}
      {goalSimple && (
        <div className="route-detail__row">
          <span className="route-detail__label">ゴール</span>
          <span className="route-detail__text">{goalSimple}</span>
        </div>
      )}
      {goalShape && (
        <div className="route-detail__row">
          <span className="route-detail__label">ルート形状</span>
          <span className="route-detail__text route-detail__text--pre">{goalShape}</span>
        </div>
      )}
      {gimmicks && (
        <div className="route-detail__row">
          <span className="route-detail__label">ギミック</span>
          <span className="route-detail__chips">
            {gimmicks.map(g => (
              <span key={g} className="route-detail__chip">{g}</span>
            ))}
          </span>
        </div>
      )}
      {sourceKey && (
        <div className="route-detail__row">
          <span className="route-detail__label">参照</span>
          <span className="route-detail__text">{sourceKey}</span>
        </div>
      )}
      {imageUrl && (
        <div className="route-detail__row">
          <a className="route-detail__link" href={imageUrl} target="_blank" rel="noreferrer">
            参考画像を開く
          </a>
        </div>
      )}
    </div>
  )
}

export function fmtTime(iso: string | null, style: 'default' | 'record' = 'default'): string {
  if (!iso) return '\u2014'
  const date = new Date(iso)
  if (style === 'record') {
    return date.toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtValue(value: number | null): string {
  return value == null ? '\u2014' : value.toLocaleString()
}
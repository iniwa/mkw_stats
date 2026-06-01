import { useState } from 'react'

const TABLES = [
  { key: '24p', label: '24人部屋', src: '/assets/items/item-table-24p.png' },
  { key: '12p', label: '12人部屋', src: '/assets/items/item-table-12p.png' },
  { key: 'extra', label: '追加出現アイテム', src: '/assets/items/item-table-extra.png' },
] as const

function ItemImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <p className="hint">画像を読み込めませんでした。</p>
  return (
    <img
      className="items-view__image"
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  )
}

export default function ItemTablesView() {
  return (
    <div className="items-view">
      <div>
        <h2 className="panel__title">アイテムテーブル</h2>
        <p className="items-view__source">
          v1.6.0以降の順位別アイテム表 &mdash;{' '}
          <a
            href="https://japan-mk.blog.jp/mkworld.item-1"
            target="_blank"
            rel="noopener noreferrer"
          >
            出典
          </a>
        </p>
      </div>
      {TABLES.map(t => (
        <section key={t.key} className="items-view__section panel">
          <h3 className="panel__title">{t.label}</h3>
          <ItemImage src={t.src} alt={`${t.label} アイテムテーブル`} />
        </section>
      ))}
    </div>
  )
}

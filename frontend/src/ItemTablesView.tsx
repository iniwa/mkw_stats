import { useState } from 'react'
import {
  ITEM_TABLE_EXTRA,
  ITEM_TABLE_PHASES,
  ITEM_TABLE_SOURCE,
  ITEM_TABLE_SOURCE_REVISION,
  ITEM_TABLE_VERSION,
} from './itemTables'

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
          {ITEM_TABLE_VERSION}（出典更新: {ITEM_TABLE_SOURCE_REVISION}） / 12人・24人の順位を併記 /{' '}
          <a href={ITEM_TABLE_SOURCE} target="_blank" rel="noopener noreferrer">出典</a>
        </p>
        <p className="hint">
          コミュニティ調査に基づく目安です。確率・距離条件は未確定で、時刻は概算です。
          約26秒以降もアイテムごとに解禁条件があります。
        </p>
      </div>
      {ITEM_TABLE_PHASES.map(phase => (
        <section key={phase.key} className="items-view__section panel">
          <h3 className="panel__title">{phase.label}</h3>
          <p className="hint">{phase.description}</p>
          <ItemImage src={phase.src} alt={`${phase.label} アイテムテーブル（12人・24人）`} />
        </section>
      ))}
      <section className="items-view__section panel">
        <h3 className="panel__title">{ITEM_TABLE_EXTRA.label}</h3>
        <p className="hint">条件付きで追加出現するアイテム（確率表ではありません）。</p>
        <ItemImage src={ITEM_TABLE_EXTRA.src} alt="追加出現アイテム" />
      </section>
    </div>
  )
}

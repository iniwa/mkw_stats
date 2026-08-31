export type ItemTablePhase = 'start-00-21s' | 'start-21-26s' | 'after-26s'

export const ITEM_TABLE_SOURCE = 'https://japan-mk.blog.jp/mkworld.item-1'
export const ITEM_TABLE_VERSION = 'v1.7.0'
export const ITEM_TABLE_SOURCE_REVISION = '2026-07-04'

export const ITEM_TABLE_PHASES: ReadonlyArray<{
  key: ItemTablePhase
  label: string
  description: string
  src: string
}> = [
  {
    key: 'start-00-21s',
    label: '開始〜約21秒',
    description: 'レース開始から約21秒まで',
    src: '/assets/items/item-table-v1.7.0-start-00-21s.png',
  },
  {
    key: 'start-21-26s',
    label: '約21〜26秒',
    description: '約21秒から約26秒まで',
    src: '/assets/items/item-table-v1.7.0-start-21-26s.png',
  },
  {
    key: 'after-26s',
    label: '約26秒以降',
    description: '約26秒以降（アイテムごとに解禁条件あり）。金キノコは約30秒、雷は約40秒からの目安。カメック・トゲゾーこうらの初期解禁時期は調査中。',
    src: '/assets/items/item-table-v1.7.0-after-26s.png',
  },
]

export const ITEM_TABLE_EXTRA = {
  label: '追加出現アイテム',
  src: '/assets/items/item-table-extra.png',
} as const

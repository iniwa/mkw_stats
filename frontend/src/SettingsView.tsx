import { useEffect, useRef, useState } from 'react'
import { api, ApiError, Settings, VrAccount, VrAccountCreateBody, VrAccountUpdateBody } from './api'

const OVERLAY_URLS = [
  { label: 'VR / 透過 / compact', path: '/?view=overlay&mode=vr&compact=1' },
  { label: 'VR / 背景あり / compact', path: '/?view=overlay&mode=vr&compact=1&bg=solid' },
  { label: 'Lounge MMR / 背景あり / compact', path: '/?view=overlay&mode=mmr&compact=1&bg=solid' },
  { label: '自動切替 / 透過 / compact', path: '/?view=overlay&mode=auto&compact=1' },
] as const

interface EditDraft {
  display_name: string
  initial_vr: string
  current_vr: string
  sort_order: string
}

interface CreateDraft {
  name: string
  display_name: string
  initial_vr: string
  current_vr: string
}

const EMPTY_CREATE: CreateDraft = { name: '', display_name: '', initial_vr: '0', current_vr: '' }

function toEditDraft(a: VrAccount): EditDraft {
  return {
    display_name: a.display_name,
    initial_vr: String(a.initial_vr),
    current_vr: String(a.current_vr),
    sort_order: String(a.sort_order),
  }
}

export default function SettingsView() {
  const [accounts, setAccounts] = useState<VrAccount[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createDraft, setCreateDraft] = useState<CreateDraft>(EMPTY_CREATE)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const baseUrl = window.location.origin

  const [loungeDraft, setLoungeDraft] = useState({
    lounge_player_id: '',
    lounge_auto_sync: false,
    lounge_season: '2',
  })
  const [loungeSuccess, setLoungeSuccess] = useState(false)

  const isBusy = (key: string) => busy.has(key)
  const mark = (key: string, on: boolean) =>
    setBusy(prev => { const s = new Set(prev); on ? s.add(key) : s.delete(key); return s })

  async function load() {
    mark('load', true)
    setError(null)
    try {
      const [accs, sett] = await Promise.all([api.getVrAccounts(), api.getSettings()])
      setAccounts(accs)
      setSettings(sett)
      setLoungeDraft({
        lounge_player_id: sett.lounge_player_id ?? '',
        lounge_auto_sync: sett.lounge_auto_sync,
        lounge_season: String(sett.lounge_season),
      })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '読み込みに失敗しました')
    } finally {
      mark('load', false)
    }
  }

  async function refresh() {
    try {
      const [accs, sett] = await Promise.all([api.getVrAccounts(), api.getSettings()])
      setAccounts(accs)
      setSettings(sett)
    } catch {
      /* silent refresh failure — keep current data */
    }
  }

  useEffect(() => { load() }, [])

  function startEdit(a: VrAccount) {
    setEditingId(a.id)
    setEditDraft(toEditDraft(a))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft(null)
  }

  async function saveEdit(id: string) {
    if (!editDraft) return
    mark(`edit-${id}`, true)
    setError(null)
    try {
      const body: VrAccountUpdateBody = {
        display_name: editDraft.display_name,
        initial_vr: parseInt(editDraft.initial_vr, 10),
        current_vr: parseInt(editDraft.current_vr, 10),
        sort_order: parseInt(editDraft.sort_order, 10),
      }
      await api.updateVrAccount(id, body)
      cancelEdit()
      await refresh()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '保存に失敗しました')
    } finally {
      mark(`edit-${id}`, false)
    }
  }

  async function activate(id: string) {
    mark(`activate-${id}`, true)
    setError(null)
    try {
      await api.activateVrAccount(id)
      await refresh()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '有効化に失敗しました')
    } finally {
      mark(`activate-${id}`, false)
    }
  }

  async function deleteAccount(id: string) {
    mark(`delete-${id}`, true)
    setError(null)
    try {
      await api.deleteVrAccount(id)
      await refresh()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '削除に失敗しました')
    } finally {
      mark(`delete-${id}`, false)
    }
  }

  async function createAccount() {
    mark('create', true)
    setError(null)
    try {
      const body: VrAccountCreateBody = {
        name: createDraft.name,
        display_name: createDraft.display_name,
        initial_vr: parseInt(createDraft.initial_vr, 10),
        ...(createDraft.current_vr !== '' && { current_vr: parseInt(createDraft.current_vr, 10) }),
      }
      await api.createVrAccount(body)
      setCreateDraft(EMPTY_CREATE)
      setShowCreate(false)
      await refresh()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '作成に失敗しました')
    } finally {
      mark('create', false)
    }
  }

  async function handleCopy(key: string, url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 2000)
    } catch {
      const input = inputRefs.current[key]
      if (input) { input.focus(); input.select() }
    }
  }

  async function saveLounge() {
    mark('lounge', true)
    setError(null)
    setLoungeSuccess(false)
    try {
      await api.updateSettings({
        lounge_player_id: loungeDraft.lounge_player_id || null,
        lounge_auto_sync: loungeDraft.lounge_auto_sync,
        lounge_season: parseInt(loungeDraft.lounge_season, 10) || 2,
      })
      setLoungeSuccess(true)
      await refresh()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '保存に失敗しました')
    } finally {
      mark('lounge', false)
    }
  }

  const loading = isBusy('load')

  return (
    <div className="settings">
      <div className="settings__head">
        <span className="settings__title">設定</span>
        <button className="btn" onClick={load} disabled={loading}>
          {loading ? '読み込み中…' : '再読み込み'}
        </button>
      </div>

      {error && <div className="notice notice--error">{error}</div>}

      {/* VR Accounts */}
      <div className="panel">
        <div className="panel__title">VR アカウント</div>
        {accounts.length === 0 && !loading && (
          <p className="settings__empty">アカウントがありません。</p>
        )}
        <ul className="account-list">
          {accounts.map(a => (
            <li key={a.id} className={`account-item${a.is_active ? ' account-item--active' : ''}`}>
              <div className="account-item__row">
                <div className="account-item__info">
                  <span className="account-item__display-name">{a.display_name}</span>
                  <span className="account-item__name">({a.name})</span>
                  {a.is_active && <span className="tag tag--account-active">有効</span>}
                  <span className="account-item__vr">VR {a.current_vr} / 初期 {a.initial_vr} / 順 {a.sort_order}</span>
                </div>
                <div className="account-item__actions">
                  {!a.is_active && (
                    <button
                      className="btn btn--primary"
                      onClick={() => activate(a.id)}
                      disabled={isBusy(`activate-${a.id}`)}
                    >
                      有効化
                    </button>
                  )}
                  <button
                    className="btn"
                    onClick={() => editingId === a.id ? cancelEdit() : startEdit(a)}
                    disabled={isBusy(`edit-${a.id}`)}
                  >
                    {editingId === a.id ? 'キャンセル' : '編集'}
                  </button>
                  <button
                    className="btn btn--danger"
                    onClick={() => deleteAccount(a.id)}
                    disabled={a.is_active || isBusy(`delete-${a.id}`)}
                    title={a.is_active ? '有効なアカウントは削除できません' : undefined}
                  >
                    削除
                  </button>
                </div>
              </div>

              {editingId === a.id && editDraft && (
                <div className="account-item__edit">
                  <div className="field">
                    <label className="field__label">表示名</label>
                    <input
                      className="input"
                      value={editDraft.display_name}
                      onChange={e => setEditDraft({ ...editDraft, display_name: e.target.value })}
                    />
                  </div>
                  <div className="account-item__edit-row">
                    <div className="field">
                      <label className="field__label">初期 VR</label>
                      <input
                        className="input"
                        type="number"
                        value={editDraft.initial_vr}
                        onChange={e => setEditDraft({ ...editDraft, initial_vr: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label className="field__label">現在 VR</label>
                      <input
                        className="input"
                        type="number"
                        value={editDraft.current_vr}
                        onChange={e => setEditDraft({ ...editDraft, current_vr: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label className="field__label">並び順</label>
                      <input
                        className="input"
                        type="number"
                        value={editDraft.sort_order}
                        onChange={e => setEditDraft({ ...editDraft, sort_order: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="btn-row">
                    <button
                      className="btn btn--primary"
                      onClick={() => saveEdit(a.id)}
                      disabled={isBusy(`edit-${a.id}`)}
                    >
                      {isBusy(`edit-${a.id}`) ? '保存中…' : '保存'}
                    </button>
                    <button className="btn" onClick={cancelEdit}>キャンセル</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        {!showCreate ? (
          <button
            className="btn"
            style={{ marginTop: '0.75rem' }}
            onClick={() => setShowCreate(true)}
          >
            + 新規アカウント
          </button>
        ) : (
          <div className="create-form">
            <div className="create-form__title">新規アカウント作成</div>
            <div className="create-form__grid">
              <div className="field">
                <label className="field__label">内部名 (name)</label>
                <input
                  className="input"
                  placeholder="my_account"
                  value={createDraft.name}
                  onChange={e => setCreateDraft({ ...createDraft, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field__label">表示名</label>
                <input
                  className="input"
                  placeholder="プレイヤー名"
                  value={createDraft.display_name}
                  onChange={e => setCreateDraft({ ...createDraft, display_name: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field__label">初期 VR</label>
                <input
                  className="input"
                  type="number"
                  value={createDraft.initial_vr}
                  onChange={e => setCreateDraft({ ...createDraft, initial_vr: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field__label">現在 VR（省略時は初期 VR）</label>
                <input
                  className="input"
                  type="number"
                  placeholder="省略可"
                  value={createDraft.current_vr}
                  onChange={e => setCreateDraft({ ...createDraft, current_vr: e.target.value })}
                />
              </div>
            </div>
            <div className="btn-row">
              <button
                className="btn btn--primary"
                onClick={createAccount}
                disabled={isBusy('create') || !createDraft.name || !createDraft.display_name}
              >
                {isBusy('create') ? '作成中…' : '作成'}
              </button>
              <button
                className="btn"
                onClick={() => { setShowCreate(false); setCreateDraft(EMPTY_CREATE) }}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lounge Settings */}
      <div className="panel">
        <div className="panel__title">ラウンジ設定</div>
        {settings === null && !loading && (
          <p className="settings__empty">設定を読み込めませんでした。</p>
        )}
        <div className="lounge-form">
          <div className="field">
            <label className="field__label">ラウンジプレイヤー ID</label>
            <input
              className="input"
              value={loungeDraft.lounge_player_id}
              placeholder="未設定"
              onChange={e => {
                setLoungeDraft({ ...loungeDraft, lounge_player_id: e.target.value })
                setLoungeSuccess(false)
              }}
            />
            <p className="field__hint">MKCentral ID（数値）推奨。プレイヤー名でも検索できます。</p>
          </div>
          <div className="field">
            <label className="field__label">シーズン</label>
            <input
              className="input"
              type="number"
              min="1"
              value={loungeDraft.lounge_season}
              onChange={e => {
                setLoungeDraft({ ...loungeDraft, lounge_season: e.target.value })
                setLoungeSuccess(false)
              }}
            />
          </div>
          <div className="field">
            <label className="field__label">ゲームモード</label>
            <p className="field__hint">12人 / 24人のゲームモードは Lounge セッションの参加人数から自動的に決まります（12人: mkworld、24人 シーズン2以降: mkworld24p）。</p>
          </div>
          <div className="toggle-row">
            <input
              id="lounge-auto-sync"
              type="checkbox"
              checked={loungeDraft.lounge_auto_sync}
              onChange={e => {
                setLoungeDraft({ ...loungeDraft, lounge_auto_sync: e.target.checked })
                setLoungeSuccess(false)
              }}
            />
            <label htmlFor="lounge-auto-sync">自動同期を有効にする</label>
          </div>
          <div className="btn-row">
            <button
              className="btn btn--primary"
              onClick={saveLounge}
              disabled={isBusy('lounge') || settings === null}
            >
              {isBusy('lounge') ? '保存中…' : '保存'}
            </button>
            {loungeSuccess && <span className="lounge-form__ok">保存しました</span>}
          </div>
        </div>
      </div>

      {/* OBS Overlay URLs */}
      <div className="panel">
        <div className="panel__title">OBS 配信オーバーレイ</div>
        <p className="overlay-url__guidance">
          ブラウザソース推奨サイズ: compact モード <strong>320 × 120</strong> / 通常モード <strong>480 × 160</strong>。
          透過 URL は OBS の「ブラウザソースの透明度を有効にする」をオン。背景固定（bg=solid）の場合は不要。
        </p>
        <ul className="overlay-url__list">
          {OVERLAY_URLS.map(({ label, path }) => {
            const url = `${baseUrl}${path}`
            return (
              <li key={path} className="overlay-url__row">
                <span className="overlay-url__label">{label}</span>
                <div className="overlay-url__controls">
                  <input
                    ref={el => { inputRefs.current[path] = el }}
                    className="overlay-url__input"
                    readOnly
                    value={url}
                    onFocus={e => e.currentTarget.select()}
                  />
                  <button
                    className="btn btn--sm"
                    onClick={() => handleCopy(path, url)}
                  >
                    {copiedKey === path ? 'コピーしました' : 'コピー'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

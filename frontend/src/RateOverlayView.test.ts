import { describe, expect, it } from 'vitest'
import { normalizeOverlayPollMs, resolveDisplay, resolveMmrFormat, type OverlayMode } from './RateOverlayView'
import type { PlaySession, Settings } from './api'

const settings = (overrides: Partial<Settings> = {}): Settings => ({
  id: 1,
  selected_vr_account_id: null,
  selected_character_id: null,
  selected_vehicle_id: null,
  lounge_player_id: null,
  lounge_auto_sync: false,
  lounge_season: 2,
  lounge_game: 'mkworld12p',
  lounge_mmr_12p: 1000,
  lounge_mmr_24p: 2000,
  lounge_mmr_synced_at: null,
  ...overrides,
})

const session = (overrides: Partial<PlaySession>): PlaySession => ({
  id: 's1',
  source: 'ranked',
  status: 'active',
  title: null,
  vr_account_id: null,
  lounge_table_id: null,
  player_count: null,
  format: null,
  started_at: '2026-07-07T00:00:00Z',
  completed_at: null,
  lounge_mmr_before: null,
  lounge_mmr_after: null,
  lounge_mmr_delta: null,
  lounge_mmr_table_id: null,
  lounge_mmr_synced_at: null,
  lounge_mmr_game: null,
  lounge_season: null,
  completion_reason: null,
  ...overrides,
})

describe('overlay helpers', () => {
  it.each<[OverlayMode, ReturnType<typeof resolveDisplay>]>([
    ['vr', 'vr'],
    ['mmr', 'mmr'],
    ['mmr12', 'mmr'],
    ['mmr24', 'mmr'],
  ])('resolves fixed mode %s', (mode, expected) => {
    expect(resolveDisplay(mode, [], 'mmr')).toBe(expected)
  })

  it('prefers active lounge over ranked in auto mode', () => {
    const sessions = [
      session({ source: 'ranked', status: 'active' }),
      session({ id: 's2', source: 'lounge', status: 'active' }),
    ]
    expect(resolveDisplay('auto', sessions, 'vr')).toBe('mmr')
  })

  it('resolves MMR format from explicit mode, active session, then settings', () => {
    expect(resolveMmrFormat('mmr24', [], settings())).toBe('24p')
    expect(resolveMmrFormat('mmr', [session({ source: 'lounge', player_count: 24 })], settings())).toBe('24p')
    expect(resolveMmrFormat('mmr', [], settings({ lounge_game: 'mkworld24p' }))).toBe('24p')
    expect(resolveMmrFormat('mmr', [], settings())).toBe('12p')
  })

  it('normalizes overlay polling interval while preserving the default', () => {
    expect(normalizeOverlayPollMs(null)).toBe(2000)
    expect(normalizeOverlayPollMs('500')).toBe(1000)
    expect(normalizeOverlayPollMs('1500')).toBe(1500)
    expect(normalizeOverlayPollMs('999999')).toBe(60000)
  })
})
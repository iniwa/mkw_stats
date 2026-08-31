import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'

afterEach(() => vi.unstubAllGlobals())

function mockReadinessResponse(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })))
}

describe('readiness response contract', () => {
  it('accepts the recognized ready response', async () => {
    mockReadinessResponse(200, { status: 'ok', service: 'mkw-stats-backend', database: 'ok' })

    await expect(api.getReadiness()).resolves.toBe('ready')
  })

  it('accepts only the recognized database unavailable response', async () => {
    mockReadinessResponse(503, { status: 'error', service: 'mkw-stats-backend', database: 'error' })

    await expect(api.getReadiness()).resolves.toBe('database-error')
  })

  it.each([
    [200, { status: 'ok', service: 'mkw-stats-backend', database: 'error' }],
    [503, {}],
  ])('rejects an inconsistent readiness response (%i)', async (status, body) => {
    mockReadinessResponse(status, body)

    await expect(api.getReadiness()).rejects.toMatchObject({ status })
  })

  it('rejects a proxy HTML error page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>upstream unavailable</html>', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    })))

    await expect(api.getReadiness()).rejects.toMatchObject({ status: 503 })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchStudioTasks,
  fetchStudioTask,
  fetchStudioStatsOverview,
  fetchStudioStatsTrends,
} from '../studio-api'

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
  } as unknown as Response
}

function errorResponse(
  status: number,
  body: Record<string, unknown> = {},
): Response {
  return {
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(),
  } as unknown as Response
}

// ── Setup ────────────────────────────────────────────────────────────────────

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  // Default env — cleared per test
  process.env.STUDIO_API_URL = 'http://test-studio:8000'
  process.env.STUDIO_USER_ID = 'test-user-42'
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete process.env.STUDIO_API_URL
  delete process.env.STUDIO_USER_ID
})

// ── fetchStudioTasks ─────────────────────────────────────────────────────────

describe('fetchStudioTasks', () => {
  const mockResponse = {
    tasks: [{ id: 't1', title: 'Test task' }],
    total: 1,
    page: 1,
    pageSize: 20,
  }

  it('calls GET /tasks/ with default page params', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(mockResponse))

    const result = await fetchStudioTasks()

    expect(result).toEqual(mockResponse)
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-studio:8000/tasks/?page=1&page_size=20')
    expect(init.method).toBe('GET')
  })

  it('sends x-user-id header from STUDIO_USER_ID', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(mockResponse))
    await fetchStudioTasks()

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['x-user-id']).toBe('test-user-42')
    expect(init.headers['content-type']).toBe('application/json')
  })

  it('falls back to "local" when STUDIO_USER_ID is unset', async () => {
    delete process.env.STUDIO_USER_ID
    fetchMock.mockResolvedValueOnce(jsonResponse(mockResponse))
    await fetchStudioTasks()

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['x-user-id']).toBe('local')
  })

  it('falls back to default URL when STUDIO_API_URL is unset', async () => {
    delete process.env.STUDIO_API_URL
    fetchMock.mockResolvedValueOnce(jsonResponse(mockResponse))
    await fetchStudioTasks()

    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('http://127.0.0.1:8000/tasks/')
  })

  it('applies custom page, pageSize, and status params', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(mockResponse))
    await fetchStudioTasks({ page: 3, pageSize: 10, status: 'completed' })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('page=3')
    expect(url).toContain('page_size=10')
    expect(url).toContain('status=completed')
  })

  it('omits status param when not provided', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(mockResponse))
    await fetchStudioTasks({ page: 1 })

    const [url] = fetchMock.mock.calls[0]
    expect(url).not.toContain('status=')
  })

  it('throws on non-200 response with detail message', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(404, { detail: 'Not found' }),
    )

    await expect(fetchStudioTasks()).rejects.toThrow('Not found')
  })

  it('throws on non-200 response with generic message', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(500, { message: 'Internal error' }),
    )

    await expect(fetchStudioTasks()).rejects.toThrow('Internal error')
  })

  it('throws on network error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))

    await expect(fetchStudioTasks()).rejects.toThrow('fetch failed')
  })
})

// ── fetchStudioTask ──────────────────────────────────────────────────────────

describe('fetchStudioTask', () => {
  const mockDetail = {
    id: 'task-abc',
    title: 'Clipping job',
    clips: [{ id: 'clip-1' }],
  }

  it('calls GET /tasks/{id}', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(mockDetail))

    const result = await fetchStudioTask('task-abc')

    expect(result).toEqual(mockDetail)
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-studio:8000/tasks/task-abc')
  })

  it('encodes special characters in task id', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(mockDetail))
    await fetchStudioTask('id/with spaces')

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-studio:8000/tasks/id%2Fwith%20spaces')
  })

  it('throws on 404', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(404, { detail: 'Task not found' }))

    await expect(fetchStudioTask('missing')).rejects.toThrow('Task not found')
  })
})

// ── fetchStudioStatsOverview ─────────────────────────────────────────────────

describe('fetchStudioStatsOverview', () => {
  const mockOverview = {
    totalTasks: 100,
    completedTasks: 80,
    failedTasks: 5,
    processingTasks: 15,
    totalClips: 320,
    averageClipsPerTask: 3.2,
    averageProcessingTimeSeconds: 45.5,
  }

  it('calls GET /stats/overview', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(mockOverview))

    const result = await fetchStudioStatsOverview()

    expect(result).toEqual(mockOverview)
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-studio:8000/stats/overview')
  })

  it('throws on server error', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, { error: 'DB down' }))

    await expect(fetchStudioStatsOverview()).rejects.toThrow('DB down')
  })
})

// ── fetchStudioStatsTrends ───────────────────────────────────────────────────

describe('fetchStudioStatsTrends', () => {
  const mockTrends = {
    points: [{ date: '2026-03-01', clipsCreated: 12, averageProcessingTimeSeconds: 30 }],
    periodDays: 30,
  }

  it('calls GET /stats/trends with default periodDays=30', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(mockTrends))

    const result = await fetchStudioStatsTrends()

    expect(result).toEqual(mockTrends)
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-studio:8000/stats/trends?period_days=30')
  })

  it('applies custom periodDays', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(mockTrends))
    await fetchStudioStatsTrends({ periodDays: 7 })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('period_days=7')
  })

  it('throws on error response', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(503, { detail: 'Service unavailable' }))

    await expect(fetchStudioStatsTrends()).rejects.toThrow('Service unavailable')
  })
})

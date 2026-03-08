import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchMCTasks,
  fetchMCTask,
  createMCTask,
  updateMCTask,
  deleteMCTask,
  fetchMCBoards,
  fetchMCBoard,
  createMCBoard,
  updateMCBoard,
  deleteMCBoard,
  fetchMCAgents,
  fetchMCAgent,
  createMCAgent,
  updateMCAgent,
  deleteMCAgent,
} from '../mc-api'

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

function noContentResponse(): Response {
  return {
    ok: true,
    status: 204,
    statusText: 'No Content',
    json: () => Promise.reject(new Error('no body')),
    text: () => Promise.resolve(''),
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
  // Ensure we're in a Node-like context (no window) so auth token is read
  vi.stubGlobal('window', undefined)
  process.env.MC_API_URL = 'http://test-mc:8001'
  process.env.MC_AUTH_TOKEN = 'secret-token-xyz'
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete process.env.MC_API_URL
  delete process.env.MC_AUTH_TOKEN
})

// ── Auth header ──────────────────────────────────────────────────────────────

describe('authorization header', () => {
  it('sends Bearer token from MC_AUTH_TOKEN', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ tasks: [], total: 0 }))
    await fetchMCTasks()

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['authorization']).toBe('Bearer secret-token-xyz')
  })

  it('omits authorization when MC_AUTH_TOKEN is unset', async () => {
    delete process.env.MC_AUTH_TOKEN
    fetchMock.mockResolvedValueOnce(jsonResponse({ tasks: [], total: 0 }))
    await fetchMCTasks()

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['authorization']).toBeUndefined()
  })

  it('uses default MC URL when MC_API_URL is unset', async () => {
    delete process.env.MC_API_URL
    fetchMock.mockResolvedValueOnce(jsonResponse({ tasks: [], total: 0 }))
    await fetchMCTasks()

    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('http://127.0.0.1:8001/')
  })
})

// ── Tasks ────────────────────────────────────────────────────────────────────

describe('fetchMCTasks', () => {
  const mockTasks = { tasks: [{ id: 't1', title: 'Ship it' }], total: 1 }

  it('calls GET /tasks/ with no filters', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(mockTasks))
    const result = await fetchMCTasks()

    expect(result).toEqual(mockTasks)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/tasks/')
    expect(init.method).toBe('GET')
  })

  it('applies boardId, status, and assignedAgentId filters', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(mockTasks))
    await fetchMCTasks({
      boardId: 'board-1',
      status: 'in_progress',
      assignedAgentId: 'agent-99',
    })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('board_id=board-1')
    expect(url).toContain('status=in_progress')
    expect(url).toContain('assigned_agent_id=agent-99')
  })

  it('throws on error response with detail', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(403, { detail: 'Forbidden' }))
    await expect(fetchMCTasks()).rejects.toThrow('Forbidden')
  })
})

describe('fetchMCTask', () => {
  it('calls GET /tasks/{id}', async () => {
    const mockTask = { id: 'task-42', title: 'Deploy' }
    fetchMock.mockResolvedValueOnce(jsonResponse(mockTask))

    const result = await fetchMCTask('task-42')
    expect(result).toEqual(mockTask)

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/tasks/task-42')
  })

  it('encodes special characters in id', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'a/b' }))
    await fetchMCTask('a/b')

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/tasks/a%2Fb')
  })
})

describe('createMCTask', () => {
  it('sends POST /tasks/ with JSON body', async () => {
    const input = { title: 'New task', priority: 'high' as const, tags: ['urgent'] }
    const created = { id: 'new-1', ...input }
    fetchMock.mockResolvedValueOnce(jsonResponse(created))

    const result = await createMCTask(input)
    expect(result).toEqual(created)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/tasks/')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual(input)
  })
})

describe('updateMCTask', () => {
  it('sends PATCH /tasks/{id} with partial body', async () => {
    const input = { status: 'done' as const }
    const updated = { id: 'task-1', status: 'done' }
    fetchMock.mockResolvedValueOnce(jsonResponse(updated))

    const result = await updateMCTask('task-1', input)
    expect(result).toEqual(updated)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/tasks/task-1')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual(input)
  })
})

describe('deleteMCTask', () => {
  it('sends DELETE /tasks/{id} and handles 204', async () => {
    fetchMock.mockResolvedValueOnce(noContentResponse())

    const result = await deleteMCTask('task-1')
    expect(result).toBeUndefined()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/tasks/task-1')
    expect(init.method).toBe('DELETE')
  })
})

// ── Boards ───────────────────────────────────────────────────────────────────

describe('fetchMCBoards', () => {
  const mockBoards = { boards: [{ id: 'b1', name: 'Sprint 1' }], total: 1 }

  it('calls GET /boards/ with no filters', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(mockBoards))
    const result = await fetchMCBoards()

    expect(result).toEqual(mockBoards)
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/boards/')
  })

  it('applies status and orgId filters', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(mockBoards))
    await fetchMCBoards({ status: 'active', orgId: 'org-1' })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('status=active')
    expect(url).toContain('org_id=org-1')
  })
})

describe('fetchMCBoard', () => {
  it('calls GET /boards/{id}', async () => {
    const mockBoard = { id: 'b1', name: 'Sprint 1', tasks: [] }
    fetchMock.mockResolvedValueOnce(jsonResponse(mockBoard))

    const result = await fetchMCBoard('b1')
    expect(result).toEqual(mockBoard)

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/boards/b1')
  })
})

describe('createMCBoard', () => {
  it('sends POST /boards/ with JSON body', async () => {
    const input = { name: 'New Board', description: 'Test board' }
    const created = { id: 'b-new', ...input }
    fetchMock.mockResolvedValueOnce(jsonResponse(created))

    const result = await createMCBoard(input)
    expect(result).toEqual(created)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/boards/')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual(input)
  })
})

describe('updateMCBoard', () => {
  it('sends PATCH /boards/{id}', async () => {
    const input = { name: 'Renamed Board' }
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'b1', ...input }))

    await updateMCBoard('b1', input)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/boards/b1')
    expect(init.method).toBe('PATCH')
  })
})

describe('deleteMCBoard', () => {
  it('sends DELETE /boards/{id} and handles 204', async () => {
    fetchMock.mockResolvedValueOnce(noContentResponse())

    const result = await deleteMCBoard('b1')
    expect(result).toBeUndefined()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/boards/b1')
    expect(init.method).toBe('DELETE')
  })
})

// ── Agents ───────────────────────────────────────────────────────────────────

describe('fetchMCAgents', () => {
  const mockAgents = { agents: [{ id: 'a1', name: 'BossClaw' }], total: 1 }

  it('calls GET /agents/ with no filters', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(mockAgents))
    const result = await fetchMCAgents()

    expect(result).toEqual(mockAgents)
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/agents/')
  })

  it('applies status filter', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(mockAgents))
    await fetchMCAgents({ status: 'active' })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('status=active')
  })
})

describe('fetchMCAgent', () => {
  it('calls GET /agents/{id}', async () => {
    const mockAgent = { id: 'a1', name: 'BossClaw' }
    fetchMock.mockResolvedValueOnce(jsonResponse(mockAgent))

    const result = await fetchMCAgent('a1')
    expect(result).toEqual(mockAgent)

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/agents/a1')
  })
})

describe('createMCAgent', () => {
  it('sends POST /agents/ with JSON body', async () => {
    const input = { name: 'NewAgent', model: 'gpt-4', capabilities: ['code'] }
    const created = { id: 'a-new', ...input }
    fetchMock.mockResolvedValueOnce(jsonResponse(created))

    const result = await createMCAgent(input)
    expect(result).toEqual(created)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/agents/')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual(input)
  })
})

describe('updateMCAgent', () => {
  it('sends PATCH /agents/{id}', async () => {
    const input = { status: 'paused' as const }
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'a1', ...input }))

    await updateMCAgent('a1', input)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/agents/a1')
    expect(init.method).toBe('PATCH')
  })
})

describe('deleteMCAgent', () => {
  it('sends DELETE /agents/{id} and handles 204', async () => {
    fetchMock.mockResolvedValueOnce(noContentResponse())

    const result = await deleteMCAgent('a1')
    expect(result).toBeUndefined()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://test-mc:8001/agents/a1')
    expect(init.method).toBe('DELETE')
  })
})

// ── Error handling (shared patterns) ─────────────────────────────────────────

describe('error handling', () => {
  it('extracts detail from JSON error body', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(400, { detail: 'Bad request body' }))
    await expect(fetchMCTasks()).rejects.toThrow('Bad request body')
  })

  it('extracts message from JSON error body', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, { message: 'Server broke' }))
    await expect(fetchMCTasks()).rejects.toThrow('Server broke')
  })

  it('extracts error from JSON error body', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(502, { error: 'Gateway error' }))
    await expect(fetchMCTasks()).rejects.toThrow('Gateway error')
  })

  it('propagates network errors', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(fetchMCAgents()).rejects.toThrow('Failed to fetch')
  })
})

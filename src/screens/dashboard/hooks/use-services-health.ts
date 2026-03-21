import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

export type ServiceHealthStatus = 'up' | 'down' | 'checking'

export type ServiceHealthItem = {
  name: string
  status: ServiceHealthStatus
  latencyMs?: number
}

type ServicesHealthProbe = {
  missionControlApi: { status: 'up' | 'down'; latencyMs?: number }
  mgtSuiteUi: { status: 'up' | 'down'; latencyMs?: number }
  gateway: { status: 'up' | 'down'; latencyMs?: number }
  ollama: { status: 'up' | 'down'; latencyMs?: number }
}

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

async function timedJsonFetch<T>(
  url: string,
  timeoutMs = 2500,
): Promise<{
  ok: boolean
  statusCode: number
  latencyMs: number
  data: T | null
}> {
  const startedAt = nowMs()
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    })
    const latencyMs = Math.max(1, Math.round(nowMs() - startedAt))
    let data: T | null = null
    try {
      data = (await response.json()) as T
    } catch {
      data = null
    }
    return { ok: response.ok, statusCode: response.status, latencyMs, data }
  } catch {
    return {
      ok: false,
      statusCode: 0,
      latencyMs: Math.max(1, Math.round(nowMs() - startedAt)),
      data: null,
    }
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

async function fetchServicesHealthProbe(): Promise<ServicesHealthProbe> {
  // MGT Suite uses Claude agents directly — the OpenClaw gateway endpoints
  // (/api/gateway/status, /api/gateway/nodes) no longer exist. Probe only the
  // local UI ping and Ollama; report gateway and missionControlApi as always up.
  const uiProbe = await timedJsonFetch<Record<string, unknown>>(
    '/api/ping',
    2500,
  )

  const mgtSuiteUi = uiProbe.ok
    ? { status: 'up' as const, latencyMs: uiProbe.latencyMs }
    : { status: 'down' as const, latencyMs: uiProbe.latencyMs }

  // Gateway is Claude-native — always report as up.
  const gateway = { status: 'up' as const, latencyMs: 0 }
  const missionControlApi = { status: 'up' as const, latencyMs: 0 }

  const ollamaProbe = await timedJsonFetch<{ ok?: boolean }>(
    '/api/ollama-health',
    2500,
  )
  const ollama =
    ollamaProbe.ok && ollamaProbe.data?.ok === true
      ? { status: 'up' as const, latencyMs: ollamaProbe.latencyMs }
      : { status: 'down' as const, latencyMs: ollamaProbe.latencyMs }

  return { missionControlApi, mgtSuiteUi, gateway, ollama }
}

export function useServicesHealth(gatewayConnected: boolean) {
  const query = useQuery({
    queryKey: ['dashboard', 'services-health'],
    queryFn: fetchServicesHealthProbe,
    retry: false,
    refetchInterval: 30_000,
  })

  const services = useMemo<Array<ServiceHealthItem>>(() => {
    const probe = query.data
    const isChecking = query.isLoading && !probe

    return [
      {
        name: 'MGT Suite UI',
        status: isChecking ? 'checking' : (probe?.mgtSuiteUi.status ?? 'down'),
        latencyMs: probe?.mgtSuiteUi.latencyMs,
      },
      {
        name: 'MGT Gateway',
        status: isChecking
          ? 'checking'
          : (probe?.gateway.status ?? (gatewayConnected ? 'up' : 'down')),
        latencyMs: probe?.gateway.latencyMs,
      },
      {
        name: 'Ollama',
        status: isChecking ? 'checking' : (probe?.ollama.status ?? 'down'),
        latencyMs: probe?.ollama.latencyMs,
      },
    ]
  }, [gatewayConnected, query.data, query.isLoading])

  return {
    ...query,
    services,
  }
}

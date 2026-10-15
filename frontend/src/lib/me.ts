import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { api } from './api'

export type Plan = 'free' | 'pro'

// Shape returned by GET /api/me (see backend/src/index.ts).
export interface Me {
  id: string
  name: string | null
  nickname: string | null
  email: string
  image: string | null
  plan: Plan
  role: 'user' | 'admin'
  draftCount: number
  draftLimit: number | null // null = unlimited (Pro)
}

// The backend sends { error, code } on rule violations, e.g. PRO_REQUIRED or DRAFT_LIMIT.
export function errorCode(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const code = (error.response?.data as { code?: unknown } | undefined)?.code
    return typeof code === 'string' ? code : null
  }
  return null
}

export function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: unknown } | undefined)?.error
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

// Loads the signed-in user's plan and limits. `me` is null when logged out.
export function useMe() {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<Me>('/api/me')
      setMe(res.data)
    } catch {
      setMe(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    api
      .get<Me>('/api/me')
      .then((res) => {
        if (!cancelled) setMe(res.data)
      })
      .catch(() => {
        if (!cancelled) setMe(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { me, loading, refresh }
}

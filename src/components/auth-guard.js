'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function AuthGuard({ children }) {
  const [authenticated, setAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const session = sessionStorage.getItem('supabase_session')
        if (session) {
          const parsed = JSON.parse(session)
          if (parsed?.access_token) return true
        }
      } catch (e) { }
    }
    return true // Assume authenticated on first render to prevent layout destruction/flash
  })
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      const session = sessionStorage.getItem('supabase_session')

      if (!session) {
        setAuthenticated(false)
        router.push('/login')
        return
      }

      try {
        const parsedSession = JSON.parse(session)
        if (parsedSession?.access_token) {
          setAuthenticated(true)
        } else {
          setAuthenticated(false)
          router.push('/login')
        }
      } catch (error) {
        setAuthenticated(false)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  if (!authenticated) {
    return null
  }

  return children
}

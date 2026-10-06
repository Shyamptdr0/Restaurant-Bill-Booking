'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const session = sessionStorage.getItem('supabase_session')
        if (session && JSON.parse(session)?.access_token) {
          router.replace('/tables')
          return
        }
      } catch (e) {}
    }
    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-xs text-gray-500 font-medium">Opening...</p>
      </div>
    </div>
  )
}

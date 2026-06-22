'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export function ApiStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  useEffect(() => {
    const checkApi = async () => {
      try {
        const response = await fetch(`${apiUrl}/health`, { method: 'GET' })
        if (response.ok) {
          setStatus('online')
          console.log('✅ Backend API is online at', apiUrl)
        } else {
          setStatus('offline')
          console.error('❌ Backend returned:', response.status)
        }
      } catch (error) {
        setStatus('offline')
        console.error('❌ Cannot connect to backend at', apiUrl, error)
      }
    }

    checkApi()
    const interval = setInterval(checkApi, 30000) // Check every 30s
    return () => clearInterval(interval)
  }, [apiUrl])

  if (status === 'online') {
    return null // Don't show anything if API is online
  }

  return (
    <div className={`fixed top-4 right-4 z-[9999] rounded-lg border px-4 py-3 flex items-center gap-2 ${
      status === 'checking' 
        ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700'
        : 'border-red-500/50 bg-red-500/10 text-red-700'
    }`}>
      {status === 'checking' ? (
        <>
          <div className="animate-spin">⏳</div>
          <div className="text-sm">
            Connecting to backend at <code className="font-mono text-xs">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}</code>
          </div>
        </>
      ) : (
        <>
          <AlertCircle className="h-4 w-4" />
          <div className="text-sm">
            <strong>Backend offline.</strong> Start backend with: <code className="font-mono text-xs bg-black/10 px-1 rounded">cd backend && uvicorn app.main:app --reload</code>
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Circle } from 'lucide-react'

interface HealthStatus {
  endpoint: string
  status: 'checking' | 'ok' | 'error'
  message: string
  time: number
}

export default function DiagnosticsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const [results, setResults] = useState<HealthStatus[]>([])

  useEffect(() => {
    const checkEndpoints = async () => {
      const endpoints = [
        { path: '/health', name: 'Health Check' },
        { path: '/api/command/dashboard', name: 'Dashboard' },
        { path: '/api/command/grid', name: 'Grid' },
        { path: '/api/attribution/overview', name: 'Attribution' },
        { path: '/api/enforcement/queue', name: 'Enforcement' },
        { path: '/api/citizen/ward-risk', name: 'Citizen' },
        { path: '/api/forecast/grid/24', name: 'Forecast' },
      ]

      const checks: HealthStatus[] = []

      for (const ep of endpoints) {
        const status: HealthStatus = {
          endpoint: ep.name,
          status: 'checking',
          message: 'Checking...',
          time: 0,
        }
        setResults((prev) => [...prev, status])

        const start = performance.now()
        try {
          const response = await fetch(`${apiUrl}${ep.path}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
          const time = performance.now() - start

          if (response.ok) {
            status.status = 'ok'
            status.message = `OK (${time.toFixed(0)}ms)`
            status.time = time
          } else {
            status.status = 'error'
            status.message = `HTTP ${response.status}`
          }
        } catch (error) {
          status.status = 'error'
          status.message = error instanceof Error ? error.message : 'Connection failed'
        }

        setResults((prev) => [...prev.slice(0, -1), status])
        checks.push(status)
      }
    }

    checkEndpoints()
  }, [apiUrl])

  const allOk = results.every((r) => r.status === 'ok')

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">VayuMind Diagnostics</h1>
        <p className="text-muted-foreground mb-6">Backend API Health Check</p>

        <div className="rounded-lg border border-border bg-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <code className="text-sm text-primary bg-primary/10 px-2 py-1 rounded">
              {apiUrl}
            </code>
          </div>

          {allOk ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">All endpoints operational ✓</span>
            </div>
          ) : results.some((r) => r.status === 'error') ? (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold">Some endpoints failed</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-600">
              <Circle className="h-4 w-4 animate-pulse" />
              <span className="font-semibold">Checking endpoints...</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {results.map((result) => (
            <div
              key={result.endpoint}
              className={`rounded-lg border px-4 py-3 flex items-center justify-between ${
                result.status === 'ok'
                  ? 'border-green-500/30 bg-green-500/10'
                  : result.status === 'error'
                    ? 'border-red-500/30 bg-red-500/10'
                    : 'border-yellow-500/30 bg-yellow-500/10'
              }`}
            >
              <div className="flex items-center gap-3">
                {result.status === 'ok' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : result.status === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <Circle className="h-4 w-4 text-yellow-600 animate-pulse" />
                )}
                <span className="font-medium">{result.endpoint}</span>
              </div>
              <span className={`text-sm ${
                result.status === 'ok'
                  ? 'text-green-600'
                  : result.status === 'error'
                    ? 'text-red-600'
                    : 'text-yellow-600'
              }`}>
                {result.message}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-border bg-card p-6">
          <h2 className="font-semibold mb-4">Troubleshooting</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">❌ Backend not responding?</p>
              <code className="block bg-black/30 p-2 rounded text-xs mb-2">
                cd /Users/atharvamendhulkar/Desktop/ET/backend<br />
                pip install -r requirements.txt<br />
                uvicorn app.main:app --reload
              </code>
            </div>

            <div>
              <p className="font-medium text-foreground mb-1">❌ Wrong API URL?</p>
              <p>Edit <code className="text-xs bg-black/30 px-1">frontend/.env.local</code>:</p>
              <code className="block bg-black/30 p-2 rounded text-xs">
                NEXT_PUBLIC_API_URL=http://localhost:8000
              </code>
            </div>

            <div>
              <p className="font-medium text-foreground mb-1">❌ CORS Error?</p>
              <p>Restart frontend to pick up env changes:</p>
              <code className="block bg-black/30 p-2 rounded text-xs">
                npm run dev
              </code>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <a
            href="/command"
            className="text-sm text-primary hover:underline"
          >
            ← Back to Command Center
          </a>
        </div>
      </div>
    </div>
  )
}

'use client'

import AerisMap from '@/components/map/aeris-map'
import { generateGrid } from '@/lib/mock-data'
import { useState } from 'react'

export default function MapTestPage() {
  const [gridSource, setGridSource] = useState<'mock' | 'api'>('mock')
  const [gridData, setGridData] = useState(generateGrid())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFromApi = async () => {
    setLoading(true)
    setError(null)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/command/grid`)
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      const data = await response.json()
      setGridData(data)
      setGridSource('api')
      console.log('✅ Loaded', data.length, 'cells from API')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('❌ API failed:', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen">
      {/* Map */}
      <div className="flex-1">
        <AerisMap grid={gridData} />
      </div>

      {/* Debug Panel */}
      <div className="w-80 bg-card border-l border-border flex flex-col">
        <div className="border-b border-border p-4">
          <h2 className="font-semibold mb-4">Map Test Debug Panel</h2>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Grid Source</p>
              <p className="font-mono text-xs bg-black/30 px-2 py-1 rounded mt-1">
                {gridSource}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">Grid Cells</p>
              <p className="font-mono text-xs bg-black/30 px-2 py-1 rounded mt-1">
                {gridData?.length || 0} cells
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">Cell Structure</p>
              {gridData?.[0] ? (
                <div className="font-mono text-xs bg-black/30 px-2 py-1 rounded mt-1 max-h-32 overflow-auto">
                  <pre>{JSON.stringify(gridData[0], null, 2)}</pre>
                </div>
              ) : (
                <p className="text-xs text-red-600">No cells available</p>
              )}
            </div>

            {error && (
              <div className="rounded border border-red-500/50 bg-red-500/10 p-2">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-2">
          <button
            onClick={() => setGridData(generateGrid())}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
          >
            Load Mock Data
          </button>

          <button
            onClick={loadFromApi}
            disabled={loading}
            className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load from API'}
          </button>

          <div className="text-xs text-muted-foreground pt-4 border-t">
            <p className="mb-2 font-semibold">Debug Info:</p>
            <ul className="space-y-1">
              <li>✓ Map component loads</li>
              <li>✓ Grid renders as 26×26 rectangles</li>
              <li>✓ Click cells for details</li>
              <li>✓ Toggle layers in top-left</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { create } from 'zustand'

interface TimeState {
  /** index into forecast frames */
  frame: number
  playing: boolean
  speed: number
  setFrame: (f: number) => void
  setPlaying: (p: boolean) => void
  togglePlaying: () => void
  setSpeed: (s: number) => void
}

export const useTimeStore = create<TimeState>((set) => ({
  frame: 0,
  playing: false,
  speed: 1,
  setFrame: (frame) => set({ frame }),
  setPlaying: (playing) => set({ playing }),
  togglePlaying: () => set((s) => ({ playing: !s.playing })),
  setSpeed: (speed) => set({ speed }),
}))

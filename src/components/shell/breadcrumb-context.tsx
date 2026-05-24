"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"

type LabelMap = Record<string, string>

interface Setters {
  setLabel: (segment: string, label: string) => void
  clearLabel: (segment: string) => void
}

const LabelsCtx = createContext<LabelMap>({})
const SettersCtx = createContext<Setters | null>(null)

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = useState<LabelMap>({})

  const setters = useMemo<Setters>(() => ({
    setLabel: (segment, label) =>
      setLabels((prev) => (prev[segment] === label ? prev : { ...prev, [segment]: label })),
    clearLabel: (segment) =>
      setLabels((prev) => {
        if (!(segment in prev)) return prev
        const next = { ...prev }
        delete next[segment]
        return next
      }),
  }), [])

  return (
    <SettersCtx.Provider value={setters}>
      <LabelsCtx.Provider value={labels}>{children}</LabelsCtx.Provider>
    </SettersCtx.Provider>
  )
}

export function useBreadcrumbLabels(): LabelMap {
  return useContext(LabelsCtx)
}

export function SetBreadcrumb({ segment, label }: { segment: string; label: string }) {
  const setters = useContext(SettersCtx)
  // Latest-label ref so we can update without re-subscribing to the effect.
  const labelRef = useRef(label)
  labelRef.current = label

  useEffect(() => {
    if (!setters) return
    setters.setLabel(segment, labelRef.current)
    return () => setters.clearLabel(segment)
  }, [setters, segment])

  // Push label updates without re-running cleanup.
  useEffect(() => {
    if (!setters) return
    setters.setLabel(segment, label)
  }, [setters, segment, label])

  return null
}

"use client"

import { useCallback, useEffect, useState } from "react"

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        }
      } catch {
        // Ignore write errors
      }
    },
    [key, storedValue]
  )

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T)
        } catch {
          // Ignore parse errors
        }
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [key])

  return [storedValue, setValue]
}

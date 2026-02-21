import type { ComponentType } from 'react'
import type { CustomWidgetProps } from './types'

type WidgetComponent = ComponentType<CustomWidgetProps>

const customWidgets = new Map<string, WidgetComponent>()

export function registerCustomWidget(key: string, component: WidgetComponent): void {
  if (customWidgets.has(key)) {
    throw new Error(`Custom widget '${key}' is already registered`)
  }
  customWidgets.set(key, component)
}

export function getCustomWidget(key: string): WidgetComponent | null {
  return customWidgets.get(key) ?? null
}

export function getAllCustomWidgetKeys(): string[] {
  return Array.from(customWidgets.keys())
}

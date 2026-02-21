import type {
  ModuleManifest,
  ModuleSidebarItem,
  AnalyticsWidgetDefinition,
  ModuleRoute,
} from './types'

export class ModuleRegistry {
  private manifests = new Map<string, ModuleManifest>()
  private dependentsMap = new Map<string, string[]>()
  private validated = false

  register(manifest: ModuleManifest): void {
    if (this.manifests.has(manifest.slug)) {
      throw new Error(`Module '${manifest.slug}' is already registered`)
    }
    this.manifests.set(manifest.slug, manifest)
    this.validated = false
  }

  validate(): void {
    // Check all dependencies exist
    for (const [slug, manifest] of this.manifests) {
      for (const dep of manifest.dependencies) {
        if (!this.manifests.has(dep)) {
          throw new Error(`Module '${slug}' depends on '${dep}' which is not registered`)
        }
      }
    }

    // Build dependents map
    this.dependentsMap.clear()
    for (const [slug] of this.manifests) {
      this.dependentsMap.set(slug, [])
    }
    for (const [slug, manifest] of this.manifests) {
      for (const dep of manifest.dependencies) {
        this.dependentsMap.get(dep)!.push(slug)
      }
    }

    // Detect circular dependencies via topological sort
    const visited = new Set<string>()
    const inStack = new Set<string>()

    const visit = (slug: string, path: string[]): void => {
      if (inStack.has(slug)) {
        throw new Error(`Circular dependency detected: ${[...path, slug].join(' -> ')}`)
      }
      if (visited.has(slug)) return

      inStack.add(slug)
      const manifest = this.manifests.get(slug)!
      for (const dep of manifest.dependencies) {
        visit(dep, [...path, slug])
      }
      inStack.delete(slug)
      visited.add(slug)
    }

    for (const slug of this.manifests.keys()) {
      visit(slug, [])
    }

    this.validated = true
  }

  // Core queries

  getManifest(slug: string): ModuleManifest | null {
    return this.manifests.get(slug) ?? null
  }

  getAllManifests(): ModuleManifest[] {
    return Array.from(this.manifests.values())
  }

  // Dependency enforcement

  getDependents(slug: string): string[] {
    return this.dependentsMap.get(slug) ?? []
  }

  getDependencies(slug: string): string[] {
    return this.manifests.get(slug)?.dependencies ?? []
  }

  canDisable(
    slug: string,
    enabledSlugs: string[]
  ): { allowed: boolean; blockedBy: string[] } {
    const manifest = this.manifests.get(slug)
    if (!manifest) return { allowed: false, blockedBy: [] }

    if (manifest.isCore) {
      return { allowed: false, blockedBy: ['__core__'] }
    }

    const enabledSet = new Set(enabledSlugs)
    const blockedBy = (this.dependentsMap.get(slug) ?? []).filter((dep) =>
      enabledSet.has(dep)
    )

    return { allowed: blockedBy.length === 0, blockedBy }
  }

  canEnable(
    slug: string,
    enabledSlugs: string[]
  ): { allowed: boolean; missingDeps: string[] } {
    const manifest = this.manifests.get(slug)
    if (!manifest) return { allowed: false, missingDeps: [] }

    const enabledSet = new Set(enabledSlugs)
    const missingDeps = manifest.dependencies.filter((dep) => !enabledSet.has(dep))

    return { allowed: missingDeps.length === 0, missingDeps }
  }

  // Tenant-scoped queries

  getEnabledManifests(enabledSlugs: string[]): ModuleManifest[] {
    const set = new Set(enabledSlugs)
    return this.getAllManifests().filter((m) => set.has(m.slug))
  }

  getSidebarItems(enabledSlugs: string[]): ModuleSidebarItem[] {
    return this.getEnabledManifests(enabledSlugs).flatMap((m) => m.sidebarItems)
  }

  getAnalyticsWidgets(enabledSlugs: string[]): AnalyticsWidgetDefinition[] {
    return this.getEnabledManifests(enabledSlugs).flatMap((m) => m.analyticsWidgets)
  }

  getRoutes(enabledSlugs: string[]): ModuleRoute[] {
    return this.getEnabledManifests(enabledSlugs).flatMap((m) => m.routes)
  }

  getPermissions(enabledSlugs: string[]): string[] {
    return this.getEnabledManifests(enabledSlugs).flatMap((m) => m.permissions)
  }
}

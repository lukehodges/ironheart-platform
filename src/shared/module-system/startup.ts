// Server-only startup tasks. Separated from register-all.ts so that
// client components can import moduleRegistry without pulling in DB deps.
import { syncPermissions } from './permission-seeder'
import { moduleSettingsService } from '@/modules/settings/module-settings.service'
import { moduleRegistry } from './register-all'

let startupDone = false

export async function initStartupTasks(): Promise<void> {
  if (startupDone) return
  startupDone = true

  await syncPermissions(moduleRegistry.getAllManifests())
  await moduleSettingsService.seedModuleSettings(moduleRegistry.getAllManifests())
}

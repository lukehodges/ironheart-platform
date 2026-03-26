// Server-only startup tasks. Separated from register-all.ts so that
// client components can import moduleRegistry without pulling in DB deps.
import { syncPermissions } from './permission-seeder'
import { moduleSettingsService } from '@/modules/settings/module-settings.service'
import { moduleRegistry } from './register-all'
import { searchProviderRegistry } from './search-registry'
import { customerSearchProvider } from '@/modules/customer/customer.search-provider'
import { bookingSearchProvider } from '@/modules/booking/booking.search-provider'
import { teamSearchProvider } from '@/modules/team/team.search-provider'

// --- Search providers (server-only, import DB) ---
searchProviderRegistry.register(customerSearchProvider)
searchProviderRegistry.register(bookingSearchProvider)
searchProviderRegistry.register(teamSearchProvider)

let startupDone = false

export async function initStartupTasks(): Promise<void> {
  if (startupDone) return
  startupDone = true

  await syncPermissions(moduleRegistry.getAllManifests())
  await moduleSettingsService.seedModuleSettings(moduleRegistry.getAllManifests())
}

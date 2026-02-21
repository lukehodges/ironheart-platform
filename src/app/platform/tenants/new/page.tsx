import { TenantWizard } from "@/components/platform/tenant-wizard"

export default function CreateTenantPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create Tenant</h1>
        <p className="text-muted-foreground mt-1">
          Set up a new tenant organization on the platform
        </p>
      </div>

      <TenantWizard />
    </div>
  )
}

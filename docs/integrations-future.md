# Integration Hub — Evolution Roadmap

This document captures how the Integration Hub is designed to evolve. The current architecture was built with these paths in mind.

---

## Next Providers to Implement

### Xero (accounting)
- **Events:** `invoice.finalised`, `payment.received`
- **Why:** Automatic invoice creation in Xero when bookings are confirmed and paid
- **Complexity:** Medium — Xero OAuth is standard, their API is well-documented

### HubSpot (CRM)
- **Events:** `customer.created`, `booking.confirmed`, `booking.completed`
- **Why:** Keep HubSpot contact records in sync; log bookings as activities
- **Complexity:** Medium — property mapping is the main design decision

### Slack (notifications)
- **Events:** `booking.confirmed`, `review.submitted`, `payment.received`
- **Why:** Real-time team notifications in dedicated channels
- **Complexity:** Low — no OAuth complexity, just webhook delivery

### Stripe Connect (payments)
- **Events:** `payment.received`, `payment.failed`, `invoice.finalised`
- **Why:** Stripe is already integrated for processing — Connect enables marketplace payouts
- **Complexity:** High — Connect has distinct OAuth flow + financial compliance concerns

---

## Rule Engine (mini-Zapier)

The current hub is hardcoded: `booking.confirmed` → push to Google Calendar. The natural evolution is a configurable rule layer where tenants define their own mappings.

### What needs to be built

1. **Rule model** — a DB table `integration_rules` with:
   - `tenantId`, `providerId`, `domainEventType`
   - `fieldMappings` (JSONB) — e.g. `{ externalTitle: "{{service.name}} — {{customer.fullName}}" }`
   - `conditions` (JSONB) — optional filters (e.g. "only for bookings > 60 min")
   - `isEnabled`

2. **Rule evaluator** — `integrationsService.routeEvent()` loads applicable rules and passes them as part of `IntegrationContext`, so providers can use them for field mapping

3. **UI** — a tenant-facing rule builder. The tables already support this; it's purely a UI problem.

### What does NOT change

The `IntegrationProvider` interface is unchanged. Providers accept field mappings via `IntegrationContext` and apply them — they don't need to know where the mappings came from. Adding a rule engine is an additive change to the hub, not a replacement.

---

## Tenant-Facing Integration Management UI

The DB tables already support a full integration management UI. What's needed:

1. **Integration catalogue page** — lists all available providers from `getAllProviders()`, shows connection status per user from `user_integrations`
2. **Connect flow** — calls `integrations.initiateOAuth` tRPC mutation → redirects to provider → callback calls `integrations.completeOAuth`
3. **Disconnect flow** — calls `integrations.disconnect` tRPC mutation
4. **Status page** — reads `user_integration_sync_logs` to show recent sync history and any errors

The tRPC router (`integrationsRouter`) exposes all the endpoints this UI needs:
- `integrations.initiateOAuth`
- `integrations.completeOAuth`
- `integrations.disconnect`
- `integrations.listConnected`

---

## Provider Marketplace

For a multi-tenant platform where tenants can install integrations from a catalogue:

1. **`integrations` table** — already exists. Add a `isAvailableToTenants` flag and `installCount` counter.
2. **`tenant_integrations` table** — per-tenant enable/disable + configuration. Currently this is handled by `tenant_modules` but a dedicated table gives more flexibility (per-tenant API keys, custom scopes, etc.)
3. **Tenant-supplied credentials (bring-your-own)** — add a `credentialSource` enum: `PLATFORM` (current) or `TENANT`. If `TENANT`, load encrypted credentials from a `tenant_credentials` table instead of env vars.

---

## Scaling Considerations

### High volume event routing

The current implementation uses `Promise.allSettled()` to fan out to all connected users in parallel within a single Inngest step. For tenants with hundreds of staff members (each with Google Calendar connected), this could become slow.

**Future improvement:** Split the fan-out into individual Inngest jobs — one job per user-integration. This gives per-user retry granularity and parallel execution without timeout risk.

```typescript
// Current
await Promise.allSettled(connectedUsers.map(user => provider.onEvent(event, ctx)))

// Future — emit individual jobs
await Promise.all(connectedUsers.map(user =>
  inngest.send({ name: 'integration/sync.user', data: { userId: user.id, event, providerSlug } })
))
```

### Watch channel management at scale

Google watch channels expire after 7 days. The current `renewWatchChannels` Inngest scheduled function renews channels expiring within 24 hours. This works well up to ~1,000 connected users. Beyond that, batch the renewals across multiple Inngest steps.

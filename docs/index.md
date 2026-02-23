# Ironheart Developer Guide

Comprehensive reference for adding modules, modifying existing features, and maintaining the Ironheart SaaS platform.

## Guide Structure

This guide is split into multiple files to allow agents to load only the sections they need:

| File | Contents |
|------|----------|
| [01-overview.md](./01-overview.md) | Project overview, tech stack, project structure |
| [02-module-architecture.md](./02-module-architecture.md) | Module file structure, layer responsibilities |
| [03-adding-module.md](./03-adding-module.md) | Step-by-step guide to adding a new module |
| [04-backend-patterns.md](./04-backend-patterns.md) | tRPC procedures, context, concurrency patterns |
| [05-frontend-patterns.md](./05-frontend-patterns.md) | React patterns, components, styling |
| [06-database.md](./06-database.md) | Drizzle ORM patterns |
| [07-auth.md](./07-auth.md) | Authentication & authorization |
| [08-events.md](./08-events.md) | Inngest event system |
| [09-module-system.md](./09-module-system.md) | Module system & feature flags |
| [10-error-handling.md](./10-error-handling.md) | Error handling patterns |
| [11-logging.md](./11-logging.md) | Logging conventions |
| [12-testing.md](./12-testing.md) | Testing patterns |
| [13-pitfalls.md](./13-pitfalls.md) | Common pitfalls to avoid |
| [14-deploy.md](./14-deploy.md) | Build & deploy, env vars |
| [15-search-providers.md](./15-search-providers.md) | Dynamic search provider system |
| [16-resource-pool.md](./16-resource-pool.md) | Shared resource pool (skills, capacity, assignments) |

---

*Last updated: 2026-02-23*

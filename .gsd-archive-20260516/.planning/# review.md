# review
I AM GOING TO GET THE IMMEDIATE ERRORS OUT THE WAY BEFORE REVIEWING THE TESTING PLAYBOOK. I THINK WE NEED TO UPDATE THE SEED FIRST TO BE PROPERLY PLANNED AND READY

/admin
the dashboard page displays cards that may require specific modules to be enabled such as bookings etc. along with the random ass new booking button. create a note that we need to implement a completely new dashbaord system with drag and drop capabilities that integrate with the widget system created by modules. link this in with /admin/analytics



throughout the codebase its representing all values of money off by a cfactor of 100 indicating that there is a pense conversion somewhere. identify if its that a helper function is off by 100 or if everything needs to be increased by 100. please answer and determine why. 

/admin/customers last booking (if they are booked in the future it says -3 days etc. should it be this way or 3 days time etc)
make sure this cascades down into the popup as well. 
when i popup onto an individual customer hit edit it has a notes thing there. what is that doing how is that different to notes tab. 
upon that popup it should only show tabs of modules enabled (i think) aka if forms are disabled it shouldnt display that tab. other option is we have it be this is not enabled (or some mock data etc to try and insentivise an upsell. then mention please contact your account rep. )

whats the definition of an inactive customer. should the user be able to change this manually. is this an automatic process that after x they become inactive. should this just happen within the workflow or cron job system idk?

back to earlier point. make it that on the table we can select columns. if modules are disabled (say bookings) then that column is automatically disabled if you want to enable the column it has a big x with please contact your admin/account rep just like above

since we will be removing the big new booking button at the top since bookings may not be enabled. we need to create like 3 variations of that search and filtering modal and i will pick the best one to go forth with. 
is pagination enabled in the table? does this impact the fetch query

/admin/audit failed to load when not platform admin. should this be the case who should be able to see this audit log

on the test user signed in luke.hodges.dev@gmail.com the admin sidebar only shows dashboard settings audit log. i think it should properly reflect enabled disabled modules what's going on!?!

/settings. 

this needs to be fleashed out into a proper module we need to have a deep think about this. what constitutes tenant settings. what needs to be individual to a user. how do we manage staff and their settings. as a staff member and as their manager etc. 


/settings modules works as expected should have a proper think about how we can implement module settings that update and change etc since i can imagine that being a big part of this software. 

/settings/billing we need to have a proper think into how billing will work since this software will be abit like salesforce for multiple specialised industries. all links into the bigger picture with where the settings module needs to be better defined. 

/bookings customer shows ID not name same with service and staff. with staff if we can pull in a picture from their profile or workos legendary!!!!
/bookings as with /customers 3 variations of the filtering and searching use frontend design skill to get it perfecto!

tRPC error on team.getById: Error [TRPCError]: Staff member not found: 42fd590c-6c12-425b-9dcd-2b77a7f57926
    at Object.getStaffMember (src/modules/team/team.service.ts:34:24)
    at async (src/shared/trpc.ts:250:12)
    at async (src/shared/trpc.ts:231:18)
  32 |   async getStaffMember(ctx: Context, userId: string): Promise<StaffMember> {
  33 |     const member = await teamRepository.findById(ctx.tenantId, userId);
> 34 |     if (!member) throw new NotFoundError("Staff member", userId);
     |                        ^
  35 |
  36 |     // Ensure the found staff member belongs to the requesting tenant
  37 |     if (member.tenantId !== ctx.tenantId) { {
  code: 'INTERNAL_SERVER_ERROR',
  [cause]: Error [NotFoundError]: Staff member not found: 42fd590c-6c12-425b-9dcd-2b77a7f57926
      at Object.getStaffMember (src/modules/team/team.service.ts:34:24)
      at async (src/shared/trpc.ts:250:12)
      at async (src/shared/trpc.ts:231:18)
    32 |   async getStaffMember(ctx: Context, userId: string): Promise<StaffMember> {
    33 |     const member = await teamRepository.findById(ctx.tenantId, userId);
  > 34 |     if (!member) throw new NotFoundError("Staff member", userId);
       |                        ^
    35 |
    36 |     // Ensure the found staff member belongs to the requesting tenant
    37 |     if (member.tenantId !== ctx.tenantId) { {
    code: 'NOT_FOUND'
  }
}

tRPC error on search.globalSearch: Error [TRPCError]: Failed query: select "id", "firstName", "lastName", "email" from "customers" where ("customers"."tenantId" = $1 and ("customers"."firstName" || ' ' || "customers"."lastName" || ' ' || COALESCE("customers"."email", '')) ILIKE $2 and customers.deleted_at IS NULL) limit $3
params: 4c242435-683a-4b59-b0c4-c052ee5d22f9,%aud%,5
    at async (src/modules/search/search.router.ts:17:49)
    at async (src/shared/trpc.ts:250:12)
    at async (src/shared/trpc.ts:231:18)
  15 |       const perTypeLimit     = Math.ceil(input.limit / 2)
  16 |
> 17 |       const [customerResults, bookingResults] = await Promise.all([
     |                                                 ^
  18 |         includeCustomers
  19 |           ? searchRepository.fullTextSearchCustomers(ctx.tenantId, input.query, perTypeLimit)
  20 |           : Promise.resolve([]), {
  code: 'INTERNAL_SERVER_ERROR',
  [cause]: Error: Failed query: select "id", "firstName", "lastName", "email" from "customers" where ("customers"."tenantId" = $1 and ("customers"."firstName" || ' ' || "customers"."lastName" || ' ' || COALESCE("customers"."email", '')) ILIKE $2 and customers.deleted_at IS NULL) limit $3
  params: 4c242435-683a-4b59-b0c4-c052ee5d22f9,%aud%,5
      at async (src/modules/search/search.router.ts:17:49)
      at async (src/shared/trpc.ts:250:12)
      at async (src/shared/trpc.ts:231:18)
    15 |       const perTypeLimit     = Math.ceil(input.limit / 2)
    16 |
  > 17 |       const [customerResults, bookingResults] = await Promise.all([
       |                                                 ^
    18 |         includeCustomers
    19 |           ? searchRepository.fullTextSearchCustomers(ctx.tenantId, input.query, perTypeLimit)
    20 |           : Promise.resolve([]), {
    query: `select "id", "firstName", "lastName", "email" from "customers" where ("customers"."tenantId" = $1 and ("customers"."firstName" || ' ' || "customers"."lastName" || ' ' || COALESCE("customers"."email", '')) ILIKE $2 and customers.deleted_at IS NULL) limit $3`,
    params: [ '4c242435-683a-4b59-b0c4-c052ee5d22f9', '%aud%', 5 ],
    [cause]: Error [PostgresError]: column customers.deleted_at does not exist
        at ignore-listed frames {
      severity_local: 'ERROR',
      severity: 'ERROR',
      code: '42703',
      hint: 'Perhaps you meant to reference the column "customers.deletedAt".',
      position: '219',
      file: 'parse_relation.c',
      line: '3723',
      routine: 'errorMissingColumn'
    }
  }
}


/calendar this seems very centralised on the booking feature but if im building this big wholistic software for multiple industries it cannot just link with booking and only booking so help me god. we should just like with settings have a proper brainstorm of how this should work integrating with different modules flags etc. whats shown on the calendar whats removed from the calendar etc. 


modules as a whole. we've built the perfect architecture aggreed its just we need to look over the dependancy system and work out whats core whats not if we were a software like salesforce. surely team is core since that contains users etc etc


/developer works fine. just like with calendar we should convert this into a bigger thing later down the line


/scheduling what the flying fuck is going on. this needs to merge with /staff and /calendar before continuing. this is an utter mess


review /team and team module in better detail lets make something industry standard rather than the mess above


global search resolve the bugs below. 
tRPC error on search.globalSearch: Error [TRPCError]: Failed query: select "id", "firstName", "lastName", "email" from "customers" where ("customers"."tenantId" = $1 and ("customers"."firstName" || ' ' || "customers"."lastName" || ' ' || COALESCE("customers"."email", '')) ILIKE $2 and customers.deleted_at IS NULL) limit $3
params: 4c242435-683a-4b59-b0c4-c052ee5d22f9,%workfl%,5
    at async (src/modules/search/search.router.ts:17:49)
    at async (src/shared/trpc.ts:250:12)
    at async (src/shared/trpc.ts:231:18)
  15 |       const perTypeLimit     = Math.ceil(input.limit / 2)
  16 |
> 17 |       const [customerResults, bookingResults] = await Promise.all([
     |                                                 ^
  18 |         includeCustomers
  19 |           ? searchRepository.fullTextSearchCustomers(ctx.tenantId, input.query, perTypeLimit)
  20 |           : Promise.resolve([]), {
  code: 'INTERNAL_SERVER_ERROR',
  [cause]: Error: Failed query: select "id", "firstName", "lastName", "email" from "customers" where ("customers"."tenantId" = $1 and ("customers"."firstName" || ' ' || "customers"."lastName" || ' ' || COALESCE("customers"."email", '')) ILIKE $2 and customers.deleted_at IS NULL) limit $3
  params: 4c242435-683a-4b59-b0c4-c052ee5d22f9,%workfl%,5
      at async (src/modules/search/search.router.ts:17:49)
      at async (src/shared/trpc.ts:250:12)
      at async (src/shared/trpc.ts:231:18)
    15 |       const perTypeLimit     = Math.ceil(input.limit / 2)
    16 |
  > 17 |       const [customerResults, bookingResults] = await Promise.all([
       |                                                 ^
    18 |         includeCustomers
    19 |           ? searchRepository.fullTextSearchCustomers(ctx.tenantId, input.query, perTypeLimit)
    20 |           : Promise.resolve([]), {
    query: `select "id", "firstName", "lastName", "email" from "customers" where ("customers"."tenantId" = $1 and ("customers"."firstName" || ' ' || "customers"."lastName" || ' ' || COALESCE("customers"."email", '')) ILIKE $2 and customers.deleted_at IS NULL) limit $3`,
    params: [ '4c242435-683a-4b59-b0c4-c052ee5d22f9', '%workfl%', 5 ],
    [cause]: Error [PostgresError]: column customers.deleted_at does not exist
        at ignore-listed frames {
      severity_local: 'ERROR',
      severity: 'ERROR',
      code: '42703',
      hint: 'Perhaps you meant to reference the column "customers.deletedAt".',
      position: '219',
      file: 'parse_relation.c',
      line: '3723',
      routine: 'errorMissingColumn'
    }
  }
}

/workflow module. we need to take this into alot more detail lots of bugs lots of things not going as expected needs to integrate seamlessly with modules etc

/admin/forms put on hold needs to be a proper really big thing if we want it to be industry standard. 



you know what i want you to look over this entire software as a whole and docs/index.md and once the bugs above are solved in sub agents (please dont do the stupid long tasks i mentioned) i want you to identify what is required for the MVP what modules need to be properly in sync in the best cleanest way possible whats the fewest number of modules we need to integrate perfectly seamlessly. think about salesforce or an other industry leader how they have quite a few core modules. 
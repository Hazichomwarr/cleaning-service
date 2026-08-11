# Just Cleaning — Project Guidelines

## Document Purpose

This document defines the product vision, business context, architectural principles, domain rules, and implementation boundaries for the Just Cleaning platform.

It is not an implementation ticket.

It should be treated as persistent project context and consulted before implementing features that affect:

- cleaning requests
- customers
- pricing
- scheduling
- workers
- assignments
- administration
- notifications
- business workflows
- historical business data

Individual implementation tickets define **what to build next**.

This document defines **what kind of product we are building and how we should think while building it**.

---

# 1. Product

## Just Cleaning

Just Cleaning is a professional cleaning business serving residential and commercial customers.

Customers need a simple way to request cleaning services without relying entirely on phone calls and manual back-and-forth communication.

The business also needs a lightweight internal system for organizing those requests and coordinating the people who perform the work.

We are therefore building more than a marketing website.

We are building a small operational platform composed of two primary experiences:

1. a public customer-facing website and cleaning-request experience;
2. a private administrative workspace for Just Cleaning.

The product should remain intentionally focused on the real operational needs of this cleaning business.

It is **not** intended to become a generic enterprise CRM, workforce-management platform, or cleaning SaaS product during this project.

---

# 2. Primary Product Goal

The fundamental workflow is:

```text
Customer needs cleaning
        ↓
Visits Just Cleaning website
        ↓
Chooses the service needed
        ↓
Provides property details
        ↓
Receives an estimated starting price
        ↓
Selects preferred date/time
        ↓
Submits cleaning request
        ↓
Just Cleaning receives the request
        ↓
Business reviews the request
        ↓
Appointment is confirmed
        ↓
Workers are assigned
        ↓
Cleaning is performed
        ↓
Job is completed
        ↓
History remains available
```

Everything we build should make this workflow easier.

If a proposed feature does not materially improve this workflow or satisfy a currently established business requirement, it should generally not enter the MVP.

---

# 3. Product Philosophy

## Simple for customers

A customer should not need instructions to request cleaning.

The public experience should feel:

- welcoming
- premium
- fast
- trustworthy
- mobile-first
- obvious

Avoid exposing internal business terminology to customers.

Avoid unnecessary fields.

Avoid making customers create accounts simply to request cleaning.

---

## Simple for the business

The Just Cleaning team is operating a cleaning company.

They should not need to become software experts to use their dashboard.

The administrative experience should prioritize:

- clarity
- today's work
- new requests
- upcoming appointments
- worker assignments
- customer information
- obvious actions

Avoid dashboards filled with decorative analytics.

Avoid enterprise-style navigation containing features the business does not need.

A useful admin screen is better than an impressive-looking complicated admin screen.

---

# 4. Users

The MVP has three important human groups.

## Customer

A customer requests cleaning.

The customer may be:

- a homeowner
- an apartment resident
- an Airbnb operator
- a business
- an office
- another commercial customer

Customers do not require accounts in the initial product.

Their primary interaction is the cleaning-request flow.

---

## Business Administrator

The administrator operates Just Cleaning.

The administrator needs to:

- receive requests
- review requests
- see customer information
- confirm appointments
- determine final pricing
- assign workers
- monitor upcoming jobs
- update job status
- cancel jobs when necessary
- review customer and job history

The administrative experience should optimize for these actions.

---

## Worker

Workers perform cleaning jobs.

There are two operational worker categories:

```text
CREW
CONTRACTOR
```

### Crew

Crew members belong to Just Cleaning's regular internal workforce.

Residential properties are handled by the company's own crew.

### Contractors

Contractors are external workers used primarily for commercial contracts.

Commercial work is commonly assigned to contractors.

Internal crew may also perform commercial work when appropriate.

The system must preserve this distinction.

---

# 5. Worker Assignment Reality

Cleaning jobs are normally performed by multiple workers.

Do not assume:

```text
1 cleaning request = 1 cleaner
```

A typical residential assignment may be:

```text
Customer:
Jane Smith

Property:
3-bedroom house

Assigned workers:
Maria
Rosa
Lucia
```

The domain must therefore support many workers assigned to one cleaning request.

Likewise, one worker may participate in many cleaning requests over time.

A single `assignedCleanerId` field on a cleaning request is not sufficient for this business.

---

# 6. Staffing Rules

The currently established business rules are:

## Residential work

Residential properties should be assigned only to:

```text
CREW
```

Residential property types currently include:

```text
HOUSE
APARTMENT
AIRBNB
```

Contractors should not be assignable to residential jobs through normal application workflows.

This restriction must eventually be enforced by authoritative server-side business logic, not merely hidden in the UI.

---

## Commercial work

Commercial properties may be assigned to:

```text
CONTRACTOR
```

or:

```text
CREW
```

Contractors are the common operational choice, but crew assignment must remain possible.

Commercial property types currently include:

```text
OFFICE
COMMERCIAL
```

The application should not prohibit crew from commercial jobs.

---

## Other properties

```text
OTHER
```

must not automatically imply residential or commercial staffing rules.

The business should review the request before assignment.

Do not silently classify `OTHER`.

---

# 7. Customer Pricing Experience

Customers should receive useful price information before submitting a request.

Just Cleaning currently uses bedroom-based starting prices for residential cleaning.

Initial business examples:

```text
1 bedroom → from $100
2 bedrooms → from $200
3 bedrooms → from $300
```

The pattern may continue for additional bedroom counts according to configured business pricing.

The product must treat these values as:

> Estimated starting prices.

They are not necessarily final quotes.

The customer-facing experience should communicate this clearly.

Example:

```text
Estimated starting price

From $200

Final pricing may vary depending on the size,
condition, service selected, and additional cleaning needs.
```

The pricing experience should help customers understand approximate cost immediately without misleading them into believing the estimate is necessarily the final invoice amount.

---

# 8. Pricing Is Business Configuration

Pricing must not be buried inside UI components.

Do not implement business rules such as:

```ts
if (bedrooms === 1) return 100;
if (bedrooms === 2) return 200;
if (bedrooms === 3) return 300;
```

inside React components.

Pricing should be modeled as configurable business data and calculated through domain/application logic.

This allows Just Cleaning to change pricing later without redesigning the application.

React may display a calculated estimate.

React should not be the authoritative source of that estimate.

---

# 9. Historical Pricing

Historical accuracy matters.

Suppose a customer submits a request when the pricing configuration is:

```text
2 bedrooms → from $200
```

The customer sees:

```text
Estimated price:
$200
```

Six months later, Just Cleaning changes its pricing:

```text
2 bedrooms → from $240
```

The historical request must still show:

```text
$200
```

because that is what the customer was shown when the request was submitted.

Therefore, the request must preserve the calculated estimate at submission time.

Do not dynamically reconstruct historical estimates from the current pricing configuration.

---

# 10. Estimate vs Final Price

The system distinguishes between:

```text
estimatedPrice
```

and:

```text
confirmedPrice
```

Example:

```text
Customer submits request

Estimated starting price:
$200
```

After review:

```text
Business determines final price:
$250
```

Both values are legitimate historical facts.

Do not overwrite the estimate with the final price.

The application should preserve:

- what the customer originally saw;
- what the business eventually confirmed.

---

# 11. Scheduling Philosophy

The public request experience is **not instant booking**.

Customers express a scheduling preference.

For example:

```text
Preferred date:
Friday

Preferred window:
10:00 AM – 12:00 PM
```

The business reviews availability before confirming the appointment.

The confirmed appointment may differ:

```text
Confirmed:
Friday
1:00 PM – 3:00 PM
```

Both pieces of information must remain preserved.

The product must distinguish:

```text
customer preference
```

from:

```text
confirmed appointment
```

Do not overwrite one with the other.

---

# 12. Cleaning Request Lifecycle

The locked MVP lifecycle is:

```text
NEW
 ↓
REVIEWING
 ↓
CONFIRMED
 ↓
ASSIGNED
 ↓
IN_PROGRESS
 ↓
COMPLETED
```

Cancellation is an alternative terminal path:

```text
NEW
REVIEWING
CONFIRMED
ASSIGNED
IN_PROGRESS
     ↓
CANCELLED
```

## NEW

The customer submitted the request.

The business has not begun processing it.

## REVIEWING

The business is reviewing:

- property details
- requested service
- pricing
- availability
- staffing

## CONFIRMED

The business has accepted the request and confirmed the appointment.

## ASSIGNED

One or more workers have been assigned.

## IN_PROGRESS

The cleaning is currently being performed.

## COMPLETED

The cleaning job has been completed.

## CANCELLED

The job will no longer occur.

Do not introduce additional lifecycle states without a demonstrated business requirement.

In particular, do not invent statuses such as:

```text
QUOTED
PAID
REFUNDED
RESCHEDULED
NO_SHOW
ARCHIVED
```

unless a future requirement explicitly needs them.

---

# 13. Services Are Configurable

Cleaning services are business data.

Initial examples include:

```text
Standard Cleaning
Deep Cleaning
Move-In / Move-Out
Office Cleaning
Airbnb Turnover
Post-Construction
```

Do not represent these as rigid application enums unless a future domain requirement explicitly justifies it.

The business should eventually be able to:

- activate a service
- deactivate a service
- reorder services
- add services

without requiring a database schema migration.

---

# 14. Extras Are Configurable

Additional cleaning options may include:

```text
Inside Oven
Inside Refrigerator
Interior Windows
Inside Cabinets
Laundry
```

These should also be modeled as configurable business data rather than application enums.

Do not assume this initial list is permanent.

Do not prematurely hardcode extra pricing unless the business explicitly defines how extras affect price.

---

# 15. Customer Notes vs Internal Notes

Customer-provided information and internal staff commentary are different concepts.

Example customer note:

```text
Please use the side entrance.
There is a dog in the house.
```

Example internal note:

```text
Customer requested Maria's team if available.
```

These must remain separate.

Internal notes must never accidentally appear in customer-facing experiences.

---

# 16. Request Identity

Every cleaning request should eventually receive a human-readable business identifier.

Example:

```text
JC-2026-0042
```

Customers and administrators should use this identifier when referring to a request.

Internal database IDs may remain implementation details.

Human-readable request numbers must be generated server-side and protected against collisions.

Do not rely on client-generated request numbers.

---

# 17. Public Website

The public website serves two purposes.

## Marketing

It should communicate:

- professionalism
- trust
- available services
- how the process works
- convenience
- service quality
- how to contact Just Cleaning

## Conversion

Its primary business CTA is:

```text
Request Your Cleaning
```

The website should lead naturally toward the cleaning-request experience.

Do not clutter the landing page with unnecessary product functionality.

---

# 18. Cleaning Request Experience

The planned public flow is approximately:

```text
Choose service
      ↓
Choose property type
      ↓
Enter property details
      ↓
See estimated starting price
      ↓
Choose extras
      ↓
Choose preferred date/time
      ↓
Enter contact/address information
      ↓
Review request
      ↓
Submit
      ↓
Confirmation
```

The final UX may evolve during implementation.

However, the underlying domain distinctions must remain intact.

The customer should be able to complete the request comfortably from a phone.

---

# 19. Admin Dashboard

The admin dashboard exists to help the business answer a few questions quickly:

```text
What needs my attention?

What cleanings are happening today?

What requests are new?

What is coming next?

Who is assigned?
```

The dashboard should therefore emphasize operational information rather than decorative analytics.

Likely primary navigation:

```text
Dashboard
Requests
Calendar
Customers
Workers
Services
Settings
```

Do not create pages simply because typical SaaS dashboards have them.

Every navigation item must have a business purpose.

---

# 20. Admin Design Philosophy

The dashboard is for a small operating business, not a corporate analytics department.

Avoid:

- unnecessary graphs
- large KPI collections
- complicated filtering systems
- dense tables when simpler layouts work
- excessive statuses
- overly technical terminology
- hidden essential actions

Prioritize:

- new requests
- today's appointments
- upcoming work
- worker assignments
- customer contact information
- service details
- clear status changes

The owner should be able to open the dashboard and understand what requires attention within seconds.

---

# 21. Mobile Matters

Both sides of the product must work well on phones.

Customers will frequently request cleaning from mobile devices.

The business owner may also check:

- requests
- appointments
- customer addresses
- worker assignments

from a phone while away from a computer.

Mobile behavior is therefore not an afterthought.

Responsive usability is an acceptance requirement for customer-facing and administrative workflows.

---

# 22. Data Integrity Principle

Do not optimize only for what the application needs to display today.

Before implementing a major domain feature, ask:

> **What historical information must this feature preserve?**

Examples include:

- original estimate vs final price
- requested appointment vs confirmed appointment
- customer notes vs internal notes
- worker assignments
- cancellation information

When a business fact changes, determine whether the old value represents meaningful history before overwriting it.

If it does, preserve the distinction explicitly.

---

# 23. Historical Business Data

The application should distinguish between:

1. **current state**, and
2. **historically meaningful facts**.

For example:

```text
Current price configuration:
2 bedrooms → $240
```

does not replace:

```text
Price shown on an old request:
$200
```

Likewise:

```text
Current confirmed appointment:
1 PM – 3 PM
```

does not replace:

```text
Customer originally requested:
10 AM – 12 PM
```

Do not erase meaningful history merely because the current state changed.

---

# 24. Domain Logic Belongs Outside React

React components should not become the authoritative implementation of business rules.

Avoid placing rules such as these directly inside components:

```text
pricing calculations
valid status transitions
worker eligibility
assignment restrictions
request-number generation
authorization
```

Components may present and invoke these behaviors.

The authoritative logic should live in appropriate domain/service modules.

This ensures the same rules apply regardless of whether an operation originates from:

- UI
- Server Action
- API
- background process
- future integration

---

# 25. Server-Side Trust Boundary

Never trust customer-provided values for authoritative business information.

For example, the browser may display:

```text
Estimated price:
$200
```

The browser may submit enough information for the server to determine the price.

But the server must independently calculate or verify the authoritative estimate before persisting the request.

Do not trust a hidden field containing:

```text
estimatedPrice = 200
```

simply because the UI sent it.

The same principle applies to:

- request status
- confirmed pricing
- worker eligibility
- assignments
- privileged administrative fields

---

# 26. Validation

Inputs should be validated at appropriate application boundaries.

Do not rely exclusively on:

- HTML `required`
- TypeScript types
- Prisma types
- UI restrictions

Server-side validation must protect persisted business data.

Where practical, shared validation schemas should prevent unnecessary duplication between client and server behavior.

Validation rules that depend on business state should remain in the appropriate service/domain layer.

---

# 27. Security

Administrative functionality must require authentication and authorization before production launch.

Public customers must never be able to:

- access the admin dashboard
- read other customers' requests
- change request statuses
- set confirmed prices
- assign workers
- read internal notes
- access private worker information

Do not rely solely on hidden navigation or client-side checks.

Authorization must be enforced server-side.

---

# 28. Personal Data

Cleaning requests contain personal information, potentially including:

- customer names
- phone numbers
- email addresses
- home addresses
- scheduling information
- access instructions

Treat this data as private.

Do not expose it unnecessarily in:

- logs
- URLs
- client bundles
- public APIs
- error messages

Do not use real customer information in development seed data.

Use fictional data for development and testing.

---

# 29. Architecture

Prefer clear domain boundaries over premature abstraction.

Likely application areas may eventually include:

```text
services/
  cleaning-request.service.ts
  cleaning-pricing.service.ts
  cleaning-assignment.service.ts

lib/
  validations/
  auth/

app/
  request-cleaning/
  admin/
```

Exact structure may evolve with the repository.

Do not force this exact directory structure if the repository already has a coherent architecture.

Inspect the project first.

Do not create generic abstractions merely because several functions look similar.

Optimize for:

- readability
- domain correctness
- testability
- maintainability

---

# 30. Database Modeling Philosophy

The schema should represent business concepts explicitly.

Prefer:

```text
CleaningRequest
Worker
CleaningAssignment
PricingRule
CleaningService
CleaningExtra
```

over generic abstractions that obscure meaning.

Do not prematurely generalize the application into reusable SaaS infrastructure.

Just Cleaning is the product being built.

If future projects reuse concepts, reuse should happen deliberately rather than weakening the current domain model.

---

# 31. Worker Assignment Modeling

Because multiple workers commonly perform the same job, assignments should be represented through an explicit relation.

Conceptually:

```text
Cleaning Request
      │
      ├── Maria
      ├── Rosa
      └── Lucia
```

A worker can also belong to many cleaning jobs:

```text
Maria
  ├── Request A
  ├── Request B
  └── Request C
```

Do not model this domain with a single nullable worker field on the cleaning request.

---

# 32. Assignment History

The initial implementation may distinguish current assignments from historical assignment changes.

Before implementing assignment mutation behavior, perform a domain audit:

> If a worker is removed or replaced, does the business need to know that the worker was previously assigned?

If yes, preserve that history explicitly.

Do not assume deleting an assignment row is always sufficient.

This decision belongs to the ticket that implements assignment lifecycle behavior.

---

# 33. Pricing Engine Philosophy

The pricing engine should be:

- deterministic
- server-verifiable
- configurable
- simple enough to explain
- testable independently from the UI

For MVP residential pricing, bedroom count is the currently established pricing input.

Do not invent sophisticated pricing factors without business confirmation.

Potential factors such as:

```text
square footage
bathroom count
distance
cleaning frequency
property condition
extras
service type multipliers
```

should not automatically affect the estimate unless Just Cleaning defines those rules.

---

# 34. Commercial Pricing

Commercial jobs may not naturally fit the residential bedroom-based pricing model.

Do not force bedroom pricing onto commercial requests.

If commercial pricing requires manual review, the system should support that reality rather than inventing an automatic estimate.

A later pricing ticket should explicitly define what the customer sees for:

```text
OFFICE
COMMERCIAL
OTHER
```

before implementation.

Do not silently fabricate a commercial price formula.

---

# 35. Services and Pricing Are Different Concepts

A cleaning service describes:

> What kind of cleaning does the customer need?

Examples:

```text
Standard Cleaning
Deep Cleaning
Move-In / Move-Out
Office Cleaning
```

A pricing rule describes:

> How is a starting estimate calculated?

Do not merge these concepts unnecessarily.

Future pricing may depend on service type, but that relationship should only be introduced when the business rule is known.

---

# 36. Request Submission Is a Business Event

Submitting a request should eventually result in an authoritative server-side operation.

A valid submission should:

1. validate customer input;
2. resolve the selected service;
3. validate selected extras;
4. calculate or verify the estimate;
5. generate the request number;
6. persist the request;
7. preserve the estimate shown to the customer;
8. preserve scheduling preference;
9. return a stable confirmation result.

Do not allow UI state alone to determine whether a cleaning request exists.

---

# 37. Customer Confirmation

After a successful request, the customer should receive a clear confirmation experience.

It should communicate:

- request received
- request number
- requested service
- preferred appointment
- estimated starting price when applicable
- that the appointment still requires confirmation
- what happens next

Avoid ambiguous messages such as:

```text
Booking confirmed!
```

when the business has not actually confirmed availability.

Prefer language equivalent to:

```text
Your cleaning request has been received.

We'll review the details and confirm your appointment shortly.
```

---

# 38. Notifications

Customer and business notifications are important but should follow the authoritative business operation.

Do not design the core request lifecycle around whether an email succeeds.

Eventually:

```text
Request persisted successfully
        ↓
Notification attempted
```

should be conceptually safer than:

```text
Send email
        ↓
Maybe save request
```

A notification failure should not create duplicate cleaning requests when retried.

Notification implementation belongs to its own ticket.

---

# 39. Authentication

The public request experience should not require authentication.

Admin functionality should.

Do not introduce customer accounts in the MVP simply to support request submission.

The business administrator needs secure access to operational information.

Worker login is not currently an established MVP requirement.

Do not build worker authentication unless a later ticket explicitly introduces it.

---

# 40. Admin Language

The administrative dashboard may eventually need Spanish support depending on the business's operational preference.

However, language behavior should be introduced intentionally.

Do not scatter hardcoded language logic throughout components.

If multilingual admin support becomes a locked requirement, define the localization strategy before implementing many dashboard screens.

---

# 41. Implementation Ticket Discipline

Development should proceed through small, narrowly scoped tickets.

A ticket should normally have one primary responsibility.

Prefer:

```text
Schema
```

then:

```text
Seed data
```

then:

```text
Pricing engine
```

then:

```text
Request creation
```

rather than one ticket that implements:

```text
schema + service + API + form + dashboard
```

This makes changes easier to:

- understand
- review
- test
- debug
- revert

Do not implement future tickets opportunistically unless required to correctly complete the current ticket.

---

# 42. Ticket Scope Discipline

When implementing a ticket:

- inspect the repository first;
- identify the smallest required change;
- preserve existing functionality;
- avoid unrelated refactors;
- avoid speculative abstractions;
- do not silently expand scope.

If completing the ticket reveals a legitimate prerequisite or domain problem, report it clearly.

Do not hide consequential design changes inside implementation details.

---

# 43. Testing Philosophy

Business rules deserve tests.

High-value examples include:

- correct bedroom pricing
- historical estimate preservation
- residential contractor rejection
- commercial crew assignment allowed
- multiple workers per request
- invalid lifecycle transitions rejected
- request-number uniqueness
- cancellation behavior
- unauthorized admin access rejection

Prefer testing business behavior rather than implementation details.

Do not write tests merely to increase test counts.

Tests should protect decisions we care about.

---

# 44. Concurrency and Duplicate Actions

Administrative and customer workflows may eventually encounter repeated actions.

Examples:

- customer double-clicks submit
- administrator confirms the same request twice
- two admins modify the same request
- duplicate assignment attempts
- duplicate request-number generation

Where relevant, protect authoritative writes against duplicate or conflicting operations.

Do not assume client-side button disabling alone guarantees correctness.

Concurrency safeguards should be introduced where the corresponding mutation behavior is implemented.

---

# 45. Error Handling

Errors should be useful without exposing sensitive implementation details.

Customer-facing failures should explain what the customer can do next.

Admin failures should clearly identify the failed operation.

Avoid displaying:

- database errors
- Prisma internals
- stack traces
- environment details
- SQL errors

to end users.

Log enough information for diagnosis while protecting customer data.

---

# 46. Empty States

Empty states are part of product quality.

Examples:

```text
No new requests
No cleanings scheduled today
No workers assigned yet
No upcoming appointments
```

They should clearly communicate:

- what the state means;
- whether action is required;
- what the user can do next.

Do not leave large blank areas with no explanation.

---

# 47. Loading States

Important user actions should communicate progress.

Examples include:

- submitting a cleaning request
- updating status
- assigning workers
- confirming an appointment

Prevent confusing duplicate actions while a request is being processed.

Do not make the user wonder whether a button worked.

---

# 48. Accessibility

Public and admin experiences should use semantic HTML and accessible controls.

At minimum:

- form fields require visible labels;
- buttons need meaningful text or accessible labels;
- keyboard navigation must work;
- focus states should remain visible;
- color should not be the only indicator of status;
- validation errors should be understandable;
- mobile controls should have usable touch targets.

Accessibility should be built into components rather than treated as final polish.

---

# 49. Avoid Premature Complexity

The first production version does not currently require:

- customer accounts
- worker mobile application
- payroll
- contractor payments
- GPS tracking
- route optimization
- automatic dispatch
- recurring-cleaning subscriptions
- sophisticated analytics
- accounting
- invoicing engine
- online payment processing
- real-time chat
- AI scheduling
- complex RBAC
- franchise management
- multi-company SaaS tenancy

Do not introduce infrastructure for these hypothetical features unless a later ticket explicitly requires it.

---

# 50. Product Quality Standard

This project should not merely be technically functional.

It should feel intentionally designed.

Customer-facing experiences should have:

- excellent spacing
- clear hierarchy
- useful loading states
- useful error states
- useful empty states
- obvious actions
- polished confirmation experiences
- responsive layouts
- accessible controls
- concise copy

Administrative screens should prioritize speed and comprehension.

The owner should be able to understand what requires attention within seconds.

---

# 51. Definition of Exceptional

Exceptional does **not** mean more features.

For this project, exceptional means:

```text
Customer opens website
        ↓
Immediately trusts the business
        ↓
Understands the services
        ↓
Requests cleaning without confusion
        ↓
Sees useful pricing
        ↓
Receives clear confirmation
```

while internally:

```text
Business receives request
        ↓
Immediately understands it
        ↓
Confirms the appointment
        ↓
Assigns the appropriate crew
        ↓
Tracks the job
        ↓
Completes it
        ↓
Can find the history later
```

If we accomplish those two workflows exceptionally well, the product succeeds.

---

# 52. MVP Success Criteria

The initial product is successful when a real customer can:

1. visit the website;
2. understand what Just Cleaning offers;
3. select a cleaning service;
4. describe their property;
5. receive an estimated starting price when applicable;
6. choose a preferred appointment;
7. submit their request;
8. receive confirmation;

and Just Cleaning can:

1. see the new request;
2. review its details;
3. determine or confirm pricing;
4. confirm an appointment;
5. assign multiple eligible workers;
6. see upcoming work;
7. move the job through its lifecycle;
8. complete or cancel the job;
9. retain useful customer and job history.

That is the product we are building.

---

# 53. Delivery Strategy

The project is being developed on a short production timeline.

Do not interpret this as permission to compromise domain correctness.

Instead:

> **Keep scope small and correctness high.**

The desired implementation sequence is broadly:

```text
Domain foundation
        ↓
Configurable business data
        ↓
Pricing engine
        ↓
Public request creation
        ↓
Customer confirmation
        ↓
Admin foundation
        ↓
Request operations
        ↓
Worker assignments
        ↓
Scheduling
        ↓
Notifications
        ↓
Polish and production launch
```

Exact ticket numbering may evolve.

The principle should not.

---

# 54. Short Timeline Principle

When faced with a choice between:

```text
10 shallow features
```

and:

```text
5 complete, understandable, reliable features
```

prefer the latter.

The product can grow after launch.

Its foundations should not need to be rewritten because already-known business realities were ignored.

---

# 55. Current Locked Domain Decisions

The following decisions are currently considered established requirements:

## Request lifecycle

```text
NEW
REVIEWING
CONFIRMED
ASSIGNED
IN_PROGRESS
COMPLETED
CANCELLED
```

## Worker categories

```text
CREW
CONTRACTOR
```

## Residential staffing

```text
Residential → CREW only
```

## Commercial staffing

```text
Commercial → CONTRACTOR or CREW
```

## Multi-worker jobs

```text
One request → multiple workers
```

## Residential starting-price concept

```text
1 bedroom → from $100
2 bedrooms → from $200
3 bedrooms → from $300
```

## Historical pricing

```text
estimatedPrice ≠ confirmedPrice
```

## Historical scheduling

```text
preferred appointment ≠ confirmed appointment
```

## Services

```text
Configurable data
Not rigid enum values
```

## Extras

```text
Configurable data
Not rigid enum values
```

These decisions should not be casually reversed inside implementation tickets.

If implementation reveals a genuine conflict, surface it before changing the domain.

---

# 56. Known Questions That May Require Future Business Confirmation

Not every future decision should be guessed today.

Examples that may require confirmation include:

- how commercial estimates should work;
- whether extras affect automatic pricing;
- whether bathroom count affects pricing;
- how rescheduling history should be preserved;
- whether removed worker assignments require immutable history;
- whether worker compensation belongs in the system;
- whether recurring customers should be able to repeat old requests;
- whether email, SMS, or WhatsApp is the primary notification channel;
- whether administrators need more than one permission level;
- whether customers will eventually pay online.

Do not silently invent answers to these questions.

Address them when the corresponding feature becomes necessary.

---

# 57. Instruction to Future Implementation Tickets

Before implementing any substantial ticket:

1. Read this document.
2. Read the implementation ticket.
3. Inspect the existing repository rather than assuming its architecture.
4. Identify any conflict between the requested implementation and the established domain.
5. Ask:

   > **What historical information must this feature preserve?**

6. Preserve meaningful historical business facts where required.
7. Keep implementation within the ticket's scope.
8. Do not silently invent business rules.
9. Surface genuine domain ambiguity before encoding a consequential assumption.
10. Keep authoritative business rules outside presentation components.
11. Validate authoritative mutations server-side.
12. Run relevant existing tests after implementation.
13. Report deviations, discoveries, and unresolved concerns clearly.
14. Do not opportunistically implement later-ticket functionality.

---

# 58. Guiding Domain Question

For every significant feature, ask:

> **What historical information must this feature preserve?**

This question should guide:

- schema design
- service behavior
- lifecycle mutations
- scheduling
- pricing
- assignments
- cancellations
- future reporting

Do not sacrifice historical correctness merely because overwriting a field is easier.

---

# 59. Guiding Product Principle

The central product principle is:

> **Make requesting cleaning effortless for the customer and coordinating cleaning effortless for the business.**

Every major product and engineering decision should ultimately support that goal.

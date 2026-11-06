# Cosmetics Express Studio

A Hebrew-first, RTL marketing studio for Israeli beauty clinics. Built with Next.js App Router, TypeScript, React, Tailwind CSS, Supabase and OpenAI image generation.

## Run the local demo

For the guided local launcher, extract the downloadable project ZIP, install Node.js 24 LTS, then open `start-demo.cmd` (Windows) or `start-demo.command` (macOS). The `START-HERE.html` guide contains Hebrew instructions. Alternatively run `npm run demo` from the project directory. The launcher installs locked dependencies on first use, seeds a fresh local demo without resetting existing data, binds only to loopback and opens the browser. It does not overwrite `.env` files. `npm run demo -- --port 3001` selects another local port; `--no-open` skips automatic browser opening. No domain, hosting account, payment or API credentials are needed.

Use **Node.js 24 LTS** and npm 11. The local demo uses Node's built-in SQLite database. Use the existing checkout; cloud tasks are already isolated, so no additional worktree is needed.

```sh
npm ci
cp .env.example .env.local  # only when you do not already have local configuration
APP_MODE=demo npm run seed
npm run dev
```

Open the app on port 3000 and choose **לסיור בסטודיו** or **כניסה לסטודיו לדוגמה**. Alternatively, log in with `hello@demo.studio` / `StudioDemo2026!`. This demonstration account has platform-admin access. New signups are ordinary clinic accounts, with their own data and 30 credits.

The demo persists data in `.data/studio.sqlite` and uploads in `.data/<clinic-id>/`. Seeding is transactional and repeatable; it never resets an existing account. `STUDIO_DATA_DIR` can point to an isolated directory for tests. Back up this directory if you want to retain demo work. Demo mode is for a **single local instance**, not a hosted multi-instance SaaS.

**Demo disclosure:** image generation uses labeled, original SVG illustrations and consumes a **demo credit**, without an OpenAI call or charge. It exercises reservation, history, rendering and quota logic. Sample campaigns are pre-seeded at zero usage. Demo artwork is not evidence of AI image quality. Do not expose demo mode publicly: its published demo login is intentionally accessible.

```sh
npm run build
npm run start
curl --fail http://localhost:3000/api/health
```

## Implemented workflows

- Public home, pricing, signup, login and Supabase email confirmation.
- Dashboard with live account counts, activity, leads and remaining credits.
- Three-step campaign wizard: treatment, objective, offer, audience, mood and visual direction. An explicit choice separates a new visual from free editing.
- Master-image generation, version history, structured prompts and prompt-version metadata.
- Hebrew editor: headline, subheadline, price, CTA, phone, logo, text color, background overlay, alignment, presets, vertical positioning and safe areas.
- Reuse one master in **1080×1350 post**, **1080×1920 story** or **1080×1080 square**. PNG and JPG exports are rendered in the browser with Hebrew text and same-origin images. Downloads save current overlay edits first.
- Automatically created landing-page drafts; editable copy, benefits, FAQ, CTA, color and publishing toggle. Public `/p/<slug>` pages include phone, `wa.me`, consent, lead form and thank-you state.
- Tenant-scoped lead search, campaign/status filters, notes, five status values and UTF-8 CSV export with spreadsheet-formula escaping.
- Clinic profile and validated raster-logo uploads (PNG/JPG/WebP, 2 MB maximum).
- Usage and plan screen; platform-admin clinic list, monthly completed generations, current cycle usage, bonus-credit grants and suspension.

## Architecture

| Area                                             | Location                              |
| ------------------------------------------------ | ------------------------------------- |
| Authenticated routes                             | `app/app/`                            |
| Public landing pages                             | `app/p/[slug]/`                       |
| Auth, public lead and app mutations              | `app/api/[...path]/route.ts`          |
| Checked image delivery                           | `app/api/assets/[id]/route.ts`        |
| Supabase cookie refresh                          | `proxy.ts`                            |
| Server-side auth and tenant-scoped repository    | `lib/auth.ts`, `lib/store.ts`         |
| Prompt builder and generation provider           | `lib/prompts.ts`, `lib/generation.ts` |
| Atomic local usage engine                        | `lib/local-usage.ts`                  |
| Local relational database and seed               | `lib/local-db.ts`                     |
| Supabase production schema, RLS and transactions | `supabase/migrations/001_studio.sql`  |
| Reusable editor, landing and workflow UI         | `components/`                         |

The runtime defaults to the **production path** unless `APP_MODE=demo` is explicitly set. It never silently falls back to demo authentication or artwork when credentials are unavailable. API inputs are validated with Zod. Mutating requests require a same-origin `Origin` matching `APP_URL`. Authentication, generation and public lead submissions are rate-limited in the database. Production deployments must put the server behind a trusted proxy which **overwrites** `X-Forwarded-For`; otherwise this header is not a reliable rate-limit identity.

### Credit correctness

Every clinic starts with a 30-image monthly allowance. Billing cycles are UTC calendar-month intervals anchored to signup, with month-end clamping. Display dates use Israel time. Cycle rollover happens transactionally on access, resets usage and expires manual bonus credits. A payment provider can set the authoritative cycle dates later.

Generation reserves a credit **before** calling the provider. PostgreSQL locks the subscription row; SQLite uses `BEGIN IMMEDIATE`. The unique clinic/request idempotency key prevents retries from spending twice, and reusing a key on a different campaign is rejected. Pending requests count toward quota. Success atomically commits the asset version and updates the campaign's master image. Provider failure refunds exactly once. Reservations abandoned by a process restart expire after 15 minutes and are recovered when usage is accessed. A late failure cannot decrement a different billing cycle. Expired reservations cannot complete afterward.

Editing endpoints cannot mutate the generation ledger, counters, clinic ownership or visual prompt fields. Output-format switching, restoring an asset version, downloading, landing-page editing and lead management remain available at zero credits. Production authenticated clients have no direct write access to subscription counters, generation records or admin membership. Only the server service role can finalize/refund a generation. Database foreign keys and RLS prevent cross-clinic references; image routes independently verify ownership or a published campaign's current asset. Private storage paths must belong to the clinic.

## Connect production Supabase + OpenAI

Local demo is fully usable without credentials. To activate live services:

1. Create a Supabase project. Run `supabase/migrations/001_studio.sql` once in its SQL editor, or use the Supabase CLI migration workflow. The migration creates relational tables, indexes, signup provisioning, RLS, protected RPCs and the private `studio-assets` storage bucket. Supabase `auth.users` is the canonical production user table.
2. Configure server environment variables securely:

   | Variable                        | Purpose                                                                        |
   | ------------------------------- | ------------------------------------------------------------------------------ |
   | `APP_MODE=production`           | Disables all demo authentication and sample generation                         |
   | `APP_URL`                       | Canonical HTTPS application origin, without trailing slash                     |
   | `NEXT_PUBLIC_SUPABASE_URL`      | Your project URL                                                               |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public project key; access remains constrained by RLS                          |
   | `SUPABASE_SERVICE_ROLE_KEY`     | Server-only storage, rate-limit, lead-write and generation-finalization access |
   | `OPENAI_API_KEY`                | Platform-owned server key; customers never supply their own                    |
   | `OPENAI_IMAGE_MODEL`            | Optional; defaults to `gpt-image-1`                                            |

3. In Supabase Auth, enable email/password, set the site URL to `APP_URL` and allow `APP_URL/auth/confirm`. The app supports PKCE confirmation codes and `token_hash` links. For server-side confirmation templates, use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`. Configure a production mail provider and test signup, confirmation, session refresh and logout on the hosted instance.
4. Provision admins **only through trusted database administration**:

   ```sql
   insert into public.platform_admins(user_id)
   values ('<existing-auth-user-uuid>');
   ```

   Client metadata is never accepted as an admin grant. Normal signups cannot access admin controls.

5. Rebuild in production configuration (`npm ci && npm run build`) and run `npm run start`. Use Node.js hosting that supports at least a 180-second API request timeout for image generation. A low-timeout serverless tier needs a durable job worker before enabling real generation. Private images are delivered through the app, not public storage URLs. Storage paths left by a failed finalization can be pruned by an operational cleanup job.
6. Allow outbound HTTPS to `api.openai.com` and your exact `<project-ref>.supabase.co` hostname, in addition to npm/package-manager domains. Demo mode needs none of these service destinations. Preserve TLS verification. In the managed environment, platform-reserved `OPENAI_` names may not be supported by proxy-secret declarations; supply this server variable via a supported secure deployment environment binding instead. Never put credentials in chat, browser variables or source files.

Production calls use OpenAI's image API from the backend, request one high-quality 1024×1536 PNG and store the result privately. The AI only produces the master visual; Hebrew text, price, CTA, phone and logo are always app-rendered overlays. Visual direction is treated as untrusted preference text inside the server prompt. Prompts ask for adult subjects, realistic anatomy, no text/watermarks, negative space and no exaggerated medical claims. Review generated artwork before publishing; model compliance and typography are not guaranteed by prompting alone.

## Validation

```sh
npm run typecheck
npm test
# Install once if Chromium is not already available:
npx playwright install chromium
npm run build
npm run test:e2e
# Or use an existing system browser:
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Backend tests cover exact quota enforcement, request idempotency, failure refunds, abandoned leases, cycle rollover, suspension, foreign-key isolation, password hashing, prompt constraints and safe CSV. PostgreSQL tests execute the **unmodified production migration** with PGlite (embedded PostgreSQL), against small stand-ins for Supabase-owned auth/storage schemas, and exercise actual RLS and RPC permissions. These do not validate Supabase's hosted Auth/Storage HTTP services.

Playwright runs the production server in explicit demo mode with a separate `.data/e2e` database. It exercises signup/auth, tenant access denials, CSRF and input validation, campaign creation, generation confirmation, credit accounting, Hebrew edits, PNG dimensions for all three formats, JPG signatures, landing-page publishing, consented lead capture, status updates, CSV, responsive navigation and browser errors. Screenshots and failure traces are written to ignored `test-results/`. Stop an existing development server before running the isolated suite; it owns port 3000 by default.

## What remains before a public launch

- **Live credentials and hosted integration verification:** the requested local demo does not contact OpenAI or Supabase. Hosted auth, email delivery, image storage and real image quality must be checked with your actual project.
- **Payments:** no money is collected. Starter and Pro are modeled, but both currently default to 30 images. Subscription dates/status are data, not payment-provider webhooks. Add checkout, signed idempotent webhooks and entitlement reconciliation before selling paid plans.
- **Operations:** add a durable generation queue for short-timeout hosting, monitoring, daily stale-reservation/storage cleanup, tested backups and retention/deletion workflows for leads and account data.
- **Account lifecycle:** self-service password recovery, team invitations, cancellation and account deletion are not implemented. Supabase supports these; add verified product flows before launch.
- **Legal/content:** review Israeli privacy and accessibility requirements, clinic consent wording and treatment advertising. No medical outcome is promised by the supplied copy.

No Facebook/Meta API, CRM, chatbot, WhatsApp API or third-party customer-account integration is included. WhatsApp uses ordinary `wa.me` links only.

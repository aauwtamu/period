# Maintenance and deployment

A public campus period-product tracker for Texas A&M. Google Sheets is the source
of truth; student leads can edit inventory without changing application code.

## Run locally

Use Node 22.13+ (or a current Node 24 release). Copy `.env.example` to
`.env.local`, fill in the server credentials listed below, then run:

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The app uses Next.js App Router,
TypeScript, Tailwind, Framer Motion, Lucide, Zod, and the Google Sheets client.
Geist and Nunito are downloaded at build time by next/font and served by the app.

Required read credentials: `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, and
`SPREADSHEET_ID`. Share the spreadsheet with the service account. The private key
accepts either actual line breaks or escaped `\n`. Never use `NEXT_PUBLIC_` for
these values or commit `.env.local`.

## Spreadsheet setup

The setup script previews changes by default:

```sh
npm run sheets:setup
npm run sheets:setup -- --apply
```

It validates existing inventory, backs up `Sheet1`, renames it `Bathrooms`, adds
permanent IDs, converts flag values to checkboxes, and creates `Log` and `Summary`.
It preserves unrelated tabs, rejects duplicate IDs and unfamiliar columns, and
does not overwrite an existing log or summary with a different schema. The apply
operation is a single Google Sheets batch. Stop app writes while running a schema
migration. Re-running setup preserves existing IDs, counts, and audit entries.

The live sheet was migrated during initial implementation: 15 bathrooms were
preserved, a backup was created, and Sheet2 was left intact.

### Bathrooms columns

`ID`, `Building`, `Room`, `Floor`, `Pads`, `Tampons`, `Liners`, `Other`, `Supplier`,
`Socials`, `Needs Restock`, `Latitude`, `Longitude`, `Last Updated`.

Columns are read by header name; keep names unique and unchanged. Counts must be
whole numbers at least zero. Leave optional coordinates/socials blank if unknown.
Missing coordinates place a bathroom last in proximity sorting. Date-only legacy
timestamps remain dates; app updates use UTC ISO timestamps.

Unused rows containing only unchecked checkbox cells are ignored. Other malformed
rows cause an unavailable-data state so the app never invents stock counts.

### Student-lead workflow

- Admins edit the **Bathrooms** tab. The dated **Inventory backup** tab is a
  recovery copy from setup, not live inventory. Keep it for recovery or hide it
  to avoid confusion; the app does not read it. Sheet2 is also unused by the app.
- Restock by editing the product counts in Bathrooms. Set Last Updated to an ISO
  timestamp such as `2026-09-27T15:00:00Z` to record when you checked it.
- Enter the total now present (for example, 4 remaining + 20 added = 24).
- Uncheck Needs Restock after the restock is complete. The app marks a location
  as needing restock whenever pads, tampons, and liners are each 3 or fewer;
  raise the counts above that threshold to clear the automatic status.
- To add a location, supply a new permanent ID such as `ZACH-W204`, building,
  room, and all four counts. IDs must be unique and should not change afterward.
- Keep product counts editable. Do not replace them with formulas.
- Public changes become visible immediately to the person making them; manual
  edits normally reach an open page within about 60 seconds.
- Log is hidden to reduce clutter. Unhide it in Sheets to audit takes and reports.
  Do not delete or edit log entries: they also prevent duplicate retries.
- Summary!B2 totals items taken since launch. Restocks, reports, and manual count
  corrections do not increase that total. No historical distribution is assumed.

## Enable public updates

Follow [the Apps Script deployment guide](../apps-script/README.md), then configure:

- `SHEETS_WRITER_URL`: the deployed Google Apps Script `/exec` URL.
- `SHEETS_WRITER_SECRET`: the same random secret stored in Script Properties.

Restart the app after changing environment variables. Without these two settings,
the dashboard reads normally, but take/report requests return an unavailable
message and make no changes. Deploying the writer requires a Google account that
can edit the sheet; a service-account key alone does not deploy it as that owner.

## How data moves

- The server reads Bathrooms and Summary through googleapis. Only normalized public
  inventory is sent to the browser. Google auth and the writer secret remain server-only.
- A 30-second in-memory cache coalesces reads within each Vercel instance. It is
  not a global cache or a guarantee of a fixed total API request rate.
- The visible dashboard refreshes every 30 seconds and on returning to the tab.
  Search and building filters are preserved; failed refreshes mark old counts stale.
- `decrementItem` and `flagBathroom` are public Server Actions. Zod validates input;
  Apps Script repeats validation and reads current counts under its script lock.
- A single batch updates the stock/flag, timestamp, and Log. Each Take press
  records one item; the browser allows five confirmed presses per bathroom visit.
  The writer also accepts validated quantities of 1–5. Request IDs make retries
  idempotent. An uncertain response presents a retry button for the same
  operation; do not reload while resolving that retry.
- A take that leaves pads, tampons, and liners at 3 or fewer flags the sheet in
  the same batch. Direct edits to a bound Bathrooms sheet also flag low stock.
- Successful writes invalidate the current server instance's read cache and
  revalidate the page. Older snapshots cannot undo a confirmed client update.
- Geolocation is requested on click and stays in the browser. Denial silently
  leaves alphabetical sorting. The visit limit uses session storage and resets
  in a new tab; logs support review rather than preventing abuse.
- Script locks coordinate app writes, not simultaneous human edits in Sheets.

## Verification

```sh
npm test
npm run lint
npm run build
```

Unit tests execute the deployable Code.gs with a fake Google API and cover the
atomic batch, duplicate IDs, last-item contention, busy locks, reports, errors,
normalization, migration, cache expiry, distances, and quantity validation.

Read-only browser checks need a running app with a populated sheet:

```sh
npx playwright install chromium
npm run test:e2e
```

Set `PLAYWRIGHT_BASE_URL` to test another local/preview URL. On Windows, use an
installed Edge browser by setting `PLAYWRIGHT_CHANNEL=msedge`. The checks cover
desktop/mobile layouts, search, building filters, denied geolocation, and report
dialog keyboard focus. They do not submit inventory writes.

Before public launch, verify the deployed writer on a separate test spreadsheet
using the checklist in [the writer guide](../apps-script/README.md). Keep preview
and production sheet IDs, writer URLs, and secrets paired correctly.

## Vercel deployment

Import this repository as a Next.js project. Set the five server environment
variables above, select Node 22 or later, then build. Use a separate test sheet and
writer in Preview environments. Do not publish an app wired to test or production
writes until the deployed writer checks pass. No cron job or database is required.
If the production domain changes, update `brand.siteUrl` in `lib/branding.ts`
and the link in the root README.

## Branding handoff

The active logo and flower are in `public/branding/`, the landing illustration is
in `public/illustrations/`, and the product photos are in
`public/images/products/`. The browser icon and social preview are `app/icon.png`
and `app/opengraph-image.png`. Asset paths, sponsor links, and the request form
link are configured in `lib/branding.ts`. Replace an image in its existing path
when updating the artwork; unused source exports are not needed in the repo.

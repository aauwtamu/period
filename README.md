# tamuperiod.

Free period products on the Texas A&M University campus. Find a bathroom, check
what is stocked, and tap **Take** so the team knows when to restock.

**[Open tamuperiod.](https://tamuperiod.vercel.app/)**

## Built with

Next.js, React, TypeScript, and Tailwind CSS power the site. Google Sheets stores
the inventory, a small Apps Script records takes and restock requests, and Vercel
hosts the app.

## Run locally

Use Node.js 22.13 or later. Copy `.env.example` to `.env.local`, fill in your own
Google Sheets credentials and writer settings, then run:

```sh
npm ci
npm run dev
```

See [maintenance and deployment](docs/maintenance.md) for setup, testing, and
inventory operations. The [Apps Script guide](apps-script/README.md) covers the
writer deployment.

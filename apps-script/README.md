# Deploy the tamuperiod. writer

The Next.js server reads Sheets as the service account. Public writes go through
this owner-deployed Apps Script so every Vercel instance shares one write lock.
The browser never receives the endpoint secret or service-account credentials.

## One-time setup

1. Run the spreadsheet migration described in the root README first.
2. Sign into an organization-controlled Google account that can edit the sheet.
   In the spreadsheet, choose **Extensions → Apps Script**.
3. Replace the editor's `Code.gs` with this folder's `Code.gs`.
4. Open **Project Settings**, enable **Show appsscript.json manifest file in editor**,
   and replace that manifest with this folder's `appsscript.json`.
   The manifest enables the advanced Google Sheets service. If the project uses
   a custom Google Cloud project, also enable the Google Sheets API in that project.
5. In **Project Settings → Script Properties**, add:

   | Property               | Value                                  |
   | ---------------------- | -------------------------------------- |
   | `SPREADSHEET_ID`       | The same ID as the Next.js app         |
   | `SHEETS_WRITER_SECRET` | A new random secret, at least 32 bytes |

   Generate a secret locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   Copy it directly into Script Properties and `.env.local`; do not commit it.

6. Choose **Deploy → New deployment → Web app**:
   - Execute as: **Me** (the organization account).
   - Who has access: **Anyone**. The script validates the secret on every request.
   - Authorize the requested spreadsheet permission.
7. Copy the deployed `/exec` URL into `SHEETS_WRITER_URL` in `.env.local` and Vercel.
   Add the matching `SHEETS_WRITER_SECRET`. Restart the local server after changing env.
8. For code updates, use **Deploy → Manage deployments → Edit → New version**.
   Keep one production script project/deployment: locks are scoped to the script.

Deploy the updated writer before releasing the Take button update. Its first take
adds the Log `Quantity` header and updates the Summary formula in the same batch.
Existing takes without a quantity continue to count as one. Running
`npm run sheets:setup -- --apply` also updates those two cells after preview.

If the organization's Workspace policy does not allow access by Anyone, this
deployment approach needs an administrator's change or a different writer host.
An endpoint requiring an interactive Google login will not work for server calls.

## Verify on a separate test spreadsheet

### Renaming the restock column on an existing deployment

Rename the live Bathrooms header `Need Replacement` to `Needs Restock` when
switching to the updated app and Apps Script. Deploy `Code.gs` using
**Manage deployments ? Edit ? New version**. The header must match exactly;
there is no fallback for the old name. No inventory migration or new backup is
needed for this header-only change. Reports now request restocks only; existing
audit entries remain intact.

Create a test spreadsheet owned by a human account, share it with the service
account, and add a test bathroom with one pad and an unchecked restock flag.
Use the same headers as Bathrooms. Run `npm run sheets:setup -- --spreadsheet-id=TEST_ID --apply`.
Deploy a **separate test copy** of this script pointed at that ID, with a different
secret. Point a local/preview app at the test sheet and test writer together.

- Take up to five pads: stock decreases by that amount, Last Updated changes, and one `take` log records the quantity.
- Retry the same request ID: no second decrement or audit entry.
- Send two different take requests together with one remaining item: one succeeds,
  one returns `EMPTY`; stock remains zero.
- Request a restock: checkbox becomes true, one report is logged, and the
  distribution count does not increase. A second report is a no-op.
- An incorrect secret returns `UNAUTHORIZED` and changes nothing.
- Correct a count manually and verify the app refreshes within roughly 60 seconds.

The local automated suite executes this exact Code.gs source against a fake Sheets
API. It verifies batch contents and lock/error paths, but is not a substitute for
this deployed integration check.

## Operations and limits

- Keep **Log** append-only. Request IDs support retry safety; deleting entries
  removes both audit history and duplicate protection.
- `Summary!B2` totals quantities from `take` events; historical log entries without a quantity count as one. Reports do not increase the count.
- The script lock covers app writes only. It cannot lock a human editing the same
  spreadsheet cell simultaneously. Avoid editing a cell during a pending app update.
- A write uses one Sheets batch for stock/flag, timestamp, and audit row.
  If its result is uncertain, the app retains the request ID for the retry.
- When pads, tampons, and liners are each 3 or fewer, the app shows Needs restock
  and Reported. A take sets the sheet flag in its batch; the bound-sheet `onEdit`
  trigger also sets it after manual count changes. Existing low-count rows show
  the status immediately in the app; their checkbox is set on the next take or edit.
- The writer enforces a maximum of five items per take request. This is a per-request limit, not authentication or abuse prevention.
- Read and audit scans suit a small campus deployment. Monitor Google quotas and
  request times as the log grows; do not archive/delete logs without preserving
  the distribution total and idempotency records.
- Never log request bodies, shared secrets, or full Google error objects.

References: [Web app deployment](https://developers.google.com/apps-script/guides/web),
[script locks](https://developers.google.com/apps-script/reference/lock/lock-service),
[atomic Sheets batches](https://developers.google.com/workspace/sheets/api/guides/batch).

# PAL ANTOJO Inventory & Sales

This is a Google Sheets + Google Apps Script web application. The seller workspace opens directly without a password; owner controls remain protected by the owner PIN. It has no external database, hosting service, package manager, or GitHub dependency.

## Seller workspace

- **New Sale** — multi-product touch checkout with a live subtotal, automatic quantity discounts, and Cash, Zelle, or Cash App payment selection.
- **Inventory** — a read-only, mobile-friendly view of current stock and prices.
- **Transactions** — today's transactions can be corrected or voided. A void restores inventory and remains in the audit history.
- **Stock Use** — samples, personal use, and damaged products reduce inventory without being recorded as revenue.
- **Caja** — daily opening cash, live cash-sales total, cash-in/out records, and a saved drawer count with over/short reconciliation.

Price changes, full inventory corrections, costs, settings, and historical controls require the owner PIN.

## Files

Create these files in Apps Script and paste the matching source from this folder:

- `Code.gs` — web entry point, setup, sheet helpers
- `Auth.gs` — server-side PIN login, sessions, owner authorization
- `Settings.gs` — business settings and discount rules
- `Products.gs` — product records and product cost lookup
- `Inventory.gs` — inventory formulas and owner inventory updates
- `CashDrawer.gs` — daily cash drawer totals, movement audit trail, and reconciliation
- `Costs.gs` — expense ledger and estimated finished-bag costs
- `Sales.gs` — locked, server-authoritative checkout and reporting
- `Tests.gs` — non-destructive calculation tests
- `Index.html` — application shell
- `Styles.html` — responsive visual design
- `Scripts.html` — seller POS and owner dashboard behavior
- `appsscript.json` — optional manifest; Apps Script can generate its own

## Sheet interaction

- `PRODUCTS` is the product catalog. Product IDs tie every other record together. Products can be added, repriced, and activated or deactivated from the owner page.
- `INVENTORY` stores starting inventory and cumulative additions. `Units Sold` sums item quantities in `SALES`; `Current Inventory` calculates `Starting + Added - Sold`.
- `COSTS` contains the expense ledger in columns A–H. Columns J–P contain the editable per-product finished-bag cost model: raw product, label, plastic bag, and other packaging.
- `SALES` uses one row per product item and a shared Sale ID for the transaction. Transaction totals repeat on its item rows, so the dashboard deduplicates by Sale ID when calculating revenue and discounts.
- `SETTINGS` stores the business name, currency, discount thresholds, seller names, and payment methods. Repeated `SELLER_NAME` and `PAYMENT_METHOD` rows form the available lists.
- `ADJUSTMENTS` is the audit trail for samples, personal use, damaged products, restocks, and inventory corrections.
- `CASH_DRAWER` stores opening cash, cash-in/out movements, and saved drawer counts. Expected cash is calculated from these entries plus active Cash transactions; Zelle and Cash App are excluded.

Access PINs are kept in Apps Script **Script Properties**, not in HTML, browser JavaScript, or the spreadsheet. Initial setup creates owner PIN `1301`. Seller checkout no longer requires a PIN.

## Installation and deployment

1. In Google Drive, create a blank Google Sheet and name it `PAL ANTOJO Inventory & Sales`.
2. In the Sheet, choose **Extensions → Apps Script**. This creates a script project bound to the Sheet.
3. Rename the default `Code.gs` if needed, then add each `.gs` file listed above with the **+ → Script** button. Paste the contents of its matching local file.
4. Add `Index`, `Styles`, and `Scripts` with **+ → HTML**. Apps Script adds `.html` automatically; use the exact names because `Code.gs` includes them by name.
5. Optional: open **Project Settings**, enable **Show `appsscript.json` manifest file in editor**, and replace it with the supplied manifest. Otherwise, set the project time zone manually to the time zone where sales occur.
6. Click **Save**.
7. At the top of the editor, select `setupPalAntojoSystem` and click **Run** once.
8. Google will ask for authorization. Choose the Google account that owns the Sheet, review the permissions, and click **Allow**. If Google shows an unverified-app warning for your own script, open **Advanced**, confirm the project name, and continue only if this is the script you created.
9. Return to the Sheet and confirm these tabs exist: `PRODUCTS`, `INVENTORY`, `COSTS`, `SALES`, `ADJUSTMENTS`, `CASH_DRAWER`, and `SETTINGS`. Running setup again is safe: it adds missing structure/defaults and does not clear existing records.
10. Back in Apps Script, choose **Deploy → New deployment**.
11. Click the gear beside **Select type**, then choose **Web app**.
12. Add a description such as `PAL ANTOJO MVP v1`.
13. Set **Execute as** to **Me**. This is essential: sellers use the owner's authorized script to write to the bound Sheet.
14. Set **Who has access** to **Anyone** if sellers will not sign in with Google. If your Google Workspace administrator does not allow this option, choose the broadest permitted audience and have sellers use eligible Google accounts.
15. Click **Deploy**, complete any requested authorization, and copy the **Web app URL** ending in `/exec`.
16. Open that URL in a private/incognito window. Confirm seller checkout opens immediately, then use **Owner access** to test owner PIN `1301`.
17. After future code changes, choose **Deploy → Manage deployments → Edit**, select **New version**, and deploy. The `/exec` URL remains the same.

Never give sellers edit access to the Sheet or Apps Script project. Share only the deployed web-app URL.

## First-use configuration

1. Sign in as owner.
2. Open **Products**, add at least one product, set its selling price, and leave it Active.
3. Open **Inventory**, set starting inventory or use Quick Add, then set a reorder level.
4. Open **Costs**, fill in the per-bag raw product, label, plastic bag, and other packaging values.
5. Open **Settings**, replace `Seller 1` with real seller names and confirm payment methods.
6. Sign out and sign in as seller. Select a seller name and record a small test sale.

## Testing checklist

Run `runPalAntojoTests` from the Apps Script editor. Its execution result should report passes for discount boundaries, mixed-product totals, cost per unit, and estimated profit. Then run these integration checks in the deployed app:

- [ ] 1 bag receives 0% discount.
- [ ] 3 bags receive 0%; the page prompts for one more bag.
- [ ] 4 bags receive 10%.
- [ ] 5 bags receive 10%; the page prompts for one more bag.
- [ ] 6 bags receive 15%.
- [ ] 10 bags receive 15%.
- [ ] A mixed-product order uses total bag count and reduces every included product.
- [ ] Attempting to exceed available inventory returns an error and writes no sale rows.
- [ ] Change a product price, refresh the seller page, and confirm the server records the new price.
- [ ] Deactivate a product and confirm it disappears from seller checkout; a stale checkout submission must fail.
- [ ] Record two sales consecutively and confirm two unique Sale IDs and correct remaining inventory.
- [ ] Filter Sales by seller, product, start date, and end date.
- [ ] Add a cost with quantity and confirm `Cost Per Unit = Total Cost / Quantity` in `COSTS`.
- [ ] For a six-bag sale at $6 with $2 estimated cost each, confirm revenue $30.60, COGS $12, and estimated gross profit $18.60.
- [ ] While signed in as seller, use browser developer tools to try calling an owner function with the seller token; it must return “not authorized.”
- [ ] Open a fresh/private browser after six hours and confirm the expired session requires a new login.
- [ ] Set opening cash, record one cash-in and one cash-out, and confirm Caja shows `opening + active Cash sales + net movements`.
- [ ] Save a drawer count above and below the expected balance and confirm the over/short result is correct.

## Operational notes

- Checkout takes a script lock and rechecks active status, live price, and available inventory before writing anything. Browser-submitted prices, discounts, and totals are ignored.
- A seller session is held in Apps Script cache for up to six hours. Cache eviction can require an earlier sign-in; this is intentional for a simple MVP.
- Revenue and discounts are transaction totals and are counted once per Sale ID. Estimated COGS is item-level and uses the estimated cost stored at the moment of sale.
- Avoid manually changing Product IDs after sales exist. Names, prices, status, inventory inputs, cost inputs, sellers, and payment methods are designed to be edited.

## Future improvements (not implemented)

- Individual seller accounts or Google-account allowlists instead of a shared PIN
- Refunds/voids with an audit trail
- CSV/PDF reports and automatic daily summaries
- Stock-addition history rather than one cumulative `Inventory Added` field
- Payment-method settlement reports and end-of-day close/lock controls
- Automated backups and a separate staging Sheet for testing changes

# Siddhi Farm Resort 🌿

A full-stack resort website + admin operations centre for **Siddhi Farm Resort** — farm stays, agro tourism and celebrations. Guests can browse stays and experiences, check live pricing, book with real-time availability, and pay online. The resort team manages pricing, coupons, bookings, site photos, payments and staff roles from a built-in admin dashboard.

> Learning project — built with Next.js App Router, Supabase and Razorpay.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org/) (App Router, JavaScript) |
| UI | React 18, Tailwind CSS, shadcn/ui (Radix primitives), lucide-react icons |
| Auth & database | [Supabase](https://supabase.com/) (Postgres, Auth, Storage) |
| Payments | [Razorpay](https://razorpay.com/) checkout + manual UPI / QR fallback |
| API | Single catch-all route handler — `app/api/[[...path]]/route.js` |

## Features

### Public site
- **Home page** — hero, experiences, stay cards, adventure teaser, photo gallery, live pricing pulled from the database.
- **Detail pages** (`/details/<slug>`) — 6 pages (Master Bedroom, 2 BHK Villa, 4 BHK Villa, Farm Stays, One Day Tour, Mini Water Park) with hero, amenities, gallery and a sticky booking card.
- **Booking flow** — availability check (date-overlap detection per service), coupon support, price computed server-side.
- **Payments**
  - Razorpay checkout (UPI, cards, netbanking, wallets) with HMAC signature verification.
  - **UPI / QR fallback** — if Razorpay fails, guests can pay directly via the resort's UPI ID / QR code and submit an "I have paid" claim (with optional UTR reference) that the team verifies manually.
- **Auth** — email/password signup & login via Supabase Auth; a profile row is auto-created by a database trigger.

### Admin dashboard (`/admin`)
- **Overview** — bookings, pending, confirmed, revenue, active coupons.
- **Season-ready rates** — edit the 9 core rates (they power live bookings, so they can't be deleted); **add/delete custom rates** with your own labels.
- **Coupon manager** — create percentage or fixed coupons; delete any coupon.
- **UPI fallback settings** — set UPI ID + payee name, upload/replace/remove the payment QR code image.
- **Image manager** — every photo on the site (~36 slots: home hero, stay cards, adventure, gallery, login panel, all detail-page heroes/galleries) can be replaced by uploading a file (stored in Supabase Storage) or pasting a URL, and reset to default anytime.
- **Booking desk** — change status (pending/confirmed/cancelled/completed), see "UPI claimed" badges, **Mark paid** after verifying manual payments, delete booking requests.
- **Team & customers** (super admin only) — assign roles, remove assigned roles (demote to customer). The **first-created super admin is protected** — cannot be demoted or changed, so you can never lock yourself out.

### Roles & permissions

| Ability | customer | staff | manager | super_admin |
|---|:---:|:---:|:---:|:---:|
| Book & pay | ✅ | ✅ | ✅ | ✅ |
| Open admin dashboard | — | ✅ | ✅ | ✅ |
| Update booking status / mark paid | — | ✅ | ✅ | ✅ |
| Edit pricing, coupons, images, UPI settings | — | — | ✅ | ✅ |
| Delete coupons / bookings / custom rates | — | — | ✅ | ✅ |
| Assign & remove roles | — | — | — | ✅ |

---

## Getting started

### 1. Prerequisites
- Node.js 18+ (tested on 22)
- A free [Supabase](https://supabase.com/) project
- (Optional) A [Razorpay](https://razorpay.com/) account — test mode works fine

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com/) → wait for it to provision.
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and **Run**. The script is idempotent (safe to re-run) and creates: `profiles`, `pricing`, `bookings`, `coupons`, `reviews`, `gallery`, `settings`, the signup trigger and row-level security.
   > If you ran an older copy of the schema, make sure the `settings` table exists — the image manager and UPI settings store their data there.
3. No manual Storage setup needed — the `site-images` bucket is created automatically on first image/QR upload.

### 4. Environment variables

Create `.env.local` in the project root:

```env
# --- Supabase (required) ---
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# --- Razorpay (optional — only for card/UPI checkout) ---
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=your-key-secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx

# --- Gmail payment-confirmation emails ---
# Create a Gmail App Password (Google Account → Security → 2-Step Verification → App passwords).
GMAIL_USER=bookings@yourdomain.com
GMAIL_APP_PASSWORD=your-16-character-app-password
# Comma-separated addresses for the three resort owners.
OWNER_EMAILS=owner1@example.com,owner2@example.com,owner3@example.com
# Optional: use a verified From address; otherwise GMAIL_USER is used.
GMAIL_FROM=bookings@yourdomain.com
# Optional: customer invoice contact details (the site values are used by default).
OWNER_CONTACT_PHONE=7083682768
RESORT_MAP_URL=https://maps.app.goo.gl/iBiKXi45sJ99vrV69
```

Find the Supabase values under **Project Settings → API**. The service role key stays server-side only — never expose it in client code.

### 5. Run the dev server

```bash
npm run dev:webpack     # Windows-friendly
# or
npm run dev             # macOS/Linux (uses NODE_OPTIONS inline)
```

Open http://localhost:3000. The app runs on port 3000, bound to all interfaces.

### 6. Create the first admin

1. Sign up through the site (`/signup`) — this creates a `customer` profile.
2. In Supabase **SQL Editor**, promote yourself:

```sql
update public.profiles set role = 'super_admin' where email = 'you@example.com';
```

3. Sign in at `/login` → you land on `/admin`. Every later role change can be done from the dashboard UI.

---

## Project structure

```
app/
  page.js                  # Home page (hero, experiences, stays, gallery, booking panel)
  login/page.js            # Sign in
  signup/page.js           # Sign up
  admin/page.js            # Admin dashboard (all management UIs)
  details/[slug]/page.js   # 6 stay/experience detail pages + booking modal
  api/[[...path]]/route.js # Entire backend: one catch-all route handler
  globals.css              # Tailwind + custom styles
components/
  upi-payment.jsx          # UPI / QR fallback payment widget
  ui/                      # shadcn/ui component library
lib/
  siteImages.js            # Registry of every admin-customizable image slot
  supabase/                # Browser / server / admin (service-role) clients
supabase/
  schema.sql               # Database schema — run once in the SQL editor
middleware.js              # Supabase session refresh on every request
```

## API overview

All endpoints live under `/api` via the catch-all handler. Reads are public; writes are role-guarded server-side.

| Method & path | Purpose | Access |
|---|---|---|
| `GET /api/pricing` | Current rates (core + custom + labels) | Public |
| `POST /api/pricing` | Save rates | manager+ |
| `GET/POST /api/bookings` | List / create bookings (availability + coupon applied) | Public |
| `PATCH /api/bookings/:id` | Update status and/or paid flag | staff+ |
| `DELETE /api/bookings/:id` | Delete a booking | manager+ |
| `GET/POST /api/coupons` | List / create coupons | Public / manager+ |
| `PATCH/DELETE /api/coupons/:id` | Toggle active / delete | manager+ |
| `GET /api/images` | Image overrides map | Public |
| `POST /api/images` | Set/reset a slot URL | manager+ |
| `POST /api/images/upload` | Upload an image to a slot (multipart) | manager+ |
| `GET/POST /api/payments/config` | UPI fallback settings | Public / manager+ |
| `POST /api/payments/qr` | Upload UPI QR image (multipart) | manager+ |
| `POST /api/payments/upi-claim` | Guest records a manual UPI payment | Public |
| `POST /api/razorpay/order` | Create a Razorpay order | Public |
| `POST /api/razorpay/verify` | Verify payment signature (HMAC) | Public |
| `GET /api/admin/summary` | Dashboard stats | Public |
| `GET/PATCH /api/admin/customers` | List users / change role | super_admin |
| `DELETE /api/admin/customers/:id` | Remove an assigned role (protected root admin refused) | super_admin |
| `GET /api/me` | Current user + profile | Public |

## How data is stored

- **`pricing`** — single row (`id='current'`) with a JSONB map. Custom rates live alongside core keys; their display labels are kept under a reserved `_labels` key.
- **`settings`** — generic key/value JSONB store. Used for `site_images` (image overrides) and `payment_config` (UPI ID, payee name, QR URL).
- **`bookings`** — one row per request; manual UPI claims are appended to `notes` with a timestamp and optional UTR.
- **Supabase Storage** — bucket `site-images` (public) holds uploaded site photos and payment QR codes.

## Paid-booking emails

When Razorpay verifies a payment, or a staff member selects **Mark paid**, the booking is atomically moved from unpaid to paid and confirmed. This one-time transition sends:

- the customer a Gmail invoice email;
- each address in `OWNER_EMAILS` a Gmail invoice email plus an Excel attachment containing every booking created in the preceding 30 days (including customer name, phone, guests, amount, stay dates, payment status, and booking status).

Customer invoices show the standard 11:00 AM check-in and 10:00 AM check-out times. Staff can select **Set times** in the Admin Dashboard booking desk to set different times for an individual booking before payment is confirmed; those custom times are included in the invoice and owner spreadsheet.

When an admin changes a booking to **Confirmed**, the owner automatically receives the booking invoice and XLSX report. If payment is confirmed through Razorpay or **Mark paid**, the customer invoice and owner report are both sent automatically.

For an existing Supabase project, run [`supabase/add-booking-times.sql`](supabase/add-booking-times.sql) once in the Supabase SQL Editor before saving custom times.

## Booking terms and conditions

Customers must read and accept the displayed booking terms before a booking request can be created. Acceptance is enforced by the server, timestamped in the booking record, and sent in a separate Gmail message to the customer. For an existing Supabase project, run [`supabase/add-booking-terms.sql`](supabase/add-booking-terms.sql) once in the Supabase SQL Editor.

Gmail requires a Google **App Password**; a normal account password will not work. If the Gmail variables are absent, the payment remains confirmed and the server logs that email delivery was skipped.
- **Row-level security** is enabled on all tables; the API accesses data through the service-role client, and role checks happen in the route handler (`requireRole`).


## Payments in test mode

- Use Razorpay **test keys** (`rzp_test_…`) — test UPI/cards succeed without real money.
- The UPI fallback is fully functional without Razorpay: configure a UPI ID/QR in the admin dashboard, book something, and use *"Razorpay not working? Pay via UPI"*.

## Documentation Guides

For in-depth guides on specific system features, refer to the consolidated topic documentation in [`docs/`](docs/):

- 📅 [**Bookings & Payments Guide**](docs/BOOKINGS_AND_PAYMENTS.md) — Booking workflows, same-day rules, Razorpay & UPI flows, terms enforcement, and partial payment plans.
- 🏷️ [**Coupons & Promotions Guide**](docs/COUPONS_GUIDE.md) — Real-time validation, discount logic, usage limits, and admin coupon tools.
- 🆔 [**Aadhaar Integration Guide**](docs/AADHAAR_GUIDE.md) — Form field format, validation, database persistence, and email invoices.
- 🛠️ [**Changelog & Bug Fixes**](docs/CHANGELOG_AND_FIXES.md) — Summary of resolved issues and architectural improvements.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `npm run dev` fails on Windows | Use `npm run dev:webpack` (the default script uses Unix-style `NODE_OPTIONS=`) |
| "Could not find the table 'public.settings'" | Re-run [`supabase/schema.sql`](supabase/schema.sql) — your DB predates the settings table |
| Login works but `/admin` redirects | Your profile role is `customer` — promote it (see *Create the first admin*) |
| Razorpay button errors | Check the three `RAZORPAY_*` env vars and restart the dev server |
| Images upload but don't change | Hard-refresh; confirm the slot shows a **Custom** badge in the Image manager |

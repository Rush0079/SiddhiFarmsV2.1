# Siddhi Farm Resort - Architecture & Design Patterns Guide

> **Audience**: Full-Stack Developers, DevOps Engineers, and AI Agents  
> **Purpose**: Standardize architecture patterns, coding conventions, API logging, and design paradigms across the repository so that any new developer can quickly understand, extend, and maintain the codebase.
> **Version**: 2.1.0 (Component-Based Restructure)

---

## 1. Architectural Overview: Layered & Component-Based Modular Architecture

The project is built on **Next.js 15 (App Router)** and **Supabase (PostgreSQL + Auth + Storage)** using a **Layered Separation-of-Concerns** and **Component-Based Modular Architecture**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Presentation Layer (UI)                         │
│   (Modular Component-Based Architecture with JSDoc & UI Telemetry)     │
│                                                                        │
│   ├── app/page.js  (Slim Customer Homepage Orchestrator ~230 LOC)      │
│   │   └── components/customer/* (11 Atomic Feature Components)         │
│   │       ├── navbar.jsx, hero-section.jsx, stats-bar.jsx              │
│   │       ├── story-section.jsx, experiences-grid.jsx, stay-cards.jsx  │
│   │       ├── flash-sale-showcase.jsx, adventure-section.jsx           │
│   │       ├── gallery-section.jsx, booking-form.jsx, footer.jsx        │
│   │                                                                    │
│   ├── app/admin/page.js (Slim Admin Dashboard Orchestrator ~600 LOC)   │
│   │   └── components/admin/* (13 Modular Control Panels & Modals)      │
│   │       ├── admin-header.jsx, admin-stats-cards.jsx                  │
│   │       ├── overview-tab.jsx (Recharts Trajectories & Activity)      │
│   │       ├── bookings-tab.jsx (Ledger, Time Trigger, Balance Clear)   │
│   │       ├── short-stays-tab.jsx, pricing-tab.jsx, flash-sale-tab.jsx │
│   │       ├── advance-codes-tab.jsx, payments-tab.jsx, content-tab.jsx │
│   │       ├── team-tab.jsx, time-editor-modal.jsx, super-admin-otp.jsx │
│   │                                                                    │
│   └── components/ui/* (Radix UI Compound Primitives, Lucide Icons)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / JSON
┌───────────────────────────────────▼────────────────────────────────────┐
│                    API Gateway & Route Layer                           │
│   ├── app/api/[[...path]]/route.js (Front Controller Gateway ~330 LOC) │
│   │   Delegates to Domain Route Handlers:                              │
│   │   ├── lib/api/handlers/bookings.js    (Lifecycle, Overlap, Rates)  │
│   │   ├── lib/api/handlers/pricing.js     (Dynamic Rates Matrix)       │
│   │   ├── lib/api/handlers/coupons.js     (Coupons & Advance Tokens)   │
│   │   ├── lib/api/handlers/payments.js    (UPI Claims, Razorpay HMAC)  │
│   │   ├── lib/api/handlers/images.js      (CMS Storage & CDN Slots)    │
│   │   ├── lib/api/handlers/terms.js       (House Rules & Policies)     │
│   │   ├── lib/api/handlers/flash-sale.js  (Promotional Campaigns)      │
│   │   └── lib/api/handlers/admin-users.js (Team Provisioning & 2FA)    │
│   └── lib/api/guards.js (RBAC Middleware, cleanPricing, overlaps)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Executes Service Logic
┌───────────────────────────────────▼────────────────────────────────────┐
│                  Business / Service Layer                              │
│   ├── lib/whatsapp.js       (Multi-Provider Resilient WhatsApp Engine) │
│   ├── lib/booking-email.js  (HTML Email Templates & Excel Generator)   │
│   ├── lib/otp-service.js    (Cryptographic 2FA OTPs & Session Tokens)  │
│   ├── lib/recaptcha.js      (Google reCAPTCHA v3 Verification)         │
│   └── lib/rate-limit.js     (IP-Based Sliding-Window Rate Limiter)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Queries / Mutations
┌───────────────────────────────────▼────────────────────────────────────┐
│                 Data Access & Security Layer                           │
│   ├── lib/supabase/admin.js  (Singleton Service-Role Client)           │
│   ├── lib/supabase/server.js (Cookie-Based SSR Client for User Auth)   │
│   ├── lib/supabase/client.js (Browser-Side Supabase Client)            │
│   └── PostgreSQL Tables & RLS Policies (profiles, bookings, coupons)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Software Engineering & Design Patterns Implemented

### A. Front Controller / API Gateway Pattern
* **Location**: [`app/api/[[...path]]/route.js`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20(3)/siddhi-farms-main/siddhi-farms-main/app/api/[[...path]]/route.js)
* **How it works**: Uses a catch-all route segment `[[...path]]` to serve as a unified entry point, routing incoming requests cleanly to domain handlers in `lib/api/handlers/*`. This eliminates monolithic single-file APIs, enforces single-responsibility principles, and decouples cross-cutting concerns (Rate-Limiting, Bot Scoring, RBAC, Logging).

### B. Component-Based Architecture Pattern
* **Customer Presentation (`components/customer/`)**:
  - `navbar.jsx`: Top navigation, dynamic auth badge, flash sale indicator, mobile drawer.
  - `hero-section.jsx`: High-impact hero banner with direct booking anchor triggers.
  - `stats-bar.jsx`: Live resort metric counters with icon highlights.
  - `story-section.jsx`: Narrative brand heritage section with aesthetic card styling.
  - `experiences-grid.jsx`: Multi-service showcase (Day tours, water park, ceremonies, parties).
  - `stay-cards.jsx`: Accommodation cards with pricing, guest capacity, and booking triggers.
  - `flash-sale-showcase.jsx`: Promotional flash sale banners with dynamic countdown status.
  - `adventure-section.jsx`: Highlight of activities and recreational offerings.
  - `gallery-section.jsx`: Image gallery with responsive masonry layout.
  - `booking-form.jsx`: Multi-step interactive booking form with coupon validation and date overlap warnings.
  - `footer.jsx`: Contact information, map links, and copyright info.

* **Admin Operations (`components/admin/`)**:
  - `admin-header.jsx`: Top navigation bar with role badge, operations link, and logout.
  - `admin-stats-cards.jsx`: 5 high-level KPI cards (Total bookings, pending, confirmed, revenue, active coupons).
  - `overview-tab.jsx`: Recharts Financial Velocity 7-day trajectory AreaChart, Donut Chart with active Sector hover, 3 quick insight cards, live activity stream.
  - `bookings-tab.jsx`: Search & status filter pills, ledger table, stay times trigger, balance clearing, WhatsApp receipt link, PDF invoice link.
  - `short-stays-tab.jsx`: Short-stay hourly pricing (Master bedroom, 2BHK, 4BHK) and day-use bookings table.
  - `pricing-tab.jsx`: Core rates table, custom rate adder & deleter, coupon creator & deleter.
  - `flash-sale-tab.jsx`: Promotional flash sale scheduler, discount type/value, banner file uploader, live countdown status.
  - `advance-codes-tab.jsx`: Single-use advance deposit token generator with auto-deletion upon booking.
  - `payments-tab.jsx`: Direct UPI configuration (VPA ID, Payee name, QR code file uploader).
  - `content-tab.jsx`: Section-by-section photo manager and Booking Terms editor.
  - `team-tab.jsx`: Staff & manager user provisioning, role promotions, and account deletion.
  - `time-editor-modal.jsx`: Modal for adjusting reservation check-in and check-out times.
  - `super-admin-otp-modal.jsx`: 2FA authorization dialog for administrative team provisioning.

### C. Strategy / Adapter Pattern
* **Multi-Gateway Messaging Strategy**:
  - **Location**: [`lib/whatsapp.js`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20(3)/siddhi-farms-main/siddhi-farms-main/lib/whatsapp.js)
  - Supports dynamic fallback among multiple WhatsApp providers (UltraMsg, Twilio, Meta Cloud API, and Custom Webhooks) without changing domain code.
* **Dual Payment Settlement Strategy**:
  - Supports automated **Razorpay Orders + HMAC-SHA256 Cryptographic Signature Verification** alongside **Dynamic UPI Intent QR Code Claim Verification** ([`components/upi-payment.jsx`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20(3)/siddhi-farms-main/siddhi-farms-main/components/upi-payment.jsx)).

### D. Builder Pattern
* **WhatsApp Message Builder**: [`buildWhatsAppMessage(booking, appUrl)`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20(3)/siddhi-farms-main/siddhi-farms-main/lib/whatsapp.js#L22) dynamically constructs structured notification messages matching specific booking types (Overnight, Short-Stay, Day-Tour, Event).
* **Invoice & Report Builder**: [`sendPaidBookingEmails(...)`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20(3)/siddhi-farms-main/siddhi-farms-main/lib/booking-email.js) compiles HTML email receipts and auto-generates 30-day Excel (`ExcelJS`) workbooks.

### E. Singleton Pattern
* **Location**: [`lib/supabase/admin.js`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20(3)/siddhi-farms-main/siddhi-farms-main/lib/supabase/admin.js)
* Ensures only one instance of the privileged Supabase Service Role client is created and reused per serverless worker runtime.

### F. Pipeline / Middleware Interceptor Pattern
* **Location**: [`middleware.js`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20(3)/siddhi-farms-main/siddhi-farms-main/middleware.js) & [`lib/rate-limit.js`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20(3)/siddhi-farms-main/siddhi-farms-main/lib/rate-limit.js)
* Requests pass through security barriers before reaching state mutations:
  1. Route protection & security headers.
  2. IP-based sliding-window rate limits.
  3. reCAPTCHA v3 bot scoring.
  4. User authentication & RBAC capability check (`requireRole`).

### G. Graceful Degradation & Fallback Pattern
* **Pricing & Configuration**: Hardcoded default rate fixtures prevent crashes if database rows are unreachable.
* **Resort Images**: [`lib/siteImages.js`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20(3)/siddhi-farms-main/siddhi-farms-main/lib/siteImages.js) provides high-resolution default CDN assets when database overrides are absent.

---

## 3. Logging Standards & Conventions

All modules follow a structured console logging taxonomy to enable auditability and real-time telemetry:

### Frontend (UI) Telemetry
```
[UI:<COMPONENT>:<ACTION>] <DETAILS / STATE>
```
* Examples:
  - `[UI:Navbar:RENDER] Rendering navbar { isStaff: true, isLoggedIn: true }`
  - `[UI:BookingForm:SUBMIT] Submitting reservation for John Doe (₹9,000)`
  - `[UI:AdminBookings:FILTER] Status filter changed to: confirmed`

### Backend (API) Telemetry
```
[API:<MODULE>:<ACTION>] <DETAILS / IDENTIFIER> [STATUS]
```
* Examples:
  - `[API:BOOKINGS:CREATED] Booking SFR-94A1BC2D initialized for John Doe (Amount: ₹9,000)`
  - `[API:PAYMENTS:RAZORPAY_VERIFY] Verified signature for SFR-94A1BC2D`
  - `[API:COUPONS:TOGGLE] Coupon WELCOME10 active state set to true`
  - `[API:AUTH:FORBIDDEN] User usr_123 (staff) attempted access requiring [super_admin]`

---

## 4. Coding Conventions for Developers

1. **Component-Based Modular Design**: Keep files under 400-500 LOC. Break UI sections into self-contained components under `components/<domain>/`.
2. **Comprehensive JSDoc Comments**: Every component, handler, and utility function must be preceded by detailed JSDoc documentation outlining its purpose, params, and return types.
3. **Keep Handlers Pure & Auditable**: Do not mutate global state directly. Perform server-side validation on every input payload.
4. **Never Expose Sensitive Keys**: `SUPABASE_SERVICE_ROLE_KEY` and `RAZORPAY_KEY_SECRET` must only ever be imported in server contexts (`app/api/*` or `lib/supabase/admin.js`).
5. **Preserve Idempotency**: Payment callbacks and webhook actions must handle retries safely without charging double or double-incrementing coupon counters.

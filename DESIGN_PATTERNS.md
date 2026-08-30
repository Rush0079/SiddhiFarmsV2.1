# Siddhi Farm Resort - Architecture & Design Patterns Guide

> **Audience**: Full-Stack Developers, DevOps Engineers, and AI Agents  
> **Purpose**: Standardize architecture patterns, coding conventions, API logging, and design paradigms across the repository so that any new developer can quickly understand, extend, and maintain the codebase.

---

## 1. Architectural Overview: Layered & Jamstack / Serverless

The project is built on **Next.js 15 (App Router)** and **Supabase (PostgreSQL + Auth + Storage)** using a **Layered Separation-of-Concerns** architecture:

```
┌────────────────────────────────────────────────────────┐
│                   Presentation Layer                   │
│   (React Server/Client Components, Tailwind, Radix)    │
│            app/*, components/*, hooks/*                │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / REST / JSON
┌───────────────────────────▼────────────────────────────┐
│                    API / Route Layer                   │
│  (Front Controller, Rate Limiter, RBAC Guard, Recaptcha)│
│       app/api/[[...path]]/route.js, app/api/chat/*     │
└───────────────────────────┬────────────────────────────┘
                            │ Calls Domain Logic
┌───────────────────────────▼────────────────────────────┐
│                  Business / Service Layer              │
│ (Multi-Gateway WhatsApp, Email Builder, Excel Reports) │
│                lib/whatsapp.js, lib/booking-email.js    │
└───────────────────────────┬────────────────────────────┘
                            │ Queries / Mutations
┌───────────────────────────▼────────────────────────────┐
│                 Data Access & Security Layer           │
│      (Supabase Admin / SSR Client, PostgreSQL RLS)     │
│                 lib/supabase/*, SQL policies           │
└────────────────────────────────────────────────────────┘
```

---

## 2. Core Software Design Patterns Implemented

### A. Front Controller / Centralized API Dispatcher Pattern
* **Location**: [`app/api/[[...path]]/route.js`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20%283%29/siddhi-farms-main/siddhi-farms-main/app/api/%5B%5B...path%5D%5D/route.js)
* **How it works**: Uses a catch-all route segment `[[...path]]` to serve as a unified entry point. Centralizes cross-cutting concerns:
  * Sliding-window rate limiting & DDoS mitigation.
  * Google reCAPTCHA v3 verification.
  * Role-Based Access Control (RBAC) authorization via `requireRole(...)`.
  * Standardized JSON serialization, error boundaries, and structured logging.

### B. Strategy / Adapter Pattern
* **Multi-Gateway Messaging Strategy**:
  * **Location**: [`lib/whatsapp.js`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20%283%29/siddhi-farms-main/siddhi-farms-main/lib/whatsapp.js)
  * Supports dynamic fallback among multiple WhatsApp providers (UltraMsg, Twilio, Meta Cloud API, and Custom Webhooks) without changing domain code.
* **Dual Payment Settlement Strategy**:
  * Supports automated **Razorpay Orders + HMAC-SHA256 Cryptographic Signature Verification** alongside **Dynamic UPI Intent QR Code Claim Verification** ([`components/upi-payment.jsx`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20%283%29/siddhi-farms-main/siddhi-farms-main/components/upi-payment.jsx)).
* **AI Model Candidate Strategy**:
  * **Location**: [`app/api/chat/route.js`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20%283%29/siddhi-farms-main/siddhi-farms-main/app/api/chat/route.js)
  * Tries candidate Gemini models sequentially (`gemini-3.6-flash` → `gemini-3.7-flash` → `gemini-2.5-flash`) with rule-based fallback responses when offline.

### C. Builder Pattern
* **WhatsApp Message Builder**: [`buildWhatsAppMessage(booking, appUrl)`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20%283%29/siddhi-farms-main/siddhi-farms-main/lib/whatsapp.js#L22) dynamically constructs structured, emoji-rich notification messages matching specific booking types (Overnight, Short-Stay, Day-Tour, Event).
* **Invoice & Report Builder**: [`sendPaidBookingEmails(...)`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20%283%29/siddhi-farms-main/siddhi-farms-main/lib/booking-email.js) compiles HTML email receipts and auto-generates 30-day Excel (`ExcelJS`) workbooks.

### D. Singleton Pattern
* **Location**: [`lib/supabase/admin.js`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20%283%29/siddhi-farms-main/siddhi-farms-main/lib/supabase/admin.js)
* Ensures only one instance of the privileged Supabase Service Role client is created and reused per serverless worker runtime.

### E. Pipeline / Middleware Interceptor Pattern
* **Location**: [`middleware.js`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20%283%29/siddhi-farms-main/siddhi-farms-main/middleware.js) & [`lib/rate-limit.js`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20%283%29/siddhi-farms-main/siddhi-farms-main/lib/rate-limit.js)
* Requests pass through security barriers before reaching state mutations:
  1. Route protection & security headers.
  2. IP-based sliding-window rate limits.
  3. reCAPTCHA v3 bot scoring.
  4. User authentication & RBAC capability check.

### F. Graceful Degradation & Fallback Pattern
* **Pricing & Configuration**: Hardcoded default rate fixtures prevent crashes if database rows are unreachable.
* **Resort Images**: [`lib/siteImages.js`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20%283%29/siddhi-farms-main/siddhi-farms-main/lib/siteImages.js) provides high-resolution default CDN assets when database overrides are absent.

### G. Compound Component & Custom Hooks (Frontend)
* **Compound Component Pattern**: Used across [`components/ui/`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20%283%29/siddhi-farms-main/siddhi-farms-main/components/ui) (Dialogs, Selects, Dropdowns) for maximum composition and clarity.
* **Custom Hooks**: UI logic encapsulation (e.g. [`hooks/use-toast.js`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20%283%29/siddhi-farms-main/siddhi-farms-main/hooks/use-toast.js) and [`hooks/use-mobile.jsx`](file:///c:/Users/Rushi/Desktop/New%20folder/siddhi-farms-main%20%283%29/siddhi-farms-main/siddhi-farms-main/hooks/use-mobile.jsx)).

---

## 3. Logging Standards & Conventions

All backend API routes follow a structured console logging standard:

### Format
```
[API:<MODULE>:<ACTION>] <DETAILS / IDENTIFIER> [STATUS: <OK|WARN|ERROR>] (Metadata)
```

### Examples
* `[API:BOOKINGS:CREATE] Created new booking: SFR-94A1BC2D for John Doe (₹9,000)`
* `[API:PAYMENTS:RAZORPAY_VERIFY] Verified signature for SFR-94A1BC2D (Payment ID: pay_ABC123)`
* `[API:RATE_LIMIT:WARN] IP 192.168.1.1 exceeded limit on /api/bookings`
* `[API:AUTH:RBAC_DENIED] User usr_123 with role 'customer' attempted to access 'admin/pricing'`

---

## 4. Coding Conventions for Developers

1. **Keep Handlers Pure & Auditable**: Do not mutate global state directly. Perform server-side validation on every input payload.
2. **Never Expose Sensitive Keys**: `SUPABASE_SERVICE_ROLE_KEY` and `RAZORPAY_KEY_SECRET` must only ever be imported in server contexts (`app/api/*` or `lib/supabase/admin.js`).
3. **Use Explicit JSDoc**: Document all newly created utility functions, input parameters, and return types.
4. **Preserve Idempotency**: Payment callbacks and webhook actions must handle retries safely without charging double or double-incrementing coupon counters.

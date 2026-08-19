# 🆔 Aadhaar Integration Guide — Siddhi Farm Resort

This document outlines the **standard Aadhaar field implementation, validation rules, database storage, and invoice presentation**.

---

## 1. Overview

To ensure guest verification for resort safety without creating friction or requiring external OTP services, Aadhaar is collected as a **clean, standard 12-digit form field** during the booking flow.

---

## 2. Form Field Implementation

### Frontend Formatting & Validation
* **Field**: Aadhaar Number (12 numeric digits).
* **Auto-formatting**: Formats digits into standard 4-digit grouped blocks (e.g. `1234 5678 9012`).
* **Input Mode**: `numeric` with a maximum formatted length of 14 characters (12 digits + 2 spaces).
* **Clean Experience**: The field is part of the standard booking modal alongside guest name, contact, and stay dates. No third-party popups or OTP barriers.

### Locations
* Home Page Booking Modal (`app/page.js`)
* Stay & Experience Detail Pages (`app/details/[slug]/page.js`)

---

## 3. Server-Side Validation & Storage

In `app/api/[[...path]]/route.js`:
* Strips non-digit characters and ensures exact 12-digit length.
* Stores formatted Aadhaar into the `bookings` table as `aadhaar_number`.
* Prevents invalid or malformed submissions.

---

## 4. Email Invoicing & Admin Visibility

* **Customer & Owner Invoices**: If provided, the Aadhaar Number is itemized cleanly on the booking confirmation email.
* **Owner Excel Reports**: Captured in the booking history records exported to the owners.

# 🛠️ Changelog & Bug Fixes — Siddhi Farm Resort

This document records the **history of resolved bugs, structural optimizations, and verification logs**.

---

## Key Resolved Issues

### 1. Aadhaar Flow Streamlined to Standard Form Field
* **Previous Issue**: Multi-step OTP verification modal added friction and event bubbling issues that prematurely closed the parent booking modal.
* **Resolution**: Replaced the OTP verification flow with a clean, standard 12-digit formatted Aadhaar field across all booking forms, validated directly on form submission.

### 2. Coupon Price "₹NaN" Fix on Date Changes
* **Previous Issue**: When a guest typed a coupon before selecting dates, or adjusted dates later, price estimates would display `₹NaN`.
* **Resolution**: Implemented automatic subtotal dependency tracking with `useEffect` in `app/page.js` and `app/details/[slug]/page.js` to recompute discounts dynamically.

### 3. Same-Day Bookings for Day Tours & Water Park
* **Previous Issue**: Day tour bookings failed date validation because check-out was required to be strictly after check-in.
* **Resolution**: Added support for same-day check-in/out for single-day tourism services.

### 4. Documentation Consolidation
* **Previous Issue**: 14+ fragmented documentation files scattered in the root directory.
* **Resolution**: Consolidated all documentation into dedicated, topic-specific markdown files under `/docs`.

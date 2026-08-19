# 🏷️ Coupons & Promotions Guide — Siddhi Farm Resort

This document details the **real-time coupon validation, discount computation logic, and admin management** features.

---

## 1. Coupon Features & Types

The resort discount engine supports:
* **Fixed Discounts**: Flat deduction in rupees (e.g. ₹500 off).
* **Percentage Discounts**: Proportional savings (e.g. 15% off).
* **Maximum Discount Caps**: Limits percentage discounts to a maximum rupee ceiling (e.g. 20% off up to ₹2,000 max).
* **Minimum Order Thresholds**: Require a minimum subtotal before becoming eligible.
* **Usage Limits**: Total redemption cap per coupon code across all guests.
* **Expiry Dates**: Time-restricted seasonal and promotional coupons.

---

## 2. Real-Time Frontend Validation

Coupons validate instantaneously as the guest types:
* **Visual States**:
  - **Valid**: Green border, green background tint, and "✓ Coupon applied successfully" indicator.
  - **Invalid / Empty**: Standard neutral border.
* **Dynamic Recalculation**:
  - Automatically re-evaluates discounts whenever the subtotal changes (such as when dates or guest counts are adjusted).
  - Shows original price struck through, exact discount savings, and final estimated total.

---

## 3. Server-Side Security & Redemption

When a booking is submitted:
1. `app/api/[[...path]]/route.js` queries active coupons matching the uppercase code.
2. Validates expiry date, subtotal threshold, and usage count.
3. Computes the discount server-side so prices cannot be manipulated from the client.
4. Atomically increments the coupon's `used` counter in Supabase upon successful booking creation.

---

## 4. Admin Coupon Management

From the `/admin` portal (accessible to managers and super admins):
* **Create Coupon**: Set code, discount type (`percentage` or `fixed`), value, max discount, min subtotal, usage limit, and expiration date.
* **Toggle Active Status**: Temporarily disable or re-enable coupons without deleting.
* **Delete Coupon**: Remove obsolete promo codes.

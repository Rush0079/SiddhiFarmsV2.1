import os
import requests
import hmac
import hashlib
from datetime import datetime, timedelta

BASE_URL = os.environ.get("NEXT_PUBLIC_BASE_URL", "https://siddhi-farm-dev.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
EXPECTED_KEYS = {"masterBedroom", "villa2BHK", "villa4BHK", "oneDayTour", "miniWaterPark", "weddingEvent", "engagementEvent", "birthdayEvent", "getTogetherEvent"}
RAZORPAY_SECRET = "G1IMpcKBeNLlsxlHxhZQygD8"

def check(condition, message):
    if not condition:
        raise AssertionError(message)
    print(f"✅ PASS: {message}")

def test_pricing():
    """Test 1: Pricing GET returns exactly 9 keys, POST without auth returns 401"""
    print("\n=== Test 1: Pricing ===")
    
    # GET /api/pricing should return 200 with exactly 9 keys
    response = requests.get(f"{API}/pricing", timeout=20)
    check(response.status_code == 200, "GET /api/pricing returns 200")
    
    pricing = response.json()
    check(set(pricing.keys()) == EXPECTED_KEYS, f"GET /api/pricing returns exactly 9 keys: {EXPECTED_KEYS}")
    check(all(isinstance(pricing[k], (int, float)) for k in pricing), "All pricing values are numeric")
    
    # Verify no extra keys like pool/hall/agroTourism
    extra_keys = set(pricing.keys()) - EXPECTED_KEYS
    check(len(extra_keys) == 0, f"GET /api/pricing has no extra keys (found: {extra_keys if extra_keys else 'none'})")
    
    # POST /api/pricing without auth should return 401
    response = requests.post(f"{API}/pricing", json=pricing, timeout=20)
    check(response.status_code == 401, "POST /api/pricing without auth returns 401 Unauthorized")
    
    print("✅ Pricing tests passed")

def test_booking_validation():
    """Test 2: Bookings validation - missing fields, invalid dates, checkOut <= checkIn"""
    print("\n=== Test 2: Booking Validation ===")
    
    # Missing name
    response = requests.post(f"{API}/bookings", json={
        "phone": "+919876543210",
        "checkIn": "2027-01-10",
        "checkOut": "2027-01-12",
        "service": "Master Bedroom"
    }, timeout=20)
    check(response.status_code == 400, "POST /api/bookings with missing name returns 400")
    
    # Missing phone
    response = requests.post(f"{API}/bookings", json={
        "name": "Rajesh Kumar",
        "checkIn": "2027-01-10",
        "checkOut": "2027-01-12",
        "service": "Master Bedroom"
    }, timeout=20)
    check(response.status_code == 400, "POST /api/bookings with missing phone returns 400")
    
    # Missing checkIn
    response = requests.post(f"{API}/bookings", json={
        "name": "Rajesh Kumar",
        "phone": "+919876543210",
        "checkOut": "2027-01-12",
        "service": "Master Bedroom"
    }, timeout=20)
    check(response.status_code == 400, "POST /api/bookings with missing checkIn returns 400")
    
    # Missing checkOut
    response = requests.post(f"{API}/bookings", json={
        "name": "Rajesh Kumar",
        "phone": "+919876543210",
        "checkIn": "2027-01-10",
        "service": "Master Bedroom"
    }, timeout=20)
    check(response.status_code == 400, "POST /api/bookings with missing checkOut returns 400")
    
    # Missing service
    response = requests.post(f"{API}/bookings", json={
        "name": "Rajesh Kumar",
        "phone": "+919876543210",
        "checkIn": "2027-01-10",
        "checkOut": "2027-01-12"
    }, timeout=20)
    check(response.status_code == 400, "POST /api/bookings with missing service returns 400")
    
    # Invalid checkIn date
    response = requests.post(f"{API}/bookings", json={
        "name": "Rajesh Kumar",
        "phone": "+919876543210",
        "checkIn": "not-a-date",
        "checkOut": "2027-01-12",
        "service": "Master Bedroom",
        "guests": 2
    }, timeout=20)
    check(response.status_code == 400, "POST /api/bookings with checkIn='not-a-date' returns 400")
    
    # checkOut <= checkIn
    response = requests.post(f"{API}/bookings", json={
        "name": "Rajesh Kumar",
        "phone": "+919876543210",
        "checkIn": "2027-01-12",
        "checkOut": "2027-01-10",
        "service": "Master Bedroom",
        "guests": 2
    }, timeout=20)
    check(response.status_code == 400, "POST /api/bookings with checkOut <= checkIn returns 400")
    
    print("✅ Booking validation tests passed")

def test_booking_creation():
    """Test 3: Bookings creation with server-side totals and snake_case fields"""
    print("\n=== Test 3: Booking Creation ===")
    
    # Get current pricing
    pricing_response = requests.get(f"{API}/pricing", timeout=20)
    pricing = pricing_response.json()
    master_bedroom_rate = pricing["masterBedroom"]
    
    # Create a booking with 2 nights
    future_date = datetime.now() + timedelta(days=30)
    check_in = future_date.strftime("%Y-%m-%d")
    check_out = (future_date + timedelta(days=2)).strftime("%Y-%m-%d")
    
    # Client supplies amount=99999 which should be ignored
    response = requests.post(f"{API}/bookings", json={
        "name": "Priya Sharma",
        "phone": "+919876543210",
        "email": "priya@example.com",
        "checkIn": check_in,
        "checkOut": check_out,
        "service": "Master Bedroom",
        "guests": 2,
        "amount": 99999  # This should be ignored by server
    }, timeout=20)
    
    check(response.status_code == 201, "POST /api/bookings with valid data returns 201")
    
    booking = response.json()
    check(booking.get("id", "").startswith("SFR-"), f"Booking ID starts with 'SFR-' (got: {booking.get('id')})")
    check(booking.get("nights") == 2, f"Booking nights = 2 (got: {booking.get('nights')})")
    
    expected_subtotal = master_bedroom_rate * 2
    check(booking.get("subtotal") == expected_subtotal, f"Booking subtotal = {expected_subtotal} (got: {booking.get('subtotal')})")
    check(booking.get("discount") == 0, f"Booking discount = 0 (got: {booking.get('discount')})")
    check(booking.get("amount") == expected_subtotal, f"Booking amount = {expected_subtotal} (got: {booking.get('amount')}), client amount ignored")
    check(booking.get("status") == "pending", f"Booking status = 'pending' (got: {booking.get('status')})")
    
    # Verify snake_case fields
    check("check_in" in booking, "Response contains snake_case field 'check_in'")
    check("check_out" in booking, "Response contains snake_case field 'check_out'")
    check("applied_coupon" in booking, "Response contains snake_case field 'applied_coupon'")
    
    print("✅ Booking creation tests passed")
    return booking["id"]

def test_booking_overlap():
    """Test 4: Bookings overlap detection"""
    print("\n=== Test 4: Booking Overlap Detection ===")
    
    # Create Booking A: 2027-01-10 to 2027-01-13
    response_a = requests.post(f"{API}/bookings", json={
        "name": "Amit Patel",
        "phone": "+919876543210",
        "checkIn": "2027-01-10",
        "checkOut": "2027-01-13",
        "service": "2 BHK Villa",
        "guests": 4
    }, timeout=20)
    check(response_a.status_code == 201, "Booking A (2027-01-10 to 2027-01-13) created successfully")
    
    # Create Booking B: 2027-01-12 to 2027-01-15 (overlaps with A)
    response_b = requests.post(f"{API}/bookings", json={
        "name": "Neha Singh",
        "phone": "+919876543211",
        "checkIn": "2027-01-12",
        "checkOut": "2027-01-15",
        "service": "2 BHK Villa",
        "guests": 4
    }, timeout=20)
    check(response_b.status_code == 409, "Booking B (overlapping dates) returns 409 Conflict")
    
    # Create Booking C: 2027-01-13 to 2027-01-16 (adjacent, no overlap)
    response_c = requests.post(f"{API}/bookings", json={
        "name": "Vikram Reddy",
        "phone": "+919876543212",
        "checkIn": "2027-01-13",
        "checkOut": "2027-01-16",
        "service": "2 BHK Villa",
        "guests": 4
    }, timeout=20)
    check(response_c.status_code == 201, "Booking C (adjacent, no overlap) created successfully")
    
    print("✅ Booking overlap detection tests passed")

def test_coupons():
    """Test 5: Coupons POST without auth returns 401"""
    print("\n=== Test 5: Coupons ===")
    
    response = requests.post(f"{API}/coupons", json={
        "code": "TEST10",
        "type": "percentage",
        "value": 10
    }, timeout=20)
    check(response.status_code == 401, "POST /api/coupons without auth returns 401 Unauthorized")
    
    print("✅ Coupons tests passed")

def test_coupon_math():
    """Test 6: Coupon math - invalid coupon code should result in discount=0"""
    print("\n=== Test 6: Coupon Math ===")
    
    future_date = datetime.now() + timedelta(days=60)
    check_in = future_date.strftime("%Y-%m-%d")
    check_out = (future_date + timedelta(days=2)).strftime("%Y-%m-%d")
    
    response = requests.post(f"{API}/bookings", json={
        "name": "Sanjay Gupta",
        "phone": "+919876543213",
        "checkIn": check_in,
        "checkOut": check_out,
        "service": "Master Bedroom",
        "guests": 2,
        "couponCode": "NOPE"  # Invalid coupon
    }, timeout=20)
    
    check(response.status_code == 201, "Booking with invalid coupon code still succeeds")
    booking = response.json()
    check(booking.get("discount") == 0, f"Booking with invalid coupon has discount=0 (got: {booking.get('discount')})")
    
    print("✅ Coupon math tests passed")

def test_razorpay_integration():
    """Test 7: Razorpay integration - order creation and signature verification"""
    print("\n=== Test 7: Razorpay Integration ===")
    
    # First create a booking
    future_date = datetime.now() + timedelta(days=90)
    check_in = future_date.strftime("%Y-%m-%d")
    check_out = (future_date + timedelta(days=2)).strftime("%Y-%m-%d")
    
    booking_response = requests.post(f"{API}/bookings", json={
        "name": "Kavita Desai",
        "phone": "+919876543214",
        "checkIn": check_in,
        "checkOut": check_out,
        "service": "Master Bedroom",
        "guests": 2
    }, timeout=20)
    check(booking_response.status_code == 201, "Booking created for Razorpay test")
    booking = booking_response.json()
    booking_id = booking["id"]
    booking_amount = booking["amount"]
    
    # Test 7a: Create Razorpay order with valid bookingId
    order_response = requests.post(f"{API}/razorpay/order", json={
        "bookingId": booking_id
    }, timeout=20)
    check(order_response.status_code == 200, "POST /api/razorpay/order with valid bookingId returns 200")
    
    order_data = order_response.json()
    check(order_data.get("orderId", "").startswith("order_"), f"orderId starts with 'order_' (got: {order_data.get('orderId')})")
    check(order_data.get("amount") == booking_amount * 100, f"amount in paise = {booking_amount * 100} (got: {order_data.get('amount')})")
    check(order_data.get("currency") == "INR", f"currency = 'INR' (got: {order_data.get('currency')})")
    check(order_data.get("keyId") == "rzp_test_TPYH6QkJgrR5lG", f"keyId matches (got: {order_data.get('keyId')})")
    check("booking" in order_data, "Response contains booking object")
    
    order_id = order_data["orderId"]
    
    # Test 7b: Create Razorpay order with invalid bookingId
    invalid_order_response = requests.post(f"{API}/razorpay/order", json={
        "bookingId": "DOES-NOT-EXIST"
    }, timeout=20)
    check(invalid_order_response.status_code == 404, "POST /api/razorpay/order with invalid bookingId returns 404")
    check("Booking not found" in invalid_order_response.json().get("error", ""), "Error message is 'Booking not found'")
    
    # Test 7c: Verify with missing fields
    verify_missing_response = requests.post(f"{API}/razorpay/verify", json={
        "bookingId": booking_id
    }, timeout=20)
    check(verify_missing_response.status_code == 400, "POST /api/razorpay/verify with missing fields returns 400")
    
    # Test 7d: Verify with invalid signature
    invalid_verify_response = requests.post(f"{API}/razorpay/verify", json={
        "bookingId": booking_id,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": "pay_INVALID123",
        "razorpay_signature": "invalid"
    }, timeout=20)
    check(invalid_verify_response.status_code == 400, "POST /api/razorpay/verify with invalid signature returns 400")
    check("Invalid payment signature" in invalid_verify_response.json().get("error", ""), "Error message is 'Invalid payment signature'")
    
    # Test 7e: Verify with valid signature
    payment_id = "pay_TESTVERIFY123"
    message = f"{order_id}|{payment_id}"
    signature = hmac.new(
        RAZORPAY_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    valid_verify_response = requests.post(f"{API}/razorpay/verify", json={
        "bookingId": booking_id,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": signature
    }, timeout=20)
    check(valid_verify_response.status_code == 200, "POST /api/razorpay/verify with valid signature returns 200")
    
    verify_data = valid_verify_response.json()
    check(verify_data.get("ok") == True, "Response contains ok: true")
    check("booking" in verify_data, "Response contains booking object")
    check(verify_data["booking"].get("paid") == True, "Booking paid = true")
    check(verify_data["booking"].get("status") == "confirmed", "Booking status = 'confirmed'")
    
    print("✅ Razorpay integration tests passed")

def test_booking_status_patch():
    """Test 8: Booking status PATCH without auth returns 401"""
    print("\n=== Test 8: Booking Status PATCH ===")
    
    # Create a booking first
    future_date = datetime.now() + timedelta(days=120)
    check_in = future_date.strftime("%Y-%m-%d")
    check_out = (future_date + timedelta(days=2)).strftime("%Y-%m-%d")
    
    booking_response = requests.post(f"{API}/bookings", json={
        "name": "Rahul Verma",
        "phone": "+919876543215",
        "checkIn": check_in,
        "checkOut": check_out,
        "service": "Master Bedroom",
        "guests": 2
    }, timeout=20)
    booking_id = booking_response.json()["id"]
    
    # Try to PATCH without auth
    response = requests.patch(f"{API}/bookings/{booking_id}", json={
        "status": "confirmed"
    }, timeout=20)
    check(response.status_code == 401, "PATCH /api/bookings/<id> without auth returns 401 Unauthorized")
    
    print("✅ Booking status PATCH tests passed")

def test_not_found_routing():
    """Test 9: Not-found routing returns 404"""
    print("\n=== Test 9: Not-Found Routing ===")
    
    # GET unknown route
    response = requests.get(f"{API}/does-not-exist", timeout=20)
    check(response.status_code == 404, "GET /api/does-not-exist returns 404")
    
    # POST unknown route
    response = requests.post(f"{API}/does-not-exist", json={}, timeout=20)
    check(response.status_code == 404, "POST /api/does-not-exist returns 404")
    
    print("✅ Not-found routing tests passed")

def main():
    print("=" * 60)
    print("Siddhi Farm Resort Backend Testing - Phase 4")
    print("Testing Supabase Postgres + Razorpay Integration")
    print("=" * 60)
    
    try:
        test_pricing()
        test_booking_validation()
        test_booking_creation()
        test_booking_overlap()
        test_coupons()
        test_coupon_math()
        test_razorpay_integration()
        test_booking_status_patch()
        test_not_found_routing()
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED")
        print("=" * 60)
        
    except AssertionError as e:
        print("\n" + "=" * 60)
        print(f"❌ TEST FAILED: {e}")
        print("=" * 60)
        raise
    except Exception as e:
        print("\n" + "=" * 60)
        print(f"❌ ERROR: {e}")
        print("=" * 60)
        raise

if __name__ == "__main__":
    main()

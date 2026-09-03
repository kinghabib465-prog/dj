import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

async function main() {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'Password123!';
  const anonClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword });

  if (authError) { console.error('Admin login error', authError); return; }
  const token = authData.session?.access_token;
  console.log('admin token', token);
  if (!token) { console.error('No token'); return; }
  const serviceClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  // Ensure admin profile has is_admin true
  const adminId = authData.user?.id;
  if (adminId) {
    await serviceClient.from('profiles').upsert({ id: adminId, is_admin: true });
    const { data: adminProfile, error: adminProfileError } = await serviceClient.from('profiles').select('*').eq('id', adminId).single();
    console.log('admin profile after upsert', adminProfile, adminProfileError);
  }
  const adminClient = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const unitPrice = 8000;
  const depositPrice = 3000;
  const quantity = 1;
  const bookingNumber = randomUUID();
  console.log('Attempting booking insert with payload', { bookingNumber, status: 'PENDING_PAYMENT_REVIEW', subtotal: unitPrice * quantity, deposit_required: depositPrice * quantity, deposit_paid: depositPrice * quantity, remaining_amount: unitPrice * quantity - depositPrice * quantity, payment_status: 'PENDING', customer_name: 'Test User', customer_phone: '1234567890', rental_start_at: new Date().toISOString(), expected_return_at: new Date(Date.now() + 86400000).toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  let { data: booking, error: bookingError } = await serviceClient.from('bookings').insert({
    booking_number: bookingNumber,
    status: 'PENDING_PAYMENT_REVIEW',
    subtotal: unitPrice * quantity,
    deposit_required: depositPrice * quantity,
    deposit_paid: depositPrice * quantity,
    remaining_amount: unitPrice * quantity - depositPrice * quantity,
    payment_status: 'PENDING',
    customer_name: 'Test User',
    customer_phone: '1234567890',
    rental_start_at: new Date().toISOString(),
    expected_return_at: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),

  }).single();
  console.log('booking insert result', booking, bookingError);
  console.log('bookingError:', bookingError);
  if (!booking && !bookingError) {
    // Attempt to fetch the booking by booking_number (if available)
    const bn = bookingNumber;
    if (bn) {
      const { data: fetchedBooking, error: fetchError } = await serviceClient.from('bookings').select('*').eq('booking_number', bn).single();
      if (fetchError) { console.error('Fetch after insert error', fetchError); return; }
      booking = fetchedBooking;
    }
  }
  if (bookingError) { console.error('Booking insert error', bookingError); return; }
  const bookingId = booking.id;
  let { data: deposit, error: depositError } = await serviceClient.from('payments').insert({
    booking_id: bookingId,
    type: 'DEPOSIT',
    amount: depositPrice * quantity,
    method: 'CASH',
    status: 'PENDING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).single();
  if (depositError) { console.error('Deposit insert error', depositError); return; }
  // Fetch the payment ID for the deposit we just inserted
  const { data: depositFetched, error: depositFetchError } = await serviceClient.from('payments')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('type', 'DEPOSIT')
    .single();
  if (depositFetchError) { console.error('Deposit fetch error', depositFetchError); return; }
  const paymentId = depositFetched.id;
  const verifyRes = await adminClient.functions.invoke('verify-payment', { body: { bookingId, paymentId, action: 'APPROVE' } });
  console.log('verifyRes', verifyRes);
  if (verifyRes.error) {
    const errText = await verifyRes.error.context.text();
    console.error('verifyRes error body', errText);
  }

  const balanceRes = await adminClient.functions.invoke('record-balance-payment', { body: { bookingId } });
  console.log('balanceRes', balanceRes);
  if (balanceRes.error) {
    const errText = await balanceRes.error.context.text();
    console.error('balanceRes error body', errText);
  }
  const { data: bookingAfter, error: bookingAfterError } = await serviceClient.from('bookings').select('status,remaining_amount').eq('id', bookingId).single();
  console.log('booking after balance', bookingAfter);
}
main().catch(e => console.error('Error in script', e));

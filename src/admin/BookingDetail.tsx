// src/admin/BookingDetail.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useParams, useNavigate } from "react-router-dom";

interface Booking {
  id: string;
  booking_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  rental_start_at: string;
  expected_return_at: string;
  status: string;
  subtotal: number;
  deposit_required: number;
  deposit_paid: number;
  remaining_amount: number;
}

const BookingDetail: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBooking = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_number, customer_name, customer_phone, rental_start_at, expected_return_at, status, subtotal, deposit_required, deposit_paid, remaining_amount")
        .eq("id", bookingId)
        .single();
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      setBooking(data);
      setLoading(false);
    };
    if (bookingId) fetchBooking();
  }, [bookingId]);

  const recordBalance = async () => {
    const { error } = await supabase.functions.invoke("record-balance-payment", {
      body: JSON.stringify({ bookingId })
    });
    if (error) {
      alert("Error recording balance payment");
      return;
    }
    // Refresh booking
    window.location.reload();
  };

  const handOver = async () => {
    const { error } = await supabase.functions.invoke("hand-over-equipment", {
      body: JSON.stringify({ bookingId })
    });
    if (error) {
      alert("Error handing over equipment");
      return;
    }
    window.location.reload();
  };

  const completeBooking = async () => {
    const { error } = await supabase.functions.invoke("complete-booking", {
      body: JSON.stringify({ bookingId })
    });
    if (error) {
      alert("Error completing booking");
      return;
    }
    window.location.reload();
  };

  if (loading) return <p className="p-4">Loading…</p>;
  if (!booking) return <p className="p-4">Booking not found.</p>;

  const canRecordBalance = booking.status === "CONFIRMED" && booking.remaining_amount > 0;
  const canHandOver = booking.status === "READY_FOR_PICKUP" && booking.remaining_amount === 0;
  const canComplete = booking.status === "RETURN_PENDING" && booking.remaining_amount === 0;

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Booking {booking.booking_number}</h2>
      <p>Customer: {booking.customer_name || "—"} ({booking.customer_phone || "—"})</p>
      <p>Period: {new Date(booking.rental_start_at).toLocaleString()} – {new Date(booking.expected_return_at).toLocaleString()}</p>
      <p>Status: {booking.status}</p>
      <p>Subtotal: {booking.subtotal}</p>
      <p>Deposit Required: {booking.deposit_required}</p>
      <p>Deposit Paid: {booking.deposit_paid}</p>
      <p>Remaining Amount: {booking.remaining_amount}</p>
      <div className="mt-4 space-x-2">
        {canRecordBalance && (
          <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={recordBalance}>
            سجل دفعة الرصيد
          </button>
        )}
        {canHandOver && (
          <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={handOver}>
            تسليم المعدات
          </button>
        )}
        {canComplete && (
          <button className="bg-purple-600 text-white px-3 py-1 rounded" onClick={completeBooking}>
            إكمال الحجز
          </button>
        )}
        <button className="bg-gray-400 text-white px-3 py-1 rounded" onClick={() => navigate('/admin/returns')}>
          عودة المعدات
        </button>
      </div>
    </div>
  );
};

export default BookingDetail;

// src/admin/Calendar.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface BookingDay {
  date: string;
  status: string;
}

function formatDate(date: Date, fmt: string): string {
  const options: Intl.DateTimeFormatOptions = {};
  if (fmt.includes("yyyy")) options.year = "numeric";
  if (fmt.includes("MM")) options.month = "2-digit";
  if (fmt.includes("dd")) options.day = "2-digit";
  return date.toLocaleDateString(undefined, options);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, date.getDate());
}

function subMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() - n, date.getDate());
}

const Calendar: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState<BookingDay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async (month: Date) => {
    const start = formatDate(startOfMonth(month), "yyyy-MM-dd");
    const end = formatDate(endOfMonth(month), "yyyy-MM-dd");
    const { data, error } = await supabase.rpc("get_bookings_in_range", { p_start: start, p_end: end });
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    setBookings(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings(currentMonth);
  }, [currentMonth]);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const renderDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = [];
    for (let d = start; d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const iso = formatDate(d, "yyyy-MM-dd");
      const dayBookings = bookings.filter((b) => b.date === iso);
      const status = dayBookings.length ? dayBookings[0].status : "";
      days.push(
          <div key={iso} className="border p-1 text-sm">
            {d.getDate()}
            {status && <span className="block text-xs" style={{ color: statusColor(status) }}>{status}</span>}
          </div>
      );
    }
    return days;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "PENDING_PAYMENT_REVIEW": return "orange";
      case "CONFIRMED": return "green";
      case "EQUIPMENT_OUT": return "blue";
      case "RETURN_PENDING": return "purple";
      case "COMPLETED": return "gray";
      case "EXPIRED": return "red";
      default: return "black";
    }
  };

  if (loading) return <p className="p-4">Loading…</p>;

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">تقويم الحجوزات</h2>
      <div className="flex items-center justify-between mb-4">
        <button className="px-2 py-1 bg-gray-200" onClick={prevMonth}>‹</button>
        <span className="text-xl font-semibold">{formatDate(currentMonth, "MMMM yyyy")}</span>
        <button className="px-2 py-1 bg-gray-200" onClick={nextMonth}>›</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {renderDays()}
      </div>
    </div>
  );
};

export default Calendar;

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { toWesternDigits } from "../lib/digits";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Search,
  User,
  Phone,
  CalendarDays,
  Banknote,
  Eye,
  Filter,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";

interface Booking {
  id: string;
  booking_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  rental_start_at: string;
  expected_return_at: string;
  status: string;
  subtotal: number;
  deposit_paid: number;
  remaining_amount: number;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT_REVIEW: "بانتظار مراجعة الدفع",
  CONFIRMED: "مؤكد",
  READY_FOR_PICKUP: "جاهز للتسليم",
  EQUIPMENT_OUT: "معدات مسلمة",
  RETURN_PENDING: "بانتظار الإرجاع",
  COMPLETED: "مكتمل",
  PAYMENT_REJECTED: "دفع مرفوض",
  CANCELLED: "ملغي",
  EXPIRED: "منتهي",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT_REVIEW: "bg-warning/15 text-warning",
  CONFIRMED: "bg-success/15 text-success",
  READY_FOR_PICKUP: "bg-info/15 text-info",
  EQUIPMENT_OUT: "bg-blue-500/15 text-blue-300",
  RETURN_PENDING: "bg-purple-500/15 text-purple-300",
  COMPLETED: "bg-gray-500/15 text-gray-300",
  PAYMENT_REJECTED: "bg-red-500/15 text-red-300",
  CANCELLED: "bg-gray-500/15 text-gray-400",
  EXPIRED: "bg-gray-500/15 text-gray-400",
};

const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString("en-US") : "0");

export default function BookingsList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id,booking_number,customer_name,customer_phone,rental_start_at,expected_return_at,status,subtotal,deposit_paid,remaining_amount")
        .order("created_at", { ascending: false });
      if (error) {
        setLoading(false);
        return;
      }
      setBookings(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = bookings.filter((b) => {
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (b.customer_name || "").toLowerCase().includes(q) ||
      (toWesternDigits(b.customer_phone) || "").toLowerCase().includes(toWesternDigits(q)) ||
      b.booking_number.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="mb-1 text-2xl font-bold">الحجوزات</div>
      <p className="mb-6 text-sm text-gray-400">إدارة ومراجعة جميع حجوزات العملاء</p>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <Search size={16} className="text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف أو رقم الحجز…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="ALL" className="bg-gray-800">كل الحالات</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k} className="bg-gray-800">{v}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-gray-400">
          لا توجد حجوزات مطابقة
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-right text-sm">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-4 py-3">رقم الحجز</th>
                <th className="px-4 py-3">العميل</th>
                <th className="px-4 py-3">الهاتف</th>
                <th className="px-4 py-3">المدة</th>
                <th className="px-4 py-3">الإجمالي</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-medium">{b.booking_number}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <User size={14} className="text-gray-500" />
                      {b.customer_name || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Phone size={14} className="text-gray-500" />
                      {toWesternDigits(b.customer_phone) || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-gray-500" />
                      {new Date(b.rental_start_at).toLocaleDateString("ar-EG-u-nu-latn")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-300">
                      <Banknote size={14} className="text-gray-500" />
                      {fmt(b.subtotal)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[b.status] ?? "bg-gray-500/15 text-gray-300"}`}>
                      {STATUS_LABELS[b.status] ?? b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/admin/bookings/${b.id}`)}
                      className="flex items-center gap-1 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/25"
                    >
                      <Eye size={14} />
                      تفاصيل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

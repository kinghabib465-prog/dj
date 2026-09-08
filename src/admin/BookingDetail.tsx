import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, User, Phone, CalendarDays, Banknote, Truck, CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
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
  deposit_required: number;
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
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT_REVIEW: "bg-warning/15 text-warning",
  CONFIRMED: "bg-success/15 text-success",
  READY_FOR_PICKUP: "bg-info/15 text-info",
  EQUIPMENT_OUT: "bg-blue-500/15 text-blue-300",
  RETURN_PENDING: "bg-purple-500/15 text-purple-300",
  COMPLETED: "bg-gray-500/15 text-gray-300",
  PAYMENT_REJECTED: "bg-red-500/15 text-red-300",
};

const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString("ar-DZ") : "0");

export default function BookingDetail() {
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
      <span className="text-accent">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function Action({ children, onClick, icon, ghost }: { children: React.ReactNode; onClick: () => void; icon: React.ReactNode; ghost?: boolean }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${ghost ? "border border-white/15 text-gray-300 hover:bg-white/5" : "bg-accent text-gray-900 hover:bg-accent/90"}`}>
      {icon}{children}
    </button>
  );
}
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
      if (error) { setMsg({ type: "err", text: "تعذر تحميل الحجز" }); setLoading(false); return; }
      setBooking(data);
      setLoading(false);
    };
    if (bookingId) fetch();
  }, [bookingId]);

  const invoke = async (fn: string) => {
    setMsg(null);
    const { error } = await supabase.functions.invoke(fn, { body: { bookingId } });
    if (error) { setMsg({ type: "err", text: "فشل تنفيذ العملية" }); return; }
    setMsg({ type: "ok", text: "تمت العملية بنجاح" });
    setTimeout(() => window.location.reload(), 900);
  };

  if (loading) return <AdminLayout><div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-accent" size={32} /></div></AdminLayout>;
  if (!booking) return <AdminLayout><p className="text-gray-400">الحجز غير موجود.</p></AdminLayout>;

  const canRecordBalance = booking.status === "CONFIRMED" && booking.remaining_amount > 0;
  const canHandOver = booking.status === "READY_FOR_PICKUP" && booking.remaining_amount === 0;
  const canComplete = booking.status === "RETURN_PENDING" && booking.remaining_amount === 0;

  return (
    <AdminLayout>
      <button onClick={() => navigate("/admin/returns")} className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowRight size={16} />العودة إلى القائمة</button>
      {msg && <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${msg.type === "ok" ? "bg-success/15 text-success" : "bg-red-500/15 text-red-300"}`}>{msg.text}</div>}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs text-gray-500">رقم الحجز</p><h1 className="text-2xl font-bold">{booking.booking_number}</h1></div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[booking.status] ?? "bg-gray-500/15 text-gray-300"}`}>{STATUS_LABELS[booking.status] ?? booking.status}</span>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Info icon={<User size={18} />} label="الاسم" value={booking.customer_name || "—"} />
          <Info icon={<Phone size={18} />} label="الهاتف" value={booking.customer_phone || "—"} />
          <Info icon={<CalendarDays size={18} />} label="فترة الإيجار" value={`${new Date(booking.rental_start_at).toLocaleDateString("ar-EG")} → ${new Date(booking.expected_return_at).toLocaleDateString("ar-EG")}`} />
          <Info icon={<Banknote size={18} />} label="الإجمالي / المدفوع / المتبقي" value={`${fmt(booking.subtotal)} / ${fmt(booking.deposit_paid)} / ${fmt(booking.remaining_amount)} دج`} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {canRecordBalance && <Action onClick={() => invoke("record-balance-payment")} icon={<Banknote size={18} />}>تسجيل دفعة الرصيد</Action>}
          {canHandOver && <Action onClick={() => invoke("hand-over-equipment")} icon={<Truck size={18} />}>تسليم المعدات</Action>}
          {canComplete && <Action onClick={() => invoke("complete-booking")} icon={<CheckCircle2 size={18} />}>إكمال الحجز</Action>}
          <Action onClick={() => invoke("start_equipment_return")} icon={<RotateCcw size={18} />} ghost>بدء الإرجاع</Action>
        </div>
      </div>
    </AdminLayout>
  );
}
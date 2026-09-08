import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  User,
  Phone,
  CalendarDays,
  Banknote,
  Truck,
  CheckCircle2,
  RotateCcw,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Receipt,
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
  deposit_required: number;
  deposit_paid: number;
  remaining_amount: number;
  payment_status: string | null;
  event_location: string | null;
}

interface Payment {
  id: string;
  type: string;
  amount: number;
  status: string;
  method: string;
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
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();
      if (error) {
        setMsg({ type: "err", text: "تعذر تحميل الحجز" });
        setLoading(false);
        return;
      }
      setBooking(data);
      const { data: payData } = await supabase
        .from("payments")
        .select("id,type,amount,status,method")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });
      setPayments(payData || []);
      setLoading(false);
    };
    if (bookingId) fetch();
  }, [bookingId]);

  const invokeEdge = async (fn: string) => {
    setMsg(null);
    setActing(fn);
    const { error } = await supabase.functions.invoke(fn, { body: { bookingId } });
    setActing(null);
    if (error) {
      setMsg({ type: "err", text: "فشل تنفيذ العملية" });
      return;
    }
    setMsg({ type: "ok", text: "تمت العملية بنجاح" });
    setTimeout(() => window.location.reload(), 900);
  };

  const startReturn = async () => {
    setMsg(null);
    setActing("start_equipment_return");
    const { error } = await supabase.rpc("start_equipment_return", {
      p_booking_id: bookingId,
    });
    setActing(null);
    if (error) {
      setMsg({ type: "err", text: "تعذر بدء الإرجاع" });
      return;
    }
    setMsg({ type: "ok", text: "تم بدء الإرجاع" });
    setTimeout(() => window.location.reload(), 900);
  };

  const reviewPayment = async (action: "APPROVE" | "REJECT") => {
    if (action === "REJECT" && !rejectReason.trim()) {
      setMsg({ type: "err", text: "أدخل سبب الرفض" });
      return;
    }
    setMsg(null);
    setActing("verify-payment");
    const dep = payments.find((p) => p.type === "DEPOSIT");
    if (!dep) {
      setMsg({ type: "err", text: "لا يوجد دفع عربون لهذا الحجز" });
      return;
    }
    const { error } = await supabase.functions.invoke("verify-payment", {
      body: {
        bookingId,
        paymentId: dep.id,
        action,
        rejectionReason: action === "REJECT" ? rejectReason : null,
      },
    });
    setActing(null);
    if (error) {
      setMsg({ type: "err", text: "فشل تنفيذ العملية" });
      return;
    }
    setShowReject(false);
    setMsg({ type: "ok", text: action === "APPROVE" ? "تم اعتماد الدفع" : "تم رفض الدفع" });
    setTimeout(() => window.location.reload(), 900);
  };

  if (loading)
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      </AdminLayout>
    );

  if (!booking)
    return (
      <AdminLayout>
        <p className="text-gray-400">الحجز غير موجود.</p>
      </AdminLayout>
    );

  const pendingReview = booking.status === "PENDING_PAYMENT_REVIEW";
  const canRecordBalance = booking.status === "CONFIRMED" && booking.remaining_amount > 0;
  const canHandOver = booking.status === "READY_FOR_PICKUP" && booking.remaining_amount === 0;
  const canStartReturn = booking.status === "EQUIPMENT_OUT";
  const canComplete = booking.status === "RETURN_PENDING" && booking.remaining_amount === 0;

  return (
    <AdminLayout>
      <button
        onClick={() => navigate("/admin/bookings")}
        className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ArrowRight size={16} />
        العودة إلى قائمة الحجوزات
      </button>

      {msg && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            msg.type === "ok" ? "bg-success/15 text-success" : "bg-red-500/15 text-red-300"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">رقم الحجز</p>
            <h1 className="text-2xl font-bold">{booking.booking_number}</h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              STATUS_COLORS[booking.status] ?? "bg-gray-500/15 text-gray-300"
            }`}
          >
            {STATUS_LABELS[booking.status] ?? booking.status}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Info icon={<User size={18} />} label="الاسم" value={booking.customer_name || "—"} />
          <Info icon={<Phone size={18} />} label="الهاتف" value={booking.customer_phone || "—"} />
          <Info
            icon={<CalendarDays size={18} />}
            label="فترة الإيجار"
            value={`${new Date(booking.rental_start_at).toLocaleDateString("ar-EG")} → ${new Date(booking.expected_return_at).toLocaleDateString("ar-EG")}`}
          />
          <Info
            icon={<Banknote size={18} />}
            label="الإجمالي / المدفوع / المتبقي"
            value={`${fmt(booking.subtotal)} / ${fmt(booking.deposit_paid)} / ${fmt(booking.remaining_amount)} دج`}
          />
          {booking.event_location && (
            <Info icon={<CalendarDays size={18} />} label="الموقع" value={booking.event_location} />
          )}
        </div>

        {payments.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
              <Receipt size={16} className="text-accent" />
              المدفوعات
            </h3>
            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-4 py-2.5 text-sm"
                >
                  <span className="text-gray-300">
                    {p.type === "DEPOSIT" ? "عربون" : p.type === "BALANCE" ? "رصيد" : "إضافي"} — {fmt(p.amount)} دج
                  </span>
                  <span className="text-xs text-gray-500">{p.method}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === "VERIFIED"
                        ? "bg-success/15 text-success"
                        : p.status === "REJECTED"
                        ? "bg-red-500/15 text-red-300"
                        : "bg-warning/15 text-warning"
                    }`}
                  >
                    {p.status === "VERIFIED" ? "موثّق" : p.status === "REJECTED" ? "مرفوض" : "قيد المراجعة"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {pendingReview && (
            <>
              <Action onClick={() => reviewPayment("APPROVE")} icon={<ThumbsUp size={18} />} disabled={acting === "verify-payment"}>
                اعتماد الدفع
              </Action>
              <Action onClick={() => setShowReject(true)} icon={<ThumbsDown size={18} />} ghost disabled={acting === "verify-payment"}>
                رفض الدفع
              </Action>
            </>
          )}
          {canRecordBalance && (
            <Action onClick={() => invokeEdge("record-balance-payment")} icon={<Banknote size={18} />} disabled={acting === "record-balance-payment"}>
              تسجيل دفعة الرصيد
            </Action>
          )}
          {canHandOver && (
            <Action onClick={() => invokeEdge("hand-over-equipment")} icon={<Truck size={18} />} disabled={acting === "hand-over-equipment"}>
              تسليم المعدات
            </Action>
          )}
          {canStartReturn && (
            <Action onClick={startReturn} icon={<RotateCcw size={18} />} ghost disabled={acting === "start_equipment_return"}>
              بدء الإرجاع
            </Action>
          )}
          {canComplete && (
            <Action onClick={() => invokeEdge("complete-booking")} icon={<CheckCircle2 size={18} />} disabled={acting === "complete-booking"}>
              إكمال الحجز
            </Action>
          )}
        </div>
      </div>

      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-gray-900 p-6">
            <h3 className="mb-4 text-lg font-bold">رفض الدفع</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="اكتب سبب رفض الدفع…"
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-accent"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowReject(false)}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
              >
                إلغاء
              </button>
              <button
                onClick={() => reviewPayment("REJECT")}
                disabled={acting === "verify-payment"}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
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

function Action({
  children,
  onClick,
  icon,
  ghost,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: React.ReactNode;
  ghost?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        ghost
          ? "border border-white/15 text-gray-300 hover:bg-white/5"
          : "bg-accent text-gray-900 hover:bg-accent/90"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { toWesternDigits } from "../lib/digits";
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
  Trash2,
  AlertTriangle,
  Download,
  Upload,
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
  receipt_path: string | null;
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

const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString("en-US") : "0");

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
        .select("id,type,amount,status,method,receipt_path")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });
      setPayments(payData || []);
      setLoading(false);
    };
    if (bookingId) fetch();
  }, [bookingId]);

  const depositPayment = payments.find((p) => p.type === "DEPOSIT");
  const receiptPath = depositPayment?.receipt_path ?? null;
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacePreview, setReplacePreview] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [depAmount, setDepAmount] = useState("");
  const [savingDep, setSavingDep] = useState(false);
  const [balancePaid, setBalancePaid] = useState("");

  useEffect(() => {
    if (depositPayment) setDepAmount(String(depositPayment.amount));
  }, [depositPayment]);

  useEffect(() => {
    if (booking && booking.remaining_amount > 0) setBalancePaid(String(booking.remaining_amount));
  }, [booking?.id, booking?.remaining_amount]);

  const saveDepositAmount = async () => {
    const v = Number(depAmount);
    if (!booking || !depositPayment || !Number.isFinite(v) || v <= 0) return;
    setSavingDep(true);
    setMsg(null);
    try {
      const { error: payErr } = await supabase
        .from("payments")
        .update({ amount: v })
        .eq("id", depositPayment.id);
      if (payErr) throw payErr;
      const { error: bkErr } = await supabase
        .from("bookings")
        .update({
          deposit_required: v,
          remaining_amount: Math.max(0, booking.subtotal - v),
        })
        .eq("id", booking.id);
      if (bkErr) throw bkErr;
      setMsg({ type: "ok", text: "تم تحديث مبلغ العربون حسب الوصل" });
      setTimeout(() => window.location.reload(), 800);
    } catch {
      setSavingDep(false);
      setMsg({ type: "err", text: "تعذر تحديث المبلغ" });
    }
  };

  const recordBalance = async () => {
    const v = Number(balancePaid);
    if (!booking || !Number.isFinite(v) || v <= 0) return;
    setMsg(null);
    setActing("record-balance-payment");
    const { error } = await supabase.functions.invoke("record-balance-payment", {
      body: { bookingId, amount: v },
    });
    setActing(null);
    if (error) {
      setMsg({ type: "err", text: "تعذر تسجيل دفعة الرصيد" });
      return;
    }
    setMsg({ type: "ok", text: "تم تسجيل الدفعة النقدية بنجاح" });
    setTimeout(() => window.location.reload(), 900);
  };

  useEffect(() => {
    let cancelled = false;
    if (!receiptPath) { setReceiptUrl(null); return; }
    setReceiptLoading(true);
    supabase.storage.from("booking-receipts").createSignedUrl(receiptPath, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        setReceiptUrl(error ? null : data?.signedUrl ?? null);
        setReceiptLoading(false);
      });
    return () => { cancelled = true; };
  }, [receiptPath]);

  const pickReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setReplaceFile(f);
    setReplacePreview(f ? URL.createObjectURL(f) : null);
  };

  const replaceReceipt = async () => {
    if (!replaceFile || !booking) return;
    setMsg(null); setActing("replace-receipt");
    try {
      const ext = replaceFile.name.split(".").pop() || "jpg";
      const newPath = `receipts/${booking.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("booking-receipts")
        .upload(newPath, replaceFile, { contentType: replaceFile.type, upsert: false });
      if (upErr) throw upErr;
      if (depositPayment) {
        const { error: payErr } = await supabase.from("payments")
          .update({ receipt_path: newPath }).eq("id", depositPayment.id);
        if (payErr) throw payErr;
      }
      const { error: bkErr } = await supabase.from("bookings")
        .update({ receipt_path: newPath }).eq("id", booking.id);
      if (bkErr) throw bkErr;
      if (receiptPath) await supabase.storage.from("booking-receipts").remove([receiptPath]);
      setShowReplace(false); setReplaceFile(null); setReplacePreview(null);
      setMsg({ type: "ok", text: "تم استبدال صورة الوصل بنجاح" });
      setTimeout(() => window.location.reload(), 900);
    } catch {
      setActing(null);
      setMsg({ type: "err", text: "تعذر استبدال صورة الوصل" });
    }
  };

  const moveToTrash = async () => {
    setMsg(null); setActing("soft-delete");
    const { error } = await supabase.rpc("soft_delete_booking", { p_booking_id: bookingId });
    setActing(null);
    if (error) { setMsg({ type: "err", text: "تعذر نقل الحجز إلى السلة" }); return; }
    setMsg({ type: "ok", text: "تم نقل الحجز إلى سلة المحذوفات" });
    setTimeout(() => navigate("/admin/bookings"), 700);
  };

  const permanentDelete = async () => {
    setMsg(null); setActing("permanent-delete");
    try {
      const { data, error } = await supabase.rpc("permanently_delete_booking", { p_booking_id: bookingId });
      if (error) throw error;
      const path = typeof data === "string" ? data : "";
      if (path) await supabase.storage.from("booking-receipts").remove([path]);
      setShowDelete(false);
      setMsg({ type: "ok", text: "تم الحذف النهائي للحجز" });
      setTimeout(() => navigate("/admin/bookings"), 700);
    } catch {
      setActing(null); setShowDelete(false);
      setMsg({ type: "err", text: "تعذر الحذف النهائي" });
    }
  };

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
  const canTrash = true; // الحذف متاح لجميع الحالات — صلاحية كاملة للأدمن

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
          <Info icon={<Phone size={18} />} label="الهاتف" value={toWesternDigits(booking.customer_phone) || "—"} />
          <Info
            icon={<CalendarDays size={18} />}
            label="فترة الإيجار"
            value={`${new Date(booking.rental_start_at).toLocaleDateString("ar-EG-u-nu-latn")} → ${new Date(booking.expected_return_at).toLocaleDateString("ar-EG-u-nu-latn")}`}
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

        <div className="mt-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
            <Receipt size={16} className="text-accent" />
            صورة وصل العربون
          </h3>
          {receiptLoading ? (
            <div className="flex h-40 items-center justify-center rounded-lg bg-white/5">
              <Loader2 className="animate-spin text-accent" size={24} />
            </div>
          ) : receiptUrl ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <img src={receiptUrl} alt="وصل العربون" className="max-h-80 rounded-lg border border-white/10 object-contain" />
              <div className="flex flex-col gap-2">
                <a href={receiptUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-300 hover:bg-white/5">
                  <Download size={16} />
                  فتح / تنزيل
                </a>
                <button onClick={() => setShowReplace(true)} className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-300 hover:bg-white/5">
                  <Upload size={16} />
                  استبدال الصورة
                </button>
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-white/5 px-4 py-3 text-sm text-gray-400">
              لا توجد صورة وصل مرفوعة لهذا الحجز.
            </p>
          )}
        </div>

        {pendingReview && depositPayment && (
          <div className="mt-6 rounded-lg border border-warning/30 bg-warning/5 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-warning">
              <Banknote size={16} />
              مبلغ العربون المكتوب في الوصل
            </h3>
            <p className="mb-3 text-xs text-gray-400">
              المحسوب آلياً: {fmt(booking.deposit_required)} دج — عدّله ليطابق المبلغ المدفوع فعلياً في الوصل قبل الاعتماد.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={0}
                value={depAmount}
                onChange={(e) => setDepAmount(e.target.value)}
                className="w-40 rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm outline-none focus:border-accent"
              />
              <span className="text-xs text-gray-500">دج</span>
              <button
                onClick={saveDepositAmount}
                disabled={savingDep || !(Number(depAmount) > 0)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-gray-900 hover:bg-accent/90 disabled:opacity-50"
              >
                {savingDep ? "جاري الحفظ…" : "حفظ المبلغ"}
              </button>
            </div>
          </div>
        )}

        {canRecordBalance && (
          <div className="mt-6 rounded-lg border border-info/30 bg-info/5 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-info">
              <Banknote size={16} />
              دفعة الرصيد النقدية عند أخذ المعدات
            </h3>
            <p className="mb-3 text-xs text-gray-400">
              المتبقي حالياً: {fmt(booking.remaining_amount)} دج — أدخل المبلغ الذي دفعه العميل نقداً الآن (يمكن دفعه على أقساط).
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={1}
                max={booking.remaining_amount}
                value={balancePaid}
                onChange={(e) => setBalancePaid(e.target.value)}
                className="w-40 rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm outline-none focus:border-accent"
              />
              <span className="text-xs text-gray-500">دج</span>
              <span className="rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-300">
                يتبقى بعد الدفع: {fmt(Math.max(0, booking.remaining_amount - (Number(balancePaid) || 0)))} دج
              </span>
              <button
                onClick={recordBalance}
                disabled={acting === "record-balance-payment" || !(Number(balancePaid) > 0)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-gray-900 hover:bg-accent/90 disabled:opacity-50"
              >
                {acting === "record-balance-payment" ? "جاري التسجيل…" : "تسجيل الدفعة"}
              </button>
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
          {canTrash && (
            <Action onClick={moveToTrash} icon={<Trash2 size={18} />} ghost disabled={acting === "soft-delete"}>
              نقل إلى السلة
            </Action>
          )}
          {canTrash && (
            <Action onClick={() => setShowDelete(true)} icon={<Trash2 size={18} />} ghost disabled={acting === "permanent-delete"}>
              حذف نهائي
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

      {showReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-gray-900 p-6">
            <h3 className="mb-4 text-lg font-bold">استبدال صورة الوصل</h3>
            {replacePreview && (
              <img src={replacePreview} alt="معاينة الوصل الجديد" className="mx-auto max-h-56 rounded-lg border border-white/10 object-contain" />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={pickReplaceFile}
              className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-gray-300"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowReplace(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">
                إلغاء
              </button>
              <button onClick={replaceReceipt} disabled={!replaceFile || acting === "replace-receipt"} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-gray-900 hover:bg-accent/90 disabled:opacity-50">
                {acting === "replace-receipt" ? "جاري الرفع…" : "تحديث الصورة"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-gray-900 p-6">
            <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-red-400">
              <AlertTriangle size={20} />
              تأكيد الحذف النهائي
            </h3>
            <p className="text-sm text-gray-400">
              سيتم حذف الحجز رقم {booking?.booking_number} مع عناصره ومدفوعاته وصورة الوصل نهائياً من قاعدة البيانات ومخزن الملفات. لا يمكن التراجع.
              {booking && ["CONFIRMED", "READY_FOR_PICKUP", "EQUIPMENT_OUT", "RETURN_PENDING"].includes(booking.status) && (
                <p className="mt-2 rounded-lg bg-warning/15 px-3 py-2 text-xs text-warning">
                  تنبيه: هذا الحجز نشط حالياً — الحذف النهائي سيؤثر على حالة المخزون المرتبطة به.
                </p>
              )}
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowDelete(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">
                إلغاء
              </button>
              <button onClick={permanentDelete} disabled={acting === "permanent-delete"} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
                {acting === "permanent-delete" ? "جاري الحذف…" : "حذف نهائي"}
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

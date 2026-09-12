import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { toWesternDigits } from "../lib/digits";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
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
  Upload,
  StickyNote,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import {
  STATUS_LABELS,
  STATUS_BADGE,
  getAllowedActions,
  getNextStepHint,
  blockingReason,
  actionLabel,
  type BookingAction,
  type BookingFlags,
} from "../domain/bookingWorkflow";

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
  notes: string | null;
}

interface Payment {
  id: string;
  type: string;
  amount: number;
  status: string;
  method: string;
  receipt_path: string | null;
}

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
  const [outsideQuantity, setOutsideQuantity] = useState(0);
  const [unresolvedMissingCount, setUnresolvedMissingCount] = useState(0);
  const [showEdit, setShowEdit] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [editForm, setEditForm] = useState({
    customer_name: "",
    customer_phone: "",
    rental_start_at: "",
    expected_return_at: "",
    event_location: "",
  });
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

      // Server-side truth for the workflow flags used by getAllowedActions.
      const [outsideRes, missingRes] = await Promise.all([
        supabase.rpc("get_equipment_outside_quantity", { p_booking_id: bookingId }),
        supabase.rpc("get_unresolved_missing_count", { p_booking_id: bookingId }),
      ]);
      setOutsideQuantity(Number(outsideRes.data) || 0);
      setUnresolvedMissingCount(Number(missingRes.data) || 0);

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
  const [adminNote, setAdminNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (booking) setAdminNote(booking.notes || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id]);

  useEffect(() => {
    if (!booking) return;
    setEditForm({
      customer_name: booking.customer_name || "",
      customer_phone: booking.customer_phone || "",
      rental_start_at: booking.rental_start_at ? booking.rental_start_at.slice(0, 16) : "",
      expected_return_at: booking.expected_return_at ? booking.expected_return_at.slice(0, 16) : "",
      event_location: booking.event_location || "",
    });
  }, [booking?.id]);

  const saveAdminNote = async () => {
    if (!booking) return;
    setSavingNote(true);
    setMsg(null);
    const { error } = await supabase.from("bookings").update({ notes: adminNote.trim() }).eq("id", booking.id);
    setSavingNote(false);
    if (error) {
      setMsg({ type: "err", text: "تعذر حفظ الملاحظة" });
      return;
    }
    setMsg({ type: "ok", text: "تم حفظ الملاحظة" });
  };

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
      const { error: rpcErr } = await supabase.rpc("set_deposit_amount", {
        p_booking_id: booking.id,
        p_payment_id: depositPayment.id,
        p_amount: v,
      });
      if (rpcErr) throw rpcErr;
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

  const acceptRequest = async () => {
    const dep = payments.find((p) => p.type === "DEPOSIT");
    if (!dep) {
      setMsg({ type: "err", text: "لا يوجد دفع عربون لهذا الحجز" });
      return;
    }
    setMsg(null);
    setActing("verify-payment");
    const { error } = await supabase.functions.invoke("verify-payment", {
      body: { bookingId, paymentId: dep.id, action: "APPROVE", rejectionReason: null },
    });
    setActing(null);
    if (error) {
      setMsg({ type: "err", text: `تعذر قبول الطلب: ${error.message}` });
      return;
    }
    setMsg({ type: "ok", text: "تم قبول الطلب" });
    setTimeout(() => window.location.reload(), 900);
  };

  const rejectAndDelete = async () => {
    if (!rejectReason.trim()) {
      setMsg({ type: "err", text: "أدخل سبب الرفض" });
      return;
    }
    setMsg(null);
    setActing("reject-and-delete");
    try {
      const { data, error } = await supabase.rpc("reject_and_delete_booking", {
        p_booking_id: bookingId,
        p_reason: rejectReason.trim(),
      });
      if (error) throw error;
      const path = typeof data === "string" ? data : "";
      if (path) await supabase.storage.from("booking-receipts").remove([path]);
      setShowReject(false);
      setMsg({ type: "ok", text: "تم رفض الطلب وحذفه" });
      setTimeout(() => navigate("/admin/bookings"), 700);
    } catch (e) {
      setActing(null);
      setMsg({ type: "err", text: `تعذر رفض الطلب: ${(e as Error)?.message ?? ""}` });
    }
  };

  const saveBookingDetails = async () => {
    if (!booking) return;
    setMsg(null);
    setActing("update-details");
    try {
      const { error } = await supabase.rpc("update_booking_details", {
        p_booking_id: booking.id,
        p_customer_name: editForm.customer_name.trim() || null,
        p_customer_phone: editForm.customer_phone.trim() || null,
        p_rental_start_at: editForm.rental_start_at || null,
        p_expected_return_at: editForm.expected_return_at || null,
        p_event_location: editForm.event_location.trim() || null,
      });
      if (error) throw error;
      setShowEdit(false);
      setMsg({ type: "ok", text: "تم تحديث بيانات الطلب" });
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setActing(null);
      setMsg({ type: "err", text: `تعذر تحديث البيانات: ${(e as Error)?.message ?? ""}` });
    }
  };

  const savePriceAdjustment = async () => {
    const delta = Number(adjustAmount);
    if (!booking || !Number.isFinite(delta) || delta === 0) return;
    setMsg(null);
    setActing("adjust-price");
    try {
      const { error } = await supabase.rpc("adjust_booking_price", {
        p_booking_id: booking.id,
        p_delta_amount: delta,
        p_reason: adjustReason.trim() || null,
      });
      if (error) throw error;
      setAdjustAmount("");
      setAdjustReason("");
      setMsg({ type: "ok", text: "تم تعديل المبلغ" });
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setActing(null);
      setMsg({ type: "err", text: `تعذر تعديل المبلغ: ${(e as Error)?.message ?? ""}` });
    }
  };

  const saveRefund = async () => {
    const amount = Number(refundAmount);
    if (!booking || !Number.isFinite(amount) || amount <= 0) return;
    setMsg(null);
    setActing("record-refund");
    try {
      const { error } = await supabase.rpc("record_refund", {
        p_booking_id: booking.id,
        p_amount: amount,
        p_method: "CASH",
        p_note: refundNote.trim() || null,
      });
      if (error) throw error;
      setRefundAmount("");
      setRefundNote("");
      setMsg({ type: "ok", text: "تم تسجيل الاسترجاع" });
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setActing(null);
      setMsg({ type: "err", text: `تعذر تسجيل الاسترجاع: ${(e as Error)?.message ?? ""}` });
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

  // ---------------------------------------------------------------------------
  // Workflow permissions — single source of truth in domain/bookingWorkflow.
  // ---------------------------------------------------------------------------
  const flags: BookingFlags = {
    remainingAmount: booking.remaining_amount,
    outsideQuantity,
    unresolvedMissingCount,
    hasDepositPayment: payments.some((p) => p.type === "DEPOSIT"),
  };
  const allowed: BookingAction[] = getAllowedActions(booking.status, flags);
  const isAllowed = (a: BookingAction) => allowed.includes(a);
  const hint = getNextStepHint(booking.status, flags);
  const blocker = blockingReason(booking.status, flags);

  // In-page money panels follow the same matrix as the action bar.
  const canSetDeposit = isAllowed("ACCEPT_REQUEST") && Boolean(depositPayment);
  const canRecordBalance = isAllowed("RECORD_BALANCE");
  const canAdjustPrice = isAllowed("ADJUST_PRICE");
  const canRefund = isAllowed("RECORD_REFUND");

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

      {(blocker || hint) && (
        <div
          className={`mb-4 rounded-lg px-4 py-2.5 text-sm ${
            blocker ? "bg-warning/15 text-warning" : "bg-white/5 text-gray-300"
          }`}
        >
          {blocker ?? hint}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{booking.booking_number}</h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {booking.customer_name || "—"} · {toWesternDigits(booking.customer_phone) || "—"}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(booking.rental_start_at).toLocaleDateString("ar-EG-u-nu-latn")} →{" "}
              {new Date(booking.expected_return_at).toLocaleDateString("ar-EG-u-nu-latn")}
              {booking.event_location ? ` · ${booking.event_location}` : ""}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              STATUS_BADGE[booking.status] ?? "bg-gray-500/15 text-gray-300"
            }`}
          >
            {STATUS_LABELS[booking.status] ?? booking.status}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg bg-white/5 px-3 py-1.5 text-gray-300">
            الإجمالي: <b className="text-gray-100">{fmt(booking.subtotal)}</b> دج
          </span>
          <span className="rounded-lg bg-white/5 px-3 py-1.5 text-gray-300">
            المدفوع: <b className="text-gray-100">{fmt(booking.deposit_paid)}</b> دج
          </span>
          <span
            className={`rounded-lg px-3 py-1.5 ${
              booking.remaining_amount > 0 ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
            }`}
          >
            المتبقي: <b>{fmt(booking.remaining_amount)}</b> دج
          </span>
        </div>

        {(canSetDeposit || isAllowed("REJECT_AND_DELETE")) && (
          <div className="mt-5 rounded-lg border border-warning/30 bg-warning/5 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-warning">
              <Receipt size={16} />
              مراجعة الطلب
            </h3>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="sm:w-64 sm:shrink-0">
                {receiptLoading ? (
                  <div className="flex h-40 items-center justify-center rounded-lg bg-white/5">
                    <Loader2 className="animate-spin text-accent" size={24} />
                  </div>
                ) : receiptUrl ? (
                  <a href={receiptUrl} target="_blank" rel="noreferrer">
                    <img src={receiptUrl} alt="وصل العربون" className="max-h-56 rounded-lg border border-white/10 object-contain" />
                  </a>
                ) : (
                  <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-400">لا توجد صورة وصل مرفوعة.</p>
                )}
              </div>
              <div className="flex-1">
                {canSetDeposit && depositPayment && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-400">مبلغ العربون كما في الوصل:</span>
                    <input
                      type="number"
                      min={0}
                      value={depAmount}
                      onChange={(e) => setDepAmount(e.target.value)}
                      className="w-32 rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none focus:border-accent"
                    />
                    <span className="text-xs text-gray-500">دج</span>
                    <button
                      onClick={saveDepositAmount}
                      disabled={savingDep || !(Number(depAmount) > 0)}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-50"
                    >
                      {savingDep ? "جاري الحفظ..." : "تحديث"}
                    </button>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {isAllowed("ACCEPT_REQUEST") && (
                    <Action onClick={acceptRequest} icon={<ThumbsUp size={18} />} disabled={acting === "verify-payment"}>
                      {actionLabel("ACCEPT_REQUEST")}
                    </Action>
                  )}
                  {isAllowed("REJECT_AND_DELETE") && (
                    <Action onClick={() => setShowReject(true)} icon={<ThumbsDown size={18} />} ghost disabled={acting === "reject-and-delete"}>
                      {actionLabel("REJECT_AND_DELETE")}
                    </Action>
                  )}
                </div>
                {receiptUrl && (
                  <button onClick={() => setShowReplace(true)} className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
                    <Upload size={12} />
                    استبدال الصورة
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {canRecordBalance && (
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-info/30 bg-info/5 p-4">
            <span className="text-sm text-gray-300">
              دفعة نقدية الآن (المتبقي {fmt(booking.remaining_amount)} دج):
            </span>
            <input
              type="number"
              min={1}
              max={booking.remaining_amount}
              value={balancePaid}
              onChange={(e) => setBalancePaid(e.target.value)}
              className="w-32 rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none focus:border-accent"
            />
            <span className="text-xs text-gray-500">دج</span>
            <button
              onClick={recordBalance}
              disabled={acting === "record-balance-payment" || !(Number(balancePaid) > 0)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-50"
            >
              {acting === "record-balance-payment" ? "جاري التسجيل..." : "تسجيل"}
            </button>
          </div>
        )}


        {canRefund && (
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-4">
            <span className="text-sm text-gray-300">رد مبلغ للعميل:</span>
            <input
              type="number"
              min={1}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="المبلغ"
              className="w-32 rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none focus:border-accent"
            />
            <span className="text-xs text-gray-500">دج</span>
            <button
              onClick={saveRefund}
              disabled={acting === "record-refund" || !(Number(refundAmount) > 0)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-50"
            >
              {acting === "record-refund" ? "جاري التسجيل..." : "تسجيل"}
            </button>
          </div>
        )}


        {isAllowed("HAND_OVER") && (
          <div className="mt-5">
            <Action onClick={() => invokeEdge("hand-over-equipment")} icon={<Truck size={18} />} disabled={acting === "hand-over-equipment"}>
              {actionLabel("HAND_OVER")}
            </Action>
          </div>
        )}

        {isAllowed("START_RETURN") && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Action onClick={() => navigate(`/admin/returns/${bookingId}`)} icon={<RotateCcw size={18} />}>
              تسجيل الإرجاع
            </Action>
            <span className="text-xs text-gray-500">خارج المخزون الآن: {outsideQuantity} وحدة</span>
          </div>
        )}

        {isAllowed("COMPLETE") && (
          <div className="mt-5">
            <Action
              onClick={() => invokeEdge("complete-booking")}
              icon={<CheckCircle2 size={18} />}
              disabled={acting === "complete-booking" || Boolean(blocker)}
            >
              {actionLabel("COMPLETE")}
            </Action>
          </div>
        )}

        <div className="mt-5 border-t border-white/5 pt-3">
          <button onClick={() => setShowMore((s) => !s)} className="text-xs text-gray-500 hover:text-gray-300">
            {showMore ? "إخفاء الخيارات ▲" : "المزيد من الخيارات ▼"}
          </button>
          {showMore && (
            <div className="mt-3 space-y-4">
              {payments.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-400">المدفوعات</p>
                  <div className="space-y-1.5">
                    {payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs"
                      >
                        <span className="text-gray-300">
                          {p.type === "DEPOSIT" ? "عربون" : p.type === "BALANCE" ? "رصيد" : p.type === "REFUND" ? "استرجاع" : "إضافي"} — {fmt(p.amount)} دج
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 ${
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
              {!(canSetDeposit || isAllowed("REJECT_AND_DELETE")) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400">وصل العربون:</span>
                  {receiptLoading ? (
                    <Loader2 size={14} className="animate-spin text-gray-500" />
                  ) : receiptUrl ? (
                    <>
                      <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-gray-300 underline hover:text-white">
                        فتح / تنزيل
                      </a>
                      <button onClick={() => setShowReplace(true)} className="text-xs text-gray-300 underline hover:text-white">
                        استبدال الصورة
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">لا توجد صورة</span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {isAllowed("EDIT_DETAILS") && (
                  <Action onClick={() => setShowEdit(true)} icon={<StickyNote size={16} />} ghost disabled={acting === "update-details"}>
                    {actionLabel("EDIT_DETAILS")}
                  </Action>
                )}
                {isAllowed("MOVE_TO_TRASH") && (
                  <Action onClick={moveToTrash} icon={<Trash2 size={16} />} ghost disabled={acting === "soft-delete"}>
                    {actionLabel("MOVE_TO_TRASH")}
                  </Action>
                )}
                {isAllowed("PERMANENT_DELETE") && (
                  <Action onClick={() => setShowDelete(true)} icon={<Trash2 size={16} />} ghost disabled={acting === "permanent-delete"}>
                    {actionLabel("PERMANENT_DELETE")}
                  </Action>
                )}
              </div>

              {canAdjustPrice && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-400">تعديل السعر (موجب للزيادة / سالب للخصم):</span>
                  <input
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="0"
                    className="w-28 rounded-lg border border-white/10 bg-white/5 p-2 text-xs outline-none focus:border-accent"
                  />
                  <span className="text-xs text-gray-500">دج</span>
                  <input
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="السبب"
                    className="w-44 rounded-lg border border-white/10 bg-white/5 p-2 text-xs outline-none focus:border-accent"
                  />
                  <button
                    onClick={savePriceAdjustment}
                    disabled={acting === "adjust-price" || !adjustAmount || Number(adjustAmount) === 0}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-50"
                  >
                    {acting === "adjust-price" ? "جاري الحفظ..." : "حفظ"}
                  </button>
                </div>
              )}

              <div>
                <p className="mb-1 text-xs font-semibold text-gray-400">ملاحظة الأدمن (داخلية)</p>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="ملاحظة داخلية فقط..."
                  rows={2}
                  className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs outline-none focus:border-accent"
                />
                <button
                  onClick={saveAdminNote}
                  disabled={savingNote}
                  className="mt-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-50"
                >
                  {savingNote ? "جاري الحفظ..." : "حفظ الملاحظة"}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-gray-900 p-6">
            <h3 className="mb-4 text-lg font-bold">رفض وحذف الطلب</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="اكتب سبب رفض الطلب..."
              className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-accent"
            />
            <p className="mt-2 text-xs text-gray-400">سيتم حذف الطلب نهائيا مع مدفوعاته. لا يمكن التراجع.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowReject(false)}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
              >
                إلغاء
              </button>
              <button
                onClick={rejectAndDelete}
                disabled={acting === "reject-and-delete"}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {acting === "reject-and-delete" ? "جاري الحذف..." : "رفض وحذف"}
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

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-gray-900 p-6">
            <h3 className="mb-4 text-lg font-bold">تعديل بيانات الطلب</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-gray-400">
                اسم العميل
                <input
                  value={editForm.customer_name}
                  onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-gray-200 outline-none focus:border-accent"
                />
              </label>
              <label className="text-xs text-gray-400">
                رقم الهاتف
                <input
                  value={editForm.customer_phone}
                  onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-gray-200 outline-none focus:border-accent"
                />
              </label>
              <label className="text-xs text-gray-400">
                بداية الإيجار
                <input
                  type="datetime-local"
                  value={editForm.rental_start_at}
                  onChange={(e) => setEditForm({ ...editForm, rental_start_at: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-gray-200 outline-none focus:border-accent"
                />
              </label>
              <label className="text-xs text-gray-400">
                موعد الإرجاع المتوقع
                <input
                  type="datetime-local"
                  value={editForm.expected_return_at}
                  onChange={(e) => setEditForm({ ...editForm, expected_return_at: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-gray-200 outline-none focus:border-accent"
                />
              </label>
              <label className="text-xs text-gray-400 sm:col-span-2">
                مكان الحدث
                <input
                  value={editForm.event_location}
                  onChange={(e) => setEditForm({ ...editForm, event_location: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm text-gray-200 outline-none focus:border-accent"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowEdit(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">
                إلغاء
              </button>
              <button
                onClick={saveBookingDetails}
                disabled={acting === "update-details"}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-gray-900 hover:bg-accent/90 disabled:opacity-50"
              >
                {acting === "update-details" ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
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

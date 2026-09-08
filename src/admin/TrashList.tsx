import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Trash2, RotateCcw, Loader2, AlertTriangle, Inbox, RefreshCw, X } from "lucide-react";
import AdminLayout from "../components/AdminLayout";

interface TrashedBooking {
  id: string;
  booking_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  deleted_at: string | null;
  completed_at: string | null;
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

export default function TrashList() {
  const [items, setItems] = useState<TrashedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TrashedBooking | null>(null);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("get_trashed_bookings");
    if (rpcError) {
      setError("تعذر تحميل سلة المحذوفات");
    } else {
      setItems((data as TrashedBooking[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const restore = async (b: TrashedBooking) => {
    setActing(b.id);
    setMsg("");
    const { error } = await supabase.rpc("restore_booking", { p_booking_id: b.id });
    setActing(null);
    if (error) {
      setMsg("تعذر استعادة الحجز");
      return;
    }
    setMsg(`تمت استعادة الحجز ${b.booking_number} بنجاح`);
    load();
  };

  const permanentDelete = async (b: TrashedBooking) => {
    setActing(b.id);
    setMsg("");
    try {
      const { data, error } = await supabase.rpc("permanently_delete_booking", { p_booking_id: b.id });
      if (error) throw error;
      const path = typeof data === "string" ? data : "";
      if (path) {
        await supabase.storage.from("booking-receipts").remove([path]);
      }
      setMsg(`تم الحذف النهائي للحجز ${b.booking_number} من قاعدة البيانات والمخزن`);
      setConfirmDelete(null);
      load();
    } catch {
      setMsg("تعذر الحذف النهائي");
    } finally {
      setActing(null);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Trash2 size={24} className="text-accent" />
            سلة المحذوفات
          </h1>
          <p className="mt-1 text-sm text-gray-500">الحجوزات المحذوفة — استعادة أو حذف نهائي من الجذور</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
        >
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>

      {msg && <div className="mb-4 rounded-lg bg-success/15 px-4 py-3 text-sm text-success">{msg}</div>}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">
          {error}
          <button onClick={load} className="mr-3 underline">
            إعادة المحاولة
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 py-16 text-gray-500">
          <Inbox size={40} className="mb-3" />
          <p>السلة فارغة — لا توجد حجوزات محذوفة</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-right text-xs text-gray-500">
                <th className="p-4">رقم الحجز</th>
                <th className="p-4">العميل</th>
                <th className="p-4">الهاتف</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">تاريخ الحذف</th>
                <th className="p-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-b border-white/5 last:border-0">
                  <td className="p-4 font-semibold text-accent">{b.booking_number}</td>
                  <td className="p-4">{b.customer_name || "—"}</td>
                  <td className="p-4" dir="ltr">
                    {b.customer_phone || "—"}
                  </td>
                  <td className="p-4">{STATUS_LABELS[b.status] ?? b.status}</td>
                  <td className="p-4 text-gray-400">
                    {b.deleted_at ? new Date(b.deleted_at).toLocaleDateString("ar-EG") : "—"}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => restore(b)}
                        disabled={acting === b.id}
                        className="flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-50"
                      >
                        <RotateCcw size={14} />
                        استعادة
                      </button>
                      <button
                        onClick={() => setConfirmDelete(b)}
                        disabled={acting === b.id}
                        className="flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/25 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        حذف نهائي
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-gray-900 p-6">
            <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-red-400">
              <AlertTriangle size={20} />
              حذف نهائي من الجذور
            </h3>
            <p className="text-sm text-gray-400">
              سيتم حذف الحجز {confirmDelete.booking_number} مع عناصره ومدفوعاته وصورة الوصل نهائياً
              من قاعدة البيانات ومخزن الملفات. لا يمكن التراجع.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex items-center gap-1 rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
              >
                <X size={16} />
                إلغاء
              </button>
              <button
                onClick={() => permanentDelete(confirmDelete)}
                disabled={acting === confirmDelete.id}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {acting === confirmDelete.id ? "جاري الحذف…" : "حذف نهائي"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
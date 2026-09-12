import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { toWesternDigits } from "../lib/digits";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Search,
  Package,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  User,
  Phone,
  CalendarClock,
  Truck,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { STATUS_LABELS, STATUS_BADGE as STATUS_STYLES } from "../domain/bookingWorkflow";

interface OutsideAssignment {
  booking_id: string;
  booking_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  equipment_id: string;
  equipment_name: string;
  quantity_out: number;
  rental_start_at: string;
  expected_return_at: string;
  status: string;
}

export default function EquipmentOutside() {
  const [assignments, setAssignments] = useState<OutsideAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const [acting, setActing] = useState<string | null>(null);
  const [actMsg, setActMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("get_equipment_outside_assignments");
    if (error || !data) {
      setAssignments([]);
      setError("تعذر تحميل المعدات الخارجة، تحقق من الاتصال ثم أعد المحاولة.");
    } else {
      setAssignments(data as OutsideAssignment[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const markReturned = async (b: OutsideAssignment) => {
    setActing(b.booking_id);
    setActMsg(null);
    try {
      await supabase.rpc("start_equipment_return", { p_booking_id: b.booking_id });
      const { data: items } = await supabase.rpc("get_return_items_for_booking", { p_booking_id: b.booking_id });
      for (const it of (items || [])) {
        await supabase.rpc("upsert_return_item", {
          p_return_item_id: it.id,
          p_returned_good_quantity: it.expected_quantity,
          p_damaged_quantity: 0,
          p_missing_quantity: 0,
          p_remaining_out_quantity: 0,
        });
      }
      await supabase.rpc("maybe_complete_return", { p_booking_id: b.booking_id });
      setActing(null);
      setActMsg({ ok: true, text: `تم تسجيل إرجاع الحجز ${b.booking_number} بنجاح` });
      await fetchAssignments();
    } catch {
      setActing(null);
      setActMsg({ ok: false, text: "تعذر تسجيل الإرجاع — تحقق من معدات الحجز" });
    }
  };
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAssignments();
    setRefreshing(false);
  };

  const enriched = useMemo(() => {
    const now = new Date();
    return assignments.map((a) => ({
      ...a,
      overdue: new Date(a.expected_return_at).getTime() < now.getTime(),
      daysLeft: Math.ceil((new Date(a.expected_return_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }));
  }, [assignments]);

  const filtered = enriched.filter((a) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      (a.customer_name || "").toLowerCase().includes(q) ||
      toWesternDigits(a.customer_phone).toLowerCase().includes(toWesternDigits(q)) ||
      a.booking_number.toLowerCase().includes(q) ||
      a.equipment_name.toLowerCase().includes(q)
    );
  });

  const totalItemsOut = enriched.reduce((s, a) => s + a.quantity_out, 0);
  const totalBookingsOut = new Set(enriched.map((a) => a.booking_id)).size;
  const overdueCount = enriched.filter((a) => a.overdue).length;
  const activeCount = enriched.filter((a) => a.status === "EQUIPMENT_OUT").length;

  const stats = [
    { label: "قطع خارج المتجر", value: totalItemsOut, icon: <Truck size={22} />, color: "text-info", bg: "bg-info/10" },
    { label: "حجوزات نشطة", value: totalBookingsOut, icon: <Package size={22} />, color: "text-blue-300", bg: "bg-blue-500/10" },
    { label: "بانتظار الإرجاع", value: activeCount, icon: <CheckCircle2 size={22} />, color: "text-purple-300", bg: "bg-purple-500/10" },
    { label: "متأخرة عن الإرجاع", value: overdueCount, icon: <AlertTriangle size={22} />, color: "text-red-400", bg: "bg-red-500/10" },
  ];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المعدات خارج المتجر</h1>
          <p className="mt-1 text-sm text-gray-400">جميع المعدات المسلمة للعملاء مع تواريخ الإرجاع المتوقعة</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          تحديث
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
          <button onClick={handleRefresh} className="mr-2 font-semibold underline">إعادة المحاولة</button>
        </div>
      )}

      {/* Stats */}
      {actMsg && (
        <div className={"mb-4 rounded-lg px-4 py-3 text-sm " + (actMsg.ok ? "bg-success/15 text-success" : "bg-red-500/15 text-red-300")}>
          {actMsg.text}
        </div>
      )}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${s.bg} ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6 flex w-full max-w-md items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
        <Search size={16} className="text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث باسم العميل أو الهاتف أو رقم الحجز…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500"
        />
      </div>

      {/* Loading / Empty / Table */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-gray-400">
          {search ? "لا توجد نتائج مطابقة" : "لا توجد معدات خارج المتجر حالياً"}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-right text-sm">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-4 py-3">العميل</th>
                <th className="px-4 py-3">رقم الحجز</th>
                <th className="px-4 py-3">المعدة</th>
                <th className="px-4 py-3">الكمية</th>
                <th className="px-4 py-3">الإرجاع المتوقع</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, idx) => (
                <tr key={`${a.booking_id}-${a.equipment_id}-${idx}`} className={`border-t border-white/5 hover:bg-white/5 ${a.overdue ? "bg-red-500/5" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-2 font-medium">
                        <User size={14} className="text-gray-500" />
                        {a.customer_name || "—"}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                        <Phone size={12} className="text-gray-500" />
                        {toWesternDigits(a.customer_phone) || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-white/5 px-2 py-1 font-mono text-xs text-gray-300">
                      {a.booking_number}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{a.equipment_name}</td>
                  <td className="px-4 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 font-bold text-accent">
                      {a.quantity_out}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className={`flex items-center gap-2 text-xs font-medium ${a.overdue ? "text-red-400" : "text-gray-300"}`}>
                        <CalendarClock size={14} />
                        {new Date(a.expected_return_at).toLocaleDateString("ar-EG-u-nu-latn")}
                      </span>
                      {a.overdue ? (
                        <span className="mt-0.5 text-xs font-semibold text-red-400">متأخر {Math.abs(a.daysLeft)} يوم</span>
                      ) : a.daysLeft <= 2 ? (
                        <span className="mt-0.5 text-xs font-semibold text-warning">متبقي {a.daysLeft} يوم</span>
                      ) : (
                        <span className="mt-0.5 text-xs text-gray-500">متبقي {a.daysLeft} يوم</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[a.status] ?? "bg-white/5 text-gray-300"}`}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </td>
                    <button
                      onClick={() => markReturned(a)}
                      disabled={acting === a.booking_id}
                      className="flex items-center gap-1 rounded-lg bg-success/15 px-3 py-1.5 text-xs font-medium text-success transition hover:bg-success/25 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      {acting === a.booking_id ? "جاري…" : "تم الارجاع"}
                    </button>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/admin/returns/${a.booking_id}`)}
                      className="flex items-center gap-1 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/25"
                    >
                      <Eye size={14} />
                      إرجاع / متابعة
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

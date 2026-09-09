import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  Loader2,
  Search,
  Package,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  RefreshCw,
  Wrench,
  Pencil,
  Trash2,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";

interface InventoryItem {
  equipment_id: string;
  name: string;
  total_quantity: number;
  physical_outside_quantity: number;
  outside_quantity: number;
  damaged_quantity: number;
  missing_quantity: number;
  rentable_quantity: number;
  physical_inside_quantity: number;
  inside_quantity: number;
}

export default function EquipmentInside() {
  const [list, setList] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [delMsg, setDelMsg] = useState("");

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setDelMsg("");
    try {
      const marker = "/object/public/equipment-images/";
      const { data: eq } = await supabase.from("equipment").select("image_path").eq("id", confirmDelete.equipment_id).single();
      const { error } = await supabase.from("equipment").delete().eq("id", confirmDelete.equipment_id);
      if (error) throw error;
      const img = eq?.image_path || "";
      if (img.includes(marker)) {
        try {
          const obj = decodeURIComponent(img.split(marker)[1]);
          await supabase.storage.from("equipment-images").remove([obj]);
        } catch {}
      }
      setConfirmDelete(null);
      await fetchStatus();
    } catch (err: any) {
      if (err?.code === "23503" || String(err?.message || "").includes("foreign key")) {
        setDelMsg("لا يمكن حذف معدة مرتبطة بحجوزات سابقة — يمكنك تعديلها أو إخفاؤها بدل حذفها.");
      } else {
        setDelMsg("تعذر حذف المعدة");
      }
    } finally {
      setDeleting(false);
    }
  };

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("inventory_status")
      .select("*")
      .order("name");
    if (error || !data) {
      setList([]);
      setError("تعذر تحميل المخزون، تحقق من الاتصال ثم أعد المحاولة.");
    } else {
      setList(data as InventoryItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  const normalized = useMemo(() => {
    return list.map((e) => ({
      ...e,
      outsideQty: e.physical_outside_quantity ?? e.outside_quantity ?? 0,
      insideQty: e.physical_inside_quantity ?? e.inside_quantity ?? 0,
      damaged: e.damaged_quantity ?? 0,
      missing: e.missing_quantity ?? 0,
      rentable: e.rentable_quantity ?? 0,
    }));
  }, [list]);

  const filtered = normalized.filter((e) =>
    e.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const totalUnits = normalized.reduce((s, e) => s + e.total_quantity, 0);
  const rentableUnits = normalized.reduce((s, e) => s + e.rentable, 0);
  const outsideUnits = normalized.reduce((s, e) => s + e.outsideQty, 0);
  const issuesUnits = normalized.reduce((s, e) => s + e.damaged + e.missing, 0);

  const stats = [
    { label: "إجمالي القطع", value: totalUnits, icon: <Boxes size={22} />, color: "text-info", bg: "bg-info/10" },
    { label: "متاح للإيجار", value: rentableUnits, icon: <CheckCircle2 size={22} />, color: "text-success", bg: "bg-success/10" },
    { label: "خارج المتجر", value: outsideUnits, icon: <Package size={22} />, color: "text-warning", bg: "bg-warning/10" },
    { label: "تالف/مفقود", value: issuesUnits, icon: <AlertTriangle size={22} />, color: "text-red-400", bg: "bg-red-500/10" },
  ];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المعدات داخل المتجر</h1>
          <p className="mt-1 text-sm text-gray-400">حالة مخزون المعدات المتاحة داخل المتجر</p>
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

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
          <button onClick={handleRefresh} className="mr-2 font-semibold underline">إعادة المحاولة</button>
        </div>
      )}

      {/* Stats */}
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
          placeholder="بحث باسم المعدة…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500"
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-gray-400">
          {search ? "لا توجد نتائج مطابقة" : "لا توجد معدات مسجلة حالياً"}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-right text-sm">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-4 py-3">المعدة</th>
                <th className="px-4 py-3">الإجمالي</th>
                <th className="px-4 py-3">التوفر</th>
                <th className="px-4 py-3">متاح</th>
                <th className="px-4 py-3">خارج</th>
                <th className="px-4 py-3">تالف</th>
                <th className="px-4 py-3">مفقود</th>
                <th className="px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.equipment_id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                        <Wrench size={15} />
                      </span>
                      {e.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{e.total_quantity}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${
                            e.rentable === 0
                              ? "bg-red-500"
                              : e.rentable <= e.total_quantity / 2
                              ? "bg-warning"
                              : "bg-success"
                          }`}
                          style={{ width: `${Math.min(100, (e.total_quantity === 0 ? 0 : (e.rentable / e.total_quantity) * 100))}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{Math.round((e.total_quantity === 0 ? 0 : (e.rentable / e.total_quantity) * 100))}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${e.rentable === 0 ? "bg-red-500/15 text-red-400" : "bg-success/15 text-success"}`}>
                      {e.rentable}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${e.outsideQty > 0 ? "bg-warning/15 text-warning" : "bg-white/5 text-gray-500"}`}>
                      {e.outsideQty}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${e.damaged > 0 ? "bg-red-500/15 text-red-400" : "bg-white/5 text-gray-500"}`}>
                      {e.damaged}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${e.missing > 0 ? "bg-red-500/15 text-red-400" : "bg-white/5 text-gray-500"}`}>
                      {e.missing}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/admin/equipment/edit/${e.equipment_id}`)}
                        className="flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-white/5"
                      >
                        <Pencil size={13} />
                        تعديل
                      </button>
                      <button
                        onClick={() => setConfirmDelete(e)}
                        className="flex items-center gap-1 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/25"
                      >
                        <Trash2 size={13} />
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {delMsg && (
        <div className="mb-4 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{delMsg}</div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-gray-900 p-6">
            <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-red-400">
              <AlertTriangle size={20} />
              تأكيد حذف المعدة
            </h3>
            <p className="text-sm text-gray-400">
              سيتم حذف «{confirmDelete.name}» نهائياً. إذا كانت مرتبطة بحجوزات سابقة فلن يسمح النظام بالحذف.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">
                إلغاء
              </button>
              <button onClick={handleDelete} disabled={deleting} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
                {deleting ? "جاري الحذف…" : "حذف نهائي"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

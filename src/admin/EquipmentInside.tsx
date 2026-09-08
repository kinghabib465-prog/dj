import React, { useEffect, useMemo, useState } from "react";
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

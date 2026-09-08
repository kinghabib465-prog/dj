import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Save, Loader2, Package } from "lucide-react";
import AdminLayout from "../components/AdminLayout";

interface ReturnItem {
  id: string;
  equipment_name: string;
  expected_quantity: number;
  returned_good_quantity: number;
  damaged_quantity: number;
  missing_quantity: number;
  remaining_out_quantity: number;
}

export default function ReturnsDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.rpc("get_return_items_for_booking", { p_booking_id: bookingId });
      if (error) { setMsg({ type: "err", text: "تعذر تحميل عناصر الإرجاع" }); setLoading(false); return; }
      setItems(data ?? []);
      setLoading(false);
    };
    if (bookingId) fetch();
  }, [bookingId]);

  const handleChange = (index: number, field: keyof ReturnItem, value: number) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: Math.max(0, value) } : it));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    for (const item of items) {
      const { error } = await supabase.rpc("upsert_return_item", {
        p_return_item_id: item.id,
        p_returned_good_quantity: item.returned_good_quantity,
        p_damaged_quantity: item.damaged_quantity,
        p_missing_quantity: item.missing_quantity,
        p_remaining_out_quantity: item.remaining_out_quantity,
      });
      if (error) { setMsg({ type: "err", text: "فشل حفظ بعض العناصر" }); setSaving(false); return; }
    }
    await supabase.rpc("maybe_complete_return", { p_booking_id: bookingId });
    setMsg({ type: "ok", text: "تم الحفظ بنجاح" });
    setSaving(false);
    setTimeout(() => navigate("/admin/returns"), 900);
  };

  if (loading) return <AdminLayout><div className="flex h-48 items-center justify-center"><Loader2 className="animate-spin text-accent" size={28} /></div></AdminLayout>;

  return (
    <AdminLayout>
      <button onClick={() => navigate("/admin/returns")} className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowRight size={16} />العودة</button>
      {msg && <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${msg.type === "ok" ? "bg-success/15 text-success" : "bg-red-500/15 text-red-300"}`}>{msg.text}</div>}
      <h1 className="mb-1 text-2xl font-bold">تسجيل الإرجاع</h1>
      <p className="mb-6 text-sm text-gray-400">الحجز: {bookingId}</p>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-right text-sm">
          <thead className="bg-white/5 text-gray-400">
            <tr>
              <th className="px-4 py-3">المعدة</th>
              <th className="px-4 py-3">المتوقع</th>
              <th className="px-4 py-3">سليم</th>
              <th className="px-4 py-3">تالف</th>
              <th className="px-4 py-3">مفقود</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id} className="border-t border-white/5">
                <td className="px-4 py-3"><span className="flex items-center gap-2"><Package size={14} className="text-accent" />{it.equipment_name}</span></td>
                <td className="px-4 py-3 text-gray-400">{it.expected_quantity}</td>
                <td className="px-2 py-2"><NumInput value={it.returned_good_quantity} onChange={v => handleChange(idx, "returned_good_quantity", v)} /></td>
                <td className="px-2 py-2"><NumInput value={it.damaged_quantity} onChange={v => handleChange(idx, "damaged_quantity", v)} /></td>
                <td className="px-2 py-2"><NumInput value={it.missing_quantity} onChange={v => handleChange(idx, "missing_quantity", v)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={handleSave} disabled={saving} className="mt-6 flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-accent/90 disabled:opacity-50">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}حفظ وإكمال الإرجاع
      </button>
    </AdminLayout>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return <input type="number" min={0} value={value} onChange={e => onChange(parseInt(e.target.value) || 0)} className="w-20 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-center text-sm outline-none focus:border-accent" />;
}

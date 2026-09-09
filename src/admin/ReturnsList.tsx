import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Loader2, User, Phone, CalendarDays, Package, Eye } from "lucide-react";
import AdminLayout from "../components/AdminLayout";

interface ReturnBooking {
  id: string;
  booking_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  expected_return_at: string;
  equipment_summary: string;
  status: string;
}

export default function ReturnsList() {
  const [returns, setReturns] = useState<ReturnBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.rpc("get_equipment_outside_assignments");
      if (error) { setLoading(false); return; }
      const grouped: { [key: string]: ReturnBooking } = {};
      data.forEach((item: any) => {
        const key = item.booking_id;
        if (!grouped[key]) {
          grouped[key] = { id: key, booking_number: item.booking_number, customer_name: item.customer_name, customer_phone: item.customer_phone, expected_return_at: item.expected_return_at, equipment_summary: `${item.quantity_out ?? item.quantity} × ${item.equipment_name}`, status: item.status };
        } else {
          grouped[key].equipment_summary += `, ${item.quantity_out ?? item.quantity} × ${item.equipment_name}`;
        }
      });
      setReturns(Object.values(grouped));
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <AdminLayout>
      <h1 className="mb-1 text-2xl font-bold">المعدات الخارجة</h1>
      <p className="mb-6 text-sm text-gray-400">جميع الحجوزات النشطة بانتظار الإرجاع</p>
      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="animate-spin text-accent" size={28} /></div>
      ) : returns.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-gray-400">لا توجد معدات خارجة حالياً</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-right text-sm">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="px-4 py-3">الحجز</th>
                <th className="px-4 py-3">الزبون</th>
                <th className="px-4 py-3">الهاتف</th>
                <th className="px-4 py-3">الإرجاع المتوقع</th>
                <th className="px-4 py-3">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-medium">{r.booking_number}</td>
                  <td className="px-4 py-3"><span className="flex items-center gap-2"><User size={14} className="text-gray-500" />{r.customer_name || "—"}</span></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-2"><Phone size={14} className="text-gray-500" />{r.customer_phone || "—"}</span></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-2"><CalendarDays size={14} className="text-gray-500" />{new Date(r.expected_return_at).toLocaleDateString("ar-EG-u-nu-latn")}</span></td>
                  <td className="px-4 py-3"><button onClick={() => navigate(`/admin/returns/${r.id}`)} className="flex items-center gap-1 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/25"><Eye size={14} />تفاصيل</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

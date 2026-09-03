// src/admin/ReturnsList.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

interface ReturnBooking {
  id: string;
  booking_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  expected_return_at: string;
  equipment_summary: string;
  status: string;
}

const ReturnsList: React.FC = () => {
  const [returns, setReturns] = useState<ReturnBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReturns = async () => {
      const { data, error } = await supabase.rpc("get_equipment_outside_assignments");
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      // data is an array of assignments; group by booking
      const grouped: { [key: string]: ReturnBooking } = {};
      data.forEach((item: any) => {
        const key = item.booking_id;
        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            booking_number: item.booking_number,
            customer_name: item.customer_name,
            customer_phone: item.customer_phone,
            expected_return_at: item.expected_return_at,
            equipment_summary: `${item.quantity} × ${item.equipment_name}`,
            status: item.status,
          };
        } else {
          grouped[key].equipment_summary += `, ${item.quantity} × ${item.equipment_name}`;
        }
      });
      setReturns(Object.values(grouped));
      setLoading(false);
    };
    fetchReturns();
  }, []);

  if (loading) return <p className="p-4">Loading…</p>;

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">المعدات الخارجة</h2>
      {returns.length === 0 ? (
        <p>No equipment currently out.</p>
      ) : (
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200">
              <th className="px-4 py-2">Booking</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Return By</th>
              <th className="px-4 py-2">Equipment</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="px-4 py-2">{r.booking_number}</td>
                <td className="px-4 py-2">{r.customer_name || "—"}</td>
                <td className="px-4 py-2">{r.customer_phone || "—"}</td>
                <td className="px-4 py-2">{new Date(r.expected_return_at).toLocaleString()}</td>
                <td className="px-4 py-2">{r.equipment_summary}</td>
                <td className="px-4 py-2">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => navigate(`/admin/returns/${r.id}`)}
                  >
                    تفاصيل
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ReturnsList;

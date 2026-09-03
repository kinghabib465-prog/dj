// src/admin/EquipmentOutside.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

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

const EquipmentOutside: React.FC = () => {
  const [assignments, setAssignments] = useState<OutsideAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAssignments = async () => {
      const { data, error } = await supabase.rpc("get_equipment_outside_assignments");
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      setAssignments(data);
      setLoading(false);
    };
    fetchAssignments();
  }, []);

  if (loading) return <p className="p-4">Loading…</p>;

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">المعدات خارج المتجر</h2>
      <table className="min-w-full table-auto">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2">Booking</th>
            <th className="px-4 py-2">Customer</th>
            <th className="px-4 py-2">Phone</th>
            <th className="px-4 py-2">Equipment</th>
            <th className="px-4 py-2">Qty</th>
            <th className="px-4 py-2">Return By</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <tr key={a.booking_id + a.equipment_id} className="border-b">
              <td className="px-4 py-2">{a.booking_number}</td>
              <td className="px-4 py-2">{a.customer_name || "—"}</td>
              <td className="px-4 py-2">{a.customer_phone || "—"}</td>
              <td className="px-4 py-2">{a.equipment_name}</td>
              <td className="px-4 py-2">{a.quantity_out}</td>
              <td className="px-4 py-2">{new Date(a.expected_return_at).toLocaleString()}</td>
              <td className="px-4 py-2">
                <button
                  className="text-blue-600 hover:underline"
                  onClick={() => navigate(`/admin/returns/${a.booking_id}`)}
                >
                  تفاصيل
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EquipmentOutside;

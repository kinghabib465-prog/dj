// src/admin/ReturnsDetail.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, useParams } from "react-router-dom";

interface ReturnItem {
  id: string;
  equipment_name: string;
  expected_quantity: number;
  returned_good_quantity: number;
  damaged_quantity: number;
  missing_quantity: number;
  remaining_out_quantity: number;
}

const ReturnsDetail: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReturnItems = async () => {
      const { data, error } = await supabase.rpc("get_return_items_for_booking", { p_booking_id: bookingId });
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      setItems(data);
      setLoading(false);
    };
    if (bookingId) fetchReturnItems();
  }, [bookingId]);

  const handleChange = (index: number, field: keyof ReturnItem, value: number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSave = async () => {
    // Save each return item via RPC
    for (const item of items) {
      await supabase.rpc("upsert_return_item", {
        p_return_item_id: item.id,
        p_returned_good_quantity: item.returned_good_quantity,
        p_damaged_quantity: item.damaged_quantity,
        p_missing_quantity: item.missing_quantity,
        p_remaining_out_quantity: item.remaining_out_quantity,
      });
    }
    // After saving, maybe transition booking status if all returned
    await supabase.rpc("maybe_complete_return", { p_booking_id: bookingId });
    navigate("/admin/returns");
  };

  if (loading) return <p className="p-4">Loading…</p>;

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Return Inspection – Booking {bookingId}</h2>
      <table className="min-w-full table-auto">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2">Equipment</th>
            <th className="px-4 py-2">Expected</th>
            <th className="px-4 py-2">Good</th>
            <th className="px-4 py-2">Damaged</th>
            <th className="px-4 py-2">Missing</th>
            <th className="px-4 py-2">Still Outside</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={it.id} className="border-b">
              <td className="px-4 py-2">{it.equipment_name}</td>
              <td className="px-4 py-2">{it.expected_quantity}</td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  min={0}
                  max={it.expected_quantity}
                  value={it.returned_good_quantity}
                  onChange={(e) => handleChange(idx, "returned_good_quantity", parseInt(e.target.value) || 0)}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  min={0}
                  max={it.expected_quantity}
                  value={it.damaged_quantity}
                  onChange={(e) => handleChange(idx, "damaged_quantity", parseInt(e.target.value) || 0)}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  min={0}
                  max={it.expected_quantity}
                  value={it.missing_quantity}
                  onChange={(e) => handleChange(idx, "missing_quantity", parseInt(e.target.value) || 0)}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  min={0}
                  max={it.expected_quantity}
                  value={it.remaining_out_quantity}
                  onChange={(e) => handleChange(idx, "remaining_out_quantity", parseInt(e.target.value) || 0)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleSave}
      >
        Save & Complete Return
      </button>
    </div>
  );
};

export default ReturnsDetail;

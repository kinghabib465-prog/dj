// src/admin/EquipmentInside.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface EquipmentStatus {
  equipment_id: string;
  name: string;
  total_quantity: number;
  inside_quantity: number;
  outside_quantity: number;
}

const EquipmentInside: React.FC = () => {
  const [list, setList] = useState<EquipmentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data, error } = await supabase.rpc("get_inventory_status");
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      setList(data);
      setLoading(false);
    };
    fetchStatus();
  }, []);

  if (loading) return <p className="p-4">Loading…</p>;

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">المعدات داخل المتجر</h2>
      <table className="min-w-full table-auto">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2">Equipment</th>
            <th className="px-4 py-2">Total</th>
            <th className="px-4 py-2">Inside</th>
            <th className="px-4 py-2">Outside</th>
          </tr>
        </thead>
        <tbody>
          {list.map((e) => (
            <tr key={e.equipment_id} className="border-b">
              <td className="px-4 py-2">{e.name}</td>
              <td className="px-4 py-2">{e.total_quantity}</td>
              <td className="px-4 py-2">{e.inside_quantity}</td>
              <td className="px-4 py-2">{e.outside_quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EquipmentInside;

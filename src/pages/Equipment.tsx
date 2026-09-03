import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Equipment } from "../types";

const EquipmentPage: React.FC = () => {
  const [items, setItems] = useState<Equipment[]>([]);
  useEffect(() => {
    const fetchEquipment = async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) console.error(error);
      else setItems(data as Equipment[]);
    };
    fetchEquipment();
  }, []);
  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-semibold mb-4">المعدات المتاحة</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-gray-800 rounded-lg shadow p-4">
            <img src={item.image_path} alt={item.name} className="w-full h-48 object-cover rounded" />
            <h3 className="text-xl font-bold mt-2">{item.name}</h3>
            <p className="text-sm mt-1">{item.description}</p>
            <p className="mt-2 text-green-400">{item.rental_price.toLocaleString()} دج / اليوم</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EquipmentPage;

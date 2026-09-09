import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Equipment } from "../types";
import Layout from "../components/Layout";
import { Boxes } from "lucide-react";

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
    <Layout>
      <section className="bg-white rounded-lg shadow p-6 max-w-5xl mx-auto text-gray-900">
        <h2 className="text-3xl font-semibold mb-4 text-center">المعدات المتاحة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-gray-100 rounded-lg shadow p-4">
              {item.image_path ? (
                <img src={item.image_path} alt={item.name} className="w-full h-48 object-cover rounded" />
              ) : (
                <div className="w-full h-48 rounded bg-gray-200 flex items-center justify-center text-gray-400">
                  <Boxes size={40} />
                </div>
              )}
              <h3 className="text-xl font-bold mt-2">{item.name}</h3>
              <p className="text-sm mt-1">{item.description}</p>
              <p className="mt-2 text-success">{item.rental_price.toLocaleString("en-US")} دج / اليوم</p>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default EquipmentPage;


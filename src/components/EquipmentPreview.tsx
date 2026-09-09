import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

type Equipment = {
  id: string;
  name: string;
  image_path: string | null;
  rental_price: number;
  category_id: string;
};

const EquipmentPreview: React.FC = () => {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id,name,image_path,rental_price,category_id")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) console.error(error);
      else setItems(data as Equipment[]);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <section className="py-12">
      <h2 className="text-3xl font-semibold mb-6 text-center">معداتنا</h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-800 animate-pulse rounded-lg h-48"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-gray-800 rounded-lg overflow-hidden shadow">
              {item.image_path && (
                <img src={item.image_path} alt={item.name} className="w-full h-48 object-cover" />
              )}
              <div className="p-4">
                <h3 className="text-xl font-bold">{item.name}</h3>
                <p className="text-sm text-gray-400 mb-2">{item.rental_price.toLocaleString("en-US")} دج / يوم</p>
                <Link to={`/booking?equipment=${item.id}`} className="inline-flex items-center gap-2 text-accent hover:underline">
                  اختر للحجز <CheckCircle2 size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default EquipmentPreview;

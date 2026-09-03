export type Equipment = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  image_path: string;
  total_quantity: number;
  rental_price: number;
  deposit_price: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BookingItem = {
  equipment_id: string;
  quantity: number;
  unit_price: number;
  deposit_amount: number;
};

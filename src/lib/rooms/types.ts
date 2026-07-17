export type Room = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type RoomWithBudget = Room & {
  product_count: number;
  bought_product_count: number;
  remaining_product_count: number;
  spent_budget: number;
  remaining_budget: number | null;
};

export type RoomProductPayment = {
  id: string;
  product_id: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type RoomInspirationImage = {
  id: string;
  room_id: string;
  image_url: string;
  created_at: string;
};

export type RoomProductOption = {
  id: string;
  product_id: string;
  store_name: string;
  phone_number?: string | null;
  price: number;
  currency?: string | null;
  location?: string | null;
  notes?: string | null;
  cover_image_url?: string | null;
  is_selected: boolean;
  created_at: string;
  updated_at: string;
};

export type RoomProduct = {
  id: string;
  room_id: string;
  name: string;
  category?: string | null;
  notes?: string | null;
  quantity: number;
  cover_image_url?: string | null;
  selected_option_id?: string | null;
  selected_option_price?: number | null;
  selected_option_currency?: string | null;
  selected_option_store_name?: string | null;
  selected_option_location?: string | null;
  selected_option_cover_image_url?: string | null;

  created_at: string;
  updated_at: string;
};

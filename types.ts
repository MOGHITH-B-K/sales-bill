export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string; // Base64 string or URL
}

export interface CartItem extends Product {
  qty: number;
}

export interface Order {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
}

export interface ShopDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
  footerMessage: string;
  logo?: string; // Base64 string
  paymentQrCode?: string; // Base64 string
}

export type ViewState = 'pos' | 'inventory' | 'history' | 'settings';

export const CATEGORIES = ['Beverages', 'Food', 'Snacks', 'Dessert', 'Other'];

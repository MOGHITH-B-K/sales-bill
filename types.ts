
export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  description?: string;
  image?: string; // Base64 string or URL
  taxRate?: number; // Optional product-specific tax rate
  minStockLevel?: number; // Custom minimum stock alert level
  productType: 'sale' | 'rental'; 
  rentalDuration?: string; // e.g. "1 Hour", "Per Day"
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  place: string;
}

export interface CartItem extends Product {
  qty: number;
}

export interface Order {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  taxTotal: number;
  customer?: {
    name: string;
    phone: string;
    place: string;
  };
}

export interface ShopDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
  footerMessage: string;
  logo?: string; // Base64 string
  paymentQrCode?: string; // Base64 string
  taxEnabled: boolean;
  defaultTaxRate: number;
}

export type ViewState = 'pos' | 'inventory' | 'customers' | 'history' | 'settings' | 'analysis';

export const CATEGORIES = ['Beverages', 'Food', 'Snacks', 'Dessert'];

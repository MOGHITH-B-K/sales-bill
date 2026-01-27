
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
  productType?: 'sale' | 'rental'; // Added to support POS specific item types
  rentalDuration?: string; // Added to support rental items
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  place: string;
}

export interface CartItem extends Product {
  qty: number;
  returned?: boolean; // Track if a rental item has been returned to stock
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
  poweredByText?: string; // Customizable branding credit
  logo?: string; // Base64 string
  paymentQrCode?: string; // Base64 string
  taxEnabled: boolean;
  defaultTaxRate: number;
}

export type ViewState = 'pos' | 'inventory' | 'customers' | 'history' | 'settings' | 'analysis';

export const CATEGORIES = ['Beverages', 'Food', 'Snacks', 'Dessert'];


import { supabase } from './supabaseClient';
import { Product, Order, ShopDetails, Customer } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

const LOCAL_STORAGE_KEYS = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CUSTOMERS: 'customers',
  SETTINGS: 'settings'
};

const getLocal = (key: string) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch (e) { return []; }
};

const setLocal = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const dbService = {
  
  isConfigured: () => {
    const url = (supabase as any).supabaseUrl || "";
    const key = (supabase as any).supabaseKey || "";
    const isPlaceholder = url === 'https://placeholder.supabase.co' || !url || !key;
    return !isPlaceholder;
  },

  subscribeToTables(handlers: Record<string, (payload: any) => void>): RealtimeChannel | null {
    if (!this.isConfigured()) return null;
    const channel = supabase.channel('main_db_changes');
    channel
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) => {
            const table = payload.table;
            if (handlers[table]) handlers[table](payload);
        })
      .subscribe();
    return channel;
  },

  unsubscribe(channel: RealtimeChannel) {
    supabase.removeChannel(channel);
  },

  async getProducts() {
    if (!this.isConfigured()) return getLocal(LOCAL_STORAGE_KEYS.PRODUCTS) as Product[];
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) {
      console.warn("Cloud fetch error:", error.message);
      return getLocal(LOCAL_STORAGE_KEYS.PRODUCTS) as Product[];
    }
    return data as Product[];
  },

  async saveProduct(product: Product) {
    const products = getLocal(LOCAL_STORAGE_KEYS.PRODUCTS) as Product[];
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) products[index] = product;
    else products.push(product);
    setLocal(LOCAL_STORAGE_KEYS.PRODUCTS, products);

    if (this.isConfigured()) {
      const payload = {
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        category: product.category,
        description: product.description,
        image: product.image,
        taxRate: product.taxRate,
        minStockLevel: product.minStockLevel,
        productType: product.productType || 'sale',
        rentalDuration: product.rentalDuration || ''
      };

      const { error } = await supabase.from('products').upsert(payload);
      if (error) {
        console.error("Cloud save failed:", error.message);
        throw new Error(`Database Error: ${error.message}`);
      }
    }
  },

  async deleteProduct(id: string) {
    const products = getLocal(LOCAL_STORAGE_KEYS.PRODUCTS) as Product[];
    setLocal(LOCAL_STORAGE_KEYS.PRODUCTS, products.filter(p => p.id !== id));
    if (this.isConfigured()) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    }
  },

  async clearProducts() {
    setLocal(LOCAL_STORAGE_KEYS.PRODUCTS, []);
    if (this.isConfigured()) {
      await supabase.from('products').delete().neq('id', '0');
    }
  },

  async getOrders() {
    if (!this.isConfigured()) return getLocal(LOCAL_STORAGE_KEYS.ORDERS) as Order[];
    const { data, error } = await supabase.from('orders').select('*').order('date', { ascending: false });
    if (error) return getLocal(LOCAL_STORAGE_KEYS.ORDERS) as Order[];
    return data as Order[];
  },

  async getNextOrderId() {
    const orders = getLocal(LOCAL_STORAGE_KEYS.ORDERS) as Order[];
    const maxLocal = orders.reduce((max, order) => {
      const numId = parseInt(order.id, 10);
      return !isNaN(numId) && numId > max ? numId : max;
    }, 0);
    if (!this.isConfigured()) return (maxLocal + 1).toString();
    const { data } = await supabase.from('orders').select('id');
    const maxCloud = (data || []).reduce((max, item: any) => {
      const numId = parseInt(item.id, 10);
      return !isNaN(numId) && numId > max ? numId : max;
    }, 0);
    return (Math.max(maxLocal, maxCloud) + 1).toString();
  },

  async saveOrder(order: Order) {
    const orders = getLocal(LOCAL_STORAGE_KEYS.ORDERS) as Order[];
    const index = orders.findIndex(o => o.id === order.id);
    if (index >= 0) orders[index] = order;
    else orders.push(order);
    setLocal(LOCAL_STORAGE_KEYS.ORDERS, orders);

    if (this.isConfigured()) {
      const payload = {
        id: order.id,
        date: order.date,
        items: order.items,
        total: order.total,
        taxTotal: order.taxTotal,
        customer: order.customer
      };
      const { error } = await supabase.from('orders').upsert(payload);
      if (error) throw error;
    }
  },

  async deleteOrder(id: string) {
    const orders = getLocal(LOCAL_STORAGE_KEYS.ORDERS) as Order[];
    setLocal(LOCAL_STORAGE_KEYS.ORDERS, orders.filter(o => o.id !== id));
    if (this.isConfigured()) {
      await supabase.from('orders').delete().eq('id', id);
    }
  },

  async clearOrders() {
    setLocal(LOCAL_STORAGE_KEYS.ORDERS, []);
    if (this.isConfigured()) {
      await supabase.from('orders').delete().neq('id', '0');
    }
  },

  async getCustomers() {
    if (!this.isConfigured()) return getLocal(LOCAL_STORAGE_KEYS.CUSTOMERS) as Customer[];
    const { data, error } = await supabase.from('customers').select('*');
    if (error) return getLocal(LOCAL_STORAGE_KEYS.CUSTOMERS) as Customer[];
    return data as Customer[];
  },

  async saveCustomer(customer: Customer) {
    const customers = getLocal(LOCAL_STORAGE_KEYS.CUSTOMERS) as Customer[];
    const index = customers.findIndex(c => c.id === customer.id);
    if (index >= 0) customers[index] = customer;
    else customers.push(customer);
    setLocal(LOCAL_STORAGE_KEYS.CUSTOMERS, customers);
    if (this.isConfigured()) {
      await supabase.from('customers').upsert(customer);
    }
  },

  async deleteCustomer(id: string) {
    const customers = getLocal(LOCAL_STORAGE_KEYS.CUSTOMERS) as Customer[];
    setLocal(LOCAL_STORAGE_KEYS.CUSTOMERS, customers.filter(c => c.id !== id));
    if (this.isConfigured()) {
      await supabase.from('customers').delete().eq('id', id);
    }
  },

  async clearCustomers() {
    setLocal(LOCAL_STORAGE_KEYS.CUSTOMERS, []);
    if (this.isConfigured()) {
      await supabase.from('customers').delete().neq('id', '0');
    }
  },

  async getShopDetails() {
    const localSettings = getLocal(LOCAL_STORAGE_KEYS.SETTINGS);
    if (!this.isConfigured()) return localSettings?.main_details || null;
    const { data } = await supabase.from('settings').select('*').eq('id', 'main_details').single();
    return data || localSettings?.main_details || null;
  },

  async saveShopDetails(details: ShopDetails) {
    const payload = { ...details, id: 'main_details' };
    const settings = getLocal(LOCAL_STORAGE_KEYS.SETTINGS) || {};
    settings.main_details = payload;
    setLocal(LOCAL_STORAGE_KEYS.SETTINGS, settings);
    if (this.isConfigured()) {
      await supabase.from('settings').upsert(payload);
    }
  },

  async resetDatabase() {
    localStorage.clear();
    if (this.isConfigured()) {
      await Promise.all([
        supabase.from('products').delete().neq('id', '0'),
        supabase.from('orders').delete().neq('id', '0'),
        supabase.from('customers').delete().neq('id', '0'),
        supabase.from('settings').delete().neq('id', '0')
      ]);
    }
  }
};

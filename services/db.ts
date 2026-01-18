import { supabase } from './supabaseClient';
import { Product, Order, ShopDetails, Customer } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

const LOCAL_STORAGE_KEYS = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CUSTOMERS: 'customers',
  SETTINGS: 'settings'
};

// Helper for local storage
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
    // Check if Supabase is properly configured with valid (non-placeholder) keys
    const url = (supabase as any).supabaseUrl || "";
    const key = (supabase as any).supabaseKey || "";
    
    // It is configured only if it's NOT the placeholder values we set in supabaseClient.ts
    const isPlaceholder = url === 'https://placeholder.supabase.co' || key === 'placeholder-key';
    const isMissing = !url || !key;

    return !isMissing && !isPlaceholder;
  },

  // --- Real-time Subscription ---
  // Consolidated subscription to prevent multiple channel connection errors
  subscribeToTables(
    handlers: Record<string, (payload: any) => void>
  ): RealtimeChannel | null {
    if (!this.isConfigured()) return null;

    const channel = supabase.channel('main_db_changes');

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload: any) => {
            const table = payload.table;
            if (handlers[table]) {
                // console.log(`Realtime update for ${table}`);
                handlers[table](payload);
            }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log('Connected to real-time changes.');
        } else if (status === 'CHANNEL_ERROR') {
            console.warn('Real-time connection failed. This usually means "Realtime" replication is not enabled for your tables in the Supabase Dashboard, or your API key lacks permissions. The app will continue in offline/manual mode.');
        }
      });
      
    return channel;
  },

  unsubscribe(channel: RealtimeChannel) {
    supabase.removeChannel(channel);
  },

  // --- Products ---
  async getProducts() {
    if (!this.isConfigured()) return getLocal(LOCAL_STORAGE_KEYS.PRODUCTS) as Product[];

    const { data, error } = await supabase.from('products').select('*');
    if (error) {
      console.error("Error fetching products:", error.message || error);
      // Fallback to local if fetch fails (e.g. table doesn't exist yet)
      return getLocal(LOCAL_STORAGE_KEYS.PRODUCTS) as Product[];
    }
    return data as Product[];
  },

  async saveProduct(product: Product) {
    if (!this.isConfigured()) {
      const products = getLocal(LOCAL_STORAGE_KEYS.PRODUCTS) as Product[];
      const index = products.findIndex(p => p.id === product.id);
      if (index >= 0) products[index] = product;
      else products.push(product);
      setLocal(LOCAL_STORAGE_KEYS.PRODUCTS, products);
      return;
    }

    const { error } = await supabase.from('products').upsert(product);
    if (error) console.error("Error saving product:", error.message || error);
  },

  async deleteProduct(id: string) {
    if (!this.isConfigured()) {
      const products = getLocal(LOCAL_STORAGE_KEYS.PRODUCTS) as Product[];
      setLocal(LOCAL_STORAGE_KEYS.PRODUCTS, products.filter(p => p.id !== id));
      return;
    }

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) console.error("Error deleting product:", error.message || error);
  },

  async clearProducts() {
    if (!this.isConfigured()) {
      setLocal(LOCAL_STORAGE_KEYS.PRODUCTS, []);
      return;
    }
    const { error } = await supabase.from('products').delete().neq('id', '0'); 
    if (error) console.error("Error clearing products:", error.message || error);
  },

  // --- Orders ---
  async getOrders() {
    if (!this.isConfigured()) return getLocal(LOCAL_STORAGE_KEYS.ORDERS) as Order[];

    const { data, error } = await supabase.from('orders').select('*');
    if (error) {
      console.error("Error fetching orders:", error.message || error);
      return [];
    }
    return data as Order[];
  },

  async getNextOrderId() {
    // Strategy: Fetch all IDs, find max numerical value, increment by 1.
    // This ensures we start from 1 and go to infinite (1, 2, 3...)
    
    if (!this.isConfigured()) {
      const orders = getLocal(LOCAL_STORAGE_KEYS.ORDERS) as Order[];
      if (orders.length === 0) return '1';
      
      const maxId = orders.reduce((max, order) => {
        const numId = parseInt(order.id, 10);
        return !isNaN(numId) && numId > max ? numId : max;
      }, 0);
      
      return (maxId + 1).toString();
    }

    // Supabase
    const { data, error } = await supabase.from('orders').select('id');
    
    if (error) {
      console.error("Error fetching order IDs for sequence:", error.message || error);
      return Date.now().toString(); // Fallback to timestamp if offline/error to prevent collision
    }

    if (!data || data.length === 0) return '1';

    const maxId = data.reduce((max, item: any) => {
      const numId = parseInt(item.id, 10);
      return !isNaN(numId) && numId > max ? numId : max;
    }, 0);

    return (maxId + 1).toString();
  },

  async saveOrder(order: Order) {
    if (!this.isConfigured()) {
      const orders = getLocal(LOCAL_STORAGE_KEYS.ORDERS) as Order[];
      const index = orders.findIndex(o => o.id === order.id);
      if (index >= 0) orders[index] = order;
      else orders.push(order);
      setLocal(LOCAL_STORAGE_KEYS.ORDERS, orders);
      return;
    }

    const { error } = await supabase.from('orders').upsert(order);
    if (error) console.error("Error saving order:", error.message || error);
  },

  async deleteOrder(id: string) {
    if (!this.isConfigured()) {
      const orders = getLocal(LOCAL_STORAGE_KEYS.ORDERS) as Order[];
      setLocal(LOCAL_STORAGE_KEYS.ORDERS, orders.filter(o => o.id !== id));
      return;
    }

    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) console.error("Error deleting order:", error.message || error);
  },

  async clearOrders() {
    if (!this.isConfigured()) {
      setLocal(LOCAL_STORAGE_KEYS.ORDERS, []);
      return;
    }

    const { error } = await supabase.from('orders').delete().neq('id', '0');
    if (error) console.error("Error clearing orders:", error.message || error);
  },

  // --- Customers ---
  async getCustomers() {
    if (!this.isConfigured()) return getLocal(LOCAL_STORAGE_KEYS.CUSTOMERS) as Customer[];

    const { data, error } = await supabase.from('customers').select('*');
    if (error) {
      console.error("Error fetching customers:", error.message || error);
      return [];
    }
    return data as Customer[];
  },

  async saveCustomer(customer: Customer) {
    if (!this.isConfigured()) {
      const customers = getLocal(LOCAL_STORAGE_KEYS.CUSTOMERS) as Customer[];
      const index = customers.findIndex(c => c.id === customer.id);
      if (index >= 0) customers[index] = customer;
      else customers.push(customer);
      setLocal(LOCAL_STORAGE_KEYS.CUSTOMERS, customers);
      return;
    }

    const { error } = await supabase.from('customers').upsert(customer);
    if (error) console.error("Error saving customer:", error.message || error);
  },

  async deleteCustomer(id: string) {
    if (!this.isConfigured()) {
      const customers = getLocal(LOCAL_STORAGE_KEYS.CUSTOMERS) as Customer[];
      setLocal(LOCAL_STORAGE_KEYS.CUSTOMERS, customers.filter(c => c.id !== id));
      return;
    }

    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) console.error("Error deleting customer:", error.message || error);
  },

  async clearCustomers() {
    if (!this.isConfigured()) {
      setLocal(LOCAL_STORAGE_KEYS.CUSTOMERS, []);
      return;
    }
    const { error } = await supabase.from('customers').delete().neq('id', '0');
    if (error) console.error("Error clearing customers:", error.message || error);
  },

  // --- Settings ---
  async getShopDetails() {
    if (!this.isConfigured()) {
       const settings = getLocal(LOCAL_STORAGE_KEYS.SETTINGS);
       return settings?.main_details || null;
    }

    const { data, error } = await supabase.from('settings').select('*').eq('id', 'main_details').single();
    if (error) {
       if (error.code !== 'PGRST116') console.error("Error fetching settings:", error.message || error);
    }
    return data as ShopDetails | null;
  },

  async saveShopDetails(details: ShopDetails) {
    const payload = { ...details, id: 'main_details' };
    
    if (!this.isConfigured()) {
       const settings = getLocal(LOCAL_STORAGE_KEYS.SETTINGS) || {};
       settings.main_details = payload;
       setLocal(LOCAL_STORAGE_KEYS.SETTINGS, settings);
       return;
    }

    const { error } = await supabase.from('settings').upsert(payload);
    if (error) console.error("Error saving settings:", error.message || error);
  },

  async resetDatabase() {
    if (!this.isConfigured()) {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ORDERS);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CUSTOMERS);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.SETTINGS);
      return;
    }

    await Promise.all([
      supabase.from('products').delete().neq('id', '0'),
      supabase.from('orders').delete().neq('id', '0'),
      supabase.from('customers').delete().neq('id', '0'),
      supabase.from('settings').delete().neq('id', '0')
    ]);
  }
};
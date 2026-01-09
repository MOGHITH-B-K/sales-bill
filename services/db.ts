import { openDB } from 'idb';
import { Product, Order, ShopDetails } from '../types';

const DB_NAME = 'smart-pos-db';
const DB_VERSION = 1;

// Initialize IndexedDB
const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store for Products
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      // Store for Orders
      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'id' });
      }
      // Store for Settings (we'll use 'id' 'main_details' for the singleton)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    },
  });
};

export const dbService = {
  
  // Always true for local DB
  isConfigured: () => true,

  // --- Products ---
  async getProducts() {
    const db = await initDB();
    return await db.getAll('products') as Product[];
  },

  async saveProduct(product: Product) {
    const db = await initDB();
    await db.put('products', product);
  },

  async deleteProduct(id: string) {
    const db = await initDB();
    await db.delete('products', id);
  },

  async clearProducts() {
    const db = await initDB();
    await db.clear('products');
  },

  // --- Orders ---
  async getOrders() {
    const db = await initDB();
    return await db.getAll('orders') as Order[];
  },

  async saveOrder(order: Order) {
    const db = await initDB();
    await db.put('orders', order);
  },

  async deleteOrder(id: string) {
    const db = await initDB();
    await db.delete('orders', id);
  },

  async clearOrders() {
    const db = await initDB();
    await db.clear('orders');
  },

  // --- Settings ---
  async getShopDetails() {
    const db = await initDB();
    const data = await db.get('settings', 'main_details');
    return data ? (data as ShopDetails) : null;
  },

  async saveShopDetails(details: ShopDetails) {
    const db = await initDB();
    // We add the ID so it can be stored in the object store
    const payload = { ...details, id: 'main_details' };
    await db.put('settings', payload);
  },
};

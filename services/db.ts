import { openDB, DBSchema } from 'idb';
import { Product, Order, ShopDetails } from '../types';

interface SmartPOSDB extends DBSchema {
  products: {
    key: string;
    value: Product;
  };
  orders: {
    key: string;
    value: Order;
  };
  settings: {
    key: string;
    value: ShopDetails;
  };
}

const DB_NAME = 'smartpos-db';
const DB_VERSION = 1;

const dbPromise = openDB<SmartPOSDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('products')) {
      db.createObjectStore('products', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('orders')) {
      db.createObjectStore('orders', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings');
    }
  },
});

export const dbService = {
  // Products
  async getProducts() {
    return (await dbPromise).getAll('products');
  },
  async saveProduct(product: Product) {
    return (await dbPromise).put('products', product);
  },
  async deleteProduct(id: string) {
    return (await dbPromise).delete('products', id);
  },
  async clearProducts() {
    return (await dbPromise).clear('products');
  },

  // Orders
  async getOrders() {
    return (await dbPromise).getAll('orders');
  },
  async saveOrder(order: Order) {
    return (await dbPromise).put('orders', order);
  },
  async deleteOrder(id: string) {
    return (await dbPromise).delete('orders', id);
  },
  async clearOrders() {
    return (await dbPromise).clear('orders');
  },

  // Settings
  async getShopDetails() {
    return (await dbPromise).get('settings', 'main_details');
  },
  async saveShopDetails(details: ShopDetails) {
    return (await dbPromise).put('settings', details, 'main_details');
  },
};

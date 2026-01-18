import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Store, LogOut, ReceiptText, Settings } from 'lucide-react';
import { POS } from './views/POS';
import { Inventory } from './views/Inventory';
import { History } from './views/History';
import { ShopSettings } from './views/ShopSettings';
import { Product, CartItem, ViewState, Order, ShopDetails } from './types';
import { dbService } from './services/db';

// Initial Data for seeding the DB
const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Cappuccino', price: 250, stock: 50, category: 'Beverages', description: 'Rich espresso with frothy milk' },
  { id: '2', name: 'Croissant', price: 180, stock: 30, category: 'Snacks', description: 'Buttery flaky pastry' },
  { id: '3', name: 'Avocado Toast', price: 350, stock: 20, category: 'Food', description: 'Sourdough with fresh avocado' },
  { id: '4', name: 'Iced Latte', price: 280, stock: 45, category: 'Beverages', description: 'Cold espresso with milk and ice' },
  { id: '5', name: 'Blueberry Muffin', price: 150, stock: 25, category: 'Snacks', description: 'Freshly baked with berries' },
  { id: '6', name: 'Green Tea', price: 120, stock: 100, category: 'Beverages', description: 'Organic soothing green tea' },
];

const INITIAL_SHOP_DETAILS: ShopDetails = {
  name: 'SmartPOS Demo Shop',
  address: '123 Innovation Drive, Tech Valley, CA 90210',
  phone: '+91 98765 43210',
  email: 'contact@smartpos.demo',
  footerMessage: 'Thank you for your business!',
  logo: '',
  paymentQrCode: ''
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('inventory');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shopDetails, setShopDetails] = useState<ShopDetails>(INITIAL_SHOP_DETAILS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from DB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load Products
        const dbProducts = await dbService.getProducts();
        if (dbProducts.length === 0) {
          // Seed initial products
          for (const p of INITIAL_PRODUCTS) {
            await dbService.saveProduct(p);
          }
          setProducts(INITIAL_PRODUCTS);
        } else {
          setProducts(dbProducts);
        }

        // Load Orders
        const dbOrders = await dbService.getOrders();
        setOrders(dbOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        // Load Settings
        const dbSettings = await dbService.getShopDetails();
        if (dbSettings) {
          setShopDetails(dbSettings);
        } else {
          await dbService.saveShopDetails(INITIAL_SHOP_DETAILS);
        }
      } catch (error) {
        console.error("Failed to load data from database", error);
        setProducts(INITIAL_PRODUCTS);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Product Handlers
  const handleAddProduct = async (product: Product) => {
    await dbService.saveProduct(product);
    setProducts(prev => {
        const exists = prev.find(p => p.id === product.id);
        if (exists) {
            return prev.map(p => p.id === product.id ? product : p);
        }
        return [...prev, product];
    });
  };

  const handleUpdateProduct = async (product: Product) => {
    await dbService.saveProduct(product);
    setProducts(prev => prev.map(p => p.id === product.id ? product : p));
  };

  const handleDeleteProduct = async (id: string) => {
    await dbService.deleteProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleClearProducts = async () => {
    await dbService.clearProducts();
    setProducts([]);
  };

  // Order Handlers
  const handleSaveOrder = async (order: Order) => {
    try {
      // 1. Save the order record
      await dbService.saveOrder(order);
      setOrders(prev => [order, ...prev]);

      // 2. Decrement stock for each item
      const updatedProducts = [...products];
      
      for (const item of order.items) {
        const productIndex = updatedProducts.findIndex(p => p.id === item.id);
        if (productIndex > -1) {
          // Calculate new stock, ensuring it doesn't go below 0
          const currentStock = Number(updatedProducts[productIndex].stock) || 0;
          const newStock = Math.max(0, currentStock - item.qty);
          
          updatedProducts[productIndex] = { 
            ...updatedProducts[productIndex], 
            stock: newStock 
          };
          
          // Update individual product in DB to persist stock change
          await dbService.saveProduct(updatedProducts[productIndex]);
        }
      }
      
      // Update local state to reflect new stock immediately
      setProducts(updatedProducts);
      
    } catch (error) {
      console.error("Error processing order:", error);
      alert("Failed to save order.");
    }
  };

  const handleDeleteOrder = async (id: string) => {
    await dbService.deleteOrder(id);
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const handleClearOrders = async () => {
    await dbService.clearOrders();
    setOrders([]);
  };

  // Settings Handler
  const handleSaveSettings = async (details: ShopDetails) => {
    await dbService.saveShopDetails(details);
    setShopDetails(details);
  };

  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <nav className="w-20 lg:w-64 bg-slate-900 flex-shrink-0 flex flex-col justify-between text-slate-300 transition-all duration-300 print:hidden">
        <div>
          <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-800">
            {shopDetails.logo ? (
               <img src={shopDetails.logo} alt="Logo" className="w-10 h-10 object-cover rounded-lg" />
            ) : (
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-900/50">
                S
              </div>
            )}
            <span className="ml-3 font-bold text-xl text-white hidden lg:block tracking-tight">SmartPOS</span>
          </div>

          <div className="p-4 space-y-2">
            <button 
              onClick={() => setView('pos')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                view === 'pos' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Store size={22} />
              <span className="font-medium hidden lg:block">Billing / POS</span>
            </button>
            
            <button 
              onClick={() => setView('inventory')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                view === 'inventory' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard size={22} />
              <span className="font-medium hidden lg:block">Stock Management</span>
            </button>

            <button 
              onClick={() => setView('history')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                view === 'history' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ReceiptText size={22} />
              <span className="font-medium hidden lg:block">Orders History</span>
            </button>

            <button 
              onClick={() => setView('settings')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                view === 'settings' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings size={22} />
              <span className="font-medium hidden lg:block">Shop Settings</span>
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 hover:text-red-400 transition-colors">
            <LogOut size={22} />
            <span className="font-medium hidden lg:block">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto scroll-smooth">
          {view === 'pos' && (
            <POS 
                products={products} 
                cart={cart} 
                setCart={setCart} 
                onSaveOrder={handleSaveOrder} 
                shopDetails={shopDetails} 
                onManageStock={() => setView('inventory')}
            />
          )}
          {view === 'inventory' && (
            <Inventory 
                products={products} 
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onClearProducts={handleClearProducts}
                onNavigateToPos={() => setView('pos')}
            />
          )}
          {view === 'history' && (
            <History 
                orders={orders} 
                onDeleteOrder={handleDeleteOrder}
                onClearOrders={handleClearOrders}
                shopDetails={shopDetails} 
            />
          )}
          {view === 'settings' && (
            <ShopSettings 
                shopDetails={shopDetails} 
                onSave={handleSaveSettings} 
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
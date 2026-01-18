import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Store, LogOut, ReceiptText, Settings, BarChart3, Users, Cloud } from 'lucide-react';
import { POS } from './views/POS';
import { Inventory } from './views/Inventory';
import { History } from './views/History';
import { ShopSettings } from './views/ShopSettings';
import { DailyAnalysis } from './views/DailyAnalysis';
import { Customers } from './views/Customers';
import { Product, CartItem, ViewState, Order, ShopDetails, Customer } from './types';
import { dbService } from './services/db';

const INITIAL_SHOP_DETAILS: ShopDetails = {
  name: 'SmartPOS Demo Shop',
  address: '123 Innovation Drive, Tech Valley, CA 90210',
  phone: '+91 98765 43210',
  email: 'contact@smartpos.demo',
  footerMessage: 'Thank you for your business!',
  logo: '',
  paymentQrCode: '',
  taxEnabled: true,
  defaultTaxRate: 5
};

// Seeding data for new instances
const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Cappuccino', price: 250, stock: 50, category: 'Beverages', description: 'Rich espresso with frothy milk', taxRate: 5, productType: 'sale' },
  { id: '2', name: 'Croissant', price: 180, stock: 30, category: 'Snacks', description: 'Buttery flaky pastry', taxRate: 5, productType: 'sale' },
  { id: '3', name: 'Avocado Toast', price: 350, stock: 20, category: 'Food', description: 'Sourdough with fresh avocado', taxRate: 5, productType: 'sale' },
  { id: '4', name: 'Iced Latte', price: 280, stock: 45, category: 'Beverages', description: 'Cold espresso with milk and ice', taxRate: 5, productType: 'sale' },
  { id: '5', name: 'Blueberry Muffin', price: 150, stock: 25, category: 'Snacks', description: 'Freshly baked with berries', taxRate: 5, productType: 'sale' },
  { id: '6', name: 'Green Tea', price: 120, stock: 100, category: 'Beverages', description: 'Organic soothing green tea', taxRate: 5, productType: 'sale' },
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shopDetails, setShopDetails] = useState<ShopDetails>(INITIAL_SHOP_DETAILS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  
  // State to hold customer details when editing an order
  const [editingCustomer, setEditingCustomer] = useState<{name: string, phone: string, place: string} | null>(null);

  // Load data from DB on mount and setup real-time subscriptions
  useEffect(() => {
    let globalSub: any = null;

    const loadData = async () => {
      try {
        const connected = dbService.isConfigured();
        setIsCloudConnected(connected);

        // Load Products
        const dbProducts = await dbService.getProducts();
        
        if (dbProducts.length === 0 && !connected) {
            // Seed initial products if DB is empty and local
            for (const p of INITIAL_PRODUCTS) {
              await dbService.saveProduct(p);
            }
            setProducts(INITIAL_PRODUCTS);
        } else {
            // Ensure compatibility and initial sort
            const normalizedProducts = dbProducts.map(p => ({
                ...p,
                productType: p.productType || 'sale'
            })).sort((a, b) => a.name.localeCompare(b.name));
            setProducts(normalizedProducts);
        }

        // Load Orders
        const dbOrders = await dbService.getOrders();
        setOrders(dbOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        // Load Customers
        const dbCustomers = await dbService.getCustomers();
        setCustomers(dbCustomers);

        // Load Settings
        const dbSettings = await dbService.getShopDetails();
        if (dbSettings) {
          setShopDetails({ ...INITIAL_SHOP_DETAILS, ...dbSettings });
        } else {
          // Save default settings if none exist
          await dbService.saveShopDetails(INITIAL_SHOP_DETAILS);
          setShopDetails(INITIAL_SHOP_DETAILS);
        }

        // --- SETUP REALTIME SUBSCRIPTIONS ---
        if (connected) {
            const handleRealtime = (payload: any, setter: React.Dispatch<React.SetStateAction<any[]>>, idField = 'id', sortFn?: (a: any, b: any) => number) => {
                const { eventType, new: newRecord, old: oldRecord } = payload;
                
                setter(prev => {
                    let updated = [...prev];
                    if (eventType === 'INSERT') {
                        // Avoid duplicates if we optimistically updated
                        const exists = updated.find(item => item[idField] === newRecord[idField]);
                        if (!exists) updated.push(newRecord);
                    } else if (eventType === 'UPDATE') {
                        updated = updated.map(item => item[idField] === newRecord[idField] ? newRecord : item);
                    } else if (eventType === 'DELETE') {
                        updated = updated.filter(item => item[idField] !== oldRecord[idField]);
                    }
                    if (sortFn) updated.sort(sortFn);
                    return updated;
                });
            };

            // Use consolidated subscription
            globalSub = dbService.subscribeToTables({
                'products': (payload) => handleRealtime(payload, setProducts, 'id', (a, b) => a.name.localeCompare(b.name)),
                'orders': (payload) => handleRealtime(payload, setOrders, 'id', (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                'customers': (payload) => handleRealtime(payload, setCustomers, 'id', (a, b) => a.name.localeCompare(b.name))
            });
        }

      } catch (error) {
        console.error("Failed to load data from database", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();

    return () => {
        if (globalSub) dbService.unsubscribe(globalSub);
    };
  }, []);

  // Product Handlers
  const handleAddProduct = async (product: Product) => {
    await dbService.saveProduct(product);
    // Optimistic update
    setProducts(prev => {
        const exists = prev.find(p => p.id === product.id);
        if (exists) {
            return prev.map(p => p.id === product.id ? product : p);
        }
        return [...prev, product].sort((a, b) => a.name.localeCompare(b.name));
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
          const currentStock = Number(updatedProducts[productIndex].stock) || 0;
          const newStock = Math.max(0, currentStock - item.qty);
          
          updatedProducts[productIndex] = { 
            ...updatedProducts[productIndex], 
            stock: newStock 
          };
          
          await dbService.saveProduct(updatedProducts[productIndex]);
        }
      }
      setProducts(updatedProducts);
      // Clear editing customer state after successful save
      setEditingCustomer(null);
      
    } catch (error) {
      console.error("Error processing order:", error);
      alert("Failed to save order.");
    }
  };

  // Restores stock for an order before deleting it
  const restoreStockForOrder = async (order: Order) => {
    const updatedProducts = [...products];
    for (const item of order.items) {
        const productIndex = updatedProducts.findIndex(p => p.id === item.id);
        if (productIndex > -1) {
            // Add quantity back to stock
            const currentStock = Number(updatedProducts[productIndex].stock) || 0;
            updatedProducts[productIndex] = {
                ...updatedProducts[productIndex],
                stock: currentStock + item.qty
            };
            await dbService.saveProduct(updatedProducts[productIndex]);
        }
    }
    setProducts(updatedProducts);
  };

  const handleDeleteOrder = async (id: string) => {
    const orderToDelete = orders.find(o => o.id === id);
    if (orderToDelete) {
        // Restore stock when deleting an order (voiding)
        await restoreStockForOrder(orderToDelete);
    }
    
    await dbService.deleteOrder(id);
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const handleClearOrders = async () => {
    await dbService.clearOrders();
    setOrders([]);
  };

  // Logic to "Recall" an order for editing
  // 1. Deletes order from DB
  // 2. RESTORES stock (so if they save it again, it decrements correctly)
  // 3. Loads items into POS Cart
  // 4. Restores customer details
  const handleEditOrder = async (order: Order) => {
      // Restore stock and delete from history
      await handleDeleteOrder(order.id);
      
      // Load items to cart
      setCart(order.items);
      
      // Load customer details if present
      if (order.customer) {
          setEditingCustomer(order.customer);
      } else {
          setEditingCustomer(null);
      }
      
      // Navigate to POS
      setView('pos');
  };

  // Customer Handlers
  const handleAddCustomer = async (customer: Customer) => {
    await dbService.saveCustomer(customer);
    setCustomers(prev => [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleUpdateCustomer = async (customer: Customer) => {
    await dbService.saveCustomer(customer);
    setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
  };

  const handleDeleteCustomer = async (id: string) => {
    await dbService.deleteCustomer(id);
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const handleClearCustomers = async () => {
    await dbService.clearCustomers();
    setCustomers([]);
  };

  // Factory Reset
  const handleFactoryReset = async () => {
      // Clear database tables
      await dbService.resetDatabase();
      
      // Reset local state
      setProducts([]);
      setOrders([]);
      setCustomers([]);
      setCart([]);
      
      // Reset settings to default
      await dbService.saveShopDetails(INITIAL_SHOP_DETAILS);
      setShopDetails(INITIAL_SHOP_DETAILS);
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
              onClick={() => setView('customers')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                view === 'customers' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users size={22} />
              <span className="font-medium hidden lg:block">Customer Details</span>
            </button>

             <button 
              onClick={() => setView('analysis')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                view === 'analysis' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BarChart3 size={22} />
              <span className="font-medium hidden lg:block">Sales Analysis</span>
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
                customers={customers}
                cart={cart} 
                setCart={setCart} 
                onSaveOrder={handleSaveOrder}
                onSaveCustomer={handleAddCustomer}
                shopDetails={shopDetails} 
                onManageStock={() => setView('inventory')}
                onViewHistory={() => setView('history')}
                initialCustomer={editingCustomer}
                onAddProduct={handleAddProduct}
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
                defaultTaxRate={shopDetails.defaultTaxRate}
            />
          )}
          {view === 'history' && (
            <History 
                orders={orders} 
                onDeleteOrder={handleDeleteOrder}
                onClearOrders={handleClearOrders}
                onEditOrder={handleEditOrder}
                shopDetails={shopDetails} 
            />
          )}
           {view === 'analysis' && (
            <DailyAnalysis 
                orders={orders} 
                shopDetails={shopDetails}
            />
          )}
          {view === 'customers' && (
            <Customers 
                customers={customers}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
            />
          )}
          {view === 'settings' && (
            <ShopSettings 
                shopDetails={shopDetails} 
                onSave={handleSaveSettings} 
                orders={orders}
                customers={customers}
                onClearOrders={handleClearOrders}
                onClearProducts={handleClearProducts}
                onClearCustomers={handleClearCustomers}
                onFactoryReset={handleFactoryReset}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
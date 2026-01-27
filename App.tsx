
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Store, LogOut, ReceiptText, Settings, BarChart3, Users } from 'lucide-react';
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
  poweredByText: 'Powered by SmartPOS',
  logo: '',
  paymentQrCode: '',
  taxEnabled: true,
  defaultTaxRate: 5
};

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Cappuccino', price: 250, stock: 50, category: 'Beverages', description: 'Rich espresso with frothy milk', taxRate: 5, productType: 'sale' },
  { id: '2', name: 'Croissant', price: 180, stock: 30, category: 'Snacks', description: 'Buttery flaky pastry', taxRate: 5, productType: 'sale' },
  { id: '3', name: 'Avocado Toast', price: 350, stock: 20, category: 'Food', description: 'Sourdough with fresh avocado', taxRate: 5, productType: 'sale' },
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shopDetails, setShopDetails] = useState<ShopDetails>(INITIAL_SHOP_DETAILS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState<{name: string, phone: string, place: string} | null>(null);

  useEffect(() => {
    let globalSub: any = null;

    const loadData = async () => {
      try {
        const connected = dbService.isConfigured();
        const dbProducts = await dbService.getProducts();
        
        if (dbProducts.length === 0 && !connected) {
            for (const p of INITIAL_PRODUCTS) await dbService.saveProduct(p);
            setProducts(INITIAL_PRODUCTS);
        } else {
            setProducts(dbProducts.sort((a, b) => a.name.localeCompare(b.name)));
        }

        const dbOrders = await dbService.getOrders();
        setOrders(dbOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        const dbCustomers = await dbService.getCustomers();
        setCustomers(dbCustomers);

        const dbSettings = await dbService.getShopDetails();
        if (dbSettings) setShopDetails({ ...INITIAL_SHOP_DETAILS, ...dbSettings });
        else await dbService.saveShopDetails(INITIAL_SHOP_DETAILS);

        if (connected) {
            globalSub = dbService.subscribeToTables({
                'products': async () => setProducts(await dbService.getProducts()),
                'orders': async () => setOrders(await dbService.getOrders()),
                'customers': async () => setCustomers(await dbService.getCustomers())
            });
        }
      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    return () => { if (globalSub) dbService.unsubscribe(globalSub); };
  }, []);

  const handleAddProduct = async (product: Product) => {
    await dbService.saveProduct(product);
    setProducts(await dbService.getProducts());
  };

  const handleUpdateProduct = async (product: Product) => {
    await dbService.saveProduct(product);
    setProducts(await dbService.getProducts());
  };

  const handleDeleteProduct = async (id: string) => {
    await dbService.deleteProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleClearProducts = async () => {
    await dbService.clearProducts();
    setProducts([]);
  };

  const handleSaveOrder = async (order: Order) => {
    try {
      await dbService.saveOrder(order);
      setOrders(prev => [order, ...prev]);

      for (const item of order.items) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          const updated = { ...product, stock: Math.max(0, (product.stock || 0) - item.qty) };
          await dbService.saveProduct(updated);
        }
      }
      setProducts(await dbService.getProducts());
      setEditingCustomer(null);
    } catch (error) {
      alert("Failed to save order.");
    }
  };

  const handleEditOrder = async (order: Order) => {
      const orderToDelete = orders.find(o => o.id === order.id);
      if (orderToDelete) {
          for (const item of orderToDelete.items) {
              const product = products.find(p => p.id === item.id);
              if (product) {
                  await dbService.saveProduct({ ...product, stock: (product.stock || 0) + item.qty });
              }
          }
      }
      await dbService.deleteOrder(order.id);
      setOrders(prev => prev.filter(o => o.id !== order.id));
      setProducts(await dbService.getProducts());
      setCart(order.items);
      if (order.customer) setEditingCustomer(order.customer);
      setView('pos');
  };

  const handleAddCustomer = async (customer: Customer) => {
    await dbService.saveCustomer(customer);
    setCustomers(await dbService.getCustomers());
  };

  const handleUpdateCustomer = async (customer: Customer) => {
    await dbService.saveCustomer(customer);
    setCustomers(await dbService.getCustomers());
  };

  const handleDeleteCustomer = async (id: string) => {
    await dbService.deleteCustomer(id);
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const handleFactoryReset = async () => {
      await dbService.resetDatabase();
      setProducts([]);
      setOrders([]);
      setCustomers([]);
      setCart([]);
      setShopDetails(INITIAL_SHOP_DETAILS);
      await dbService.saveShopDetails(INITIAL_SHOP_DETAILS);
  };

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
      <nav className="w-20 lg:w-64 bg-slate-900 flex-shrink-0 flex flex-col justify-between text-slate-300 transition-all duration-300 print:hidden">
        <div>
          <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-800">
            {shopDetails.logo ? (
               <img src={shopDetails.logo} alt="Logo" className="w-10 h-10 object-cover rounded-lg" />
            ) : (
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">S</div>
            )}
            <span className="ml-3 font-bold text-xl text-white hidden lg:block tracking-tight">SmartPOS</span>
          </div>
          <div className="p-4 space-y-2">
            <button onClick={() => setView('pos')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'pos' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><Store size={22} /><span className="font-medium hidden lg:block">Billing / POS</span></button>
            <button onClick={() => setView('inventory')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><LayoutDashboard size={22} /><span className="font-medium hidden lg:block">Stock Management</span></button>
            <button onClick={() => setView('history')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><ReceiptText size={22} /><span className="font-medium hidden lg:block">Orders History</span></button>
            <button onClick={() => setView('customers')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'customers' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><Users size={22} /><span className="font-medium hidden lg:block">Customer Details</span></button>
            <button onClick={() => setView('analysis')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'analysis' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><BarChart3 size={22} /><span className="font-medium hidden lg:block">Sales Analysis</span></button>
            <button onClick={() => setView('settings')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><Settings size={22} /><span className="font-medium hidden lg:block">Shop Settings</span></button>
          </div>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 hover:text-red-400 transition-colors"><LogOut size={22} /><span className="font-medium hidden lg:block">Logout</span></button>
        </div>
      </nav>
      <main className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto scroll-smooth">
          {view === 'pos' && <POS products={products} customers={customers} cart={cart} setCart={setCart} onSaveOrder={handleSaveOrder} onSaveCustomer={handleAddCustomer} shopDetails={shopDetails} onManageStock={() => setView('inventory')} onViewHistory={() => setView('history')} initialCustomer={editingCustomer} onAddProduct={handleAddProduct} />}
          {view === 'inventory' && <Inventory products={products} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} onClearProducts={handleClearProducts} onNavigateToPos={() => setView('pos')} defaultTaxRate={shopDetails.defaultTaxRate} />}
          {view === 'history' && <History orders={orders} onDeleteOrder={async (id) => { const o = orders.find(x => x.id === id); if (o) { for (const item of o.items) { const p = products.find(y => y.id === item.id); if (p) await dbService.saveProduct({...p, stock: p.stock + item.qty}); } } await dbService.deleteOrder(id); setOrders(await dbService.getOrders()); setProducts(await dbService.getProducts()); }} onClearOrders={async () => { await dbService.clearOrders(); setOrders([]); }} onEditOrder={handleEditOrder} shopDetails={shopDetails} />}
          {view === 'analysis' && <DailyAnalysis orders={orders} shopDetails={shopDetails} />}
          {view === 'customers' && <Customers customers={customers} onAddCustomer={handleAddCustomer} onUpdateCustomer={handleUpdateCustomer} onDeleteCustomer={handleDeleteCustomer} />}
          {view === 'settings' && <ShopSettings shopDetails={shopDetails} onSave={handleSaveSettings} orders={orders} customers={customers} onClearOrders={async () => { await dbService.clearOrders(); setOrders([]); }} onClearProducts={handleClearProducts} onClearCustomers={async () => { await dbService.clearCustomers(); setCustomers([]); }} onFactoryReset={handleFactoryReset} onAddProduct={handleAddProduct} />}
        </div>
      </main>
    </div>
  );
};

export default App;

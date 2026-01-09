import React, { useState, useMemo } from 'react';
import { Search, Trash2, ShoppingCart, Coffee, Utensils, CreditCard, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import { Product, CartItem, CATEGORIES, Order, ShopDetails } from '../types';
import { ProductCard } from '../components/ProductCard';
import { ReceiptModal } from '../components/ReceiptModal';

interface POSProps {
  products: Product[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onSaveOrder: (order: Order) => void;
  shopDetails: ShopDetails;
}

export const POS: React.FC<POSProps> = ({ products, cart, setCart, onSaveOrder, shopDetails }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualQtyMode, setManualQtyMode] = useState(false);
  const [qtyPromptProduct, setQtyPromptProduct] = useState<Product | null>(null);
  const [qtyPromptValue, setQtyPromptValue] = useState<string>('1');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  // Derived State
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }, [cart]);

  // Handlers
  const initiateAddToCart = (product: Product) => {
    if (manualQtyMode) {
      setQtyPromptProduct(product);
      setQtyPromptValue('1');
    } else {
      addToCart(product, 1);
    }
  };

  const confirmQtyAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (qtyPromptProduct) {
      const qty = parseInt(qtyPromptValue) || 1;
      addToCart(qtyPromptProduct, qty);
      setQtyPromptProduct(null);
    }
  };

  const addToCart = (product: Product, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentQtyInCart = existing ? existing.qty : 0;
      const totalRequested = currentQtyInCart + quantity;

      if (totalRequested > product.stock) {
        alert(`Cannot add more. Only ${product.stock} items available in stock.`);
        return prev;
      }

      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, qty: item.qty + quantity } : item
        );
      }
      return [...prev, { ...product, qty: quantity }];
    });
  };

  const updateQty = (id: string, newQty: string) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 1) return;
    
    // Check stock
    const product = products.find(p => p.id === id);
    if (product && qty > product.stock) {
        alert(`Maximum stock available is ${product.stock}`);
        return;
    }

    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, qty } : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    if(window.confirm("Are you sure you want to clear the bill?")) {
      setCart([]);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const newOrder: Order = {
      id: Math.floor(Math.random() * 1000000).toString(),
      date: new Date().toISOString(),
      items: [...cart],
      total: totalAmount * 1.1 // Including 10% tax
    };

    onSaveOrder(newOrder);
    setLastOrder(newOrder);
    setCart([]);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 p-6">
      {/* Left Side: Menu */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="mb-6">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-2xl font-bold text-slate-800">Menu</h2>
             <button 
                onClick={() => setManualQtyMode(!manualQtyMode)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
                title="Ask for quantity when clicking a product"
             >
                {manualQtyMode ? <ToggleRight className="text-blue-600" size={24} /> : <ToggleLeft className="text-slate-400" size={24} />}
                <span>Manual Quantity Input</span>
             </button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
             {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto scrollbar-hide">
              <button 
                onClick={() => setSelectedCategory('All')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'All' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All
              </button>
              {CATEGORIES.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-2 pb-2">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Coffee size={48} className="mb-2 opacity-20" />
              <p>No products found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} onAdd={initiateAddToCart} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Billing Cart */}
      <div className="w-full lg:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col h-[calc(100vh-8rem)] lg:h-auto sticky top-4">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <ShoppingCart size={20} className="text-blue-600" />
              Current Bill
            </h3>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <Utensils size={24} className="opacity-30" />
              </div>
              <p className="text-sm">No items added to the bill yet.</p>
              <p className="text-xs text-center max-w-[200px]">Click on products from the menu to add them here.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="group flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-transparent hover:border-blue-100 hover:bg-white transition-all">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xs font-bold text-slate-700 shadow-sm border border-slate-100">
                  {item.qty}x
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-800 truncate">{item.name}</h4>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>₹{item.price.toFixed(2)} / unit</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-bold text-slate-800 text-sm">
                    ₹{(item.price * item.qty).toFixed(2)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <input 
                      type="number" 
                      min="1"
                      className="w-12 h-6 text-xs text-center border rounded bg-white"
                      value={item.qty}
                      onChange={(e) => updateQty(item.id, e.target.value)}
                    />
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Totals */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Tax (10%)</span>
              <span>₹{(totalAmount * 0.1).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200">
              <span className="font-bold text-slate-800 text-lg">Total</span>
              <span className="font-bold text-blue-600 text-xl">₹{(totalAmount * 1.1).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             <button 
              onClick={clearCart}
              disabled={cart.length === 0}
              className="py-3 px-4 rounded-xl text-slate-600 font-medium text-sm bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="py-3 px-4 rounded-xl text-white font-medium text-sm bg-slate-900 hover:bg-blue-600 shadow-lg shadow-slate-200 hover:shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard size={16} /> Pay & Print
            </button>
          </div>
        </div>
      </div>

      {/* Manual Quantity Modal */}
      {qtyPromptProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold mb-4">Enter Quantity for {qtyPromptProduct.name}</h3>
                <div className="mb-4 text-sm text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                   Available in Stock: <span className="font-bold text-slate-700">{qtyPromptProduct.stock}</span>
                </div>
                <form onSubmit={confirmQtyAddToCart}>
                    <input 
                        type="number"
                        min="1"
                        max={qtyPromptProduct.stock}
                        autoFocus
                        className="w-full px-4 py-3 text-lg border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={qtyPromptValue}
                        onChange={(e) => setQtyPromptValue(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setQtyPromptProduct(null)} className="flex-1 py-2 rounded-lg bg-slate-100 font-medium text-slate-600">Cancel</button>
                        <button type="submit" className="flex-1 py-2 rounded-lg bg-blue-600 font-medium text-white">Add</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Receipt Modal */}
      {lastOrder && (
        <ReceiptModal order={lastOrder} shopDetails={shopDetails} onClose={() => setLastOrder(null)} />
      )}
    </div>
  );
};

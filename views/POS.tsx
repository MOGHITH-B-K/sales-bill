
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Trash2, ShoppingCart, Coffee, Utensils, CreditCard, ToggleLeft, ToggleRight, AlertCircle, Package, User, Phone, MapPin, ChevronDown, ChevronUp, History, Clock, Plus, X, Sparkles, Loader2, Tag, Upload, Image as ImageIcon } from 'lucide-react';
import { Product, CartItem, Order, ShopDetails, Customer } from '../types';
import { ProductCard } from '../components/ProductCard';
import { ReceiptModal } from '../components/ReceiptModal';
import { dbService } from '../services/db';
import { generateProductDetails } from '../services/gemini';

interface POSProps {
  products: Product[];
  customers: Customer[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onSaveOrder: (order: Order) => void;
  onSaveCustomer: (customer: Customer) => void;
  shopDetails: ShopDetails;
  onManageStock: () => void;
  onViewHistory: () => void;
  initialCustomer?: { name: string; phone: string; place: string } | null;
  onAddProduct: (product: Product) => Promise<void>;
}

export const POS: React.FC<POSProps> = ({ 
    products, 
    customers, 
    cart, 
    setCart, 
    onSaveOrder, 
    onSaveCustomer,
    shopDetails, 
    onManageStock,
    onViewHistory,
    initialCustomer,
    onAddProduct
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualQtyMode, setManualQtyMode] = useState(false);
  const [qtyPromptProduct, setQtyPromptProduct] = useState<Product | null>(null);
  const [qtyPromptValue, setQtyPromptValue] = useState<string>('1');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Customer State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPlace, setCustomerPlace] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [isCustomerSectionOpen, setIsCustomerSectionOpen] = useState(true);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Quick Add Product Modal State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddProduct, setQuickAddProduct] = useState<Partial<Product>>({
      name: '',
      price: 0,
      stock: 0,
      category: 'Beverages'
  });
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Initialize customer state from prop if editing an order
  useEffect(() => {
    if (initialCustomer) {
      setCustomerName(initialCustomer.name || '');
      setCustomerPhone(initialCustomer.phone || '');
      setCustomerPlace(initialCustomer.place || '');
      setIsCustomerSectionOpen(true);
    }
  }, [initialCustomer]);

  // Filter customers for autocomplete
  const filteredCustomers = useMemo(() => {
    if (!customerPhone && !customerName) return [];
    const term = (customerPhone || customerName).toLowerCase();
    return customers.filter(c => 
        c.phone.includes(term) || c.name.toLowerCase().includes(term)
    ).slice(0, 5); // Limit suggestions
  }, [customers, customerPhone, customerName]);

  // Click outside to close search suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setShowCustomerSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectCustomer = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerPlace(customer.place);
    setShowCustomerSearch(false);
  };

  // Derived State
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const subTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }, [cart]);

  const taxTotal = useMemo(() => {
    if (!shopDetails.taxEnabled) return 0;
    
    return cart.reduce((sum, item) => {
        const rate = item.taxRate !== undefined ? item.taxRate : shopDetails.defaultTaxRate;
        const itemTax = (item.price * item.qty) * (rate / 100);
        return sum + itemTax;
    }, 0);
  }, [cart, shopDetails]);

  const grandTotal = subTotal + taxTotal;

  // Derive categories only from products to respect "Deleted" categories (empty ones)
  const dynamicCategories = useMemo(() => {
      const cats = new Set(products.map(p => p.category));
      return Array.from(cats).sort();
  }, [products]);

  // Available categories for dropdown in Quick Add
  const availableCategories = dynamicCategories.length > 0 ? dynamicCategories : ['General'];

  // Effect to reset category if it disappears (e.g. after deletion)
  useEffect(() => {
      if (selectedCategory !== 'All' && !dynamicCategories.includes(selectedCategory)) {
          setSelectedCategory('All');
      }
  }, [dynamicCategories, selectedCategory]);

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

      const taxRate = product.taxRate !== undefined ? product.taxRate : shopDetails.defaultTaxRate;
      const productWithTax = { ...product, taxRate };

      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, qty: item.qty + quantity } : item
        );
      }
      return [...prev, { ...productWithTax, qty: quantity }];
    });
  };

  const updateQty = (id: string, newQty: string) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 1) return;
    
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
      setCustomerName('');
      setCustomerPhone('');
      setCustomerPlace('');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    
    try {
        // Auto-save customer logic
        if (customerPhone && customerName) {
            const existingCustomer = customers.find(c => c.phone === customerPhone);
            if (!existingCustomer) {
                const newCustomer: Customer = {
                    id: Date.now().toString(),
                    name: customerName,
                    phone: customerPhone,
                    place: customerPlace || ''
                };
                onSaveCustomer(newCustomer);
            }
        }

        // Get serial order ID
        const nextId = await dbService.getNextOrderId();

        const newOrder: Order = {
          id: nextId,
          date: new Date().toISOString(),
          items: [...cart],
          total: grandTotal,
          taxTotal: taxTotal,
          customer: (customerName || customerPhone) ? {
              name: customerName,
              phone: customerPhone,
              place: customerPlace
          } : undefined
        };

        onSaveOrder(newOrder);
        setLastOrder(newOrder);
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerPlace('');
    } catch (error) {
        console.error("Checkout failed:", error);
        alert("Failed to process order. Please try again.");
    } finally {
        setIsCheckingOut(false);
    }
  };

  // Quick Add Handlers
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickAddProduct.name || quickAddProduct.price === undefined) return;
      
      const newProduct: Product = {
          id: Date.now().toString(),
          name: quickAddProduct.name,
          price: Number(quickAddProduct.price),
          stock: Number(quickAddProduct.stock),
          category: quickAddProduct.category || 'General',
          taxRate: shopDetails.defaultTaxRate, // Use default
          minStockLevel: 5,
          image: quickAddProduct.image,
          description: quickAddProduct.description
      };
      
      await onAddProduct(newProduct);
      
      // Auto add to cart
      addToCart(newProduct, 1);
      
      // Reset and close
      setQuickAddProduct({ name: '', price: 0, stock: 0, category: 'Beverages' });
      setIsQuickAddOpen(false);
  };
  
  const handleAIGenerate = async () => {
    if (!quickAddProduct.name) return;
    setIsLoadingAI(true);
    const data = await generateProductDetails(quickAddProduct.name);
    if (data) {
      setQuickAddProduct(prev => ({
        ...prev,
        description: data.description || prev.description,
        price: data.suggestedPrice || prev.price,
        category: data.category || prev.category
      }));
    }
    setIsLoadingAI(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            setQuickAddProduct(prev => ({ ...prev, image: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 p-6">
      {/* Left Side: Menu */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="mb-6">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
             <div className="flex items-center gap-3">
                 <h2 className="text-2xl font-bold text-slate-800">Menu</h2>
                 <div className="flex gap-2">
                    <button 
                        onClick={() => setIsQuickAddOpen(true)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-200"
                        title="Add New Product (Quick)"
                    >
                        <Plus size={16} /> Add Item
                    </button>
                    <button 
                      onClick={onManageStock}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200"
                      title="Go to Stock Management"
                    >
                      <Package size={14} /> Stock
                    </button>
                    <button 
                      onClick={onViewHistory}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-200"
                      title="Go to Order History"
                    >
                      <History size={14} /> History
                    </button>
                 </div>
             </div>
             <button 
                onClick={() => setManualQtyMode(!manualQtyMode)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm"
                title="Ask for quantity when clicking a product"
             >
                {manualQtyMode ? <ToggleRight className="text-blue-600" size={24} /> : <ToggleLeft className="text-slate-400" size={24} />}
                <span className="font-medium">Manual Qty</span>
             </button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
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

            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto scrollbar-hide">
              <button 
                onClick={() => setSelectedCategory('All')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'All' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All
              </button>
              {dynamicCategories.map(cat => (
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
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <ShoppingCart size={20} className="text-blue-600" />
              Current Bill
            </h3>
            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{cart.length} Items</span>
          </div>
        </div>

        {/* Customer Details Section */}
        <div className="px-4 py-3 border-b border-slate-100 bg-white" ref={searchWrapperRef}>
            <button 
                onClick={() => setIsCustomerSectionOpen(!isCustomerSectionOpen)}
                className="flex items-center justify-between w-full text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 hover:text-blue-600"
            >
                <span>Customer Details (Optional)</span>
                {isCustomerSectionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {isCustomerSectionOpen && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Phone size={14} /></div>
                        <input 
                            type="tel" 
                            placeholder="Phone (Search)"
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            value={customerPhone}
                            onChange={(e) => {
                                setCustomerPhone(e.target.value);
                                setShowCustomerSearch(true);
                            }}
                            onFocus={() => setShowCustomerSearch(true)}
                        />
                         {/* Search Dropdown */}
                        {showCustomerSearch && filteredCustomers.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                {filteredCustomers.map(customer => (
                                    <div 
                                        key={customer.id} 
                                        className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex flex-col border-b border-slate-50 last:border-0"
                                        onClick={() => selectCustomer(customer)}
                                    >
                                        <span className="text-sm font-bold text-slate-800">{customer.name}</span>
                                        <span className="text-xs text-slate-500">{customer.phone} • {customer.place}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="relative">
                         <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><User size={14} /></div>
                        <input 
                            type="text" 
                            placeholder="Name"
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                         <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><MapPin size={14} /></div>
                        <input 
                            type="text" 
                            placeholder="Place"
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            value={customerPlace}
                            onChange={(e) => setCustomerPlace(e.target.value)}
                        />
                    </div>
                </div>
            )}
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
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-800 truncate">{item.name}</h4>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>₹{item.price.toFixed(2)}</span>
                    {shopDetails.taxEnabled && <span className="text-[10px] bg-slate-100 px-1 rounded">Tax: {item.taxRate || 0}%</span>}
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
              <span>₹{subTotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm text-slate-500">
              <span className="flex items-center gap-2">
                Tax 
                {!shopDetails.taxEnabled && <span className="text-[10px] text-slate-400">(Disabled)</span>}
              </span>
              <span>₹{taxTotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200">
              <span className="font-bold text-slate-800 text-lg">Total</span>
              <span className="font-bold text-blue-600 text-xl">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             <button 
              onClick={clearCart}
              disabled={cart.length === 0 || isCheckingOut}
              className="py-3 px-4 rounded-xl text-slate-600 font-medium text-sm bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || isCheckingOut}
              className="py-3 px-4 rounded-xl text-white font-medium text-sm bg-slate-900 hover:bg-blue-600 shadow-lg shadow-slate-200 hover:shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard size={16} /> 
              {isCheckingOut ? 'Processing...' : 'Pay & Print'}
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

      {/* Quick Add Product Modal */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Plus size={18} className="text-blue-600" /> Quick Add Item</h3>
                    <button onClick={() => setIsQuickAddOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleQuickAddSubmit} className="p-5 space-y-4">
                    
                    {/* Image Quick Upload */}
                    <div className="flex justify-center">
                         <div className="relative w-20 h-20 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden hover:border-blue-300 transition-colors group cursor-pointer">
                            {quickAddProduct.image ? (
                                <img src={quickAddProduct.image} className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon size={20} className="text-slate-300" />
                            )}
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                         </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Name</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                autoFocus
                                required
                                value={quickAddProduct.name} 
                                onChange={(e) => setQuickAddProduct({...quickAddProduct, name: e.target.value})} 
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                placeholder="e.g. Chocolate Cake"
                            />
                            <button type="button" onClick={handleAIGenerate} disabled={isLoadingAI || !quickAddProduct.name} className="px-3 py-2 bg-purple-50 text-purple-600 rounded-lg border border-purple-100 hover:bg-purple-100 disabled:opacity-50 transition-colors">
                                {isLoadingAI ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price</label>
                            <input 
                                type="number" 
                                required
                                min="0"
                                step="0.01"
                                value={quickAddProduct.price} 
                                onChange={(e) => setQuickAddProduct({...quickAddProduct, price: parseFloat(e.target.value)})} 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock</label>
                            <input 
                                type="number" 
                                required
                                min="0"
                                value={quickAddProduct.stock} 
                                onChange={(e) => setQuickAddProduct({...quickAddProduct, stock: parseInt(e.target.value)})} 
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            />
                        </div>
                    </div>

                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                         <select 
                            value={quickAddProduct.category} 
                            onChange={(e) => setQuickAddProduct({...quickAddProduct, category: e.target.value})} 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                        >
                            {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="General">General</option>
                        </select>
                    </div>

                    <button 
                        type="submit" 
                        className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all text-sm mt-2"
                    >
                        Save & Add to Bill
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Receipt Modal */}
      {lastOrder && (
        <ReceiptModal 
          order={lastOrder} 
          shopDetails={shopDetails} 
          onClose={() => setLastOrder(null)} 
          autoPrint={true}
        />
      )}
    </div>
  );
};

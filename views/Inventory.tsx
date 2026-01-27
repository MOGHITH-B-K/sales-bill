
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Sparkles, Loader2, Package, Upload, Image as ImageIcon, Store, AlertTriangle, ListFilter, AlertCircle, CheckCircle2, Cloud, CloudOff, Tag, Repeat } from 'lucide-react';
import { Product } from '../types';
import { generateProductDetails } from '../services/gemini';
import { dbService } from '../services/db';

interface InventoryProps {
  products: Product[];
  onAddProduct: (product: Product) => Promise<void>;
  onUpdateProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onClearProducts: () => Promise<void>;
  onNavigateToPos: () => void;
  defaultTaxRate?: number;
}

export const Inventory: React.FC<InventoryProps> = ({ 
  products, 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct, 
  onClearProducts,
  onNavigateToPos,
  defaultTaxRate = 0
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [dbConnected] = useState(dbService.isConfigured());
  
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    stock: 0,
    category: 'Beverages',
    description: '',
    image: '',
    taxRate: defaultTaxRate,
    minStockLevel: 5,
    productType: 'sale'
  });

  const [editId, setEditId] = useState<string | null>(null);

  const categories = Array.from(new Set(products.map(p => p.category))).sort();
  const dropdownCategories = categories.length > 0 ? categories : ['Beverages', 'Food', 'Snacks', 'Dessert'];

  const resetForm = () => {
    setCurrentProduct({ 
      name: '', 
      price: 0, 
      stock: 0, 
      category: dropdownCategories[0], 
      description: '', 
      image: '', 
      taxRate: defaultTaxRate, 
      minStockLevel: 5,
      productType: 'sale'
    });
    setEditId(null);
    setIsModalOpen(false);
    setIsSaving(false);
    setSaveSuccess(false);
    setIsCustomCategory(false);
  };

  const handleSubmit = async (e: React.FormEvent, shouldRedirect: boolean) => {
    e.preventDefault();
    if (!currentProduct.name || currentProduct.price === undefined) {
      alert("Please enter a product name and price.");
      return;
    }
    
    setIsSaving(true);
    setSaveSuccess(false);

    const processedProduct = {
      ...currentProduct,
      stock: Number(currentProduct.stock) || 0,
      price: Number(currentProduct.price) || 0,
      taxRate: Number(currentProduct.taxRate) || 0,
      minStockLevel: Number(currentProduct.minStockLevel) || 5
    };

    try {
      if (editId) {
        await onUpdateProduct({ ...processedProduct, id: editId } as Product);
      } else {
        const newProduct: Product = {
          ...processedProduct as Product,
          id: Date.now().toString(),
        };
        await onAddProduct(newProduct);
      }
      
      setSaveSuccess(true);
      
      setTimeout(() => {
        if (shouldRedirect) {
          onNavigateToPos();
        } else {
          resetForm();
        }
      }, 800);

    } catch (err: any) {
      console.error("Save error:", err);
      alert(err.message || "Failed to save product.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setCurrentProduct(product);
    setEditId(product.id);
    setIsCustomCategory(false);
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            setCurrentProduct(prev => ({ ...prev, image: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Inventory Management</h2>
            {dbConnected ? (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold border border-green-100">
                    <Cloud size={12} /> CLOUD SYNC ACTIVE
                </div>
            ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold border border-amber-100">
                    <CloudOff size={12} /> LOCAL MODE
                </div>
            )}
          </div>
          <p className="text-slate-500 mt-1">Manage standard sales and temporary rentals.</p>
        </div>
        <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setIsCategoryModalOpen(true)} 
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all"
            >
              <ListFilter size={18} /> Categories
            </button>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }} 
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-all shadow-lg"
            >
              <Plus size={18} /> New Product
            </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Info</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">In Stock</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Inventory is empty. Add items to start billing.</td></tr>
            ) : products.map(product => {
              const isRental = product.productType === 'rental';
              const threshold = product.minStockLevel || 5;
              const isLow = product.stock > 0 && product.stock <= threshold;
              const isOut = product.stock <= 0;

              return (
                <tr key={product.id} className={`transition-colors ${isOut ? 'bg-red-50/20' : isLow ? 'bg-orange-50/20' : 'hover:bg-slate-50'}`}>
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                      {product.image ? <img src={product.image} className="w-full h-full object-cover" /> : <ImageIcon size={18} className="text-slate-400" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-800 truncate">{product.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {product.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {isRental ? (
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                            <Repeat size={10} /> Rental Item
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                            <Tag size={10} /> Normal Sale
                        </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-slate-500">{product.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    {isOut ? (
                      <span className="text-red-600 font-black text-xs">OUT OF STOCK</span>
                    ) : (
                      <span className={`text-sm font-bold ${isLow ? 'text-orange-600' : 'text-slate-800'}`}>{product.stock} units</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => handleEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => onDeleteProduct(product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex justify-between items-center p-8 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-800">{editId ? 'Modify Product' : 'Add New Product'}</h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-200 rounded-full"><X size={24} /></button>
            </div>
            
            <form onSubmit={(e) => handleSubmit(e, false)} className="p-8 space-y-6">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-4 bg-slate-100 p-1.5 rounded-2xl">
                  <button 
                    type="button" 
                    onClick={() => setCurrentProduct({...currentProduct, productType: 'sale'})}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase transition-all ${currentProduct.productType === 'sale' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
                  >
                    <Tag size={16} /> Standard Sale
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setCurrentProduct({...currentProduct, productType: 'rental'})}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase transition-all ${currentProduct.productType === 'rental' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
                  >
                    <Repeat size={16} /> Rental Asset
                  </button>
              </div>

              <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Product Name</label>
                    <input type="text" required value={currentProduct.name} onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})} className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:border-blue-500 outline-none font-bold" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Price (₹)</label>
                        <input type="number" step="0.01" value={currentProduct.price} onChange={(e) => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value)})} className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:border-blue-500 outline-none font-bold" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Current Stock</label>
                        <input type="number" value={currentProduct.stock} onChange={(e) => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value)})} className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:border-blue-500 outline-none font-bold" />
                      </div>
                  </div>

                  <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                      <select value={currentProduct.category} onChange={(e) => setCurrentProduct({...currentProduct, category: e.target.value})} className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:border-blue-500 outline-none font-bold bg-white">
                        {dropdownCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                  </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full py-5 bg-slate-900 text-white rounded-[1.25rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-600 transition-all disabled:opacity-50 shadow-xl"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={24} /> : editId ? 'Update Item' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

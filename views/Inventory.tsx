
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Sparkles, Loader2, Package, Upload, Image as ImageIcon, Store, ChevronRight } from 'lucide-react';
import { Product, CATEGORIES } from '../types';
import { generateProductDetails } from '../services/gemini';

interface InventoryProps {
  products: Product[];
  onAddProduct: (product: Product) => Promise<void>;
  onUpdateProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onClearProducts: () => Promise<void>;
  onNavigateToPos: () => void;
}

export const Inventory: React.FC<InventoryProps> = ({ 
  products, 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct, 
  onClearProducts,
  onNavigateToPos
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [redirectAfterSave, setRedirectAfterSave] = useState(false);
  
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    stock: 0,
    category: 'Beverages',
    description: '',
    image: ''
  });

  const [editId, setEditId] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentProduct({ name: '', price: 0, stock: 0, category: 'Beverages', description: '', image: '' });
    setEditId(null);
    setIsModalOpen(false);
    setRedirectAfterSave(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct.name || currentProduct.price === undefined) return;

    const processedProduct = {
      ...currentProduct,
      stock: Number(currentProduct.stock) || 0,
      price: Number(currentProduct.price) || 0,
    };

    if (editId) {
      await onUpdateProduct({ ...processedProduct, id: editId } as Product);
    } else {
      const newProduct: Product = {
        ...processedProduct as Product,
        id: Date.now().toString(),
      };
      await onAddProduct(newProduct);
    }
    
    if (redirectAfterSave) {
        onNavigateToPos();
    } else {
        resetForm();
    }
  };

  const handleEdit = (product: Product) => {
    setCurrentProduct(product);
    setEditId(product.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this product?')) {
      await onDeleteProduct(id);
    }
  };

  const handleDeleteAll = async () => {
    if (products.length === 0) return;
    if (window.confirm("Delete ALL products? This cannot be undone.")) {
      await onClearProducts();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentProduct(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIGenerate = async () => {
    if (!currentProduct.name) return;
    setIsLoadingAI(true);
    const data = await generateProductDetails(currentProduct.name);
    if (data) {
      setCurrentProduct(prev => ({
        ...prev,
        description: data.description || prev.description,
        price: data.suggestedPrice || prev.price,
        category: data.category || prev.category
      }));
    }
    setIsLoadingAI(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Stock Management</h2>
          <p className="text-slate-500 mt-1">Add products here to see them in the Billing section.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
            <button 
                onClick={handleDeleteAll}
                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
            >
                <Trash2 size={18} />
            </button>
            <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
            <Plus size={18} /> Add New Product
            </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                            <Package size={32} className="opacity-20" />
                            <span>No products yet. Click "Add New Product" to start.</span>
                        </div>
                    </td>
                </tr>
            ) : products.map(product => (
              <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                    {product.image ? <img src={product.image} className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-slate-400" />}
                  </div>
                  <span className="font-medium text-slate-800">{product.name}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">{product.category}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-md font-medium ${product.stock <= 5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {product.stock} in stock
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-800">₹{product.price.toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-800">{editId ? 'Update Item' : 'Create New Item'}</h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex flex-col items-center justify-center mb-4">
                <div className="relative w-full h-32 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden hover:border-blue-300 transition-colors group cursor-pointer">
                  {currentProduct.image ? (
                    <img src={currentProduct.image} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <Upload size={24} className="mb-2" />
                      <span className="text-sm">Product Photo</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <div className="flex gap-2">
                    <input type="text" required value={currentProduct.name} onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    <button type="button" onClick={handleAIGenerate} disabled={isLoadingAI || !currentProduct.name} className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-md hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 text-sm font-medium">
                        {isLoadingAI ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                        <span>AI Fill</span>
                    </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹)</label>
                  <input type="number" step="0.01" required value={currentProduct.price} onChange={(e) => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Initial Stock</label>
                  <input type="number" min="0" required value={currentProduct.stock} onChange={(e) => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select value={currentProduct.category} onChange={(e) => setCurrentProduct({...currentProduct, category: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={currentProduct.description} onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none h-20 resize-none" />
              </div>

              <div className="pt-4 flex flex-col gap-3">
                    <button 
                        type="submit" 
                        onClick={() => setRedirectAfterSave(true)}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                    >
                        <Store size={18} /> Save & Open Billing
                    </button>
                    <button 
                        type="submit" 
                        onClick={() => setRedirectAfterSave(false)}
                        className="w-full py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                    >
                        Save Only
                    </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

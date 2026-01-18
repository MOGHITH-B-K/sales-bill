
import React, { useState, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Sparkles, Loader2, Package, Upload, Image as ImageIcon, Store, AlertTriangle, ListFilter, ArrowRight, AlertCircle, Download, FileSpreadsheet } from 'lucide-react';
import { Product, CATEGORIES } from '../types';
import { generateProductDetails } from '../services/gemini';

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
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [redirectAfterSave, setRedirectAfterSave] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    stock: 0,
    category: 'Beverages',
    description: '',
    image: '',
    taxRate: defaultTaxRate,
    minStockLevel: 5
  });

  const [editId, setEditId] = useState<string | null>(null);

  // Combine default categories with any unique categories found in existing products
  const availableCategories = Array.from(new Set([...CATEGORIES, ...products.map(p => p.category)])).sort();

  const resetForm = () => {
    setCurrentProduct({ name: '', price: 0, stock: 0, category: 'Beverages', description: '', image: '', taxRate: defaultTaxRate, minStockLevel: 5 });
    setEditId(null);
    setIsModalOpen(false);
    setRedirectAfterSave(false);
    setIsCustomCategory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct.name || currentProduct.price === undefined) return;

    const processedProduct = {
      ...currentProduct,
      stock: Number(currentProduct.stock) || 0,
      price: Number(currentProduct.price) || 0,
      taxRate: Number(currentProduct.taxRate) || 0,
      minStockLevel: Number(currentProduct.minStockLevel) || 5
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
    setIsCustomCategory(!CATEGORIES.includes(product.category));
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

  // CSV Export Logic
  const handleExportCSV = () => {
    if (products.length === 0) return alert("No products to export.");
    
    const headers = ["ID", "Name", "Price", "Stock", "Category", "Description", "TaxRate", "MinStockLevel"];
    const rows = products.map(p => [
        p.id,
        `"${(p.name || '').replace(/"/g, '""')}"`, // Escape quotes
        p.price,
        p.stock,
        `"${(p.category || 'Other').replace(/"/g, '""')}"`,
        `"${(p.description || '').replace(/"/g, '""')}"`,
        p.taxRate || 0,
        p.minStockLevel || 5
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(r => r.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to parse CSV lines respecting quotes
  const parseCSVLine = (text: string) => {
    const result = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(cell);
            cell = '';
        } else {
            cell += char;
        }
    }
    result.push(cell); // Push last cell
    return result;
  };

  // CSV Import Logic
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const text = event.target?.result as string;
        const lines = text.split(/\r\n|\n/);
        // Skip header
        const dataLines = lines.slice(1);
        
        let count = 0;
        for (const line of dataLines) {
            if (!line.trim()) continue;
            
            const parts = parseCSVLine(line);
            
            // Expected length check, allow some flexibility
            if (parts.length < 4) continue;

            // Remove surrounding quotes if they exist after splitting
            const clean = (val: string) => val ? val.replace(/^"|"$/g, '').replace(/""/g, '"').trim() : '';

            const name = clean(parts[1]);
            const price = parseFloat(parts[2]);
            const stock = parseInt(parts[3]);
            const category = clean(parts[4]) || 'Other';
            
            if (name && !isNaN(price)) {
                const newProduct: Product = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name,
                    price,
                    stock: isNaN(stock) ? 0 : stock,
                    category,
                    description: clean(parts[5]),
                    taxRate: parseFloat(parts[6]) || defaultTaxRate,
                    minStockLevel: parseInt(parts[7]) || 5
                };
                await onAddProduct(newProduct);
                count++;
            }
        }
        alert(`Successfully imported ${count} products.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
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

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '___NEW___') {
        setIsCustomCategory(true);
        setCurrentProduct(prev => ({ ...prev, category: '' }));
    } else {
        setIsCustomCategory(false);
        setCurrentProduct(prev => ({ ...prev, category: val }));
    }
  };

  // Category Management Logic
  const deleteCategory = async (categoryToDelete: string) => {
    const productsInCat = products.filter(p => p.category === categoryToDelete);
    
    if (productsInCat.length > 0) {
        const confirmMsg = `There are ${productsInCat.length} products in "${categoryToDelete}".\n\nTo delete this category, these products must be moved to "Uncategorized" or another category.`;
        if(!window.confirm(confirmMsg)) return;

        // Move to default 'Food' or first available
        const fallbackCategory = 'Other'; 
        
        for (const p of productsInCat) {
            await onUpdateProduct({ ...p, category: fallbackCategory });
        }
        alert(`Products moved to "${fallbackCategory}". Category "${categoryToDelete}" deleted.`);
    } else {
        alert(`Category "${categoryToDelete}" removed (it was empty).`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Stock Management</h2>
          <p className="text-slate-500 mt-1">Add products, set min stock limits, and manage categories.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
             <button 
                onClick={() => setIsCategoryManagerOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
                title="Manage Categories"
            >
                <ListFilter size={18} /> <span className="hidden sm:inline">Categories</span>
            </button>

            {/* Import Button */}
            <div className="relative">
                <input 
                    type="file" 
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleImportCSV}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    title="Import CSV"
                />
                <button className="px-4 py-2.5 rounded-xl border border-blue-200 text-blue-600 font-medium hover:bg-blue-50 transition-colors flex items-center gap-2">
                    <Upload size={18} /> <span className="hidden sm:inline">Import</span>
                </button>
            </div>

            {/* Export Button */}
            <button 
                onClick={handleExportCSV}
                className="px-4 py-2.5 rounded-xl border border-green-200 text-green-600 font-medium hover:bg-green-50 transition-colors flex items-center gap-2"
                title="Export Products to CSV"
            >
                <Download size={18} /> <span className="hidden sm:inline">Export</span>
            </button>

            <button 
                onClick={handleDeleteAll}
                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
                title="Delete ALL Products"
            >
                <Trash2 size={18} />
            </button>
            <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
            <Plus size={18} /> Add New
            </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price (Tax)</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                            <Package size={32} className="opacity-20" />
                            <span>No products yet. Click "Add New" or "Import".</span>
                        </div>
                    </td>
                </tr>
            ) : products.map(product => {
                const limit = product.minStockLevel || 5;
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= limit;
                
                return (
                  <tr key={product.id} className={`transition-colors group ${isOutOfStock ? 'bg-red-50/50 hover:bg-red-50' : isLowStock ? 'bg-orange-50/50 hover:bg-orange-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center flex-shrink-0">
                        {product.image ? <img src={product.image} className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-slate-400" />}
                      </div>
                      <span className="font-medium text-slate-800">{product.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">{product.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      {isOutOfStock ? (
                           <div className="flex items-center gap-2 text-red-700">
                               <AlertCircle size={16} className="text-red-600" />
                               <span className="px-2.5 py-1 bg-red-100 rounded-lg text-xs font-bold border border-red-200 shadow-sm">Out of Stock</span>
                           </div>
                      ) : isLowStock ? (
                           <div className="flex items-center gap-2 text-orange-600">
                               <AlertTriangle size={16} />
                               <div>
                                   <span className="font-bold">{product.stock}</span>
                                   <span className="text-xs ml-1 block">Low Stock (&le;{limit})</span>
                               </div>
                           </div>
                      ) : (
                          <span className="text-green-600 font-medium">{product.stock} in stock</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                             <span className="font-medium text-slate-800">₹{product.price.toFixed(2)}</span>
                             <span className="text-[10px] text-slate-500">Tax: {product.taxRate || 0}%</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )
            })}
          </tbody>
        </table>
      </div>

      {/* Product Add/Edit Modal */}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.1" 
                    value={currentProduct.taxRate} 
                    onChange={(e) => setCurrentProduct({...currentProduct, taxRate: parseFloat(e.target.value)})} 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder={`Default: ${defaultTaxRate}%`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock Limit</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={currentProduct.minStockLevel} 
                    onChange={(e) => setCurrentProduct({...currentProduct, minStockLevel: parseInt(e.target.value)})} 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Alert at..."
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Default is 5 if empty.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                {isCustomCategory ? (
                   <div className="flex gap-2">
                       <input 
                           type="text" 
                           autoFocus
                           placeholder="Enter new category name"
                           value={currentProduct.category} 
                           onChange={(e) => setCurrentProduct({...currentProduct, category: e.target.value})} 
                           className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                       <button 
                         type="button" 
                         onClick={() => { setIsCustomCategory(false); setCurrentProduct(prev => ({...prev, category: 'Beverages'})); }}
                         className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200"
                       >
                         Cancel
                       </button>
                   </div>
                ) : (
                    <select 
                        value={currentProduct.category} 
                        onChange={handleCategoryChange} 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        <option disabled>──────────</option>
                        <option value="___NEW___">+ Create New Category...</option>
                    </select>
                )}
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

      {/* Category Manager Modal */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
             <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">Manage Categories</h3>
                    <button onClick={() => setIsCategoryManagerOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-xs text-slate-500 mb-3">Deleting a category will move its products to "Other" if any exist.</p>
                    <div className="space-y-2">
                        {availableCategories.map(cat => (
                            <div key={cat} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                <span className="font-medium text-slate-700">{cat}</span>
                                <button 
                                    onClick={() => deleteCategory(cat)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Category"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        </div>
      )}

    </div>
  );
};


import React, { useState, useRef } from 'react';
import { Save, Store, Image as ImageIcon, QrCode, Calculator, Database, Download, Trash2, AlertTriangle, Cloud, ExternalLink, Code, FileUp, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { ShopDetails, Order, Customer, Product } from '../types';
import { dbService } from '../services/db';

interface ShopSettingsProps {
  shopDetails: ShopDetails;
  onSave: (details: ShopDetails) => Promise<void>;
  orders?: Order[];
  customers?: Customer[];
  onClearOrders: () => Promise<void>;
  onClearProducts: () => Promise<void>;
  onClearCustomers: () => Promise<void>;
  onFactoryReset: () => Promise<void>;
  onAddProduct: (product: Product) => Promise<void>;
}

export const ShopSettings: React.FC<ShopSettingsProps> = ({ 
    shopDetails, 
    onSave, 
    orders = [], 
    customers = [],
    onClearOrders,
    onClearProducts,
    onClearCustomers,
    onFactoryReset,
    onAddProduct
}) => {
  const [formData, setFormData] = useState<ShopDetails>(shopDetails);
  const [isSaved, setIsSaved] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; count: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    setIsSaved(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'paymentQrCode') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
        setIsSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (field: 'logo' | 'paymentQrCode') => {
    setFormData(prev => ({ ...prev, [field]: '' }));
    setIsSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
        ...formData,
        defaultTaxRate: Number(formData.defaultTaxRate)
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      let importedCount = 0;
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const product: Partial<Product> = {
          id: Date.now().toString() + i,
          taxRate: shopDetails.defaultTaxRate,
          minStockLevel: 5
        };

        headers.forEach((header, index) => {
          if (header === 'name') product.name = values[index];
          if (header === 'price') product.price = parseFloat(values[index]) || 0;
          if (header === 'stock') product.stock = parseInt(values[index]) || 0;
          if (header === 'category') product.category = values[index] || 'General';
          if (header === 'description') product.description = values[index];
        });

        if (product.name && product.price !== undefined) {
          await onAddProduct(product as Product);
          importedCount++;
        }
      }

      setImportStatus({ success: true, count: importedCount });
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setImportStatus(null), 5000);
    };

    reader.readAsText(file);
  };

  const exportOrdersCSV = () => {
    if (orders.length === 0) return alert("No orders available to export.");
    const headers = ["OrderID", "Date", "TotalAmount", "TaxTotal", "ItemsCount", "CustomerName", "CustomerPhone"];
    const rows = orders.map(o => [
        o.id,
        new Date(o.date).toLocaleString(),
        o.total,
        o.taxTotal,
        o.items.length,
        o.customer?.name || '',
        o.customer?.phone || ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    downloadCSV(csvContent, "orders_export.csv");
  };

  const downloadCSV = (content: string, fileName: string) => {
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = async (type: 'orders' | 'products' | 'customers' | 'all') => {
      let msg = "";
      if (type === 'orders') msg = "Delete ALL Order History?";
      if (type === 'products') msg = "Delete ALL Products from Inventory?";
      if (type === 'customers') msg = "Delete ALL Customer records?";
      if (type === 'all') msg = "FACTORY RESET: Delete ALL Data (Orders, Products, Customers)? This cannot be undone.";

      if (window.confirm(msg)) {
          if (type === 'orders') await onClearOrders();
          if (type === 'products') await onClearProducts();
          if (type === 'customers') await onClearCustomers();
          if (type === 'all') await onFactoryReset();
          alert("Data cleared successfully.");
      }
  }

  const isDbConfigured = dbService.isConfigured();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Shop Settings</h2>
        <p className="text-slate-500 mt-1">Manage your shop brand, tax, and inventory sync.</p>
      </div>

      <div className="space-y-8">
        {/* Database connectivity helper */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDbConfigured ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      <Cloud size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800">Cloud Sync Status</h3>
                    <p className="text-xs text-slate-500">{isDbConfigured ? 'Connected to Supabase Cloud' : 'Local Mode: Data stays in this browser only'}</p>
                  </div>
                </div>
                {isDbConfigured && <span className="px-3 py-1 bg-green-500 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">Live</span>}
            </div>
            <div className="p-8 space-y-4">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Code size={18} className="text-blue-600" /> API Connection</h4>
                    <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                      To enable real-time sync across devices, provide your Supabase URL and Key in the environment. 
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={() => setShowSchema(!showSchema)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                      >
                        <ExternalLink size={16} /> {showSchema ? 'Hide Setup' : 'View SQL Setup'}
                      </button>
                    </div>
                    
                    {showSchema && (
                      <div className="mt-6">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Supabase SQL Schema</label>
                        <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                          <pre className="text-[11px] text-green-400 font-mono">
{`create table products (id text primary key, name text not null, price numeric not null, stock numeric default 0, category text not null, description text, image text);
create table orders (id text primary key, date timestamp with time zone not null, items jsonb not null, total numeric not null, "taxTotal" numeric not null, customer jsonb);
create table settings (id text primary key, name text, address text, phone text, email text, "footerMessage" text, "poweredByText" text, logo text, "paymentQrCode" text, "taxEnabled" boolean default true, "defaultTaxRate" numeric default 5);`}
                          </pre>
                        </div>
                      </div>
                    )}
                </div>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Branding & Contact */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Store size={24} />
              </div>
              <h3 className="font-semibold text-lg text-slate-800">Branding & Credits</h3>
              </div>

              <div className="p-8 space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Logo Upload */}
                  <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-700">Receipt Logo</span>
                      <div className="relative w-full h-40 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden hover:border-blue-300 transition-colors group cursor-pointer">
                          {formData.logo ? (
                              <img src={formData.logo} alt="Shop Logo" className="w-full h-full object-contain p-2" />
                          ) : (
                              <div className="flex flex-col items-center text-slate-400 text-center p-4">
                                <ImageIcon size={24} className="mb-2 opacity-50" />
                                <span className="text-xs font-bold uppercase tracking-wider">Upload Shop Logo</span>
                              </div>
                          )}
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                      {formData.logo && (
                          <button type="button" onClick={() => removeImage('logo')} className="text-[10px] text-red-500 font-bold uppercase self-center mt-1">Remove</button>
                      )}
                  </div>

                  {/* Powered By Text */}
                  <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-700">Receipt Credit Line</span>
                      <div className="space-y-4">
                        <input 
                            type="text" 
                            name="poweredByText"
                            value={formData.poweredByText}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            placeholder="e.g. Powered by MyShop"
                        />
                        <p className="text-[10px] text-slate-400 leading-tight">
                            This text appears at the very bottom of every printed receipt. Use it for branding or white-labeling.
                        </p>
                      </div>
                  </div>
              </div>

              <div className="space-y-6">
                  <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Business Name</label>
                      <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                  </div>

                  <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Address & Header Info</label>
                      <textarea name="address" rows={2} value={formData.address} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm font-medium" />
                  </div>

                  <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Footer Message</label>
                      <input type="text" name="footerMessage" value={formData.footerMessage} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium" placeholder="Thank you message..." />
                  </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-4 border-t border-slate-100">
                  {isSaved && <span className="text-green-600 font-bold text-sm flex items-center gap-1"><CheckCircle2 size={16}/> Saved</span>}
                  <button type="submit" className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-xl">
                    <Save size={18} /> Update Shop Data
                  </button>
              </div>
              </div>
          </div>
          
          {/* Data Management & CSV Import */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                      <Database size={24} />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-800">Data Operations</h3>
              </div>
              <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* CSV Import */}
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 relative overflow-hidden">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <FileUp size={14} className="text-blue-600" /> Bulk Import Products
                          </h4>
                          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                            Upload a CSV file to quickly add products. Ensure columns: <b>name, price, stock, category, description</b>.
                          </p>
                          
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            accept=".csv" 
                            onChange={handleCSVImport} 
                            className="hidden" 
                          />
                          
                          <button 
                            type="button"
                            disabled={isImporting}
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-3 bg-white border border-slate-200 text-slate-800 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                             {isImporting ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={14} className="text-blue-500" />}
                             {isImporting ? 'Processing CSV...' : 'Select CSV File'}
                          </button>

                          {importStatus && (
                            <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                                <CheckCircle2 size={14} /> Successfully imported {importStatus.count} products!
                            </div>
                          )}
                      </div>

                      {/* Clear & Factory Reset */}
                      <div className="bg-red-50/30 p-6 rounded-2xl border border-red-100">
                           <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <Trash2 size={14} /> Critical Actions
                          </h4>
                          <div className="space-y-3">
                              <button 
                                  type="button"
                                  onClick={() => handleReset('all')}
                                  className="w-full py-3 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 shadow-lg shadow-red-100 transition-all"
                              >
                                  Factory Reset
                              </button>
                              <button 
                                  type="button"
                                  onClick={() => handleReset('orders')}
                                  className="w-full py-3 bg-white border border-red-100 text-red-600 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-50 transition-all"
                              >
                                  Wipe Order History
                              </button>
                          </div>
                      </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <Download size={18} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-500">Backup Current Sales Data</span>
                      </div>
                      <button 
                          type="button"
                          onClick={exportOrdersCSV}
                          className="px-6 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-200 transition-colors"
                      >
                          Export Orders (CSV)
                      </button>
                  </div>
              </div>
          </div>
        </form>
      </div>
    </div>
  );
};

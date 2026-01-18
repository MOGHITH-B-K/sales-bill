
import React, { useState } from 'react';
import { Save, Store, Image as ImageIcon, QrCode, Calculator, Database, Download, Trash2, AlertTriangle, Cloud, ExternalLink, Code } from 'lucide-react';
import { ShopDetails, Order, Customer } from '../types';
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
}

export const ShopSettings: React.FC<ShopSettingsProps> = ({ 
    shopDetails, 
    onSave, 
    orders = [], 
    customers = [],
    onClearOrders,
    onClearProducts,
    onClearCustomers,
    onFactoryReset
}) => {
  const [formData, setFormData] = useState<ShopDetails>(shopDetails);
  const [isSaved, setIsSaved] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  
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
        <h2 className="text-3xl font-bold text-slate-800">Shop Settings</h2>
        <p className="text-slate-500 mt-1">Manage your shop brand, tax, and database connectivity.</p>
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
                    <h3 className="font-semibold text-lg text-slate-800">Cloud Database Sync</h3>
                    <p className="text-xs text-slate-500">{isDbConfigured ? 'Connected to Supabase' : 'Local Mode: Configure Supabase to sync across devices'}</p>
                  </div>
                </div>
                {isDbConfigured && <span className="px-3 py-1 bg-green-500 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">Live</span>}
            </div>
            <div className="p-8 space-y-4">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Code size={18} className="text-blue-600" /> Connection Guide</h4>
                    <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                      To enable cloud synchronization, you must provide your Supabase URL and Key in the project environment. 
                      You also need to set up your database tables using our schema.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={() => setShowSchema(!showSchema)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                      >
                        <ExternalLink size={16} /> {showSchema ? 'Hide SQL Schema' : 'View SQL Schema'}
                      </button>
                      <a 
                        href="https://supabase.com/dashboard" 
                        target="_blank" 
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all"
                      >
                        Supabase Dashboard
                      </a>
                    </div>
                    
                    {showSchema && (
                      <div className="mt-6">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">SQL Setup Script</label>
                        <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                          <pre className="text-[11px] text-green-400 font-mono">
{`-- Run this in your Supabase SQL Editor:
create table products (
  id text primary key,
  name text not null,
  price numeric not null,
  stock numeric default 0,
  category text not null,
  description text,
  image text,
  "taxRate" numeric default 0,
  "minStockLevel" numeric default 5
);

create table orders (
  id text primary key,
  date timestamp with time zone not null,
  items jsonb not null,
  total numeric not null,
  "taxTotal" numeric not null,
  customer jsonb
);

create table customers (
  id text primary key,
  name text not null,
  phone text,
  place text
);

create table settings (
  id text primary key,
  name text,
  address text,
  phone text,
  email text,
  "footerMessage" text,
  logo text,
  "paymentQrCode" text,
  "taxEnabled" boolean default true,
  "defaultTaxRate" numeric default 5
);`}
                          </pre>
                        </div>
                      </div>
                    )}
                </div>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Tax Details Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                      <Calculator size={24} />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-800">Tax Configuration</h3>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                              type="checkbox" 
                              name="taxEnabled"
                              checked={formData.taxEnabled}
                              onChange={handleChange}
                              className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          <span className="ml-3 text-sm font-medium text-slate-700">Calculate Tax on Receipts</span>
                      </label>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Default GST / Tax (%)</label>
                      <input 
                          type="number" 
                          name="defaultTaxRate"
                          min="0"
                          step="0.1"
                          value={formData.defaultTaxRate}
                          onChange={handleChange}
                          disabled={!formData.taxEnabled}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                          placeholder="e.g. 5"
                      />
                  </div>
              </div>
          </div>

          {/* Shop Details Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Store size={24} />
              </div>
              <h3 className="font-semibold text-lg text-slate-800">Branding & Contact</h3>
              </div>

              <div className="p-8 space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Logo Upload */}
                  <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-700">Walk-in Shop Logo</span>
                      <div className="relative w-full h-48 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden hover:border-blue-300 transition-colors group cursor-pointer">
                          {formData.logo ? (
                              <>
                              <img src={formData.logo} alt="Shop Logo" className="w-full h-full object-contain p-2" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <p className="text-white text-sm font-medium">Click to Update</p>
                              </div>
                              </>
                          ) : (
                              <div className="flex flex-col items-center text-slate-400">
                              <ImageIcon size={32} className="mb-2 opacity-50" />
                              <span className="text-sm">Upload Logo</span>
                              </div>
                          )}
                          <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, 'logo')}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                      </div>
                      {formData.logo && (
                          <button type="button" onClick={() => removeImage('logo')} className="text-xs text-red-500 hover:text-red-700 font-medium self-center">Remove</button>
                      )}
                  </div>

                  {/* QR Code Upload */}
                  <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-700">UPI / Payment QR</span>
                      <div className="relative w-full h-48 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden hover:border-blue-300 transition-colors group cursor-pointer">
                          {formData.paymentQrCode ? (
                              <>
                              <img src={formData.paymentQrCode} alt="Payment QR" className="w-full h-full object-contain p-2" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <p className="text-white text-sm font-medium">Click to Update</p>
                              </div>
                              </>
                          ) : (
                              <div className="flex flex-col items-center text-slate-400">
                              <QrCode size={32} className="mb-2 opacity-50" />
                              <span className="text-sm">Upload Payment QR</span>
                              </div>
                          )}
                          <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, 'paymentQrCode')}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                      </div>
                      {formData.paymentQrCode && (
                          <button type="button" onClick={() => removeImage('paymentQrCode')} className="text-xs text-red-500 hover:text-red-700 font-medium self-center">Remove</button>
                      )}
                  </div>
              </div>

              <div className="space-y-6">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
                      <input 
                      type="text" 
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Walk-in Cafe"
                      />
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Address</label>
                      <textarea 
                      name="address"
                      rows={3}
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Line 1, Line 2, Zip"
                      />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Mobile / Phone</label>
                      <input 
                          type="text" 
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="+91..."
                      />
                      </div>
                      <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Receipt Email</label>
                      <input 
                          type="text" 
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="billing@shop.com"
                      />
                      </div>
                  </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-4">
                  {isSaved && <span className="text-green-600 font-bold text-sm">Settings Synced!</span>}
                  <button 
                  type="submit" 
                  className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 shadow-lg transition-all"
                  >
                  <Save size={18} /> Update Settings
                  </button>
              </div>
              </div>
          </div>
          
          {/* Data Cleanup */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                      <Database size={24} />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-800">Cleanup & Export</h3>
              </div>
              <div className="p-8">
                  <div className="flex flex-col space-y-6">
                      <div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Data Backup</h4>
                          <div className="flex flex-wrap gap-4">
                              <button 
                                  type="button"
                                  onClick={exportOrdersCSV}
                                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors border border-slate-200"
                              >
                                  <Download size={18} /> Export CSV
                              </button>
                          </div>
                      </div>

                      <div className="border-t border-slate-100 my-2"></div>

                      <div>
                          <div className="flex items-center gap-2 text-red-600 mb-3">
                              <AlertTriangle size={18} />
                              <h4 className="text-[10px] font-black uppercase tracking-widest">Wipe Data</h4>
                          </div>
                          <div className="flex flex-wrap gap-4">
                              <button 
                                  type="button"
                                  onClick={() => handleReset('all')}
                                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200"
                              >
                                  Factory Reset
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
        </form>
      </div>
    </div>
  );
};

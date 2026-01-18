
import React, { useState } from 'react';
import { Save, Store, Image as ImageIcon, QrCode, Calculator, Database, Download, Trash2, AlertTriangle } from 'lucide-react';
import { ShopDetails, Order, Customer } from '../types';

interface ShopSettingsProps {
  shopDetails: ShopDetails;
  onSave: (details: ShopDetails) => Promise<void>;
  // Props for Data Export & Mgmt
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

  const exportCustomersCSV = () => {
    if (customers.length === 0) return alert("No customers available to export.");
    const headers = ["ID", "Name", "Phone", "Place"];
    const rows = customers.map(c => [c.id, c.name, c.phone, c.place]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    downloadCSV(csvContent, "customers_export.csv");
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Shop Settings</h2>
        <p className="text-slate-500 mt-1">Configure your business details and system connections.</p>
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
                        <span className="ml-3 text-sm font-medium text-slate-700">Enable Tax Calculation</span>
                    </label>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Default Tax Percentage (%)</label>
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
                    <p className="text-xs text-slate-500 mt-1">This rate will be applied to new products by default.</p>
                </div>
            </div>
        </div>

        {/* Shop Details Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Store size={24} />
            </div>
            <h3 className="font-semibold text-lg text-slate-800">Business Information</h3>
            </div>

            <div className="p-8 space-y-8">
            
            {/* Images Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo Upload */}
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-700">Shop Logo</span>
                    <div className="relative w-full h-48 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden hover:border-blue-300 transition-colors group cursor-pointer">
                        {formData.logo ? (
                            <>
                            <img src={formData.logo} alt="Shop Logo" className="w-full h-full object-contain p-2" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-white text-sm font-medium">Change Logo</p>
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
                        <button type="button" onClick={() => removeImage('logo')} className="text-xs text-red-500 hover:text-red-700 font-medium self-center">Remove Logo</button>
                    )}
                </div>

                {/* QR Code Upload */}
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-700">Payment QR Code</span>
                    <div className="relative w-full h-48 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden hover:border-blue-300 transition-colors group cursor-pointer">
                        {formData.paymentQrCode ? (
                            <>
                            <img src={formData.paymentQrCode} alt="Payment QR" className="w-full h-full object-contain p-2" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-white text-sm font-medium">Change QR Code</p>
                            </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center text-slate-400">
                            <QrCode size={32} className="mb-2 opacity-50" />
                            <span className="text-sm">Upload QR Code</span>
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
                        <button type="button" onClick={() => removeImage('paymentQrCode')} className="text-xs text-red-500 hover:text-red-700 font-medium self-center">Remove QR Code</button>
                    )}
                </div>
            </div>

            <hr className="border-slate-100" />

            {/* Text Fields */}
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Shop / Business Name</label>
                    <input 
                    type="text" 
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Smart Cafe & Bistro"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <textarea 
                    name="address"
                    rows={3}
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Street Address, City, Zip Code"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <input 
                        type="text" 
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+91 98765 43210"
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email / Website</label>
                    <input 
                        type="text" 
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="contact@myshop.com"
                    />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Receipt Footer Message</label>
                    <input 
                    type="text" 
                    name="footerMessage"
                    value={formData.footerMessage}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Thank you for visiting! Please come again."
                    />
                </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-4">
                {isSaved && (
                <span className="text-green-600 font-medium text-sm animate-in fade-in">
                    Settings Saved Successfully!
                </span>
                )}
                <button 
                type="submit" 
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 shadow-lg shadow-slate-200 hover:shadow-blue-200 transition-all"
                >
                <Save size={18} /> Save Details
                </button>
            </div>
            </div>
        </div>
        
        {/* Data Management Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                    <Database size={24} />
                </div>
                <h3 className="font-semibold text-lg text-slate-800">Data Management</h3>
            </div>
            <div className="p-8">
                <div className="flex flex-col space-y-6">
                    {/* Exports */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Exports</h4>
                        <div className="flex flex-wrap gap-4">
                            <button 
                                type="button"
                                onClick={exportOrdersCSV}
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors border border-slate-200"
                            >
                                <Download size={18} /> Export Orders (CSV)
                            </button>
                            <button 
                                type="button"
                                onClick={exportCustomersCSV}
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors border border-slate-200"
                            >
                                <Download size={18} /> Export Customers (CSV)
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 my-2"></div>

                    {/* Danger Zone */}
                    <div>
                        <div className="flex items-center gap-2 text-red-600 mb-3">
                            <AlertTriangle size={18} />
                            <h4 className="text-sm font-bold uppercase tracking-wider">Danger Zone</h4>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">
                            These actions are irreversible. Please ensure you have exported your data before deleting.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <button 
                                type="button"
                                onClick={() => handleReset('orders')}
                                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors border border-red-100"
                            >
                                <Trash2 size={18} /> Clear Orders
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleReset('products')}
                                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors border border-red-100"
                            >
                                <Trash2 size={18} /> Clear Products
                            </button>
                             <button 
                                type="button"
                                onClick={() => handleReset('customers')}
                                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors border border-red-100"
                            >
                                <Trash2 size={18} /> Clear Customers
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleReset('all')}
                                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-200"
                            >
                                <AlertTriangle size={18} /> Factory Reset (All Data)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </form>
    </div>
  );
};


import React, { useState, useRef } from 'react';
import { Save, Store, Image as ImageIcon, QrCode, Calculator, Database, Download, Trash2, AlertTriangle, Cloud, ExternalLink, Code, FileUp, CheckCircle2, Loader2, Sparkles, ToggleLeft, ToggleRight, FileSpreadsheet } from 'lucide-react';
import { ShopDetails, Order, Customer, Product } from '../types';
import { dbService } from '../services/db';
import * as XLSX from 'xlsx';

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
  onAddCustomer?: (customer: Customer) => Promise<void>;
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
    onAddProduct,
    onAddCustomer
}) => {
  const [formData, setFormData] = useState<ShopDetails>(shopDetails);
  const [isSaved, setIsSaved] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; count: number; type: string } | null>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const customerFileInputRef = useRef<HTMLInputElement>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    setIsSaved(false);
  };

  const handleToggle = (name: keyof ShopDetails) => {
    setFormData(prev => ({
        ...prev,
        [name]: !prev[name]
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

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'customer') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(sheet);
        
        let importedCount = 0;
        if (type === 'product') {
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                const name = row.name || row.Name || row['Product Name'];
                if (!name) continue;

                const product: Product = {
                    id: `import-p-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
                    name: String(name),
                    price: parseFloat(row.price || row.Price || row['Unit Price']) || 0,
                    stock: parseInt(row.stock || row.Stock || row['Quantity']) || 0,
                    category: String(row.category || row.Category || 'General'),
                    description: String(row.description || row.Description || ''),
                    taxRate: parseFloat(row.taxRate || row.TaxRate || row['Tax Rate (%)']) || shopDetails.defaultTaxRate,
                    minStockLevel: parseInt(row.minStockLevel || row.MinStockLevel || row['Min Stock Level']) || 5
                };

                await onAddProduct(product);
                importedCount++;
            }
        } else if (type === 'customer' && onAddCustomer) {
            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                const name = row.name || row.Name || row['Customer Name'];
                const phone = row.phone || row.Phone || row['Customer Phone'];
                if (!name || !phone) continue;

                const customer: Customer = {
                    id: `import-c-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
                    name: String(name),
                    phone: String(phone),
                    place: String(row.place || row.Place || row['Location'] || '')
                };
                await onAddCustomer(customer);
                importedCount++;
            }
        }

        setImportStatus({ success: true, count: importedCount, type });
      } catch (err) {
        console.error("Excel import failed:", err);
        alert(`Failed to parse Excel file for ${type}s. Please check your columns.`);
      } finally {
        setIsImporting(false);
        if (productFileInputRef.current) productFileInputRef.current.value = '';
        if (customerFileInputRef.current) customerFileInputRef.current.value = '';
        setTimeout(() => setImportStatus(null), 5000);
      }
    };

    reader.readAsBinaryString(file);
  };

  const exportOrdersExcel = () => {
    if (orders.length === 0) return alert("No orders available to export.");
    
    const data = orders.map(o => ({
      'Order ID': o.id,
      'Date': new Date(o.date).toLocaleString(),
      'Total Amount': o.total,
      'Tax Amount': o.taxTotal,
      'Items Count': o.items.length,
      'Customer Name': o.customer?.name || 'Walk-in Guest',
      'Customer Phone': o.customer?.phone || '',
      'Customer Place': o.customer?.place || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, `Shop_Orders_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
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
{`create table products (id text primary key, name text not null, price numeric not null, stock numeric default 0, category text not null, description text, image text, "taxRate" numeric, "minStockLevel" numeric, "rentalDuration" text);
create table orders (id text primary key, date timestamp with time zone not null, items jsonb not null, total numeric not null, "taxTotal" numeric not null, customer jsonb);
create table settings (id text primary key, name text, address text, phone text, email text, "footerMessage" text, "poweredByText" text, logo text, "paymentQrCode" text, "taxEnabled" boolean, "defaultTaxRate" numeric, "showLogo" boolean, "showPaymentQr" boolean);`}
                          </pre>
                        </div>
                      </div>
                    )}
                </div>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Store size={24} />
                </div>
                <h3 className="font-semibold text-lg text-slate-800">Branding & Credits</h3>
              </div>

              <div className="p-8 space-y-8">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-slate-800">Show Logo on Receipt</h4>
                            <p className="text-[10px] text-slate-400">Enable to display shop logo at top.</p>
                        </div>
                        <button type="button" onClick={() => handleToggle('showLogo')}>
                            {formData.showLogo ? <ToggleRight className="text-blue-600" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-slate-800">Show Payment QR</h4>
                            <p className="text-[10px] text-slate-400">Display Scan to Pay section.</p>
                        </div>
                        <button type="button" onClick={() => handleToggle('showPaymentQr')}>
                            {formData.showPaymentQr ? <ToggleRight className="text-blue-600" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-700">Receipt Logo Image</span>
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

                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-700">Payment QR Code</span>
                        <div className="relative w-full h-40 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden hover:border-blue-300 transition-colors group cursor-pointer">
                            {formData.paymentQrCode ? (
                                <img src={formData.paymentQrCode} alt="Payment QR" className="w-full h-full object-contain p-2" />
                            ) : (
                                <div className="flex flex-col items-center text-slate-400 text-center p-4">
                                    <QrCode size={24} className="mb-2 opacity-50" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Upload QR Code</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'paymentQrCode')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        {formData.paymentQrCode && (
                            <button type="button" onClick={() => removeImage('paymentQrCode')} className="text-[10px] text-red-500 font-bold uppercase self-center mt-1">Remove</button>
                        )}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Receipt Credit Line</label>
                            <input type="text" name="poweredByText" value={formData.poweredByText} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm" placeholder="e.g. Powered by MyShop" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Tax Percentage (%)</label>
                            <div className="flex items-center gap-3">
                                <input type="number" name="defaultTaxRate" value={formData.defaultTaxRate} onChange={handleChange} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                                <button type="button" onClick={() => handleToggle('taxEnabled')} className="shrink-0">
                                    {formData.taxEnabled ? <ToggleRight className="text-blue-600" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}
                                </button>
                            </div>
                        </div>
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
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                      <Database size={24} />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-800">Excel Data Operations</h3>
              </div>
              <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-emerald-50/30 p-6 rounded-2xl border border-emerald-100 relative overflow-hidden">
                          <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <FileSpreadsheet size={14} /> Bulk Import Products (Excel)
                          </h4>
                          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                            Upload an .xlsx file. Headers: <b>name, price, stock, category, description</b>.
                          </p>
                          
                          <input 
                            type="file" 
                            ref={productFileInputRef}
                            accept=".xlsx,.xls" 
                            onChange={(e) => handleExcelImport(e, 'product')} 
                            className="hidden" 
                          />
                          
                          <button 
                            type="button"
                            disabled={isImporting}
                            onClick={() => productFileInputRef.current?.click()}
                            className="w-full py-3 bg-white border border-emerald-200 text-emerald-800 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                             {isImporting && importStatus?.type === 'product' ? <Loader2 className="animate-spin" size={16}/> : <FileUp size={14} className="text-emerald-500" />}
                             {isImporting && importStatus?.type === 'product' ? 'Processing...' : 'Select Excel File'}
                          </button>

                          {importStatus && importStatus.type === 'product' && (
                            <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                                <CheckCircle2 size={14} /> Success! {importStatus.count} products imported.
                            </div>
                          )}
                      </div>

                      <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100 relative overflow-hidden">
                          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <FileSpreadsheet size={14} /> Bulk Import Customers (Excel)
                          </h4>
                          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                            Upload an .xlsx file. Headers: <b>name, phone, place</b>.
                          </p>
                          
                          <input 
                            type="file" 
                            ref={customerFileInputRef}
                            accept=".xlsx,.xls" 
                            onChange={(e) => handleExcelImport(e, 'customer')} 
                            className="hidden" 
                          />
                          
                          <button 
                            type="button"
                            disabled={isImporting}
                            onClick={() => customerFileInputRef.current?.click()}
                            className="w-full py-3 bg-white border border-blue-200 text-blue-800 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                             {isImporting && importStatus?.type === 'customer' ? <Loader2 className="animate-spin" size={16}/> : <FileUp size={14} className="text-blue-500" />}
                             {isImporting && importStatus?.type === 'customer' ? 'Processing...' : 'Select Excel File'}
                          </button>

                          {importStatus && importStatus.type === 'customer' && (
                            <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                                <CheckCircle2 size={14} /> Success! {importStatus.count} customers imported.
                            </div>
                          )}
                      </div>

                      <div className="bg-red-50/30 p-6 rounded-2xl border border-red-100 md:col-span-2">
                           <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <Trash2 size={14} /> System Reset
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                  Clear All Orders
                              </button>
                          </div>
                      </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-2">
                          <FileSpreadsheet size={18} className="text-emerald-600" />
                          <span className="text-xs font-bold text-slate-500">Cloud Data Backup (Excel)</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button 
                            type="button"
                            onClick={() => {
                                if (customers.length === 0) return alert("No customers to export.");
                                const ws = XLSX.utils.json_to_sheet(customers.map(c => ({ 'Customer Name': c.name, 'Phone': c.phone, 'Place': c.place })));
                                const wb = XLSX.utils.book_new();
                                XLSX.utils.book_append_sheet(wb, ws, "Backup_Customers");
                                XLSX.writeFile(wb, `Customers_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
                            }}
                            className="px-6 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Export Customers
                        </button>
                        <button 
                            type="button"
                            onClick={exportOrdersExcel}
                            className="px-6 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                            Export Orders
                        </button>
                      </div>
                  </div>
              </div>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Save, Store, Image as ImageIcon, QrCode } from 'lucide-react';
import { ShopDetails } from '../types';

interface ShopSettingsProps {
  shopDetails: ShopDetails;
  onSave: (details: ShopDetails) => Promise<void>;
}

export const ShopSettings: React.FC<ShopSettingsProps> = ({ shopDetails, onSave }) => {
  const [formData, setFormData] = useState<ShopDetails>(shopDetails);
  const [isSaved, setIsSaved] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    await onSave(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Shop Settings</h2>
        <p className="text-slate-500 mt-1">Configure your business details and system connections.</p>
      </div>

      {/* Shop Details Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Store size={24} />
          </div>
          <h3 className="font-semibold text-lg text-slate-800">Business Information</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
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
        </form>
      </div>
    </div>
  );
};

import React from 'react';
import { X, Printer } from 'lucide-react';
import { Order, ShopDetails } from '../types';

interface ReceiptModalProps {
  order: Order | null;
  shopDetails: ShopDetails;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, shopDetails, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:w-full print:max-w-none print:max-h-none print:rounded-none">
        
        {/* Header - Hidden in Print */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 print:hidden">
          <h3 className="font-bold text-lg text-slate-800">Print Receipt</h3>
          <div className="flex gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer size={16} /> Print
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="printable-receipt" className="p-8 overflow-y-auto bg-white print:p-0">
          <style>
            {`
              @media print {
                body * { visibility: hidden; }
                #printable-receipt, #printable-receipt * { visibility: visible; }
                #printable-receipt { 
                  position: absolute; 
                  left: 0; 
                  top: 0; 
                  width: 100%; 
                  padding: 20px;
                }
                .no-print { display: none; }
              }
            `}
          </style>

          <div className="text-center mb-6">
            {shopDetails.logo && (
                <div className="flex justify-center mb-3">
                    <img src={shopDetails.logo} alt="Logo" className="h-16 object-contain grayscale" />
                </div>
            )}
            <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-widest mb-1">{shopDetails.name}</h1>
            <p className="text-xs text-slate-500 whitespace-pre-wrap">{shopDetails.address}</p>
            {shopDetails.phone && <p className="text-xs text-slate-500">Tel: {shopDetails.phone}</p>}
            {shopDetails.email && <p className="text-xs text-slate-500">Email: {shopDetails.email}</p>}
          </div>

          <div className="border-b-2 border-dashed border-slate-200 pb-4 mb-4">
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>Order #:</span>
              <span className="font-mono font-bold">{order.id}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Date:</span>
              <span>{new Date(order.date).toLocaleString()}</span>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead className="text-xs font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left py-2">Item</th>
                <th className="text-center py-2">Qty</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item, index) => (
                <tr key={`${item.id}-${index}`}>
                  <td className="py-2 text-slate-800">{item.name}</td>
                  <td className="py-2 text-center text-slate-600">{item.qty}</td>
                  <td className="py-2 text-right text-slate-600">{item.price.toFixed(2)}</td>
                  <td className="py-2 text-right font-medium text-slate-800">{(item.price * item.qty).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t-2 border-dashed border-slate-200 pt-4 space-y-1">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>₹{(order.total / 1.1).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Tax (10%)</span>
              <span>₹{(order.total - (order.total / 1.1)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-100 mt-2">
              <span>Total Amount</span>
              <span>₹{order.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-8 text-center space-y-4">
            {shopDetails.paymentQrCode && (
                <div className="flex flex-col items-center gap-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scan to Pay</p>
                    <img src={shopDetails.paymentQrCode} alt="Payment QR" className="w-32 h-32 border border-slate-200 rounded-lg p-1" />
                </div>
            )}
            <p className="text-xs text-slate-400">{shopDetails.footerMessage}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

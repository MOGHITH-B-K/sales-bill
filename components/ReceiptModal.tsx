
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

  const subTotal = order.total - (order.taxTotal || 0);

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
              <Printer size={16} /> Print Bill
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Area - Optimized for 58mm/80mm Thermal Printers */}
        <div id="printable-receipt" className="p-8 overflow-y-auto bg-white print:p-0">
          <style>
            {`
              @media print {
                @page { margin: 0; }
                body * { visibility: hidden; }
                #printable-receipt, #printable-receipt * { visibility: visible; }
                #printable-receipt { 
                  position: absolute; 
                  left: 0; 
                  top: 0; 
                  width: 100%;
                  max-width: 80mm; /* Standard Thermal width constraint */
                  padding: 10px 5px;
                  font-family: 'Courier New', Courier, monospace; /* Monospace for alignment */
                  color: black;
                }
                .no-print { display: none; }
                .dashed-line { border-top: 1px dashed black; margin: 8px 0; }
              }
            `}
          </style>

          <div className="text-center mb-4">
            {shopDetails.logo && (
                <div className="flex justify-center mb-2">
                    <img src={shopDetails.logo} alt="Logo" className="h-12 object-contain grayscale" />
                </div>
            )}
            <h1 className="text-xl font-bold text-black uppercase tracking-widest mb-1">{shopDetails.name}</h1>
            <p className="text-[10px] text-black whitespace-pre-wrap">{shopDetails.address}</p>
            {shopDetails.phone && <p className="text-[10px] text-black">Tel: {shopDetails.phone}</p>}
          </div>

          <div className="dashed-line border-t border-dashed border-slate-300 my-2 print:border-black"></div>

          <div className="flex justify-between text-xs text-black mb-1 font-mono">
            <span>Order #:</span>
            <span className="font-bold">{order.id}</span>
          </div>
          <div className="flex justify-between text-xs text-black font-mono">
            <span>Date:</span>
            <span>{new Date(order.date).toLocaleString()}</span>
          </div>

          {/* Customer Details Section */}
          {order.customer && (
             <div className="mt-2 text-[10px] text-black font-mono border-t border-dashed border-slate-300 pt-2 print:border-black">
                {order.customer.name && <div>Cust: {order.customer.name}</div>}
                {order.customer.phone && <div>Ph: {order.customer.phone}</div>}
                {order.customer.place && <div>Loc: {order.customer.place}</div>}
             </div>
          )}

          <div className="dashed-line border-t border-dashed border-slate-300 my-2 print:border-black"></div>

          <table className="w-full text-xs font-mono">
            <thead className="text-black border-b border-black">
              <tr>
                <th className="text-left py-1">Item</th>
                <th className="text-center py-1">Qty</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody className="">
              {order.items.map((item, index) => (
                <tr key={`${item.id}-${index}`}>
                  <td className="py-1 text-black">{item.name}</td>
                  <td className="py-1 text-center text-black">{item.qty}</td>
                  <td className="py-1 text-right font-medium text-black">{(item.price * item.qty).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="dashed-line border-t border-dashed border-slate-300 my-2 print:border-black"></div>

          <div className="space-y-1 font-mono text-xs text-black">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{subTotal.toFixed(2)}</span>
            </div>
            {shopDetails.taxEnabled ? (
                <div className="flex justify-between">
                <span>Tax Total</span>
                <span>{order.taxTotal.toFixed(2)}</span>
                </div>
            ) : (
                <div className="flex justify-between text-slate-400">
                <span>Tax</span>
                <span>0.00</span>
                </div>
            )}
            
            <div className="flex justify-between text-sm font-bold pt-2 mt-1 border-t border-black">
              <span>TOTAL</span>
              <span>₹{order.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-6 text-center space-y-4">
            {shopDetails.paymentQrCode && (
                <div className="flex flex-col items-center gap-1">
                    <p className="text-[10px] font-bold text-black uppercase">Scan to Pay</p>
                    <img src={shopDetails.paymentQrCode} alt="Payment QR" className="w-24 h-24 border border-black p-1" />
                </div>
            )}
            <p className="text-[10px] text-black font-mono">{shopDetails.footerMessage}</p>
            <p className="text-[8px] text-black pt-2">Powered by SmartPOS</p>
          </div>
        </div>
      </div>
    </div>
  );
};

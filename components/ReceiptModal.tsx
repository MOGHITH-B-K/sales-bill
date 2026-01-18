import React, { useEffect } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Order, ShopDetails } from '../types';
import html2canvas from 'html2canvas';

interface ReceiptModalProps {
  order: Order | null;
  shopDetails: ShopDetails;
  onClose: () => void;
  autoPrint?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, shopDetails, onClose, autoPrint = false }) => {
  
  const handlePrint = () => {
    // Simple window.print() combined with @media print in index.html is the most robust method
    // It uses the already rendered DOM, ensuring styles (Tailwind) are exactly as seen.
    window.print();
  };

  // Automatically trigger print if autoPrint is true
  useEffect(() => {
    if (autoPrint) {
      // Small timeout to ensure DOM is fully ready
      const timer = setTimeout(() => {
        handlePrint();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const handleDownload = async () => {
    const element = document.getElementById('printable-receipt');
    if (element) {
        const originalStyle = element.style.cssText;
        // Optimization for screenshot capture
        element.style.background = 'white';
        element.style.padding = '20px'; 
        element.style.width = '350px'; 
        element.style.margin = '0 auto';
        
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true
            });
            
            const link = document.createElement('a');
            link.download = `Receipt_${order?.id || 'doc'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error("Failed to generate receipt image", err);
        } finally {
            element.style.cssText = originalStyle;
        }
    }
  };

  if (!order) return null;

  const subTotal = order.total - (order.taxTotal || 0);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header - Hidden during print via no-print class */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white shrink-0 no-print">
          <h3 className="font-bold text-lg text-slate-800">Transaction Complete</h3>
          <div className="flex gap-2">
             <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              title="Download as Image"
            >
              <Download size={16} /> Save
            </button>
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

        {/* Printable Area - Has print-only-section class */}
        <div className="overflow-y-auto bg-white flex-1 p-8 print-container">
            <div id="printable-receipt" className="max-w-[300px] mx-auto bg-white print-only-section">
                <div className="text-center mb-4">
                    {shopDetails.logo && (
                        <div className="flex justify-center mb-2">
                            <img src={shopDetails.logo} alt="Logo" className="h-12 object-contain grayscale" />
                        </div>
                    )}
                    <h1 className="text-xl font-bold text-black uppercase tracking-widest mb-1">{shopDetails.name}</h1>
                    <p className="text-[10px] text-black whitespace-pre-wrap leading-tight">{shopDetails.address}</p>
                    {shopDetails.phone && <p className="text-[10px] text-black mt-1">Tel: {shopDetails.phone}</p>}
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

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
                    <div className="mt-2 text-[10px] text-black font-mono border-t border-dashed border-slate-300 pt-2">
                        {order.customer.name && <div>Cust: {order.customer.name}</div>}
                        {order.customer.phone && <div>Ph: {order.customer.phone}</div>}
                        {order.customer.place && <div>Loc: {order.customer.place}</div>}
                    </div>
                )}

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                <table className="w-full text-xs font-mono mb-2">
                    <thead className="text-black border-b border-black">
                    <tr>
                        <th className="text-left py-1">Item</th>
                        <th className="text-center py-1">Qty</th>
                        <th className="text-right py-1">Amt</th>
                    </tr>
                    </thead>
                    <tbody className="">
                    {order.items.map((item, index) => (
                        <tr key={`${item.id}-${index}`}>
                        <td className="py-1 text-black align-top">
                            <div>{item.name}</div>
                            {item.productType === 'rental' && <div className="text-[9px] text-slate-600">({item.rentalDuration || 'RENTAL'})</div>}
                        </td>
                        <td className="py-1 text-center text-black align-top">{item.qty}</td>
                        <td className="py-1 text-right font-medium text-black align-top">{(item.price * item.qty).toFixed(2)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

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
                    <p className="text-[8px] text-black pt-2 opacity-50">Powered by SmartPOS</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
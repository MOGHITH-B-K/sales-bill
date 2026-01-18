
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
    window.print();
  };

  // Automatically trigger print if autoPrint is true
  useEffect(() => {
    if (autoPrint) {
      // Small delay to ensure DOM is fully rendered and images (like logo/QR) are loaded
      const timer = setTimeout(() => {
        handlePrint();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const handleDownload = async () => {
    const element = document.getElementById('printable-receipt');
    if (element) {
        // Temporarily adjust style for clean capture to match 80mm thermal width
        const originalStyle = element.style.cssText;
        element.style.background = 'white';
        element.style.padding = '10px'; // minimal padding for image
        // 80mm is approx 302px at 96dpi. Setting ~300px ensures it looks like the receipt.
        element.style.width = '300px'; 
        element.style.maxWidth = '300px';
        element.style.position = 'static'; // Reset positioning for capture
        
        try {
            const canvas = await html2canvas(element, {
                scale: 2, // Higher quality
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true // Enable cross-origin for logo images
            });
            
            const link = document.createElement('a');
            link.download = `Receipt_${order?.id || 'doc'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error("Failed to generate receipt image", err);
            alert("Could not download receipt. Please try printing to PDF instead.");
        } finally {
            element.style.cssText = originalStyle;
        }
    }
  };

  if (!order) return null;

  const subTotal = order.total - (order.taxTotal || 0);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static print:z-auto">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:w-full print:max-w-none print:max-h-none print:rounded-none">
        
        {/* Header - Hidden in Print */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 print:hidden bg-white">
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

        {/* Printable Area - Optimized for 58mm/80mm Thermal Printers */}
        <div id="printable-receipt" className="p-8 overflow-y-auto bg-white print:p-0 print:overflow-visible">
          <style>
            {`
              @media print {
                /* Reset standard page margins */
                @page { 
                    margin: 0; 
                    size: auto; /* Allows content to dictate height (continuous roll) */
                }
                
                html, body {
                    height: auto;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white;
                }

                /* Hide everything by default */
                body * {
                    visibility: hidden;
                    height: 0; 
                    overflow: hidden;
                }

                /* Only show the receipt container and its children */
                #printable-receipt, #printable-receipt * {
                    visibility: visible !important;
                    height: auto !important;
                    overflow: visible !important;
                }

                /* Position the receipt absolutely at top left */
                #printable-receipt {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%; /* Fills the paper width selected in print dialog */
                    max-width: 80mm; /* Ensures proper strip width on A4 paper/PDF */
                    margin: 0;
                    padding: 5mm; /* Minimal padding for thermal printers */
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    line-height: 1.2;
                    color: black;
                    background-color: white;
                    z-index: 99999;
                }

                /* Utilities */
                .no-print { display: none !important; }
                .dashed-line { border-top: 1px dashed black !important; margin: 5px 0; }
                
                /* Ensure images print */
                img { 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact; 
                }
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
                  <td className="py-1 text-black">
                      {item.name}
                      {item.productType === 'rental' && <span className="text-[9px] ml-1">({item.rentalDuration || 'RENTAL'})</span>}
                  </td>
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

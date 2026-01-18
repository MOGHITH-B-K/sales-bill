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
    const receiptContent = document.getElementById('printable-receipt');
    if (!receiptContent) return;

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    // Append to body
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              /* Thermal Printer Optimizations */
              @page { 
                  margin: 0;
                  size: auto; 
              }
              body { 
                margin: 0; 
                padding: 5mm; 
                background: white; 
                font-family: 'Courier New', Courier, monospace; 
                color: black;
              }
              /* Utility overrides for print */
              .dashed-line { border-top: 1px dashed black !important; margin: 10px 0; }
              img { max-width: 100%; height: auto; -webkit-print-color-adjust: exact; }
              
              /* Ensure text is black */
              * { color: black !important; }
              
              /* Hide scrollbars */
              ::-webkit-scrollbar { display: none; }
            </style>
          </head>
          <body>
            ${receiptContent.innerHTML}
            <script>
              // Wait for Tailwind and images to load
              window.onload = () => {
                setTimeout(() => {
                  try {
                    window.print();
                    // Notify parent to remove iframe (optional, but good for cleanup)
                    window.parent.postMessage('print-complete', '*');
                  } catch (e) { console.error(e); }
                }, 800);
              }
            </script>
          </body>
        </html>
      `);
      doc.close();

      // Cleanup mechanism
      const cleanup = () => {
        if (document.body.contains(iframe)) {
             document.body.removeChild(iframe);
        }
        window.removeEventListener('message', messageHandler);
      };

      const messageHandler = (event: MessageEvent) => {
          if (event.data === 'print-complete') {
              // We can set a timeout to remove it, as print dialog blocks JS execution in some browsers
              // The message is sent BEFORE print dialog opens usually, or effectively when logic runs
              // Removing iframe immediately might break print in some browsers.
              // Safe bet: remove after a long delay or on next print.
              setTimeout(cleanup, 2000); 
          }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Fallback cleanup
      setTimeout(cleanup, 60000); 
    }
  };

  // Automatically trigger print if autoPrint is true
  useEffect(() => {
    if (autoPrint) {
      handlePrint();
    }
  }, [autoPrint]);

  const handleDownload = async () => {
    const element = document.getElementById('printable-receipt');
    if (element) {
        const originalStyle = element.style.cssText;
        element.style.background = 'white';
        element.style.padding = '20px'; 
        element.style.width = '350px'; 
        
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
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white shrink-0">
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

        {/* Printable Area */}
        <div className="overflow-y-auto bg-white flex-1 p-8">
            <div id="printable-receipt" className="max-w-[300px] mx-auto bg-white">
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

                <div className="dashed-line border-t border-dashed border-slate-400 my-2"></div>

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

                <div className="dashed-line border-t border-dashed border-slate-400 my-2"></div>

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

                <div className="dashed-line border-t border-dashed border-slate-400 my-2"></div>

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

import React, { useState, useRef, useMemo } from 'react';
import { Calendar, Receipt, Search, Trash2, Edit, FileArchive, Loader2, Filter, XCircle } from 'lucide-react';
import { Order, ShopDetails } from '../types';
import { ReceiptModal } from '../components/ReceiptModal';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';

interface HistoryProps {
  orders: Order[];
  onDeleteOrder: (id: string) => Promise<void>;
  onClearOrders: () => Promise<void>;
  onEditOrder: (order: Order) => void;
  shopDetails: ShopDetails;
}

export const History: React.FC<HistoryProps> = ({ orders, onDeleteOrder, onClearOrders, onEditOrder, shopDetails }) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const hiddenReceiptRef = useRef<HTMLDivElement>(null);
  const [activeTempOrder, setActiveTempOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        const orderDate = new Date(order.date);
        
        // Search term filter
        const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (order.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (order.customer?.phone || '').includes(searchTerm);
        
        // Date range filter
        let matchesDate = true;
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && orderDate >= from;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && orderDate <= to;
        }

        return matchesSearch && matchesDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, searchTerm, dateFrom, dateTo]);

  const resetFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this order record?')) {
      await onDeleteOrder(id);
    }
  };

  const handleEdit = (order: Order) => {
      if (window.confirm("Recall this order for editing? \n\nThis will delete the current record and move items back to the Billing screen.")) {
          onEditOrder(order);
      }
  };

  const handleDeleteAll = async () => {
    if (orders.length === 0) return;
    const confirmMessage = "WARNING: This will permanently delete ALL order history. This action cannot be undone.\n\nAre you sure?";
    if (window.confirm(confirmMessage)) {
      await onClearOrders();
    }
  };

  const downloadAllReceiptsZip = async () => {
    if (filteredOrders.length === 0) return;
    setIsZipping(true);
    setZipProgress(0);
    const zip = new JSZip();

    try {
      for (let i = 0; i < filteredOrders.length; i++) {
        const order = filteredOrders[i];
        setZipProgress(i + 1);
        
        setActiveTempOrder(order);
        
        // Small delay to allow DOM to update for each render
        await new Promise(r => setTimeout(r, 150));

        const element = hiddenReceiptRef.current;
        if (element) {
          const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false
          });
          
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            const dateStr = new Date(order.date).toISOString().split('T')[0];
            zip.file(`Receipt_${order.id}_${dateStr}.png`, blob);
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `Filtered_Receipts_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
    } catch (err) {
      console.error("ZIP Generation failed", err);
      alert("Failed to generate ZIP file.");
    } finally {
      setIsZipping(false);
      setActiveTempOrder(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Order History</h2>
          <p className="text-slate-500 mt-1">Found {filteredOrders.length} records matching your search.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <button 
            onClick={downloadAllReceiptsZip}
            disabled={isZipping || filteredOrders.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 font-bold shadow-lg shadow-blue-100"
          >
            {isZipping ? <Loader2 className="animate-spin" size={18} /> : <FileArchive size={18} />}
            {isZipping ? `Archiving (${zipProgress}/${filteredOrders.length})` : 'Download Filtered ZIP'}
          </button>

          <button 
            onClick={handleDeleteAll}
            disabled={orders.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-red-600 rounded-xl hover:bg-red-50 border border-red-100 transition-colors disabled:opacity-50 font-bold"
          >
            <Trash2 size={18} /> Wipe History
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-slate-400 mr-2">
            <Filter size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Filters</span>
        </div>

        <div className="relative flex-grow min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Order ID, Name or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-100 focus:border-blue-500 bg-slate-50/50 text-sm outline-none transition-all"
            />
        </div>

        <div className="flex items-center gap-2 bg-slate-50/50 border border-slate-100 px-3 py-1 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">From</span>
            <input 
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-sm font-medium outline-none text-slate-700"
            />
        </div>

        <div className="flex items-center gap-2 bg-slate-50/50 border border-slate-100 px-3 py-1 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
            <input 
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-sm font-medium outline-none text-slate-700"
            />
        </div>

        {(searchTerm || dateFrom || dateTo) && (
            <button 
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors"
            >
                <XCircle size={14} /> Clear
            </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Total</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                        <Calendar size={32} className="opacity-20" />
                        <span className="text-sm font-medium">No orders match your criteria.</span>
                    </div>
                    </td>
                </tr>
                ) : filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">#{order.id}</td>
                    <td className="px-6 py-4">
                        {order.customer ? (
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-800">{order.customer.name}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{order.customer.phone}</span>
                            </div>
                        ) : (
                            <span className="text-xs italic text-slate-400">Guest Order</span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex flex-col">
                            <span className="font-medium text-slate-800">{new Date(order.date).toLocaleDateString()}</span>
                            <span className="text-[10px] text-slate-400 uppercase">{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-slate-800">₹{order.total.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                        <button 
                            onClick={() => handleEdit(order)}
                            className="p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                            title="Recall/Edit Order"
                        >
                            <Edit size={16} />
                        </button>
                        <button 
                            onClick={() => setSelectedOrder(order)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all"
                        >
                            <Receipt size={14} /> View
                        </button>
                        <button 
                            onClick={() => handleDelete(order.id)}
                            className="p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                            title="Delete Record"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>

      {/* Hidden container for ZIP generation */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none overflow-hidden">
        <div ref={hiddenReceiptRef} className="bg-white p-8 w-[380px]">
          {activeTempOrder && (
            <div className="receipt-content text-black">
               <div className="text-center mb-6">
                  {shopDetails.logo && <div className="flex justify-center mb-3"><img src={shopDetails.logo} alt="Logo" className="h-12 object-contain grayscale" /></div>}
                  <h1 className="text-xl font-bold uppercase tracking-widest">{shopDetails.name}</h1>
                  <p className="text-[10px] whitespace-pre-wrap leading-tight mt-1">{shopDetails.address}</p>
               </div>
               <div className="border-t border-dashed border-slate-900 my-4"></div>
               <div className="text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between"><span>ORDER ID:</span> <b>#{activeTempOrder.id}</b></div>
                  <div className="flex justify-between"><span>DATE:</span> <span>{new Date(activeTempOrder.date).toLocaleString()}</span></div>
                  {activeTempOrder.customer && <div className="flex justify-between"><span>CUST:</span> <span className="uppercase">{activeTempOrder.customer.name}</span></div>}
               </div>
               <div className="border-t border-dashed border-slate-900 my-4"></div>
               <table className="w-full text-xs font-mono">
                  <thead><tr className="border-b border-black"><th className="text-left py-2 uppercase">Item</th><th className="text-center">Qty</th><th className="text-right">Amt</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeTempOrder.items.map((it, idx) => (
                      <tr key={idx}><td className="py-2">{it.name}</td><td className="text-center">{it.qty}</td><td className="text-right">₹{(it.price * it.qty).toFixed(2)}</td></tr>
                    ))}
                  </tbody>
               </table>
               <div className="border-t border-dashed border-slate-900 my-4"></div>
               <div className="text-xs space-y-2 font-mono">
                  <div className="flex justify-between text-base font-black border-t border-black pt-2"><span>TOTAL</span><span>₹{activeTempOrder.total.toFixed(2)}</span></div>
               </div>
               <div className="text-center mt-8 text-[10px] font-mono leading-relaxed">
                  {shopDetails.footerMessage}
                  <div className="mt-4 opacity-30 text-[8px]">DIGITAL ARCHIVE • SMARTPOS</div>
               </div>
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <ReceiptModal 
          order={selectedOrder} 
          shopDetails={shopDetails} 
          onClose={() => setSelectedOrder(null)} 
          autoPrint={false}
        />
      )}

      {/* ZIP Processing Overlay */}
      {isZipping && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95">
             <div className="relative w-24 h-24 mx-auto">
                <svg className="w-full h-full transform -rotate-90">
                    <circle className="text-slate-100" strokeWidth="6" stroke="currentColor" fill="transparent" r="40" cx="48" cy="48" />
                    <circle className="text-blue-600 transition-all duration-300" strokeWidth="6" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * zipProgress / filteredOrders.length)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="48" cy="48" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-black text-blue-600 text-lg">
                   {Math.round((zipProgress / filteredOrders.length) * 100)}%
                </div>
             </div>
             <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Creating Archive</h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                    Processing order <b>{zipProgress}</b> of <b>{filteredOrders.length}</b>. 
                    Converting receipts to high-quality images.
                </p>
             </div>
             <div className="pt-2">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 animate-pulse transition-all duration-300" style={{ width: `${(zipProgress / filteredOrders.length) * 100}%` }}></div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

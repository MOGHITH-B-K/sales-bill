import React, { useState, useRef, useMemo } from 'react';
import { Calendar, Receipt, Search, Trash2, Edit, FileArchive, Loader2, Filter, XCircle, ChevronDown, ChevronUp, RotateCcw, CheckCircle2, Repeat, Clock, ArrowLeftRight, Tag } from 'lucide-react';
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
  onRestoreStock?: (productId: string, qty: number) => Promise<boolean>;
}

export const History: React.FC<HistoryProps> = ({ orders, onDeleteOrder, onClearOrders, onEditOrder, shopDetails, onRestoreStock }) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [restoredItems, setRestoredItems] = useState<Set<string>>(new Set());
  const hiddenReceiptRef = useRef<HTMLDivElement>(null);
  const [activeTempOrder, setActiveTempOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        const orderDate = new Date(order.date);
        const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (order.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (order.customer?.phone || '').includes(searchTerm);
        
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

  const handleReturnItem = async (orderId: string, productId: string, productName: string, qty: number) => {
    if (!onRestoreStock) return;
    const itemKey = `${orderId}-${productId}`;
    if (restoredItems.has(itemKey)) return;

    if (window.confirm(`MARK AS RETURNED: Increase inventory of "${productName}" by ${qty} units?`)) {
      const success = await onRestoreStock(productId, qty);
      if (success) {
        setRestoredItems(prev => new Set(prev).add(itemKey));
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Order & Rental History</h2>
          <p className="text-slate-500 mt-1">Manage sales, track rentals, and process stock returns.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <button onClick={() => filteredOrders.length > 0 && onClearOrders()} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-red-600 rounded-xl hover:bg-red-50 border border-red-100 font-bold disabled:opacity-50">
            <Trash2 size={18} /> Clear Records
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-grow min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search order ID, Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-100 focus:border-blue-500 bg-slate-50/50 text-sm outline-none transition-all" />
        </div>
        <div className="flex gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 outline-none" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 outline-none" />
        </div>
        {(searchTerm || dateFrom || dateTo) && <button onClick={() => {setSearchTerm(''); setDateFrom(''); setDateTo('');}} className="text-slate-400 hover:text-red-500"><XCircle size={20}/></button>}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">View</th>
              <th className="px-6 py-4">Transaction ID</th>
              <th className="px-6 py-4">Customer Info</th>
              <th className="px-6 py-4">Date & Time</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No orders found matching your filters.</td></tr>
            ) : filteredOrders.map(order => {
              const hasRentals = order.items.some(i => i.productType === 'rental');
              return (
                <React.Fragment key={order.id}>
                  <tr className={`hover:bg-slate-50/80 group transition-colors ${expandedOrderId === order.id ? 'bg-slate-50' : ''}`}>
                    <td className="px-6 py-4">
                      <button onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)} className={`p-1.5 rounded-lg border transition-all ${expandedOrderId === order.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600'}`}>
                          {expandedOrderId === order.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                          <span className="text-xs font-black text-blue-600 tracking-tight">#{order.id}</span>
                          {hasRentals && <span className="text-[8px] font-black bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded w-fit mt-1 uppercase">Contains Rentals</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-800">{order.customer?.name || 'Walk-in Guest'}</span>
                    </td>
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                        <div className="flex items-center gap-1.5"><Calendar size={12}/> {new Date(order.date).toLocaleDateString()}</div>
                        <div className="flex items-center gap-1.5 mt-0.5"><Clock size={12}/> {new Date(order.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-800">₹{order.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                          <button onClick={() => setSelectedOrder(order)} className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all">Receipt</button>
                          <button onClick={() => onDeleteOrder(order.id)} className="p-2 text-slate-200 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                  {expandedOrderId === order.id && (
                    <tr className="bg-slate-50/30">
                      <td colSpan={6} className="px-8 py-6">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 max-w-2xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><ArrowLeftRight size={24}/></div>
                                <div>
                                    <h4 className="text-lg font-black text-slate-800 tracking-tight">Return Management</h4>
                                    <p className="text-xs text-slate-400">Mark items as returned to restore inventory levels automatically.</p>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                              {order.items.map((it, idx) => {
                                const isRental = it.productType === 'rental';
                                const itemKey = `${order.id}-${it.id}`;
                                const isRestored = restoredItems.has(itemKey);
                                return (
                                  <div key={idx} className={`flex items-center justify-between p-4 border rounded-2xl transition-all ${isRental ? 'border-orange-100 bg-orange-50/30' : 'border-slate-50 bg-slate-50/50'}`}>
                                    <div className="flex items-center gap-4">
                                       <div className={`p-2 rounded-xl ${isRental ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                                          {isRental ? <Repeat size={18}/> : <Tag size={18}/>}
                                       </div>
                                       <div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-slate-800">{it.name}</span>
                                            <span className="text-xs text-slate-400 font-bold">x {it.qty}</span>
                                          </div>
                                          <div className="text-[10px] font-black uppercase tracking-widest mt-0.5 text-slate-400">
                                            {isRental ? 'Temporary Rental Asset' : 'One-time Sale Item'}
                                          </div>
                                       </div>
                                    </div>
                                    
                                    {isRental && (
                                      <button 
                                        onClick={() => handleReturnItem(order.id, it.id, it.name, it.qty)}
                                        disabled={isRestored}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${isRestored ? 'bg-green-100 text-green-700 cursor-default ring-1 ring-green-200' : 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95'}`}
                                      >
                                        {isRestored ? <CheckCircle2 size={14}/> : <RotateCcw size={14}/>}
                                        {isRestored ? 'Item Restored' : 'Process Return'}
                                      </button>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedOrder && <ReceiptModal order={selectedOrder} shopDetails={shopDetails} onClose={() => setSelectedOrder(null)} autoPrint={false} />}
    </div>
  );
};
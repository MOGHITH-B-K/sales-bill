
import React, { useState, useMemo, useRef } from 'react';
import { Calendar, Search, Trash2, Clock, ChevronDown, ChevronUp, Tag, FileArchive, Loader2, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { Order, ShopDetails } from '../types';
import { ReceiptModal } from '../components/ReceiptModal';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

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
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  // Bulk Download State
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const hiddenReceiptRef = useRef<HTMLDivElement>(null);

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

  const handleExportExcel = () => {
    if (filteredOrders.length === 0) return;

    const data = filteredOrders.map(order => ({
      'Order ID': order.id,
      'Date': new Date(order.date).toLocaleString(),
      'Customer Name': order.customer?.name || 'Walk-in Guest',
      'Customer Phone': order.customer?.phone || '',
      'Customer Location': order.customer?.place || '',
      'Total Amount': order.total,
      'Tax Amount': order.taxTotal,
      'Items Count': order.items.length,
      'Items List': order.items.map(it => `${it.name} (x${it.qty})`).join(', ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, `Order_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadAll = async () => {
    if (filteredOrders.length === 0) return;
    
    setIsDownloadingAll(true);
    setDownloadProgress({ current: 0, total: filteredOrders.length });
    
    const zip = new JSZip();
    const container = hiddenReceiptRef.current;
    if (!container) {
      setIsDownloadingAll(false);
      return;
    }

    try {
      for (let i = 0; i < filteredOrders.length; i++) {
        const order = filteredOrders[i];
        setDownloadProgress({ current: i + 1, total: filteredOrders.length });
        
        // Render order into hidden container
        const subTotal = order.total - (order.taxTotal || 0);
        container.innerHTML = `
          <div style="width: 300px; padding: 20px; background: white; font-family: 'Courier New', monospace; color: black; border: 1px solid #eee;">
            <div style="text-align: center; margin-bottom: 10px;">
              ${shopDetails.showLogo && shopDetails.logo ? `<img src="${shopDetails.logo}" style="height: 50px; margin-bottom: 8px; filter: grayscale(100%);" />` : ''}
              <h1 style="font-size: 18px; margin: 0; text-transform: uppercase;">${shopDetails.name}</h1>
              <p style="font-size: 10px; margin: 4px 0;">${shopDetails.address}</p>
            </div>
            
            <div style="text-align: center; margin: 15px 0; border-top: 1px solid black; border-bottom: 1px solid black; padding: 10px 0;">
                <div style="font-size: 10px; font-weight: bold; text-transform: uppercase;">Order Transaction ID</div>
                <div style="font-size: 20px; font-weight: 900; letter-spacing: 2px;"># ${order.id}</div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span>Date:</span> <span>${new Date(order.date).toLocaleString()}</span>
            </div>
            ${order.customer ? `
              <div style="margin-top: 8px; font-size: 10px; border-top: 1px dashed #ccc; padding-top: 4px;">
                ${order.customer.name ? `<div>Cust: ${order.customer.name}</div>` : ''}
                ${order.customer.phone ? `<div>Ph: ${order.customer.phone}</div>` : ''}
              </div>
            ` : ''}
            <div style="border-top: 1px dashed black; margin: 8px 0;"></div>
            <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid black;">
                  <th style="text-align: left;">Item</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Amt</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td style="padding: 4px 0;">${item.name}</td>
                    <td style="text-align: center;">${item.qty}</td>
                    <td style="text-align: right;">${(item.price * item.qty).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div style="border-top: 1px dashed black; margin: 8px 0;"></div>
            <div style="font-size: 11px;">
              <div style="display: flex; justify-content: space-between;"><span>Subtotal</span> <span>${subTotal.toFixed(2)}</span></div>
              <div style="display: flex; justify-content: space-between;"><span>Tax</span> <span>${order.taxTotal.toFixed(2)}</span></div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 4px; border-top: 1px solid black; padding-top: 4px;">
                <span>TOTAL</span> <span>₹${order.total.toFixed(2)}</span>
              </div>
            </div>
            <div style="margin-top: 15px; text-align: center; font-size: 9px;">
              ${shopDetails.showPaymentQr && shopDetails.paymentQrCode ? `
                 <div style="margin: 10px auto; width: 80px; height: 80px; border: 1px solid black; padding: 5px;">
                    <img src="${shopDetails.paymentQrCode}" style="width: 100%; height: 100%; filter: grayscale(100%);" />
                 </div>
                 <p style="font-weight: bold; margin-bottom: 8px;">SCAN TO PAY</p>
              ` : ''}
              <p>${shopDetails.footerMessage}</p>
              <p style="opacity: 0.5; margin-top: 5px;">${shopDetails.poweredByText || 'Powered by SmartPOS'}</p>
            </div>
          </div>
        `;

        // Small delay to ensure styles apply
        await new Promise(r => setTimeout(r, 50));
        
        const canvas = await html2canvas(container, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true
        });
        
        const imgData = canvas.toDataURL('image/png').split(',')[1];
        zip.file(`Bill_${order.id}_${new Date(order.date).getTime()}.png`, imgData, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `Sales_Bills_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      
    } catch (err) {
      console.error("Bulk download failed:", err);
      alert("Failed to generate ZIP archive.");
    } finally {
      setIsDownloadingAll(false);
      if (container) container.innerHTML = '';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      {/* Hidden container for PNG generation */}
      <div ref={hiddenReceiptRef} style={{ position: 'fixed', left: '-9999px', top: '0' }}></div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Order History</h2>
          <p className="text-slate-500 mt-1">Review past transactions and manage sales records.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <button 
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-100"
          >
            <FileSpreadsheet size={18} />
            Export to Excel
          </button>
          <button 
            onClick={handleDownloadAll}
            disabled={isDownloadingAll || filteredOrders.length === 0}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm ${
              isDownloadingAll 
                ? 'bg-blue-50 text-blue-600 border border-blue-100 cursor-wait' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200'
            }`}
          >
            {isDownloadingAll ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing {downloadProgress.current}/{downloadProgress.total}
              </>
            ) : (
              <>
                <FileArchive size={18} />
                Download All (ZIP)
              </>
            )}
          </button>
          <button 
            onClick={() => filteredOrders.length > 0 && onClearOrders()} 
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-red-600 rounded-xl hover:bg-red-50 border border-red-100 font-bold disabled:opacity-50"
          >
            <Trash2 size={18} /> Clear All Records
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-grow min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search order ID, Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-100 focus:border-blue-500 bg-slate-50/50 text-sm outline-none transition-all" />
        </div>
        <div className="flex gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 outline-none" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 outline-none" />
        </div>
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
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No orders found.</td></tr>
            ) : filteredOrders.map(order => (
                <React.Fragment key={order.id}>
                  <tr className={`hover:bg-slate-50/80 group transition-colors ${expandedOrderId === order.id ? 'bg-slate-50' : ''}`}>
                    <td className="px-6 py-4">
                      <button onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)} className={`p-1.5 rounded-lg border transition-all ${expandedOrderId === order.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600'}`}>
                          {expandedOrderId === order.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-blue-600 tracking-tight">#{order.id}</span>
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
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 max-w-2xl">
                            <h4 className="text-sm font-black text-slate-800 tracking-tight mb-4 flex items-center gap-2"><Tag size={16}/> Itemized List</h4>
                            <div className="space-y-2">
                              {order.items.map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
                                  <div className="flex items-center gap-3">
                                     <span className="text-xs font-black text-slate-800">{it.name}</span>
                                     <span className="text-[10px] text-slate-400 font-bold">x {it.qty}</span>
                                  </div>
                                  <span className="text-xs font-bold text-slate-700">₹{(it.price * it.qty).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
          </tbody>
        </table>
      </div>
      {selectedOrder && <ReceiptModal order={selectedOrder} shopDetails={shopDetails} onClose={() => setSelectedOrder(null)} autoPrint={false} />}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Order, ShopDetails } from '../types';
import { Printer, Calendar, TrendingUp, ShoppingBag, DollarSign } from 'lucide-react';

interface DailyAnalysisProps {
  orders: Order[];
  shopDetails: ShopDetails;
}

export const DailyAnalysis: React.FC<DailyAnalysisProps> = ({ orders, shopDetails }) => {
  // Use local time for the default date to match the user's current day
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    // Offset for local timezone
    return new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  });

  const dailyOrders = useMemo(() => {
    return orders.filter(order => {
      // Order dates are typically stored in ISO (UTC).
      // We need to compare the Local Date representation of the order to the selected local date.
      const orderDate = new Date(order.date);
      const localOrderDate = new Date(orderDate.getTime() - (orderDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      return localOrderDate === selectedDate;
    });
  }, [orders, selectedDate]);

  const stats = useMemo(() => {
    const totalSales = dailyOrders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = dailyOrders.length;
    const avgOrder = orderCount > 0 ? totalSales / orderCount : 0;
    
    // Item Breakdown
    const itemMap = new Map<string, { qty: number, revenue: number }>();
    
    dailyOrders.forEach(order => {
      order.items.forEach(item => {
        // Create unique key for rentals with different durations
        const key = item.rentalDuration ? `${item.name} (${item.rentalDuration})` : item.name;
        
        const existing = itemMap.get(key) || { qty: 0, revenue: 0 };
        itemMap.set(key, {
          qty: existing.qty + item.qty,
          revenue: existing.revenue + (item.price * item.qty) // Excl tax for item breakdown
        });
      });
    });

    const itemBreakdown = Array.from(itemMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    return { totalSales, orderCount, avgOrder, itemBreakdown };
  }, [dailyOrders]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Daily Sales Analysis</h2>
          <p className="text-slate-500 mt-1">Review performance and print End-of-Day (Z) Reports.</p>
        </div>
        <div className="flex gap-4 items-center">
            <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-lg"
            >
                <Printer size={18} /> Print Z-Report
            </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:hidden">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                    <DollarSign size={24} />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-slate-800">₹{stats.totalSales.toFixed(2)}</p>
                </div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <ShoppingBag size={24} />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Total Orders</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.orderCount}</p>
                </div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                    <TrendingUp size={24} />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Avg Order Value</p>
                    <p className="text-2xl font-bold text-slate-800">₹{stats.avgOrder.toFixed(2)}</p>
                </div>
            </div>
        </div>
      </div>

      {/* Item Breakdown Table (Screen View) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
         <div className="p-6 border-b border-slate-100">
             <h3 className="font-bold text-lg text-slate-800">Item Sales Breakdown</h3>
         </div>
         <table className="w-full text-left">
             <thead className="bg-slate-50 border-b border-slate-100">
                 <tr>
                     <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Item Name</th>
                     <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Qty Sold</th>
                     <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Revenue (Excl. Tax)</th>
                 </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                 {stats.itemBreakdown.length === 0 ? (
                     <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">No sales recorded for this date.</td></tr>
                 ) : stats.itemBreakdown.map((item, idx) => (
                     <tr key={idx} className="hover:bg-slate-50">
                         <td className="px-6 py-3 text-sm text-slate-800 font-medium">{item.name}</td>
                         <td className="px-6 py-3 text-sm text-slate-600 text-right">{item.qty}</td>
                         <td className="px-6 py-3 text-sm text-slate-600 text-right">₹{item.revenue.toFixed(2)}</td>
                     </tr>
                 ))}
             </tbody>
         </table>
      </div>

      {/* Print View - Z-Report Structure */}
      <div id="z-report-print" className="hidden print:block font-mono text-black p-0 print-only-section">
         <div className="text-center mb-4">
             {shopDetails.logo && <img src={shopDetails.logo} className="h-12 mx-auto mb-2 grayscale object-contain" />}
             <h1 className="font-bold text-lg uppercase">{shopDetails.name}</h1>
             <p className="text-xs">Z-REPORT (Day End)</p>
             <p className="text-xs">{shopDetails.address}</p>
         </div>

         <div className="border-t border-dashed border-black my-2"></div>
         
         <div className="flex justify-between text-xs mb-1">
             <span>Date:</span>
             <span>{selectedDate}</span>
         </div>
         <div className="flex justify-between text-xs mb-1">
             <span>Printed At:</span>
             <span>{new Date().toLocaleTimeString()}</span>
         </div>

         <div className="border-t border-dashed border-black my-2"></div>

         <div className="mb-2">
             <div className="flex justify-between text-sm font-bold">
                 <span>Total Sales (Gross)</span>
                 <span>₹{stats.totalSales.toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-xs mt-1">
                 <span>Total Orders</span>
                 <span>{stats.orderCount}</span>
             </div>
             <div className="flex justify-between text-xs mt-1">
                 <span>Avg Ticket</span>
                 <span>₹{stats.avgOrder.toFixed(2)}</span>
             </div>
         </div>

         <div className="border-t border-dashed border-black my-2"></div>

         <div className="text-xs font-bold mb-2 uppercase">Category Breakdown</div>
         {/* Simple Item Breakdown for print */}
         <table className="w-full text-xs">
             <thead>
                 <tr>
                     <th className="text-left pb-1">Item</th>
                     <th className="text-right pb-1">Qty</th>
                     <th className="text-right pb-1">Amt</th>
                 </tr>
             </thead>
             <tbody>
                {stats.itemBreakdown.map((item, i) => (
                    <tr key={i}>
                        <td className="pb-1">{item.name.substring(0, 15)}</td>
                        <td className="text-right pb-1">{item.qty}</td>
                        <td className="text-right pb-1">{item.revenue.toFixed(0)}</td>
                    </tr>
                ))}
             </tbody>
         </table>

         <div className="border-t border-dashed border-black my-2"></div>
         <div className="text-center text-xs mt-4">
             *** END OF REPORT ***
         </div>
      </div>

    </div>
  );
};

import React, { useState } from 'react';
import { Calendar, Receipt, Search, Trash2, Edit } from 'lucide-react';
import { Order, ShopDetails } from '../types';
import { ReceiptModal } from '../components/ReceiptModal';

interface HistoryProps {
  orders: Order[];
  onDeleteOrder: (id: string) => Promise<void>;
  onClearOrders: () => Promise<void>;
  onEditOrder: (order: Order) => void; // New prop for Editing/Recalling
  shopDetails: ShopDetails;
}

export const History: React.FC<HistoryProps> = ({ orders, onDeleteOrder, onClearOrders, onEditOrder, shopDetails }) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = orders
    .filter(order => order.id.includes(searchTerm) || order.date.includes(searchTerm))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Order History</h2>
          <p className="text-slate-500 mt-1">View past transactions and manage records.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search Order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            />
          </div>
          
          <button 
            onClick={handleDeleteAll}
            disabled={orders.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border border-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Trash2 size={18} /> Delete All
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Time</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Calendar size={32} className="opacity-20" />
                    <span>No orders found.</span>
                  </div>
                </td>
              </tr>
            ) : filteredOrders.map(order => (
              <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 font-mono text-sm text-slate-600">#{order.id}</td>
                <td className="px-6 py-4 text-sm text-slate-800">{new Date(order.date).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {order.items.length} items ({order.items.map(i => i.name).join(', ').substring(0, 30)}...)
                </td>
                <td className="px-6 py-4 font-bold text-slate-800">₹{order.total.toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                        onClick={() => handleEdit(order)}
                        className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit / Recall Order"
                    >
                        <Edit size={16} />
                    </button>
                    <button 
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors"
                        title="View Receipt"
                    >
                        <Receipt size={16} /> Receipt
                    </button>
                    <button 
                        onClick={() => handleDelete(order.id)}
                        className="inline-flex items-center justify-center p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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

      {selectedOrder && (
        <ReceiptModal 
          order={selectedOrder} 
          shopDetails={shopDetails} 
          onClose={() => setSelectedOrder(null)} 
          autoPrint={false}
        />
      )}
    </div>
  );
};

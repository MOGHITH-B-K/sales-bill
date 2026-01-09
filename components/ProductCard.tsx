import React from 'react';
import { Plus } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAdd }) => {
  return (
    <div 
      onClick={() => onAdd(product)}
      className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 cursor-pointer transition-all hover:shadow-md hover:border-blue-200 group flex flex-col h-full overflow-hidden"
    >
      <div className="relative mb-3 h-32 -mx-4 -mt-4 bg-slate-100 flex items-center justify-center overflow-hidden">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
            {product.name.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-slate-700 shadow-sm">
          ₹{product.price.toFixed(2)}
        </div>
      </div>

      <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors truncate">{product.name}</h3>
      <p className="text-xs text-slate-500 line-clamp-2 mb-3 flex-grow">
        {product.description || 'No description available.'}
      </p>
      
      <button className="w-full mt-auto py-2 bg-slate-50 text-slate-600 text-xs font-medium rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center gap-1">
        <Plus size={14} /> Add to Bill
      </button>
    </div>
  );
};

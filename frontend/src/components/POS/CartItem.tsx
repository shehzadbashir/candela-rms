import { HiMinus, HiPlus, HiTrash } from 'react-icons/hi';

interface CartItemProps {
  item: {
    id: string;
    productId: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
  };
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1) {
      onUpdateQuantity(item.productId, newQuantity);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Rs. {item.price.toLocaleString()} x {item.quantity}
        </p>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
          <button
            onClick={() => handleQuantityChange(item.quantity - 1)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-l-lg"
          >
            <HiMinus className="h-4 w-4" />
          </button>
          <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
          <button
            onClick={() => handleQuantityChange(item.quantity + 1)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-r-lg"
          >
            <HiPlus className="h-4 w-4" />
          </button>
        </div>
        
        <div className="text-right min-w-[80px]">
          <p className="font-bold text-primary-600 dark:text-primary-400">
            Rs. {item.total.toLocaleString()}
          </p>
        </div>

        <button
          onClick={() => onRemove(item.productId)}
          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
        >
          <HiTrash className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
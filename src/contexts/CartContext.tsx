import { createContext, useContext, useState, ReactNode } from "react";

export interface SelectedOption {
  optionId: string;
  optionName: string;
  items: {
    itemId: string;
    itemName: string;
    itemPrice: number;
  }[];
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  observations?: string;
  image_url?: string;
  selectedOptions?: SelectedOption[];
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateObservations: (id: string, observations: string) => void;
  clearCart: () => void;
  deliveryFee: number;
  setDeliveryFee: (fee: number) => void;
  couponDiscount: number;
  setCouponDiscount: (discount: number) => void;
  appliedCouponId: string | null;
  setAppliedCouponId: (id: string | null) => void;
  appliedCouponCode: string | null;
  setAppliedCouponCode: (code: string | null) => void;
  total: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);

  const addItem = (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    setItems((prev) => {
      // Check if same item with same options exists
      const existing = prev.find((i) => {
        if (i.id !== item.id) return false;
        
        // Compare selected options
        const iOptions = i.selectedOptions || [];
        const itemOptions = item.selectedOptions || [];
        
        if (iOptions.length !== itemOptions.length) return false;
        
        return iOptions.every(iOpt => {
          const matchingOpt = itemOptions.find(io => io.optionId === iOpt.optionId);
          if (!matchingOpt) return false;
          
          if (iOpt.items.length !== matchingOpt.items.length) return false;
          
          return iOpt.items.every(iItem => 
            matchingOpt.items.some(mItem => mItem.itemId === iItem.itemId)
          );
        });
      });
      
      if (existing) {
        return prev.map((i) =>
          i === existing
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  };

  const updateObservations = (id: string, observations: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, observations } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setDeliveryFee(0);
    setCouponDiscount(0);
    setAppliedCouponId(null);
    setAppliedCouponCode(null);
  };

  const calculateItemTotal = (item: CartItem) => {
    let itemTotal = item.price;
    if (item.selectedOptions) {
      item.selectedOptions.forEach(option => {
        option.items.forEach(optItem => {
          itemTotal += optItem.itemPrice;
        });
      });
    }
    return itemTotal * item.quantity;
  };

  const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const total = Math.max(0, subtotal - couponDiscount + deliveryFee);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateObservations,
        clearCart,
        deliveryFee,
        setDeliveryFee,
        couponDiscount,
        setCouponDiscount,
        appliedCouponId,
        setAppliedCouponId,
        appliedCouponCode,
        setAppliedCouponCode,
        total,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type CartItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
};

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  updateItemQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clearCart: () => void;
  cartItemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>(() => {
        const storedCart = localStorage.getItem('cart');
        return storedCart ? JSON.parse(storedCart) : [];
      });
    
      useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cartItems));
      }, [cartItems]);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.menuItemId === item.menuItemId);

      if (existingItem) {
        return prevItems.map((i) =>
          i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        return [...prevItems, { ...item, quantity: 1 }];
      }
    });
  };

  const updateItemQuantity = (menuItemId: string, quantity: number) => {
    setCartItems((prevItems) => {
      if (quantity <= 0) {
        // If quantity is 0 or less, remove the item
        return prevItems.filter((item) => item.menuItemId !== menuItemId);
      }
      return prevItems.map((item) =>
        item.menuItemId === menuItemId ? { ...item, quantity } : item
      );
    });
  };

  const removeItem = (menuItemId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.menuItemId !== menuItemId));
  };

  const clearCart = () => setCartItems([]);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider 
    value={{ 
      cartItems, 
      addToCart, 
      updateItemQuantity,
      removeItem,
      clearCart,
      cartItemCount, }}>
      {children}
    </CartContext.Provider>
  );
};

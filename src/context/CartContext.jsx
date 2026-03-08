/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [cart, setCart] = useState([]);

    // Load user-specific cart when currentUser changes
    useEffect(() => {
        if (currentUser) {
            try {
                const savedCart = localStorage.getItem(`medxpress_cart_${currentUser.uid}`);
                if (savedCart) {
                    const parsed = JSON.parse(savedCart);
                    setCart(Array.isArray(parsed) ? parsed : []);
                } else {
                    setCart([]);
                }
            } catch (err) {
                console.error("Failed to parse cart:", err);
                setCart([]);
            }
        } else {
            // Clear cart state on logout
            setCart([]);
        }
    }, [currentUser]);

    // Save user-specific cart whenever it changes
    useEffect(() => {
        if (currentUser && cart.length > 0) {
            localStorage.setItem(`medxpress_cart_${currentUser.uid}`, JSON.stringify(cart));
        } else if (currentUser && cart.length === 0) {
            localStorage.removeItem(`medxpress_cart_${currentUser.uid}`);
        }
    }, [cart, currentUser]);

    const addToCart = (medicine) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.medicineId === medicine.id);
            if (existingItem) {
                return prevCart.map(item =>
                    item.medicineId === medicine.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prevCart, {
                medicineId: medicine.id,
                name: medicine.name,
                price: medicine.price,
                imageURL: medicine.imageURL,
                quantity: 1,
                pharmacyId: medicine.pharmacyId,
                category: medicine.category,
                stock: medicine.stock
            }];
        });
    };

    const updateQuantity = (medicineId, delta) => {
        setCart(prevCart => {
            return prevCart.map(item => {
                if (item.medicineId === medicineId) {
                    const newQuantity = item.quantity + delta;
                    if (newQuantity <= 0) return null;
                    return { ...item, quantity: newQuantity };
                }
                return item;
            }).filter(Boolean);
        });
    };

    const removeFromCart = (medicineId) => {
        setCart(prevCart => prevCart.filter(item => item.medicineId !== medicineId));
    };

    const clearCart = () => {
        setCart([]);
    };

    const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            updateQuantity,
            removeFromCart,
            clearCart,
            cartTotal,
            cartCount
        }}>
            {children}
        </CartContext.Provider>
    );
};

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ShoppingBag, X } from 'lucide-react';

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
    const [pendingReplaceItem, setPendingReplaceItem] = useState(null);

    // Load user-specific cart when currentUser changes
    useEffect(() => {
        if (currentUser) {
            try {
                const savedCart = localStorage.getItem(`medxpress_cart_${currentUser.uid}`);
                if (savedCart) {
                    const parsed = JSON.parse(savedCart);
                    // eslint-disable-next-line react-hooks/set-state-in-effect
                    setCart(Array.isArray(parsed) ? parsed : []);
                } else {

                    setCart(prev => prev.length > 0 ? [] : prev);
                }
            } catch (err) {
                console.error("Failed to parse cart:", err);

                setCart(prev => prev.length > 0 ? [] : prev);
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
        if (cart.length > 0) {
            const currentPharmacyId = cart[0].pharmacyId;
            if (currentPharmacyId && medicine.pharmacyId && currentPharmacyId !== medicine.pharmacyId) {
                setPendingReplaceItem(medicine);
                return;
            }
        }

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

    const confirmReplaceCart = () => {
        if (!pendingReplaceItem) return;
        setCart([{
            medicineId: pendingReplaceItem.id,
            name: pendingReplaceItem.name,
            price: pendingReplaceItem.price,
            imageURL: pendingReplaceItem.imageURL,
            quantity: 1,
            pharmacyId: pendingReplaceItem.pharmacyId,
            category: pendingReplaceItem.category,
            stock: pendingReplaceItem.stock
        }]);
        setPendingReplaceItem(null);
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
            
            {/* Custom Bottom Toast / Modal for replacing cart */}
            <AnimatePresence>
                {pendingReplaceItem && (
                    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 sm:p-0">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPendingReplaceItem(null)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
                        />
                        
                        {/* Modal Content */}
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="bg-white w-full max-w-md rounded-[2rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden z-10 mb-4 sm:mb-0"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -z-0" />
                            <button 
                                onClick={() => setPendingReplaceItem(null)}
                                className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all z-10"
                            >
                                <X size={20} />
                            </button>
                            
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-orange-100">
                                    <AlertCircle size={32} />
                                </div>
                                <h2 className="text-2xl font-black text-gray-800 mb-2">Replace tray items?</h2>
                                <p className="text-gray-500 font-medium mb-8 text-sm sm:text-base leading-relaxed">
                                    Your tray contains items from a different pharmacy. Do you want to clear your current tray and add <span className="text-gray-800 font-bold">{pendingReplaceItem.name}</span> instead?
                                </p>
                                
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => setPendingReplaceItem(null)}
                                        className="flex-1 py-4 px-6 bg-gray-50 text-gray-700 font-bold rounded-2xl hover:bg-gray-100 active:scale-95 transition-all text-sm sm:text-base"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmReplaceCart}
                                        className="flex-1 py-4 px-6 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                                    >
                                        <ShoppingBag size={20} />
                                        Replace Tray
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </CartContext.Provider>
    );
};

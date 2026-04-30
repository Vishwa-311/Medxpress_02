import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Truck, Package, MapPin, Phone, CheckCircle2, Clock, ArrowLeft, Loader2, AlertCircle, User, XCircle, Timer, Star, Siren, Pill } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OrderTracking = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [timeLeft, setTimeLeft] = useState(0);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [pharmacyRating, setPharmacyRating] = useState(0);
    const [riderRating, setRiderRating] = useState(0);
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);

    useEffect(() => {
        if (!orderId) return;

        const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
            if (docSnap.exists()) {
                setOrder({ id: docSnap.id, ...docSnap.data() });
            } else {
                setError('Order not found');
            }
            setLoading(false);
        }, (err) => {
            console.error('Error tracking order:', err);
            setError('Failed to load order tracking');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [orderId]);

    useEffect(() => {
        if (!order || order.orderStatus !== 'pending') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTimeLeft(prev => prev !== 0 ? 0 : prev);
            return;
        }

        // Calculate 5 minutes from order creation
        const createdMillis = order.createdAt?.toMillis ? order.createdAt.toMillis() : (order.createdAt?.seconds * 1000) || Date.now();
        const expiryTime = createdMillis + (5 * 60 * 1000);

        const calculateTime = () => Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
        setTimeLeft(calculateTime());

        const interval = setInterval(() => {
            const remaining = calculateTime();
            setTimeLeft(remaining);
            if (remaining <= 0) clearInterval(interval);
        }, 1000);

        return () => clearInterval(interval);
    }, [order]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
                <Loader2 className="animate-spin text-[#2e7d32] mb-4" size={48} />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Locating order...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
                <div className="bg-red-50 text-red-600 p-6 rounded-[2rem] border border-red-100 flex flex-col items-center gap-4 max-w-md text-center">
                    <AlertCircle size={48} />
                    <div>
                        <h2 className="text-xl font-black mb-2">Oops!</h2>
                        <p className="font-bold">{error || 'Something went wrong'}</p>
                    </div>
                    <button
                        onClick={() => navigate('/customer-dashboard')}
                        className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl font-bold"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }


    const handleCancelOrder = async () => {
        try {
            const orderRef = doc(db, 'orders', order.id);
            await updateDoc(orderRef, {
                orderStatus: 'cancelled',
                deliveryStatus: 'cancelled',
                cancelledAt: serverTimestamp()
            });
            setShowCancelModal(false);
        } catch (err) {
            console.error("Cancel failed:", err);
            alert("Failed to cancel order.");
        }
    };

    const handleSubmitRating = async () => {
        if (pharmacyRating === 0 || (order.riderId && riderRating === 0)) {
            alert("Please provide ratings for both.");
            return;
        }

        setIsSubmittingRating(true);
        try {
            const orderRef = doc(db, 'orders', order.id);
            await updateDoc(orderRef, {
                pharmacyRating,
                riderRating,
                ratingCompleted: true,
                ratedAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Rating failed:", err);
            alert("Failed to submit rating.");
        } finally {
            setIsSubmittingRating(false);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const statusSteps = [
        { id: 'pending', label: 'Order Placed', icon: <Package size={20} />, time: 'Waiting for Confirmation' },
        { id: 'confirmed', label: 'Order Confirmed', icon: <CheckCircle2 size={20} />, time: 'Preparing' },
        { id: 'assigned', label: 'Rider Assigned', icon: <User size={20} />, time: 'Heading to Pharmacy' },
        { id: 'pickedUp', label: 'Picked Up', icon: <Package size={20} />, time: 'Rider at Pharmacy' },
        { id: 'outForDelivery', label: 'Out for Delivery', icon: <Truck size={20} />, time: 'On the way' },
        { id: 'delivered', label: 'Delivered', icon: <CheckCircle2 size={20} />, time: 'Completed' },
    ];

    // Map internal deliveryStatus to steps
    const getActiveStepIndex = () => {
        if (order.orderStatus === 'pending') return 0;
        if (order.orderStatus === 'confirmed' || order.orderStatus === 'outForDelivery') {
            const ds = order.deliveryStatus;
            if (!ds || ds === 'unassigned') return 1;
            if (ds === 'assigned') return 2;
            if (ds === 'pickedUp') return 3;
            if (ds === 'outForDelivery') return 4;
        }
        if (order.orderStatus === 'completed' || order.orderStatus === 'delivered') return 5;
        return 0;
    };

    const currentStepIndex = getActiveStepIndex();

    return (
        <div className="max-w-4xl mx-auto px-4 py-10 md:py-16">
            <button
                onClick={() => navigate('/customer-dashboard')}
                className="flex items-center gap-2 text-[#2e7d32] font-bold mb-10 hover:opacity-70 transition-opacity group"
            >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                Back to Dashboard
            </button>

            <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden mb-10">
                {/* Header */}
                <div className={`${order.orderStatus === 'cancelled' ? 'bg-red-600' : 'bg-[#2e7d32]'} p-8 md:p-12 text-white transition-colors`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <p className={`${order.orderStatus === 'cancelled' ? 'text-red-200' : 'text-green-100'} font-black uppercase tracking-widest text-xs mb-2 transition-colors`}>Order Tracking</p>
                            <h1 className="text-3xl font-black">#{order.id.slice(-8).toUpperCase()}</h1>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20">
                            <p className={`${order.orderStatus === 'cancelled' ? 'text-red-200' : 'text-green-100'} text-xs font-bold uppercase tracking-widest mb-1 transition-colors`}>Status</p>
                            <p className="font-black text-xl capitalize">
                                {order.isPricingPending && order.pharmacyId !== 'broadcast' ? 'Pricing in Progress' : 
                                 order.pharmacyId === 'broadcast' ? 'Searching for nearby Pharmacies...' :
                                 (order.orderStatus === 'pending' ? 'Order Placed' : order.orderStatus)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Cancelled Banner */}
                {order.orderStatus === 'cancelled' && (
                    <div className="bg-red-50 p-8 border-b border-red-100 flex flex-col items-center justify-center text-center">
                        <XCircle size={48} className="text-red-500 mb-4" />
                        <h2 className="text-red-600 font-black text-2xl">Order Cancelled</h2>
                        <p className="text-red-500 font-bold mt-2">This order has been cancelled and will not be delivered.</p>
                    </div>
                )}

                {/* Progress Bar */}
                {order.orderStatus !== 'cancelled' && (
                    <div className="p-8 md:p-12 border-b border-gray-50">
                        {order.pharmacyId === 'broadcast' ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-[#2e7d32]/20 rounded-full animate-ping" />
                                    <div className="relative w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-[#2e7d32]">
                                        <Siren size={40} className="animate-pulse" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-black text-gray-800">Broadcasting Emergency</h3>
                                    <p className="text-gray-500 font-bold max-w-xs mt-1">Alerting all pharmacies within 10km. Please stay on this screen.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative flex justify-between">
                                {/* Line Background */}
                                <div className="absolute top-5 left-0 w-full h-1 bg-gray-100 -z-0" />
                                {/* Line Foreground */}
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
                                    className="absolute top-5 left-0 h-1 bg-[#2e7d32] -z-0"
                                />

                                {statusSteps.map((step, index) => {
                                    const isCompleted = index <= currentStepIndex;
                                    const isActive = index === currentStepIndex;

                                    return (
                                        <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${isCompleted ? 'bg-white border-[#2e7d32] text-[#2e7d32]' : 'bg-white border-gray-100 text-gray-300'
                                                } ${isActive ? 'scale-125 shadow-lg shadow-green-900/10' : ''}`}>
                                                {step.icon}
                                            </div>
                                            <div className="text-center">
                                                <p className={`text-[10px] md:text-xs font-black uppercase tracking-tight ${isCompleted ? 'text-gray-800' : 'text-gray-300'}`}>
                                                    {step.label}
                                                </p>
                                                {isActive && <p className="text-[9px] font-bold text-[#2e7d32]">{step.time}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-8 md:p-12 border-r border-gray-50 space-y-8">
                        <div>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <MapPin size={16} className="text-[#2e7d32]" /> Delivery Address
                            </h3>
                            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                                <p className="font-bold text-gray-800 leading-relaxed">
                                    {order.customerInfo?.name || 'Customer'}<br />
                                    {order.selectedAddress?.addressLine || order.selectedAddress?.address || order.customerInfo?.address || order.deliveryAddress?.address}
                                </p>
                                <p className="text-gray-500 font-medium mt-1">
                                    {order.customerInfo?.city || order.deliveryAddress?.city} - {order.customerInfo?.pincode || order.deliveryAddress?.pincode}
                                </p>
                                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 text-gray-800 font-bold">
                                    <Phone size={14} className="text-[#2e7d32]" />
                                    {order.customerInfo?.phone || order.deliveryAddress?.phone}
                                </div>
                            </div>
                        </div>

                        {/* Rider Card - shown when assigned */}
                        {order.riderName && order.orderStatus !== 'cancelled' && (
                            <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex flex-col gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                                        <Truck className="text-blue-600" size={22} />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">Your Delivery Rider</p>
                                        <p className="font-black text-gray-900">{order.riderName}</p>
                                        <a href={`tel:${order.riderPhone}`} className="text-sm font-bold text-blue-600 flex items-center gap-1 mt-0.5 hover:underline">
                                            <Phone size={12} /> {order.riderPhone || 'N/A'}
                                        </a>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${order.deliveryStatus === 'assigned' ? 'bg-blue-100 text-blue-700' :
                                        order.deliveryStatus === 'pickedUp' ? 'bg-orange-100 text-orange-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                        {order.deliveryStatus === 'assigned' ? 'Heading to pickup' :
                                            order.deliveryStatus === 'pickedUp' ? 'Headed to you!' :
                                                'Out for delivery!'}
                                    </div>
                                </div>
                                
                                {/* Final Price Confirmation Message */}
                                {!order.isPricingPending && (
                                    <motion.div 
                                        initial={{ scale: 0.95, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm"
                                    >
                                        <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <Siren size={14} /> Final Bill Confirmation
                                        </p>
                                        <p className="text-sm font-bold text-gray-700">
                                            👉 Your final bill is <span className="text-lg font-black text-[#2e7d32]">₹{order.totalAmount}</span>. 
                                            Please pay this amount to the rider at the time of delivery.
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* Estimated Delivery Time */}
                        {order.orderStatus !== 'cancelled' && order.orderStatus !== 'delivered' && order.orderStatus !== 'completed' && (
                            <div className="bg-green-50 p-6 rounded-[2rem] border border-green-100 flex items-start gap-4 shadow-sm relative overflow-hidden">
                                <Clock className="text-[#2e7d32] mt-1 shrink-0 relative z-10" size={24} />
                                <div className="relative z-10">
                                    <h4 className="font-black text-green-800 text-sm">Estimated Delivery</h4>
                                    <p className="text-green-700 text-xs font-bold leading-relaxed mt-1">
                                        Typically arrives under <span className="font-black">10 to 15 minutes</span>.
                                    </p>
                                </div>
                                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-green-500/10 to-transparent -z-0 pointer-events-none" />
                            </div>
                        )}

                        {/* Cancel Order Feature */}
                        {order.orderStatus === 'pending' && timeLeft > 0 && (
                            <div className="bg-red-50 p-8 rounded-[2.5rem] border-2 border-red-100 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg shadow-red-900/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/50 rounded-bl-full -z-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-500 shrink-0">
                                        <Timer size={24} className="animate-pulse" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-red-800 text-lg">Change of mind?</h4>
                                        <p className="text-red-600 font-bold mt-1">
                                            You can cancel this order within the next <span className="bg-red-100 px-2 py-0.5 rounded text-red-700 font-black">{formatTime(timeLeft)}</span>
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowCancelModal(true)}
                                    className="px-8 py-4 bg-red-600 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl hover:bg-red-700 active:scale-95 transition-all shadow-xl shadow-red-900/20 flex-shrink-0 relative z-10"
                                >
                                    Cancel Order Now
                                </button>
                            </div>
                        )}

                        {/* Rating Section - Shown after delivery */}
                        {(order.orderStatus === 'delivered' || order.orderStatus === 'completed') && (
                            <div className="bg-green-50 p-8 rounded-[2.5rem] border-2 border-green-100 shadow-lg shadow-green-900/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-100/50 rounded-bl-full -z-0" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 bg-[#2e7d32] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-900/20">
                                            <Star size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-green-900">How was your experience?</h3>
                                            <p className="text-green-700 font-bold text-sm">Rate the pharmacy and the rider</p>
                                        </div>
                                    </div>

                                    {order.ratingCompleted ? (
                                        <div className="space-y-4">
                                            <div className="bg-white/60 p-4 rounded-2xl border border-green-200">
                                                <p className="text-xs font-black text-green-800 uppercase tracking-widest mb-3">Your Ratings</p>
                                                <div className="flex flex-wrap gap-6">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-bold text-gray-500">Pharmacy</span>
                                                        <div className="flex gap-1">
                                                            {[1, 2, 3, 4, 5].map((s) => (
                                                                <Star key={s} size={16} className={s <= order.pharmacyRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {order.riderId && (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs font-bold text-gray-500">Rider</span>
                                                            <div className="flex gap-1">
                                                                {[1, 2, 3, 4, 5].map((s) => (
                                                                    <Star key={s} size={16} className={s <= order.riderRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-center text-green-700 font-black italic text-sm">Thank you for your feedback! It helps us improve.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {/* Pharmacy Rating */}
                                            <div>
                                                <p className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                                                    Rate the Pharmacy
                                                    <span className="text-[10px] bg-green-100 text-[#2e7d32] px-2 py-0.5 rounded-full">Medicines & Service</span>
                                                </p>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            onClick={() => setPharmacyRating(star)}
                                                            className={`p-1.5 transition-all active:scale-90 ${pharmacyRating >= star ? 'text-yellow-400' : 'text-gray-200'}`}
                                                        >
                                                            <Star size={32} fill={pharmacyRating >= star ? 'currentColor' : 'none'} strokeWidth={2.5} />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Rider Rating */}
                                            {order.riderId && (
                                                <div>
                                                    <p className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                                                        Rate the Rider
                                                        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Delivery & Conduct</span>
                                                    </p>
                                                    <div className="flex gap-2">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <button
                                                                key={star}
                                                                onClick={() => setRiderRating(star)}
                                                                className={`p-1.5 transition-all active:scale-90 ${riderRating >= star ? 'text-yellow-400' : 'text-gray-200'}`}
                                                            >
                                                                <Star size={32} fill={riderRating >= star ? 'currentColor' : 'none'} strokeWidth={2.5} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={handleSubmitRating}
                                                disabled={isSubmittingRating || pharmacyRating === 0 || (order.riderId && riderRating === 0)}
                                                className="w-full py-4 bg-[#2e7d32] text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl hover:bg-[#1b5e20] active:scale-95 transition-all shadow-xl shadow-green-900/20 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                                            >
                                                {isSubmittingRating ? <Loader2 className="animate-spin" size={20} /> : "Submit Feedback"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="bg-yellow-50 p-6 rounded-[2rem] border border-yellow-100 flex items-start gap-4">
                            <Truck className="text-yellow-600 mt-1 shrink-0" size={24} />
                            <div>
                                <h4 className="font-black text-yellow-800 text-sm">Delivery Note</h4>
                                <p className="text-yellow-700 text-xs font-bold leading-relaxed mt-1">
                                    Our delivery partner will call you once they reach your location. Please keep your phone reachable.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 md:p-12 bg-gray-50/30">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Order Details</h3>
                    <div className="space-y-4 mb-8">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center">
                                        {item.imageURL ? (
                                            <img src={item.imageURL} alt="" className="w-full h-full object-contain" />
                                        ) : (
                                            <Pill size={20} className="text-gray-300" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold">
                                            {item.quantity} x {order.isPricingPending ? '?' : `₹${item.price}`}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-sm font-black ${order.isPricingPending ? 'text-orange-500 italic' : 'text-gray-800'}`}>
                                    {order.isPricingPending ? 'Pricing...' : `₹${item.price * item.quantity}`}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3 pt-6 border-t border-gray-200">
                        <div className="flex justify-between text-xs font-bold text-gray-400">
                            <span>Medicines Total</span>
                            <span>{order.isPricingPending ? 'TBD' : `₹${order.totalAmount - (order.baseCharges || 2)}`}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-gray-400">
                            <span>Delivery & {order.isEmergency ? 'Emergency' : 'Handling'} Fee</span>
                            <span>₹{order.baseCharges || 2}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-800 font-black text-xl pt-2">
                            <span>{order.isPricingPending ? 'Estimated Total' : 'Final Amount'}</span>
                            <span className={order.isPricingPending ? 'text-orange-500' : 'text-[#2e7d32]'}>
                                ₹{order.totalAmount}
                            </span>
                        </div>
                        <div className="mt-4 bg-green-50 text-[#2e7d32] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest inline-block border border-green-100">
                            {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paid Online'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Interactive Cancel Modal */}
            <AnimatePresence>
                {showCancelModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowCancelModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-sm w-full shadow-2xl relative overflow-hidden text-center"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                                <XCircle size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 mb-2">Cancel Order?</h2>
                            <p className="text-gray-500 font-bold leading-relaxed mb-8">
                                Are you absolutely sure you want to cancel this order? This action cannot be undone.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleCancelOrder}
                                    className="w-full py-4 bg-red-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-600/20"
                                >
                                    Yes, Cancel Order
                                </button>
                                <button
                                    onClick={() => setShowCancelModal(false)}
                                    className="w-full py-4 bg-gray-50 text-gray-800 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-gray-100 active:scale-95 transition-all"
                                >
                                    Nevermind
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OrderTracking;

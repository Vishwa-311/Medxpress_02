import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Truck, Package, MapPin, Phone, CheckCircle2, Clock, ArrowLeft, Loader2, AlertCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';

const OrderTracking = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                <div className="bg-[#2e7d32] p-8 md:p-12 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <p className="text-green-100 font-black uppercase tracking-widest text-xs mb-2">Order Tracking</p>
                            <h1 className="text-3xl font-black">#{order.id.slice(-8).toUpperCase()}</h1>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20">
                            <p className="text-green-100 text-xs font-bold uppercase tracking-widest mb-1">Status</p>
                            <p className="font-black text-xl capitalize">{order.orderStatus === 'pending' ? 'Order Placed' : order.orderStatus}</p>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="p-8 md:p-12 border-b border-gray-50">
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
                </div>

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
                        {order.riderName && (
                            <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-center gap-4">
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
                                    {order.deliveryStatus === 'assigned' ? 'On the way to pickup' :
                                        order.deliveryStatus === 'pickedUp' ? 'Headed to you!' :
                                            'Out for delivery!'}
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
                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                                        <img src={item.imageURL} alt="" className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold">{item.quantity} x ₹{item.price}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-gray-800">₹{item.price * item.quantity}</span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3 pt-6 border-t border-gray-200">
                        <div className="flex justify-between text-xs font-bold text-gray-400">
                            <span>Subtotal</span>
                            <span>₹{order.totalAmount - 2}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-gray-400">
                            <span>Handling & Delivery</span>
                            <span>₹2</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-800 font-black text-xl pt-2">
                            <span>Total Paid</span>
                            <span>₹{order.totalAmount}</span>
                        </div>
                        <div className="mt-4 bg-green-50 text-[#2e7d32] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest inline-block border border-green-100">
                            {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderTracking;

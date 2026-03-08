import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { MapPin, Phone, User, Package, CheckCircle2, ArrowLeft, Loader2, Navigation, ExternalLink, ShieldCheck } from 'lucide-react';

const RiderDelivery = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (snapshot) => {
            if (snapshot.exists()) {
                setOrder(snapshot.data());
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [orderId]);

    const handleOutForDelivery = async () => {
        try {
            setCompleting(true);
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
                deliveryStatus: "outForDelivery"
            });
        } catch (error) {
            console.error("Error updating to out for delivery:", error);
            alert("Failed to update status.");
        } finally {
            setCompleting(false);
        }
    };

    const handleCompleteDelivery = async () => {
        try {
            setCompleting(true);
            const orderRef = doc(db, 'orders', orderId);

            await updateDoc(orderRef, {
                orderStatus: "completed",
                deliveryStatus: "delivered",
                deliveredAt: serverTimestamp(),
                paymentStatus: "paid"
            });

            alert("Delivery completed!");
            navigate('/rider-dashboard');
        } catch (error) {
            console.error("Error completing delivery:", error);
            alert("Failed to complete delivery.");
        } finally {
            setCompleting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8faf8]">
                <Loader2 className="animate-spin text-[#2e7d32]" size={40} />
                <p className="text-gray-500 font-black uppercase tracking-widest text-sm">Loading delivery details...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f8faf8]">
                <h2 className="text-2xl font-black text-gray-800 mb-4">Order Not Found</h2>
                <button
                    onClick={() => navigate('/rider-dashboard')}
                    className="bg-[#2e7d32] text-white px-8 py-3 rounded-xl font-bold"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f3f7f3] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate('/rider-dashboard')}
                        className="flex items-center gap-2 text-[#2e7d32] font-black group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        Rider Dashboard
                    </button>
                    <div className="px-5 py-2 bg-white rounded-full border border-green-100 shadow-sm flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-black text-blue-500 uppercase tracking-widest">Delivery in Progress</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Info */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Status Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-bl-full"></div>
                            <div className="relative z-10">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-gray-400">Current Phase</h3>
                                <h2 className="text-3xl font-black italic tracking-tighter mb-6 text-white">
                                    {order.deliveryStatus === 'outForDelivery' ? "Final Approach" : "Deliver to Customer"}
                                </h2>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#2e7d32] rounded-full transition-all duration-500"
                                            style={{ width: order.deliveryStatus === 'outForDelivery' ? '85%' : '65%' }}
                                        ></div>
                                    </div>
                                    <span className="text-xs font-black text-[#2e7d32]">
                                        {order.deliveryStatus === 'outForDelivery' ? "Almost There" : "In Transit"}
                                    </span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Customer Destination Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-4 mb-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                        <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Customer Details</p>
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{order.customerInfo?.name}</h2>
                                    <p className="text-[#2e7d32] font-bold text-sm">₹{order.totalAmount} to be collected via {order.paymentMethod}</p>
                                </div>
                                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                                    <User size={24} />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-[1.5rem]">
                                    <MapPin className="text-gray-400 mt-1" size={20} />
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black border border-gray-200 bg-white px-2 py-0.5 rounded-md uppercase text-gray-400">{order.selectedAddress?.label}</span>
                                        </div>
                                        <p className="font-black text-gray-800 leading-tight mb-2">{order.selectedAddress?.addressLine}</p>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4">
                                            {order.selectedAddress?.city} - {order.selectedAddress?.pincode}
                                        </p>

                                        <div className="flex flex-wrap gap-3">
                                            {order.selectedAddress?.latitude && (
                                                <a
                                                    href={`https://www.google.com/maps?q=${order.selectedAddress.latitude},${order.selectedAddress.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-900/10"
                                                >
                                                    <Navigation size={14} /> Open Maps
                                                </a>
                                            )}
                                            <a
                                                href={`tel:${order.customerInfo?.phone}`}
                                                className="inline-flex items-center gap-2 px-6 py-2 bg-white border border-gray-200 rounded-full text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm"
                                            >
                                                <Phone size={14} /> Contact Customer
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Security Banner */}
                                <div className="p-5 bg-green-50 rounded-[1.5rem] border border-green-100 flex items-start gap-4">
                                    <ShieldCheck className="text-[#2e7d32] shrink-0" size={24} />
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-[#2e7d32] uppercase tracking-widest">Verify Identity</p>
                                        <p className="text-xs text-green-700/70 font-bold leading-relaxed">Ensure you hand over the medicines to the correct person. Ask for the customer name if necessary.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Sidebar: Order Summary */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                            <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                                <Package className="text-[#2e7d32]" size={20} />
                                Package Details
                            </h3>
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {order.items?.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="w-10 h-10 bg-white rounded-xl p-1 shrink-0">
                                            <img src={item.imageURL} alt="" className="w-full h-full object-contain" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-gray-800 truncate">{item.name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Qty: {item.quantity}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 pt-6 border-t border-gray-100 italic font-black text-right text-[#2e7d32] text-2xl tracking-tighter">
                                ₹{order.totalAmount}
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-right mt-1">Payment: {order.paymentMethod}</p>
                        </div>

                        {/* Action Area */}
                        <div className="space-y-4">
                            {order.deliveryStatus === 'pickedUp' && (
                                <button
                                    onClick={handleOutForDelivery}
                                    disabled={completing}
                                    className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-900/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {completing ? (
                                        <Loader2 className="animate-spin" size={24} />
                                    ) : (
                                        <>
                                            <Navigation size={24} />
                                            <span>Out for Delivery</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {order.deliveryStatus === 'outForDelivery' && (
                                <button
                                    onClick={handleCompleteDelivery}
                                    disabled={completing}
                                    className="w-full py-5 bg-[#2e7d32] text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-green-900/20 hover:bg-[#1b5e20] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {completing ? (
                                        <Loader2 className="animate-spin" size={24} />
                                    ) : (
                                        <>
                                            <CheckCircle2 size={24} />
                                            <span>Mark Delivered</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RiderDelivery;

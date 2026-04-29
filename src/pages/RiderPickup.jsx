import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { MapPin, Phone, Building2, Package, CheckCircle2, ArrowLeft, Loader2, Navigation, ExternalLink, User } from 'lucide-react';

const RiderPickup = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [pharmacy, setPharmacy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'orders', orderId), async (snapshot) => {
            if (snapshot.exists()) {
                const orderData = snapshot.data();
                setOrder(orderData);

                // Fetch Pharmacy Info
                const pharmaSnap = await getDoc(doc(db, 'users', orderData.pharmacyId));
                if (pharmaSnap.exists()) {
                    setPharmacy(pharmaSnap.data());
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [orderId]);

    const handleMarkPickedUp = async () => {
        try {
            setUpdating(true);
            const orderRef = doc(db, 'orders', orderId);

            await updateDoc(orderRef, {
                deliveryStatus: "pickedUp",
                pickedUpAt: serverTimestamp()
            });

            navigate(`/rider-delivery/${orderId}`);
        } catch (error) {
            console.error("Error marking as picked up:", error);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8faf8]">
                <Loader2 className="animate-spin text-[#2e7d32]" size={40} />
                <p className="text-gray-500 font-black uppercase tracking-widest text-sm">Loading pickup details...</p>
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
                        Back to Tasks
                    </button>
                    <div className="px-5 py-2 bg-white rounded-full border border-green-100 shadow-sm flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#2e7d32] rounded-full animate-pulse"></div>
                        <span className="text-xs font-black text-[#2e7d32] uppercase tracking-widest">Active Task</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Info */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Status Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#2e7d32] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-green-900/20 relative overflow-hidden"
                        >
                            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-bl-full"></div>
                            <div className="relative z-10">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-70">Current Phase</h3>
                                <h2 className="text-3xl font-black italic tracking-tighter mb-6">Heading to Pickup</h2>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div className="w-1/3 h-full bg-white rounded-full"></div>
                                    </div>
                                    <span className="text-xs font-black">Pickup Stage</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Pharmacy Pickup Details */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-4 mb-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                        <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest">Pickup Location</p>
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{pharmacy?.name || "The Pharmacy"}</h2>
                                </div>
                                <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl">
                                    <Building2 size={24} />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-[1.5rem]">
                                    <MapPin className="text-gray-400 mt-1" size={20} />
                                    <div className="flex-grow">
                                        <p className="font-bold text-gray-800 leading-tight mb-2">{pharmacy?.address}</p>
                                        <div className="flex flex-wrap gap-3">
                                            {pharmacy?.latitude && (
                                                <a
                                                    href={`https://www.google.com/maps?q=${pharmacy.latitude},${pharmacy.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-200 rounded-full text-[10px] font-black text-[#2e7d32] uppercase tracking-widest hover:bg-green-50 transition-colors"
                                                >
                                                    <Navigation size={12} /> Google Maps <ExternalLink size={10} />
                                                </a>
                                            )}
                                            <a
                                                href={`tel:${pharmacy?.phone}`}
                                                className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-200 rounded-full text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 transition-colors"
                                            >
                                                <Phone size={12} /> Call Pharmacy
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Customer Info */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm"
                        >
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Delivery Destination</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black text-gray-900">{order.customerInfo?.name}</h4>
                                    <p className="text-xs text-gray-400 font-bold tracking-widest mt-0.5">{order.selectedAddress?.label || 'HOME'}</p>
                                    <p className="text-sm font-bold text-gray-600 mt-2 leading-tight">
                                        {order.selectedAddress?.addressLine}<br />
                                        <span className="text-[10px] text-gray-400 uppercase tracking-widest">{order.selectedAddress?.city} - {order.selectedAddress?.pincode}</span>
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Sidebar: Order Items */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                            <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                                <Package className="text-[#2e7d32]" size={20} />
                                Items ({order.items?.length || 0})
                            </h3>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {order.items?.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="w-12 h-12 bg-white rounded-xl p-2 shrink-0">
                                            <img src={item.imageURL} alt="" className="w-full h-full object-contain" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-gray-800 truncate">{item.name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Qty: {item.quantity}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 pt-6 border-t border-gray-100 italic font-black text-right text-[#2e7d32] text-xl tracking-tighter">
                                ₹{order.totalAmount}
                            </div>
                        </div>

                        {/* Action Area */}
                        <div className="space-y-4">
                            <button
                                onClick={handleMarkPickedUp}
                                disabled={updating}
                                className="w-full py-5 bg-[#2e7d32] text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-green-900/20 hover:bg-[#1b5e20] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {updating ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <>
                                        <CheckCircle2 size={24} />
                                        <span>Order Picked Up</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RiderPickup;

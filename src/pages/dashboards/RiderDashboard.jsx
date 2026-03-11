import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, Shield, Clock, MapPin, CheckCircle2, Package, Power, TrendingUp, ChevronRight, Navigation, Loader2 } from 'lucide-react';
import { getCurrentLocation, calculateDistance } from '../../utils/geoUtils';

const RiderDashboard = () => {
    const { userData, currentUser, logout } = useAuth();
    const [availableOrders, setAvailableOrders] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);
    const [stats, setStats] = useState({ earnings: 0, trips: 0 });
    const [loading, setLoading] = useState(true);
    const [acceptingId, setAcceptingId] = useState(null);
    const [isAvailable, setIsAvailable] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [riderLocation, setRiderLocation] = useState(null);
    const navigate = useNavigate();

    // 0. Get Rider Location
    useEffect(() => {
        getCurrentLocation().then(setRiderLocation).catch(err => console.error("Location error:", err));
    }, []);

    // 0. Listen for Rider Status
    useEffect(() => {
        if (!currentUser) return;
        const unsubscribe = onSnapshot(doc(db, 'riders', currentUser.uid), (doc) => {
            if (doc.exists()) {
                setIsAvailable(doc.data().isAvailable);
            }
        });
        return () => unsubscribe();
    }, [currentUser]);

    const toggleAvailability = async () => {
        try {
            setToggling(true);
            const riderRef = doc(db, 'riders', currentUser.uid);
            await updateDoc(riderRef, {
                isAvailable: !isAvailable
            });
        } catch (error) {
            console.error("Error toggling availability:", error);
            alert("Failed to update status.");
        } finally {
            setToggling(false);
        }
    };

    // Helper to get sortable time from Firestore timestamp
    const getSortMillis = (ts) => {
        if (!ts) return Date.now() + 8640000000; // Put brand new pending orders at very top
        if (typeof ts.toMillis === 'function') return ts.toMillis();
        if (ts.seconds) return ts.seconds * 1000;
        if (ts instanceof Date) return ts.getTime();
        return 0;
    };

    // 1. Listen for Available Orders
    useEffect(() => {
        if (!isAvailable) {
            setAvailableOrders([]);
            return;
        }

        const q = query(
            collection(db, 'orders'),
            where('orderStatus', '==', 'confirmed'),
            where('deliveryStatus', '==', 'unassigned')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const ordersData = [];
            for (const orderDoc of snapshot.docs) {
                const data = orderDoc.data();

                let pharmacyLat = data.pharmacyLat;
                let pharmacyLng = data.pharmacyLng;
                let pharmacyName = "Loading...";
                let pharmacyAddress = "Loading...";

                try {
                    const pharmaSnap = await getDoc(doc(db, 'users', data.pharmacyId));
                    if (pharmaSnap.exists()) {
                        const pharmaData = pharmaSnap.data();
                        pharmacyName = pharmaData.name;
                        pharmacyAddress = pharmaData.address || "Address not available";
                        pharmacyLat = pharmaData.latitude;
                        pharmacyLng = pharmaData.longitude;
                    }
                } catch (err) {
                    console.error("Error fetching pharmacy:", err);
                }

                let distance = null;
                if (riderLocation && pharmacyLat && pharmacyLng) {
                    distance = calculateDistance(riderLocation.lat, riderLocation.lng, pharmacyLat, pharmacyLng);
                }

                ordersData.push({
                    id: orderDoc.id,
                    ...data,
                    pharmacyName,
                    pharmacyAddress,
                    distance: distance ? Number(distance.toFixed(1)) : null,
                    _sortMillis: getSortMillis(data.createdAt || data.acceptedAt)
                });
            }

            // EXPLICIT: Sort by Recently Placed (Top priority as requested by user)
            ordersData.sort((a, b) => b._sortMillis - a._sortMillis);

            setAvailableOrders(ordersData);
        });

        return () => unsubscribe();
    }, [isAvailable, riderLocation]);

    // 2. Listen for Active Orders (Self)
    useEffect(() => {
        if (!currentUser) return;
        const q = query(
            collection(db, 'orders'),
            where('riderId', '==', currentUser.uid),
            where('deliveryStatus', 'in', ['assigned', 'pickedUp', 'outForDelivery'])
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const activeData = [];
            for (const orderDoc of snapshot.docs) {
                const data = orderDoc.data();
                if (data.orderStatus === 'completed' || data.orderStatus === 'delivered') continue;

                // Simple enrichment
                let pharmacyName = "Loading...";
                try {
                    const pharmaSnap = await getDoc(doc(db, 'users', data.pharmacyId));
                    if (pharmaSnap.exists()) pharmacyName = pharmaSnap.data().name;
                } catch (err) { }

                activeData.push({ 
                    id: orderDoc.id, 
                    ...data, 
                    pharmacyName,
                    _sortMillis: getSortMillis(data.createdAt || data.acceptedAt) 
                });
            }

            // EXPLICIT: Sort by Recently Placed (Top priority as requested by user)
            activeData.sort((a, b) => b._sortMillis - a._sortMillis);

            setActiveOrders(activeData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    // 3. Listen for Stats (Today's Earnings & Total Experience)
    useEffect(() => {
        if (!currentUser) return;

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, 'orders'),
            where('riderId', '==', currentUser.uid),
            where('orderStatus', '==', 'completed')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let todayEarnings = 0;
            let todayTrips = 0;
            let allTimeTrips = snapshot.docs.length; // Count all completed orders

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // Find any valid timestamp for the order to determine if it was done today
                const orderTs = data.acceptedAt || data.createdAt;
                const createdAt = orderTs?.toDate ? orderTs.toDate() : 
                                  (orderTs?.seconds ? new Date(orderTs.seconds * 1000) : new Date(0));

                if (createdAt >= startOfDay) {
                    todayTrips++;
                    todayEarnings += 30; // ₹30 per delivery
                }
            });

            // Calculate experience dynamically
            let experienceLevel = "New";
            if (allTimeTrips > 100) experienceLevel = "Expert";
            else if (allTimeTrips > 20) experienceLevel = "Pro";
            else if (allTimeTrips > 5) experienceLevel = "Experienced";

            setStats({ 
                earnings: todayEarnings, 
                trips: todayTrips,
                experience: experienceLevel 
            });
        });
        return () => unsubscribe();
    }, [currentUser]);

    const handleAcceptOrder = async (orderId) => {
        try {
            setAcceptingId(orderId);
            const orderRef = doc(db, 'orders', orderId);

            // Check if the order is still available before accepting
            const orderSnap = await getDoc(orderRef);
            if (!orderSnap.exists() || orderSnap.data().deliveryStatus !== 'unassigned') {
                alert("This order was already taken by another rider.");
                return;
            }

            await updateDoc(orderRef, {
                riderId: currentUser.uid,
                riderName: userData?.name || 'Rider',
                riderPhone: userData?.phone || '',
                deliveryStatus: "assigned",
                acceptedAt: serverTimestamp()
            });

            navigate(`/rider-pickup/${orderId}`);
        } catch (error) {
            console.error("Error accepting order:", error);
            alert("Failed to accept order. It might have been taken by another rider.");
        } finally {
            setAcceptingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#f3f7f3] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-4xl font-black text-gray-900 tracking-tight"
                        >
                            Welcome back, <span className="text-[#2e7d32]">{userData?.name?.split(' ')[0]}!</span>
                        </motion.h1>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm mt-2">
                            {userData?.vehicleType} Delivery Partner • {userData?.licenseNumber}
                        </p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-4"
                    >
                        {/* Availability Toggle */}
                        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 px-6 py-3">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Status</span>
                                <span className={`font-black text-sm uppercase ${isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
                                    {isAvailable ? 'Online' : 'Offline'}
                                </span>
                            </div>
                            <button
                                onClick={toggleAvailability}
                                disabled={toggling}
                                className={`w-14 h-7 rounded-full relative transition-all duration-300 shadow-inner ${isAvailable ? 'bg-green-500' : 'bg-gray-200'}`}
                            >
                                <motion.div
                                    animate={{ x: isAvailable ? 28 : 4 }}
                                    className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
                                />
                            </button>
                        </div>

                        <button
                            onClick={logout}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
                        >
                            <Power size={24} />
                        </button>
                    </motion.div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {[
                        { label: 'Today\'s Earnings', value: `₹${stats.earnings}.00`, icon: TrendingUp, color: 'bg-blue-50 text-blue-600' },
                        { label: 'Completed', value: stats.trips.toString(), icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
                        { label: 'Available Now', value: availableOrders.length.toString(), icon: Package, color: 'bg-orange-50 text-orange-600' },
                        { label: 'Experience', value: stats.experience || 'New', icon: Shield, color: 'bg-purple-50 text-purple-600' },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100"
                        >
                            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
                                <stat.icon size={24} />
                            </div>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
                        </motion.div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Active & Available Orders Column (LEFT) */}
                    <div className="lg:col-span-2 space-y-12">
                        {/* 1. Active Tasks Section */}
                        {activeOrders.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black text-[#2e7d32] tracking-tight flex items-center gap-3">
                                        <div className="w-3 h-3 bg-[#2e7d32] rounded-full animate-ping"></div>
                                        Current Active Tasks
                                    </h2>
                                    <span className="px-4 py-1.5 bg-green-50 text-[#2e7d32] rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100 italic">
                                        In Progress
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    {activeOrders.map((order) => (
                                        <motion.div
                                            key={order.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-white rounded-[2.5rem] border-2 border-[#2e7d32] p-8 shadow-xl shadow-green-900/10 relative overflow-hidden group"
                                        >
                                            <div className="absolute right-0 top-0 w-24 h-24 bg-[#2e7d32]/5 rounded-bl-[100%] transition-all group-hover:w-28 group-hover:h-28"></div>
                                            <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                                                <div className="space-y-4 flex-grow">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="px-3 py-1 bg-[#2e7d32] text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                            {order.deliveryStatus === 'assigned' ? 'ACCEPTED' : order.deliveryStatus.toUpperCase()}
                                                        </span>
                                                        <p className="font-black text-gray-800 tracking-tight">#{order.id.slice(-6).toUpperCase()}</p>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Pickup</p>
                                                            <p className="font-black text-gray-800 line-clamp-1">{order.pharmacyName}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Delivery</p>
                                                            <p className="font-black text-gray-800 line-clamp-1">{order.customerInfo?.name}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col justify-center">
                                                    <button
                                                        onClick={() => navigate(order.deliveryStatus === 'assigned' ? `/rider-pickup/${order.id}` : `/rider-delivery/${order.id}`)}
                                                        className="bg-[#2e7d32] text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-[#1b5e20] active:scale-95 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        Continue Task <ChevronRight size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Available Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Available Delivery Tasks</h2>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="animate-spin text-[#2e7d32]" size={40} />
                                </div>
                            ) : availableOrders.length > 0 ? (
                                <div className="grid grid-cols-1 gap-6">
                                    <AnimatePresence mode='popLayout'>
                                        {availableOrders.map((order) => (
                                            <motion.div
                                                key={order.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm hover:shadow-xl transition-all group"
                                            >
                                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                                    <div className="space-y-4 flex-grow">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-[#2e7d32]">
                                                                <Package size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] leading-none mb-1">Order ID</p>
                                                                <p className="font-black text-gray-800 tracking-tight">#{order.id.slice(-6).toUpperCase()}</p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] text-orange-500 font-black uppercase tracking-[0.2em] flex items-center gap-1">
                                                                    <MapPin size={10} /> Pickup From
                                                                </p>
                                                                <p className="font-black text-gray-800 text-lg leading-tight">{order.pharmacyName}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm text-gray-500 font-medium line-clamp-1">{order.pharmacyAddress}</p>
                                                                    {order.distance !== null && (
                                                                        <span className="shrink-0 bg-orange-100 text-orange-600 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                                            {order.distance} km away
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] flex items-center gap-1">
                                                                    <Navigation size={10} /> Deliver To
                                                                </p>
                                                                <p className="font-black text-gray-800 text-lg leading-tight">{order.customerInfo?.name}</p>
                                                                <p className="text-sm text-gray-500 font-medium line-clamp-1">{order.selectedAddress?.addressLine}</p>
                                                            </div>
                                                        </div>

                                                        <div className="pt-4 flex items-center gap-6 border-t border-gray-50">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                                <p className="text-xs font-bold text-gray-400 capitalize">{order.items?.length || 0} Medicines</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-[#2e7d32] rounded-full"></div>
                                                                <p className="text-xs font-bold text-[#2e7d32]">₹{order.totalAmount} Total</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col justify-center">
                                                        <button
                                                            onClick={() => handleAcceptOrder(order.id)}
                                                            disabled={acceptingId === order.id}
                                                            className="bg-[#2e7d32] text-white px-8 py-5 rounded-[1.5rem] font-black shadow-lg shadow-green-900/20 hover:bg-[#1b5e20] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 min-w-[180px]"
                                                        >
                                                            {acceptingId === order.id ? (
                                                                <Loader2 className="animate-spin" size={24} />
                                                            ) : (
                                                                <>
                                                                    <span>Accept Order</span>
                                                                    <ChevronRight size={20} />
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 p-12 text-center flex flex-col items-center justify-center gap-6"
                                >
                                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                        <Bike size={48} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-800 mb-2">No Tasks Available</h3>
                                        <p className="text-gray-400 font-medium max-w-xs mx-auto">You're currently all caught up! New delivery requests will appear here as soon as they are confirmed.</p>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Column (RIGHT) */}
                    <div className="space-y-8">
                        {/* Profile Summary Card */}
                        <div className="bg-[#2e7d32] rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-green-900/20">
                            <div className="absolute -right-8 -bottom-8 opacity-10">
                                <Bike size={200} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-black mb-6">Partner Status</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest leading-none mb-1">Account Status</p>
                                            <p className="font-black">Fully Verified</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest leading-none mb-1">Today's Performance</p>
                                            <p className="font-black">{stats.trips} Trips Completed</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                            <MapPin size={20} />
                                        </div>
                                        <div>
                                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest leading-none mb-1">Service Area</p>
                                            <p className="font-black">Local Area</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Tips */}
                        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100">
                            <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                                <div className="w-2 h-6 bg-[#2e7d32] rounded-full"></div>
                                Partner Guidelines
                            </h3>
                            <div className="space-y-4">
                                {[
                                    'Wear your MedXpress uniform',
                                    'Always verify customer OTP',
                                    'Check medicine packaging',
                                    'Drive safely & follow traffic'
                                ].map((tip, i) => (
                                    <div key={i} className="flex items-start gap-4">
                                        <div className="w-6 h-6 bg-green-50 rounded-lg flex items-center justify-center text-[#2e7d32] shrink-0 mt-0.5">
                                            <CheckCircle2 size={14} />
                                        </div>
                                        <p className="text-gray-600 font-medium text-sm leading-relaxed">{tip}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RiderDashboard;

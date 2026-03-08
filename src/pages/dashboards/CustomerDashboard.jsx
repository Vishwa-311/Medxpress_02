import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { db } from '../../firebase';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { MapPin, Search, ShoppingBag, Store, Star, Clock, ChevronRight, Loader2, AlertCircle, ArrowLeft, Pill, User, X, Info, ShieldCheck, Zap, ClipboardList, CheckCircle2, Truck, Package, Bell, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateMedicineDetails } from '../../data/medicineDetails';
import { useNavigate, useLocation } from 'react-router-dom';
import { isFuzzyMatch } from '../../utils/searchUtils';

const CustomerDashboard = () => {
    const { currentUser } = useAuth();
    const { cart, addToCart, updateQuantity, cartCount } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const initialSearchMedicine = location.state?.searchMedicine || '';
    const [userLat, setUserLat] = useState(undefined);
    const [userLng, setUserLng] = useState(undefined);
    const [pharmacies, setPharmacies] = useState([]);
    const [filteredPharmacies, setFilteredPharmacies] = useState([]);
    const [selectedPharmacy, setSelectedPharmacy] = useState(null);
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [medSearchQuery, setMedSearchQuery] = useState('');
    const [selectedMedicine, setSelectedMedicine] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All');
    const [useManualLocation, setUseManualLocation] = useState(false);

    // Order History States
    const [orders, setOrders] = useState([]);
    const [activeDashboardTab, setActiveDashboardTab] = useState(location.state?.activeTab || 'pharmacies');
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    // Handle incoming tab state from navigation (e.g. from Navbar)
    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveDashboardTab(location.state.activeTab);
            // Clear state to avoid sticky tab on refresh if desired, 
            // but usually it's better to keep it or handle via logic
            setSelectedPharmacy(null);
        }
    }, [location.state]);

    // Helper to safely format Firestore timestamps
    const formatOrderDate = (timestamp) => {
        if (!timestamp) return 'Recently placed';
        if (typeof timestamp.toDate === 'function') {
            return timestamp.toDate().toLocaleString();
        }
        if (timestamp instanceof Date) {
            return timestamp.toLocaleString();
        }
        if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000).toLocaleString();
        }
        return 'Recently placed';
    };

    // Dynamically generate categories from current medicines data
    const CATEGORIES = useMemo(() => {
        const cats = new Set(['All']);
        medicines.forEach(med => {
            if (med.category) {
                // Split by "/" and add each part as a separate category
                med.category.split('/').forEach(cat => {
                    if (cat.trim()) cats.add(cat.trim());
                });
            }
        });
        return Array.from(cats);
    }, [medicines]);

    // Combined search + category filter (robust matching for combined categories like "Fever/Pain")
    const computedMedicines = useMemo(() => {
        return medicines.filter(med => {
            const matchesSearch = med.name.toLowerCase().includes(medSearchQuery.toLowerCase());

            // Convert to lowercase for case-insensitive matching
            const selectedCat = activeCategory.toLowerCase();
            const medCat = (med.category || "").toLowerCase();

            // Debugging logs as requested
            if (activeCategory !== 'All') {
                console.log("Selected Category:", activeCategory);
                console.log("Medicine Category:", med.category);
            }

            // Match if "All" is selected OR if the medicine's category string contains the selected chip
            const matchesCategory = activeCategory === 'All' || medCat.includes(selectedCat);

            return matchesSearch && matchesCategory;
        });
    }, [medicines, medSearchQuery, activeCategory]);

    // 2) CORRECT HAVERSINE FORMULA (Distance in KM)
    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Initialize location on load and watch for changes
    useEffect(() => {
        let watchId = null;

        const startWatching = async () => {
            try {
                setLoading(true);

                // 1) Fetch pharmacies (filtering by medicine if requested)
                let targetPharmacyIds = null;
                if (initialSearchMedicine) {
                    const medSnapshot = await getDocs(collection(db, "medicines"));
                    targetPharmacyIds = new Set();

                    medSnapshot.docs.forEach(doc => {
                        const medData = doc.data();
                        if (isFuzzyMatch(medData.name, initialSearchMedicine)) {
                            targetPharmacyIds.add(medData.pharmacyId);
                        }
                    });
                }

                const pharmacyQuery = query(collection(db, "users"), where("role", "==", "pharmacy"));
                const pharmacySnapshot = await getDocs(pharmacyQuery);
                let pharList = pharmacySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Filter by target pharmacy IDs if search medicine was provided
                if (targetPharmacyIds) {
                    pharList = pharList.filter(p => targetPharmacyIds.has(p.id));
                }

                setPharmacies(pharList);

                if ("geolocation" in navigator) {
                    watchId = navigator.geolocation.watchPosition(
                        (position) => {
                            const { latitude, longitude } = position.coords;
                            console.log("Real-time location update (watchPosition):", latitude, longitude);
                            setUserLat(latitude);
                            setUserLng(longitude);
                            setLoading(false);
                        },
                        (err) => {
                            console.error("Location Watch Error:", err);
                            setError(err.code === 1 ? "Location access required." : "Failed to track location.");
                            setLoading(false);
                        },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                    );
                } else {
                    setError("Geolocation not supported.");
                    setLoading(false);
                }
            } catch (err) {
                console.error("Data Fetch Error:", err);
                setError("Failed to fetch stores.");
                setLoading(false);
            }
        };

        startWatching();
        return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
    }, []);

    // 4) FILTER PHARMACIES REACTIVELY
    useEffect(() => {
        if (userLat === undefined || userLng === undefined || pharmacies.length === 0) return;

        const filtered = pharmacies.filter((pharma) => {
            const distance = getDistance(userLat, userLng, pharma.latitude, pharma.longitude);
            const matchesSearch = pharma.name.toLowerCase().includes(searchQuery.toLowerCase());
            return distance <= 1 && matchesSearch;
        }).map(p => ({
            ...p,
            distance: getDistance(userLat, userLng, p.latitude, p.longitude)
        }));

        setFilteredPharmacies(filtered);
    }, [userLat, userLng, pharmacies, searchQuery]);

    // 5) FETCH CUSTOMER ORDERS (REAL-TIME & PERSISTENT)
    useEffect(() => {
        if (!currentUser?.uid) return;

        // Persistent background listener
        if (orders.length === 0) setLoadingOrders(true);

        const q = query(
            collection(db, 'orders'),
            where('customerId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            try {
                // 1. Normalize and Calculate Stable Sorting Value
                const fetchedOrders = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const ts = data.createdAt;
                    let millis = 0;

                    // Extremely robust check for pending/missing timestamps
                    const isPending = !ts ||
                        (typeof ts === 'object' && ts.seconds === undefined && typeof ts.toMillis !== 'function');

                    if (isPending) {
                        // Place 100 days in future to stay at the very top
                        millis = Date.now() + 8640000000;
                    } else if (typeof ts.toMillis === 'function') {
                        millis = ts.toMillis();
                    } else if (ts.seconds) {
                        millis = ts.seconds * 1000;
                    } else if (ts instanceof Date) {
                        millis = ts.getTime();
                    } else if (typeof ts === 'number') {
                        // Check if it's seconds vs millis
                        millis = ts < 10000000000 ? ts * 1000 : ts;
                    } else {
                        const d = new Date(ts);
                        millis = isNaN(d.getTime()) ? 0 : d.getTime();
                    }

                    return { ...data, id: doc.id, _sortMillis: Number(millis) || 0 };
                });

                // 2. Stable Newest-First Sort (Desc)
                fetchedOrders.sort((a, b) => {
                    const diff = b._sortMillis - a._sortMillis;
                    if (diff !== 0) return diff;
                    return b.id.localeCompare(a.id); // Tie-breaker for same-time orders
                });

                setOrders(prevOrders => {
                    // O(1) Status Change Notifications
                    const prevMap = new Map((prevOrders || []).map(o => [o.id, o]));
                    if (prevOrders && prevOrders.length > 0) {
                        fetchedOrders.forEach(newOrder => {
                            const old = prevMap.get(newOrder.id);
                            if (old) {
                                // Fire toast on orderStatus changes
                                if (old.orderStatus !== newOrder.orderStatus) {
                                    const statusMap = {
                                        confirmed: 'was Confirmed by the Pharmacy!',
                                        completed: 'has been Delivered!'
                                    };
                                    const text = statusMap[newOrder.orderStatus];
                                    if (text) {
                                        setToastMessage({
                                            title: `Order #${newOrder.id.slice(-6).toUpperCase()}`,
                                            desc: text
                                        });
                                        setTimeout(() => setToastMessage(null), 5000);
                                    }
                                }
                                // Also fire on deliveryStatus changes
                                if (old.deliveryStatus !== newOrder.deliveryStatus) {
                                    const deliveryStatusMap = {
                                        assigned: '🏍️ A rider has been assigned!',
                                        pickedUp: '📦 Order picked up from pharmacy!',
                                        outForDelivery: '🚀 Your order is Out for Delivery!',
                                        delivered: '✅ Your order has been Delivered!'
                                    };
                                    const text = deliveryStatusMap[newOrder.deliveryStatus];
                                    if (text) {
                                        setToastMessage({
                                            title: `Order #${newOrder.id.slice(-6).toUpperCase()}`,
                                            desc: text
                                        });
                                        setTimeout(() => setToastMessage(null), 5000);
                                    }
                                }
                            }
                        });
                    }
                    return fetchedOrders;
                });
            } catch (err) {
                console.error("Dashboard order processing error:", err);
            } finally {
                setLoadingOrders(false);
            }
        }, (error) => {
            console.error("Customer orders listener error:", error);
            setLoadingOrders(false);
        });

        return () => unsubscribe();
    }, [currentUser?.uid]);

    const handlePharmacyClick = async (pharma) => {
        setLoading(true);
        setSelectedPharmacy(pharma);
        setMedSearchQuery('');
        setActiveCategory('All');
        try {
            const medicineQuery = query(collection(db, "medicines"), where("pharmacyId", "==", pharma.id));
            const medicineSnapshot = await getDocs(medicineQuery);
            let medsList = medicineSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort so that the searched medicine is at the top
            if (initialSearchMedicine) {
                medsList.sort((a, b) => {
                    const aMatches = isFuzzyMatch(a.name, initialSearchMedicine);
                    const bMatches = isFuzzyMatch(b.name, initialSearchMedicine);
                    if (aMatches && !bMatches) return -1;
                    if (!aMatches && bMatches) return 1;
                    return 0;
                });
            }

            setMedicines(medsList);
        } catch (err) {
            console.error("Error fetching medicines:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleMedicineClick = (medicine) => {
        if (medicine.stock <= 0) return;
        const details = generateMedicineDetails(medicine.name, medicine.category || 'General');
        setSelectedMedicine({ ...medicine, details });
        setIsDetailModalOpen(true);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-extrabold text-[#2e7d32] mb-3">MedXpress</h1>
                    <div className="flex items-center gap-2 text-gray-500 font-semibold bg-gray-50 w-fit px-4 py-1.5 rounded-full border border-gray-100">
                        <MapPin size={18} className="text-[#2e7d32]" />
                        {userLat && userLng ? (
                            <span className="text-sm md:text-base tracking-tight">
                                Near {userLat.toFixed(4)}, {userLng.toFixed(4)} <span className="text-xs ml-1 opacity-50">(within 1km)</span>
                            </span>
                        ) : (
                            <span className="text-sm text-red-500 animate-pulse">Awaiting location...</span>
                        )}
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {activeDashboardTab !== 'orders' && !selectedPharmacy && (
                        <button
                            onClick={() => setActiveDashboardTab('orders')}
                            className="w-full md:w-auto px-6 py-4 bg-white text-[#2e7d32] border-2 border-[#2e7d32] rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-green-50 transition-all shadow-md"
                        >
                            <ClipboardList size={20} />
                            Order History
                        </button>
                    )}
                    {cartCount > 0 && (
                        <button
                            onClick={() => navigate('/cart')}
                            className="w-full md:w-auto px-10 py-4 bg-[#2e7d32] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:bg-[#1b5e20] transition-all"
                        >
                            <ShoppingBag size={22} />
                            View Cart ({cartCount})
                        </button>
                    )}
                </div>
            </header>

            {/* Global Dashboard Tabs */}
            {!selectedPharmacy && (
                <div className="flex p-1.5 bg-gray-100 rounded-2xl w-full md:w-fit mb-10 mx-auto md:mx-0 shadow-inner">
                    <button
                        onClick={() => setActiveDashboardTab('pharmacies')}
                        className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeDashboardTab === 'pharmacies' ? 'bg-white text-[#2e7d32] shadow-md' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Store size={18} /> Pharmacies
                    </button>
                    <button
                        onClick={() => setActiveDashboardTab('orders')}
                        className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeDashboardTab === 'orders' ? 'bg-white text-[#2e7d32] shadow-md' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <ClipboardList size={18} /> My Orders
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-red-50 text-red-600 p-5 rounded-2xl mb-8 flex items-center gap-4 border border-red-100 font-bold shadow-sm">
                    <AlertCircle size={24} />
                    {error}
                </div>
            )}

            {activeDashboardTab === 'orders' && !selectedPharmacy ? (
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-extrabold mb-8 text-gray-800 flex items-center gap-3">
                        <ShoppingBag className="text-[#2e7d32]" size={28} /> Order History
                    </h2>

                    {loadingOrders ? (
                        <div className="py-24 flex items-center justify-center"><Loader2 className="animate-spin text-[#2e7d32]" size={40} /></div>
                    ) : orders.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-[2.5rem] shadow-sm border border-gray-100">
                            <Package size={60} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-lg font-bold text-gray-400">No past orders found.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {orders.map(order => (
                                <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-md border border-gray-100 flex flex-col group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
                                        <div>
                                            <p className="text-xl font-black text-gray-800">Order #{order.id?.slice(-6).toUpperCase() || 'N/A'}</p>
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                                                Placed on {formatOrderDate(order.createdAt)}
                                            </p>
                                        </div>
                                        <div className="text-left md:text-right">
                                            <p className="text-2xl font-black text-[#2e7d32]">₹{order.totalAmount}</p>
                                            <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-black uppercase tracking-widest rounded-md mt-2 inline-block">
                                                {order.paymentMethod}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                        <div className="space-y-3">
                                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ordered Items</h3>
                                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 max-h-40 overflow-y-auto space-y-2">
                                                {Array.isArray(order.items) && order.items.length > 0 ? (
                                                    order.items.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-sm font-bold text-gray-700">
                                                            <span>{item.name || 'Medicine'} <span className="text-[10px] text-gray-400 ml-1">x{item.quantity || 1}</span></span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[10px] text-gray-400 font-bold italic">No items found</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Status</h3>
                                            {/* Prominent live status badge */}
                                            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-sm border ${order.orderStatus === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                order.deliveryStatus === 'unassigned' ? 'bg-green-50 text-[#2e7d32] border-green-200' :
                                                    order.deliveryStatus === 'assigned' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        order.deliveryStatus === 'pickedUp' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                            order.deliveryStatus === 'outForDelivery' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                                (order.orderStatus === 'completed' || order.deliveryStatus === 'delivered') ? 'bg-gray-100 text-gray-600 border-gray-200' :
                                                                    'bg-gray-50 text-gray-500 border-gray-200'
                                                }`}>
                                                {order.orderStatus === 'pending' ? '⏳ Waiting for Pharmacy' :
                                                    order.deliveryStatus === 'unassigned' ? '✅ Confirmed — Finding Rider' :
                                                        order.deliveryStatus === 'assigned' ? '🏍️ Rider Heading to Pickup' :
                                                            order.deliveryStatus === 'pickedUp' ? '📦 Order Picked Up' :
                                                                order.deliveryStatus === 'outForDelivery' ? '🚀 Out for Delivery!' :
                                                                    (order.orderStatus === 'completed' || order.deliveryStatus === 'delivered') ? '✅ Delivered!' :
                                                                        order.orderStatus}
                                            </div>
                                            {/* Step checklist */}
                                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3 text-sm font-bold text-gray-500">
                                                {[
                                                    { label: 'Order Placed', active: true },
                                                    { label: 'Order Confirmed', active: ['confirmed', 'outForDelivery', 'delivered', 'completed'].includes(order.orderStatus) || order.deliveryStatus === 'unassigned' },
                                                    { label: 'Rider Assigned', active: ['assigned', 'pickedUp', 'outForDelivery', 'delivered'].includes(order.deliveryStatus) },
                                                    { label: 'Out for Delivery', active: ['outForDelivery', 'delivered'].includes(order.deliveryStatus) || order.orderStatus === 'completed' },
                                                    { label: 'Delivered', active: order.deliveryStatus === 'delivered' || order.orderStatus === 'completed' },
                                                ].map((step, i) => (
                                                    <div key={i} className={`flex items-center gap-3 ${step.active ? 'text-[#2e7d32]' : ''}`}>
                                                        <CheckCircle2 size={16} className={step.active ? 'text-[#2e7d32]' : 'text-gray-300'} />
                                                        {step.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-gray-50">
                                        <button
                                            onClick={() => navigate('/order-tracking/' + order.id)}
                                            className="px-6 py-2.5 bg-white text-[#2e7d32] border-2 border-[#2e7d32] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-50 active:scale-95 transition-all text-sm"
                                        >
                                            View Full Tracking <ChevronRight size={16} />
                                        </button>
                                    </div>

                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            ) : !selectedPharmacy ? (
                <>
                    {/* Search Section */}
                    <div className="bg-white p-3 rounded-[2rem] flex items-center shadow-lg border border-gray-50 mb-12 max-w-2xl">
                        <div className="flex items-center flex-grow px-5 py-2">
                            <Search className="text-gray-400 mr-3" size={24} />
                            <input
                                type="text"
                                placeholder="Search for pharmacies near you..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="border-none outline-none flex-grow text-lg py-2 font-medium"
                            />
                        </div>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-extrabold mb-8 text-gray-800">Medical Stores Near You</h2>

                    {loading && pharmacies.length === 0 ? (
                        <div className="py-32 flex flex-col items-center justify-center"><Loader2 className="animate-spin text-[#2e7d32] mb-4" size={50} /><p className="font-bold text-gray-400">Finding pharmacies...</p></div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            {filteredPharmacies.map(pharma => (
                                <motion.div
                                    key={pharma.id}
                                    whileHover={{ y: -10 }}
                                    onClick={() => handlePharmacyClick(pharma)}
                                    className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-gray-50 cursor-pointer hover:shadow-2xl transition-all group"
                                >
                                    <div className="flex flex-col sm:flex-row items-center gap-6">
                                        <div className="w-24 h-24 bg-green-50 rounded-[2rem] flex items-center justify-center text-5xl shadow-inner group-hover:bg-green-100 transition-colors shrink-0">
                                            🏥
                                        </div>
                                        <div className="flex-grow text-center sm:text-left">
                                            <h3 className="text-xl font-extrabold text-gray-800 mb-1">{pharma.name}</h3>
                                            <p className="text-gray-500 font-medium mb-3 line-clamp-1">{pharma.address || "Medical Store"}</p>
                                            <div className="flex items-center justify-center sm:justify-start gap-4">
                                                <span className="bg-green-100 text-[#2e7d32] px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                                                    <MapPin size={12} /> {(pharma.distance * 1000).toFixed(0)}m AWAY
                                                </span>
                                                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                                                    4.5 <Star size={12} fill="currentColor" />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {filteredPharmacies.length === 0 && !loading && (
                                <div className="col-span-full py-24 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                                    <Store size={80} className="mx-auto text-gray-200 mb-6" />
                                    <h3 className="text-2xl font-black text-gray-300">No pharmacies found within 1km.</h3>
                                    <p className="text-gray-400 mt-2 font-medium mb-8">Try checking your GPS settings (or try refreshing the page).</p>

                                    {!useManualLocation && (
                                        <button
                                            onClick={() => {
                                                setUseManualLocation(true);
                                                // For demo/fallback, we'll just show all pharmacies if manual is on
                                                setFilteredPharmacies(pharmacies);
                                            }}
                                            className="px-8 py-3 bg-white border-2 border-[#2e7d32] text-[#2e7d32] rounded-xl font-bold hover:bg-green-50 transition-all shadow-sm"
                                        >
                                            Show All Pharmacies (Manual Mode)
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div>
                    {/* Back + Compact Pharmacy Header */}
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={() => { setSelectedPharmacy(null); setMedSearchQuery(''); setActiveCategory('All'); }} className="flex items-center gap-2 group text-[#2e7d32] font-bold hover:opacity-80 transition-opacity">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            <span>Back</span>
                        </button>
                        {/* Floating Cart Icon */}
                        <button
                            onClick={() => navigate('/cart')}
                            className="relative flex items-center gap-2 bg-[#2e7d32] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#1b5e20] transition-all shadow-md"
                        >
                            <ShoppingBag size={18} />
                            <span className="text-sm">Cart</span>
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Compact Pharmacy Info */}
                    <div className="bg-white px-5 py-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl shrink-0">🏥</div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-extrabold text-gray-800 truncate">{selectedPharmacy.name}</h2>
                            <p className="text-sm text-gray-400 truncate">{selectedPharmacy.address || 'Pharmacy'}</p>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-500 shrink-0">
                            <Star size={14} fill="currentColor" />
                            <span className="text-sm font-bold text-gray-600">4.8</span>
                        </div>
                    </div>

                    {/* Medicine Search Bar */}
                    <div className="relative mb-4">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search medicines..."
                            value={medSearchQuery}
                            onChange={(e) => setMedSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all"
                        />
                    </div>

                    {/* Category Filter Chips */}
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none scroll-smooth">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${activeCategory === cat
                                    ? 'bg-[#2e7d32] text-white border-[#2e7d32] shadow-md'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#2e7d32] hover:text-[#2e7d32]'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Medicine Grid */}
                    {loading ? (
                        <div className="py-24 flex items-center justify-center"><Loader2 className="animate-spin text-[#2e7d32]" size={40} /></div>
                    ) : (
                        <>
                            <p className="text-xs text-gray-400 font-medium mb-4">{computedMedicines.length} medicines found</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {computedMedicines.map(med => (
                                    <motion.div
                                        key={med.id}
                                        whileHover={{ y: -3 }}
                                        onClick={() => handleMedicineClick(med)}
                                        className="bg-white border border-gray-100 rounded-2xl p-3 flex flex-col shadow-sm hover:shadow-md transition-all group cursor-pointer"
                                    >
                                        {/* Medicine Image */}
                                        <div className="flex justify-center mb-3">
                                            <div className="w-[70px] h-[70px] rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                                                <img
                                                    src={med.imageURL}
                                                    alt={med.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            </div>
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-[#2e7d32] bg-green-50 px-2 py-0.5 rounded-full inline-block mb-1">{med.category || 'Medicine'}</p>
                                            <h4 className="text-sm font-bold text-gray-800 leading-tight mb-0.5 line-clamp-2">{med.name}</h4>
                                            <p className="text-[10px] text-gray-400 mb-2">10 tablets / strip</p>

                                            {/* Stock badge */}
                                            <div className={`text-[10px] font-black uppercase mb-3 ${med.stock > 10 ? 'text-green-600'
                                                : med.stock > 0 ? 'text-yellow-600'
                                                    : 'text-red-500'
                                                }`}>
                                                {med.stock > 0 ? `${med.stock} IN STOCK` : 'OUT OF STOCK'}
                                            </div>
                                        </div>
                                        {/* Price + Add Button / Quantity Controls */}
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                            <div className="flex flex-col">
                                                <span className="text-base font-extrabold text-gray-900">₹{med.price}</span>
                                                <span className="text-[10px] text-gray-400 -mt-1">per strip</span>
                                            </div>

                                            {cart.find(item => item.medicineId === med.id) ? (
                                                <div className="flex items-center bg-[#2e7d32] text-white rounded-xl shadow-lg shadow-green-900/10 overflow-hidden">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateQuantity(med.id, -1);
                                                        }}
                                                        className="px-3 py-2 hover:bg-[#1b5e20] transition-colors"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="px-2 font-black text-sm min-w-[24px] text-center">
                                                        {cart.find(item => item.medicineId === med.id).quantity}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateQuantity(med.id, 1);
                                                        }}
                                                        className="px-3 py-2 hover:bg-[#1b5e20] transition-colors"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToCart(med);
                                                    }}
                                                    disabled={med.stock <= 0}
                                                    className="px-4 py-2 bg-[#2e7d32] text-white rounded-xl text-xs font-bold hover:bg-[#1b5e20] transition-all disabled:opacity-30 active:scale-95 shadow-lg shadow-green-900/10 uppercase tracking-widest"
                                                >
                                                    ADD
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}

                                {computedMedicines.length === 0 && (
                                    <div className="col-span-full py-16 text-center">
                                        <Pill size={40} className="mx-auto text-gray-200 mb-3" />
                                        <p className="text-sm font-bold text-gray-400">No medicines found.</p>
                                        <p className="text-xs text-gray-300 mt-1">Try a different search or category.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Medicine Detail Modal */}
            <AnimatePresence>
                {isDetailModalOpen && selectedMedicine && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsDetailModalOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] cursor-pointer"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white z-[2100] rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                        >
                            {/* Close Bar */}
                            <div className="p-4 flex justify-center">
                                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                            </div>

                            {/* Modal Content Scroll Area */}
                            <div className="overflow-y-auto px-6 pb-24">
                                {/* Top Image Section */}
                                <div className="relative aspect-square max-w-[280px] mx-auto mb-6 bg-gray-50 rounded-[2rem] p-8 mt-4">
                                    <img
                                        src={selectedMedicine.imageURL}
                                        alt={selectedMedicine.name}
                                        className="w-full h-full object-contain"
                                    />
                                    <button
                                        onClick={() => setIsDetailModalOpen(false)}
                                        className="absolute -top-4 -right-4 bg-white p-3 rounded-2xl shadow-xl hover:bg-gray-50 transition-colors border border-gray-100"
                                    >
                                        <X size={20} className="text-gray-400" />
                                    </button>
                                </div>

                                {/* Header Info */}
                                <div className="mb-8">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-3 py-1 bg-green-50 text-[#2e7d32] border border-green-100 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                            {selectedMedicine.category}
                                        </span>
                                        <span className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                            <Info size={10} /> Certified Info
                                        </span>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-black text-gray-800 leading-tight mb-1">{selectedMedicine.name}</h2>
                                    <p className="text-gray-400 font-bold mb-4">{selectedMedicine.details.stripDetails}</p>

                                    <div className="bg-[#2e7d32]/5 p-4 rounded-2xl border border-[#2e7d32]/10 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-[#2e7d32] uppercase tracking-widest mb-1">Price per strip</p>
                                            <p className="text-2xl font-black text-[#2e7d32]">₹{selectedMedicine.price}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Availability</p>
                                            <p className="text-sm font-black text-green-600 uppercase tracking-widest">In Stock</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-gray-100 mb-8" />

                                {/* Details Grid */}
                                <div className="space-y-8 pb-10">
                                    <section>
                                        <h3 className="flex items-center gap-2 text-sm font-black text-gray-800 uppercase tracking-widest mb-3">
                                            <Info size={16} className="text-[#2e7d32]" /> Product Description
                                        </h3>
                                        <p className="text-gray-600 text-sm leading-relaxed font-medium">
                                            {selectedMedicine.details.description}
                                        </p>
                                    </section>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <section className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                            <h3 className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                                How it helps
                                            </h3>
                                            <p className="text-gray-800 text-xs font-bold leading-relaxed">
                                                <Zap size={14} className="inline mr-2 text-yellow-500 mb-0.5" />
                                                {selectedMedicine.details.usage}
                                            </p>
                                        </section>
                                        <section className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                            <h3 className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                                Effect Time
                                            </h3>
                                            <p className="text-gray-800 text-xs font-bold leading-relaxed">
                                                <Clock size={14} className="inline mr-2 text-blue-500 mb-0.5" />
                                                {selectedMedicine.details.effectTime}
                                            </p>
                                        </section>
                                    </div>

                                    <section className="bg-red-50 p-6 rounded-2xl border border-red-100">
                                        <h3 className="flex items-center gap-2 text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">
                                            Important Precautions
                                        </h3>
                                        <div className="space-y-3">
                                            <p className="text-red-700 text-xs font-bold leading-relaxed flex items-start gap-3">
                                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                                {selectedMedicine.details.caution}
                                            </p>
                                            <p className="text-red-700 text-xs font-bold leading-relaxed flex items-start gap-3">
                                                <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                                                {selectedMedicine.details.dosageNote}
                                            </p>
                                        </div>
                                    </section>
                                </div>
                            </div>

                            {/* Floating Footer Button / Quantity Controls */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 flex items-center gap-4">
                                <div className="flex-1">
                                    {cart.find(item => item.medicineId === selectedMedicine.id) ? (
                                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <div className="flex flex-col">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Quantity in cart</p>
                                                <p className="text-lg font-black text-gray-800">{cart.find(item => item.medicineId === selectedMedicine.id).quantity} Strip(s)</p>
                                            </div>
                                            <div className="flex items-center bg-[#2e7d32] text-white rounded-xl shadow-lg shadow-green-900/10 overflow-hidden">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateQuantity(selectedMedicine.id, -1);
                                                    }}
                                                    className="px-5 py-3 hover:bg-[#1b5e20] transition-colors"
                                                >
                                                    <Minus size={18} />
                                                </button>
                                                <span className="px-4 font-black text-lg min-w-[40px] text-center">
                                                    {cart.find(item => item.medicineId === selectedMedicine.id).quantity}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateQuantity(selectedMedicine.id, 1);
                                                    }}
                                                    className="px-5 py-3 hover:bg-[#1b5e20] transition-colors"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                addToCart(selectedMedicine);
                                            }}
                                            className="w-full py-4 bg-[#2e7d32] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-green-900/10 hover:bg-[#1b5e20] active:scale-95 transition-all"
                                        >
                                            Add to Tray • ₹{selectedMedicine.price}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Custom Toast Notification Overlay */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-6 right-6 z-[3000] bg-white rounded-2xl shadow-2xl border-l-4 border-[#2e7d32] p-5 flex items-start gap-4 max-w-sm w-full"
                    >
                        <div className="bg-green-100 p-2 rounded-xl shrink-0 mt-0.5">
                            <Bell className="text-[#2e7d32]" size={20} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-black text-gray-800">{toastMessage.title}</h4>
                            <p className="text-xs text-gray-500 font-bold mt-1">{toastMessage.desc}</p>
                        </div>
                        <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomerDashboard;

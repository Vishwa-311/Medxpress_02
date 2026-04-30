import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, addDoc, query, getDocs, doc, getDoc, serverTimestamp, updateDoc, where, onSnapshot, or } from 'firebase/firestore';
import { Plus, Upload, Loader2, Package, IndianRupee, Image as ImageIcon, AlertCircle, CheckCircle2, Pill, ClipboardList, MapPin, Phone, Check, Truck, Info, TrendingUp, Siren } from 'lucide-react';
import { calculateDistance } from '../../utils/geoUtils';
import { motion, AnimatePresence } from 'framer-motion';

const PharmacyDashboard = () => {
    const { currentUser } = useAuth();
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');
    const [stock, setStock] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [medicines, setMedicines] = useState([]);
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'orders'
    const [loading, setLoading] = useState(true);
    const [pharmaData, setPharmaData] = useState(null);
    const [acceptingId, setAcceptingId] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [masterMedicines, setMasterMedicines] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMeds, setSelectedMeds] = useState([]);
    const [inventoryDetails, setInventoryDetails] = useState({});
    const [saving, setSaving] = useState(false);
    const [orderToReject, setOrderToReject] = useState(null);
    const [analytics, setAnalytics] = useState({ todayOrders: 0, todayEarnings: 0, todayCompleted: 0 });
    const [pricingInputs, setPricingInputs] = useState({}); // { orderId: { itemId: price } }

    useEffect(() => {
        if (!currentUser?.uid) return;
        const fetchPharma = async () => {
            const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
            if (docSnap.exists()) {
                setPharmaData(docSnap.data());
            }
        };
        fetchPharma();
    }, [currentUser]);

    // Helper to safely format Firestore timestamps or Dates
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

    const fetchMedicines = useCallback(async () => {
        try {
            const q = query(collection(db, 'medicines'));
            const querySnapshot = await getDocs(q);
            const meds = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(med => med.pharmacyId === currentUser.uid);
            setMedicines(meds);
        } catch (error) {
            console.error("Error fetching medicines:", error);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    // Orders are now handled by real-time listener in useEffect

    useEffect(() => {
        if (!currentUser?.uid) return;

        fetchMedicines();
        import('../../data/medicines.json').then(data => {
            setMasterMedicines(data.default || data);
        });

        // Use onSnapshot for real-time Orders with indexing optimization
        const q = query(
            collection(db, 'orders'),
            or(
                where('pharmacyId', '==', currentUser.uid),
                where('pharmacyId', '==', 'broadcast')
            )
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            try {
                const fetched = snapshot.docs.map(doc => {
                    const data = doc.data();
                    let distance = null;
                    
                    // Calculate distance for broadcast orders
                    if (data.pharmacyId === 'broadcast' && pharmaData?.latitude && data.customerLat) {
                        distance = calculateDistance(
                            pharmaData.latitude, 
                            pharmaData.longitude, 
                            data.customerLat, 
                            data.customerLng
                        );
                    }

                    return {
                        id: doc.id,
                        ...data,
                        distance: distance ? Number(distance.toFixed(1)) : null
                    };
                }).filter(order => {
                    // Only show broadcast orders that are within 10km
                    if (order.pharmacyId === 'broadcast') {
                        return order.distance !== null && order.distance <= 10;
                    }
                    return true;
                });

                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                let tOrders = 0;
                let tEarnings = 0;
                let tCompleted = 0;

                // 1. Normalize and Calculate Stable Sorting Value
                const processed = fetched.map(order => {
                    const ts = order.createdAt;
                    let millis = 0;

                    // Analytics calculation
                    const orderDate = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : null);
                    
                    // If no date yet (pending server timestamp), assume it's today
                    const isToday = !orderDate || orderDate >= startOfDay;

                    if (isToday) {
                        tOrders++;
                        if (order.orderStatus === 'completed') {
                            tCompleted++;
                            tEarnings += Number(order.totalAmount || 0);
                        }
                    }

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
                        millis = ts < 10000000000 ? ts * 1000 : ts;
                    } else {
                        const d = new Date(ts);
                        millis = isNaN(d.getTime()) ? 0 : d.getTime();
                    }

                    return { ...order, _sortMillis: Number(millis) || 0 };
                });

                setAnalytics({
                    todayOrders: tOrders,
                    todayEarnings: tEarnings,
                    todayCompleted: tCompleted
                });

                // 2. Stable Newest-First Sort (Desc) with Priority grouping
                processed.sort((a, b) => {
                    // Group 1: Ongoing (Pending, Confirmed, etc.)
                    // Group 2: Finalized (Completed, Rejected, Cancelled)
                    const isOngoing = (status) => ['pending', 'confirmed', 'outForDelivery', 'pickedUp'].includes(status);
                    
                    const ongoingA = isOngoing(a.orderStatus);
                    const ongoingB = isOngoing(b.orderStatus);

                    if (ongoingA && !ongoingB) return -1;
                    if (!ongoingA && ongoingB) return 1;

                    // Priority 0: Emergency Orders always at top within their group
                    if (a.isEmergency && !b.isEmergency) return -1;
                    if (!a.isEmergency && b.isEmergency) return 1;

                    // Priority 1: Smart Status Weight
                    const getWeight = (order) => {
                        if (order.orderStatus === 'pending') return 60;
                        if (order.orderStatus === 'confirmed') {
                            if (order.deliveryStatus === 'unassigned') return 50;
                            if (order.deliveryStatus === 'assigned') return 40;
                            if (order.deliveryStatus === 'pickedUp') return 30;
                            if (order.deliveryStatus === 'outForDelivery') return 20;
                        }
                        return 10;
                    };

                    const weightA = getWeight(a);
                    const weightB = getWeight(b);

                    if (weightB !== weightA) return weightB - weightA;

                    // Priority 2: Timestamp (Newest first)
                    const diff = b._sortMillis - a._sortMillis;
                    if (diff !== 0) return diff;

                    return b.id.localeCompare(a.id);
                });

                setOrders(processed);
            } catch (err) {
                console.error("Pharmacy order processing error:", err);
            } finally {
                setLoading(false);
            }
        }, (error) => {
            console.error("Pharmacy orders listener error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser?.uid, fetchMedicines, pharmaData?.latitude, pharmaData?.longitude]);

    const handlePricingChange = (orderId, itemId, price) => {
        setPricingInputs(prev => ({
            ...prev,
            [orderId]: {
                ...(prev[orderId] || {}),
                [itemId]: price
            }
        }));
    };

    const handleSavePricing = async (orderId) => {
        const order = orders.find(o => o.id === orderId);
        const prices = pricingInputs[orderId] || {};
        
        // Validate all items have prices
        const allPriced = order.items.every(item => prices[item.requestId] > 0);
        if (!allPriced) {
            setMessage({ type: 'error', text: 'Please enter prices for all medicines' });
            return;
        }

        try {
            const updatedItems = order.items.map(item => ({
                ...item,
                price: Number(prices[item.requestId])
            }));

            const itemsTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const finalTotal = itemsTotal + (order.baseCharges || 45);

            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
                items: updatedItems,
                totalAmount: finalTotal,
                isPricingPending: false,
                orderStatus: 'confirmed', // Move to confirmed so riders see it
                confirmedAt: serverTimestamp()
            });

            window.scrollTo({ top: 0, behavior: 'smooth' });
            setMessage({ type: 'success', text: 'Pricing saved and order confirmed!' });
        } catch (error) {
            console.error("Save pricing failed:", error);
            setMessage({ type: 'error', text: 'Failed to save pricing' });
        }
    };

    const handleAcceptEmergency = async (orderId) => {
        try {
            setAcceptingId(orderId);
            const orderRef = doc(db, 'orders', orderId);
            
            // Re-verify it's still available
            const snap = await getDoc(orderRef);
            if (snap.data().pharmacyId !== 'broadcast') {
                alert("This order was already accepted by another pharmacy.");
                return;
            }

            await updateDoc(orderRef, {
                pharmacyId: currentUser.uid,
                pharmacyName: pharmaData?.name || 'Pharmacy',
                pharmacyPhone: pharmaData?.phone || '',
                pharmacyAddress: pharmaData?.address || '',
                pharmacyLat: pharmaData?.latitude || null,
                pharmacyLng: pharmaData?.longitude || null,
                acceptedAt: serverTimestamp()
            });

        } catch (error) {
            console.error("Error accepting emergency:", error);
            alert("Failed to accept emergency request.");
        } finally {
            setAcceptingId(null);
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            const orderRef = doc(db, 'orders', orderId);
            const updateData = { orderStatus: newStatus };

            if (newStatus === 'confirmed') {
                updateData.confirmedAt = serverTimestamp();
                updateData.deliveryStatus = "unassigned"; // Ready for riders
                updateData.riderId = null; // Ensure riderId exists for queries
            } else if (newStatus === 'outForDelivery') {
                updateData.outForDeliveryAt = serverTimestamp();
            } else if (newStatus === 'delivered' || newStatus === 'completed') {
                updateData.orderStatus = 'completed';
                updateData.deliveryStatus = "delivered";
                updateData.deliveredAt = serverTimestamp();
            }

            await updateDoc(orderRef, updateData);

            window.scrollTo({ top: 0, behavior: 'smooth' });
            let statusText = '';
            if (newStatus === 'confirmed') statusText = 'Order confirmed and assigned for pickup!';
            else if (newStatus === 'outForDelivery') statusText = 'Order marked as Out for Delivery!';
            else if (newStatus === 'delivered' || newStatus === 'completed') statusText = 'Order marked as Completed!';

            setMessage({ type: 'success', text: statusText });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update order status: ' + error.message });
        }
    };

    const handleRejectOrder = async (orderId) => {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
                orderStatus: "rejected",
                rejectedAt: serverTimestamp()
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setMessage({ type: 'success', text: 'Order Rejected Successfully' });
            setOrderToReject(null);
        } catch (error) {
            console.error("Reject failed:", error);
            setMessage({ type: 'error', text: 'Failed to reject order' });
        }
    };


    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!image) {
            setMessage({ type: 'error', text: 'Please select an image' });
            return;
        }

        try {
            setUploading(true);
            setMessage({ type: '', text: '' });

            const pharmaDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (!pharmaDoc.exists()) throw new Error("Pharmacy profile not found.");
            const pharmaData = pharmaDoc.data();

            if (!pharmaData.latitude || !pharmaData.longitude) {
                throw new Error("Pharmacy location not found. Ensure location access was enabled on signup.");
            }

            const reader = new FileReader();
            reader.readAsDataURL(image);
            reader.onloadend = async () => {
                const base64Image = reader.result.split(',')[1];
                const formData = new FormData();
                formData.append('image', base64Image);

                try {
                    const response = await fetch(`https://api.imgbb.com/1/upload?key=6c27feddb60aeeafcd67027ee83cd504`, {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();
                    if (!data.success) throw new Error("Image upload failed");

                    await addDoc(collection(db, 'medicines'), {
                        name,
                        category,
                        price: parseFloat(price),
                        stock: parseInt(stock),
                        imageURL: data.data.display_url,
                        pharmacyId: currentUser.uid,
                        pharmacyLat: pharmaData.latitude,
                        pharmacyLng: pharmaData.longitude,
                        createdAt: serverTimestamp()
                    });

                    setMessage({ type: 'success', text: 'Medicine added successfully!' });
                    setName(''); setPrice(''); setCategory(''); setStock(''); setImage(null); setImagePreview(null);
                    fetchMedicines();
                } catch (err) {
                    setMessage({ type: 'error', text: err.message });
                } finally {
                    setUploading(false);
                }
            };
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
            setUploading(false);
        }
    };

    const handleSaveToInventory = async () => {
        try {
            setSaving(true);
            const pharmaDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (!pharmaDoc.exists()) throw new Error("Pharmacy profile not found.");
            const pharmaData = pharmaDoc.data();

            if (!pharmaData.latitude || !pharmaData.longitude) {
                throw new Error("Pharmacy location not found.");
            }

            const savePromises = selectedMeds.map(med => {
                const details = inventoryDetails[med.name] || {};
                return addDoc(collection(db, 'medicines'), {
                    name: med.name,
                    category: med.category || 'General',
                    price: parseFloat(details.price) || 0,
                    stock: parseInt(details.stock) || 0,
                    imageURL: med.imageURL,
                    pharmacyId: currentUser.uid,
                    pharmacyLat: pharmaData.latitude,
                    pharmacyLng: pharmaData.longitude,
                    createdAt: serverTimestamp()
                });
            });

            await Promise.all(savePromises);

            setIsDetailsModalOpen(false);
            setSelectedMeds([]);
            setInventoryDetails({});
            setMessage({ type: 'success', text: 'Medicines added to inventory!' });
            fetchMedicines();
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <header className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#2e7d32] mb-2">Pharmacy Dashboard</h1>
                    <p className="text-gray-500 font-medium">Manage your medicines and orders</p>
                </div>

                {/* Tabs */}
                <div className="flex p-1.5 bg-gray-100 rounded-2xl w-full md:w-auto h-fit">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`flex-1 md:px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'inventory' ? 'bg-white text-[#2e7d32] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Package size={18} /> Inventory
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`flex-1 md:px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'orders' ? 'bg-white text-[#2e7d32] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <ClipboardList size={18} /> Orders
                        {orders.filter(o => o.orderStatus === 'pending').length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1 animate-pulse">
                                {orders.filter(o => o.orderStatus === 'pending').length}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Business Analytics Section */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
            >
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Today's Orders</p>
                    <h3 className="text-3xl font-black text-gray-900">{analytics.todayOrders}</h3>
                    <div className="flex items-center gap-1 mt-2 text-green-600 font-bold text-xs">
                        <TrendingUp size={14} /> Total Received
                    </div>
                </div>
                <div className="bg-[#2e7d32] p-6 rounded-[2rem] shadow-xl shadow-green-900/10 text-white">
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Today's Earnings</p>
                    <h3 className="text-3xl font-black">₹{analytics.todayEarnings}</h3>
                    <div className="flex items-center gap-1 mt-2 text-white/80 font-bold text-xs">
                        <IndianRupee size={14} /> Direct Revenue
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Completed</p>
                    <h3 className="text-3xl font-black text-gray-900">{analytics.todayCompleted}</h3>
                    <div className="flex items-center gap-1 mt-2 text-[#2e7d32] font-bold text-xs">
                        <CheckCircle2 size={14} /> Orders Delivered
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Performance</p>
                    <p className="text-sm font-bold text-gray-700">Excellent business health today! Keep going.</p>
                </div>
            </motion.div>

            {activeTab === 'inventory' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Form Section */}
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 h-fit">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-green-50 rounded-lg text-[#2e7d32]">
                                <Plus size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">Add New Medicine</h2>
                        </div>

                        {message.text && (
                            <div className={`${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'} p-4 rounded-xl mb-6 flex items-center gap-3 text-sm font-bold border`}>
                                {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">Medicine Name</label>
                                <div className="relative group">
                                    <Package size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        placeholder="e.g., Paracetamol"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">Category</label>
                                <div className="relative group">
                                    <Pill size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                                    <input
                                        type="text"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        required
                                        placeholder="e.g., Fever, Pain, Diabetes"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">Price (₹)</label>
                                    <div className="relative group">
                                        <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            required
                                            placeholder="0.00"
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">Stock Qty</label>
                                    <input
                                        type="number"
                                        value={stock}
                                        onChange={(e) => setStock(e.target.value)}
                                        required
                                        placeholder="100"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">Medicine Image</label>
                                <div
                                    onClick={() => document.getElementById('imageInput').click()}
                                    className="group relative border-2 border-dashed border-gray-200 hover:border-[#2e7d32] bg-gray-50 p-6 rounded-2xl text-center cursor-pointer transition-all overflow-hidden"
                                >
                                    {imagePreview ? (
                                        <div className="relative h-32 w-full">
                                            <img src={imagePreview} alt="Preview" className="h-full w-full object-cover rounded-xl" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Upload className="text-white" size={24} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-4">
                                            <ImageIcon size={32} className="mx-auto mb-2 text-gray-300 group-hover:text-[#2e7d32] transition-colors" />
                                            <p className="text-sm font-bold text-gray-400 group-hover:text-[#2e7d32] transition-colors">Click to upload image</p>
                                        </div>
                                    )}
                                    <input id="imageInput" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                </div>
                            </div>

                            <button
                                disabled={uploading}
                                type="submit"
                                className="w-full py-4 bg-[#2e7d32] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1b5e20] active:scale-[0.98] transition-all shadow-lg shadow-green-900/10 disabled:opacity-70"
                            >
                                {uploading ? <><Loader2 className="animate-spin" size={20} /> Processing...</> : <><Upload size={20} /> Add Medicine</>}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="w-full py-4 bg-white text-[#2e7d32] border-2 border-[#2e7d32] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-50 active:scale-[0.98] transition-all"
                            >
                                <Package size={20} /> Add From List
                            </button>
                        </form>
                    </motion.div>

                    {/* List Section */}
                    <div className="lg:col-span-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-gray-800">Your Inventory</h2>
                            <span className="bg-green-100 text-[#2e7d32] px-4 py-1.5 rounded-full text-sm font-bold border border-green-200">{medicines.length} Items</span>
                        </div>

                        {loading ? (
                            <div className="h-64 flex items-center justify-center bg-white rounded-[2.5rem] shadow-sm"><Loader2 className="animate-spin text-[#2e7d32]" size={40} /></div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                <AnimatePresence>
                                    {medicines.map(med => (
                                        <motion.div key={med.id} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} layout className="bg-white p-5 rounded-[2rem] shadow-lg border border-gray-50 flex flex-col group hover:shadow-2xl transition-all">
                                            <div className="relative overflow-hidden rounded-2xl mb-4 h-48">
                                                <img src={med.imageURL} alt={med.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                            <div className="flex-grow">
                                                <h4 className="text-lg font-bold text-gray-800 mb-1">{med.name}</h4>
                                                <div className="flex items-center justify-between mt-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Price</p>
                                                        <p className="text-xl font-extrabold text-[#2e7d32]">₹{med.price}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Stock</p>
                                                        <p className="font-bold text-gray-700">{med.stock} units</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {medicines.length === 0 && (
                                    <div className="col-span-full py-20 text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                                        <Package size={60} className="mx-auto text-gray-200 mb-4" />
                                        <p className="text-lg font-bold text-gray-400 uppercase tracking-widest">No medicines added yet</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Orders Section */
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                            <ClipboardList className="text-[#2e7d32]" size={28} /> Active Orders
                        </h2>
                        <span className="bg-green-100 text-[#2e7d32] px-4 py-1.5 rounded-full text-sm font-bold border border-green-200">
                            {orders.length} Orders
                        </span>
                    </div>

                    {message.text && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold border ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                            {message.text}
                        </div>
                    )}

                    {loading ? (
                        <div className="h-64 flex items-center justify-center bg-white rounded-[2.5rem] shadow-sm"><Loader2 className="animate-spin text-[#2e7d32]" size={40} /></div>
                    ) : orders.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-[2.5rem] shadow-sm border border-gray-100">
                            <Package size={60} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-lg font-bold text-gray-400">No active orders right now.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <AnimatePresence>
                                {orders.map((order) => (
                                    <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-6 md:p-8 rounded-[2rem] shadow-md border relative overflow-hidden ${order.isEmergency ? 'bg-red-50 border-red-300 shadow-red-900/10' : 'bg-white border-gray-100'}`}>
                                        {order.isEmergency && (
                                            <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-lg shadow-sm z-[20] animate-pulse flex items-center gap-2">
                                                <Siren size={12} /> EMERGENCY REQUEST
                                            </div>
                                        )}

                                        {order.pharmacyId === 'broadcast' && (
                                            <div className="absolute inset-0 bg-red-50/90 backdrop-blur-[2px] z-[50] flex flex-col items-center justify-center p-6 text-center">
                                                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
                                                    <Siren size={32} />
                                                </div>
                                                <h3 className="text-xl font-black text-red-900 mb-2">NEW EMERGENCY NEARBY</h3>
                                                <p className="text-red-700 font-bold text-sm mb-6 max-w-[250px]">
                                                    This customer is <span className="underline">{order.distance} km</span> away and needs help immediately.
                                                </p>
                                                <button
                                                    onClick={() => handleAcceptEmergency(order.id)}
                                                    disabled={acceptingId === order.id}
                                                    className="bg-red-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-red-900/20 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-2"
                                                >
                                                    {acceptingId === order.id ? <Loader2 size={18} className="animate-spin" /> : <>Accept & Open Request <Check size={18} /></>}
                                                </button>
                                            </div>
                                        )}

                                        {/* Order Header */}
                                        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 mb-6 ${order.isEmergency ? 'border-red-200 mt-4' : 'border-gray-100'}`}>
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-xl font-black text-gray-800">Order #{order.id.slice(-6).toUpperCase()}</span>
                                                    {/* Granular delivery status badge */}
                                                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border ${order.orderStatus === 'pending' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                                                        order.deliveryStatus === 'assigned' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                            order.deliveryStatus === 'pickedUp' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                                                order.deliveryStatus === 'outForDelivery' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                                                    order.orderStatus === 'completed' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                                                                        'bg-green-50 text-[#2e7d32] border-green-200'
                                                        }`}>
                                                        {order.orderStatus === 'pending' ? 'Pending' :
                                                            order.deliveryStatus === 'assigned' ? '🏍️ Rider Assigned' :
                                                                order.deliveryStatus === 'pickedUp' ? '📦 Picked Up' :
                                                                    order.deliveryStatus === 'outForDelivery' ? '🚀 Out for Delivery' :
                                                                        order.orderStatus === 'completed' ? '✅ Completed' :
                                                                            order.orderStatus}
                                                    </span>
                                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-black uppercase tracking-widest rounded-md">
                                                        {order.paymentMethod}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                                                    Placed at {formatOrderDate(order.createdAt)}
                                                </p>
                                            </div>
                                            <div className="text-left md:text-right">
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Total Amount</p>
                                                <p className="text-2xl font-black text-[#2e7d32]">₹{order.totalAmount}</p>
                                            </div>
                                        </div>

                                        {/* Order Content */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Customer Details */}
                                            <div className="space-y-4">
                                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Customer Information</h3>
                                                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
                                                    <p className="font-bold text-gray-800">{order.customerInfo?.name || 'Customer'}</p>
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                                        <Phone size={14} className="text-[#2e7d32]" /> {order.customerInfo?.phone || order.deliveryAddress?.phone || 'N/A'}
                                                    </div>
                                                    <div className="flex items-start gap-2 text-sm text-gray-600 font-medium">
                                                        <MapPin size={16} className="text-[#2e7d32] mt-0.5 shrink-0" />
                                                        <p className="leading-tight">
                                                            {order.selectedAddress?.addressLine || order.selectedAddress?.address || order.customerInfo?.address || order.deliveryAddress?.address || 'Address not available'}<br />
                                                            {order.selectedAddress?.city || order.deliveryAddress?.city} - {order.selectedAddress?.pincode || order.deliveryAddress?.pincode}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Items List */}
                                            <div className="space-y-4">
                                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Order Items</h3>
                                                <div className={`rounded-2xl p-5 border max-h-48 overflow-y-auto space-y-3 ${order.isEmergency ? 'bg-white border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                                    {(order.items || []).map((item, idx) => (
                                                        <div key={idx} className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                                            <div className="flex justify-between items-center text-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-gray-800">{item?.name || 'Unknown Item'}</span>
                                                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                                                                        x{item?.quantity || 0}
                                                                    </span>
                                                                </div>
                                                                {!order.isPricingPending ? (
                                                                    <span className="font-bold text-[#2e7d32]">₹{(item?.price || 0) * (item?.quantity || 0)}</span>
                                                                ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-bold text-gray-400">Price per unit:</span>
                                                                        <div className="relative w-24">
                                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₹</span>
                                                                            <input
                                                                                type="number"
                                                                                value={pricingInputs[order.id]?.[item.requestId] || ''}
                                                                                onChange={(e) => handlePricingChange(order.id, item.requestId, e.target.value)}
                                                                                className="w-full pl-5 pr-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-[#2e7d32]"
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {order.emergencyNotes && (
                                                        <div className="pt-2 border-t border-red-100">
                                                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Customer Emergency Notes</p>
                                                            <p className="text-sm font-bold text-gray-800 italic bg-red-100/50 p-3 rounded-xl border border-red-200">{order.emergencyNotes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Rider Information - shown once assigned */}
                                        {order.riderName && (
                                            <div className="mt-6 space-y-2">
                                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Delivery Rider</h3>
                                                <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 flex items-center gap-5">
                                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                                                        <Truck className="text-blue-600" size={24} />
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="font-black text-gray-900">{order.riderName}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Phone size={12} className="text-blue-500" />
                                                            <a href={`tel:${order.riderPhone}`} className="text-sm font-bold text-blue-600 hover:underline">{order.riderPhone || 'N/A'}</a>
                                                        </div>
                                                    </div>
                                                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${order.deliveryStatus === 'assigned' ? 'bg-blue-100 text-blue-700' :
                                                            order.deliveryStatus === 'pickedUp' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-purple-100 text-purple-700'
                                                        }`}>
                                                        {order.deliveryStatus === 'assigned' ? 'Heading to Pickup' :
                                                            order.deliveryStatus === 'pickedUp' ? 'En Route' :
                                                                'Out for Delivery'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {(order.prescriptionURL || (order.paymentMethod === 'UPI' && order.paymentScreenshotURL)) && (
                                            <div className="mt-8 p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex flex-col md:flex-row items-center gap-6">
                                                <div className="shrink-0 group relative">
                                                    <img
                                                        src={order.prescriptionURL ? order.prescriptionURL : order.paymentScreenshotURL}
                                                        alt={order.prescriptionURL ? "Prescription" : "Payment Proof"}
                                                        className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-2xl shadow-xl border-4 border-white cursor-zoom-in hover:scale-[1.02] transition-transform"
                                                        onClick={() => window.open(order.prescriptionURL || order.paymentScreenshotURL, '_blank')}
                                                    />
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center pointer-events-none">
                                                        <Plus className="text-white" size={32} />
                                                    </div>
                                                </div>
                                                <div className="text-center md:text-left space-y-2">
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border border-blue-50">
                                                        <Info size={14} /> {order.prescriptionURL ? 'Prescription Review' : 'Verification Required'}
                                                    </div>
                                                    <h4 className="text-lg font-black text-gray-800 italic tracking-tighter">
                                                        {order.prescriptionURL ? 'Customer Prescription Image' : 'Customer Payment Screenshot'}
                                                    </h4>
                                                    <p className="text-sm font-bold text-gray-500 leading-relaxed max-w-md">
                                                        {order.prescriptionURL 
                                                            ? 'Please review the uploaded prescription carefully before confirming the exact medicine and price for this order.'
                                                            : 'Please verify this transaction in your bank/payment app before confirming the order. Click the image to view full size.'}
                                                    </p>
                                                    <a
                                                        href={order.prescriptionURL || order.paymentScreenshotURL}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[#2e7d32] font-black text-xs uppercase tracking-widest hover:underline inline-block mt-2"
                                                    >
                                                        View Full Image &rarr;
                                                    </a>
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4 justify-end">
                                            {order.orderStatus === 'pending' && (
                                                <>
                                                    {orderToReject === order.id ? (
                                                        <div className="flex items-center gap-3 bg-red-50 p-2 rounded-xl border border-red-100">
                                                            <span className="text-xs font-bold text-red-600 px-2">Reject this order?</span>
                                                            <button
                                                                onClick={() => handleRejectOrder(order.id)}
                                                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all"
                                                            >
                                                                Yes, Reject
                                                            </button>
                                                            <button
                                                                onClick={() => setOrderToReject(null)}
                                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-300 transition-all"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setOrderToReject(order.id)}
                                                            className="px-6 py-3 border-2 border-red-500 text-red-500 rounded-xl font-bold hover:bg-red-50 transition-all"
                                                        >
                                                            Reject Order
                                                        </button>
                                                    )}

                                                    {order.isPricingPending ? (
                                                        <button
                                                            onClick={() => handleSavePricing(order.id)}
                                                            className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-900/10"
                                                        >
                                                            <Check size={18} /> Save Pricing & Confirm
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                                            className="px-8 py-3 bg-[#2e7d32] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1b5e20] active:scale-95 transition-all shadow-lg shadow-green-900/10"
                                                        >
                                                            <Check size={18} /> Confirm & Assign Rider
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            {order.orderStatus === 'confirmed' && order.deliveryStatus === 'unassigned' && (
                                                <div className="px-6 py-3 bg-yellow-50 text-yellow-700 rounded-xl font-bold flex items-center gap-2 border border-yellow-100 italic">
                                                    <Loader2 className="animate-spin" size={16} />
                                                    Waiting for Rider to Accept...
                                                </div>
                                            )}
                                            {order.orderStatus === 'confirmed' && order.deliveryStatus === 'assigned' && (
                                                <div className="px-6 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold flex items-center gap-2 border border-blue-100">
                                                    <Truck size={16} className="animate-pulse" />
                                                    Rider heading to pickup
                                                </div>
                                            )}
                                            {order.deliveryStatus === 'pickedUp' && (
                                                <div className="px-6 py-3 bg-orange-50 text-orange-700 rounded-xl font-bold flex items-center gap-2 border border-orange-100">
                                                    <Package size={16} />
                                                    Order Picked Up by Rider
                                                </div>
                                            )}
                                            {order.deliveryStatus === 'outForDelivery' && (
                                                <div className="px-6 py-3 bg-purple-50 text-purple-700 rounded-xl font-bold flex items-center gap-2 border border-purple-100">
                                                    <Truck size={16} className="animate-pulse" />
                                                    Out for Delivery
                                                </div>
                                            )}
                                            {order.orderStatus === 'completed' && (
                                                <div className="px-8 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold flex items-center justify-center gap-2">
                                                    <CheckCircle2 size={18} /> Delivery Completed
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>
            )}

            {/* === MODAL 1: Select From List === */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">Add From Medicine List</h2>
                                    <p className="text-gray-400 text-sm mt-0.5">Select medicines to add to your inventory</p>
                                </div>
                                <button
                                    onClick={() => { setIsModalOpen(false); setSelectedMeds([]); setSearchQuery(''); }}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
                                >
                                    <Plus className="rotate-45" size={24} />
                                </button>
                            </div>

                            {/* Search Bar */}
                            <div className="px-6 pt-5 pb-3">
                                <div className="relative group">
                                    <Package size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search medicines by name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all"
                                    />
                                </div>
                            </div>

                            {/* Medicine Grid */}
                            <div className="flex-1 overflow-y-auto px-6 pb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {masterMedicines
                                    .filter(med => med.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map((med, index) => {
                                        const isSelected = selectedMeds.some(m => m.name === med.name);
                                        return (
                                            <div
                                                key={index}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedMeds(prev => prev.filter(m => m.name !== med.name));
                                                    } else {
                                                        setSelectedMeds(prev => [...prev, med]);
                                                    }
                                                }}
                                                className={`relative p-3 rounded-2xl border-2 cursor-pointer transition-all group ${isSelected
                                                    ? 'border-[#2e7d32] bg-green-50 shadow-md'
                                                    : 'border-gray-100 bg-white hover:border-green-200 hover:shadow-md'
                                                    }`}
                                            >
                                                <div className="relative h-24 w-full rounded-xl overflow-hidden mb-3">
                                                    <img
                                                        src={med.imageURL}
                                                        alt={med.name}
                                                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                    <div className={`absolute top-1.5 right-1.5 rounded-full p-1 ${isSelected ? 'bg-[#2e7d32] text-white' : 'bg-white/80 text-gray-300'} transition-colors shadow`}>
                                                        <CheckCircle2 size={14} />
                                                    </div>
                                                </div>
                                                <p className="font-bold text-gray-800 text-xs leading-tight mb-1">{med.name}</p>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">{med.category}</span>
                                            </div>
                                        );
                                    })}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                                <p className="text-sm font-bold text-gray-500">
                                    <span className="text-[#2e7d32] text-base">{selectedMeds.length}</span> selected
                                </p>
                                <button
                                    disabled={selectedMeds.length === 0}
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setSearchQuery('');
                                        const initialDetails = {};
                                        selectedMeds.forEach(med => {
                                            initialDetails[med.name] = { price: '', stock: '' };
                                        });
                                        setInventoryDetails(initialDetails);
                                        setIsDetailsModalOpen(true);
                                    }}
                                    className="px-8 py-3 bg-[#2e7d32] text-white rounded-xl font-bold hover:bg-[#1b5e20] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-green-900/10"
                                >
                                    Save Selected →
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* === MODAL 2: Enter Inventory Details === */}
            <AnimatePresence>
                {isDetailsModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">Enter Inventory Details</h2>
                                    <p className="text-gray-400 text-sm mt-0.5">Set price & stock for each medicine</p>
                                </div>
                                <button
                                    onClick={() => { setIsDetailsModalOpen(false); setIsModalOpen(true); }}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
                                    title="Go back"
                                >
                                    <Plus className="rotate-45" size={24} />
                                </button>
                            </div>

                            {/* Medicine Detail List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {selectedMeds.map((med, index) => (
                                    <div key={index} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <img
                                            src={med.imageURL}
                                            alt={med.name}
                                            className="h-14 w-14 rounded-xl object-cover flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-800 truncate">{med.name}</p>
                                            <p className="text-xs text-gray-400 font-medium">{med.category}</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Price (₹)</label>
                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={inventoryDetails[med.name]?.price || ''}
                                                    onChange={(e) => setInventoryDetails(prev => ({
                                                        ...prev,
                                                        [med.name]: { ...prev[med.name], price: e.target.value }
                                                    }))}
                                                    className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Stock</label>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    value={inventoryDetails[med.name]?.stock || ''}
                                                    onChange={(e) => setInventoryDetails(prev => ({
                                                        ...prev,
                                                        [med.name]: { ...prev[med.name], stock: e.target.value }
                                                    }))}
                                                    className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50">
                                <button
                                    disabled={saving}
                                    onClick={handleSaveToInventory}
                                    className="w-full py-4 bg-[#2e7d32] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1b5e20] active:scale-[0.98] transition-all shadow-lg shadow-green-900/10 disabled:opacity-70"
                                >
                                    {saving ? <><Loader2 className="animate-spin" size={20} /> Saving...</> : <><CheckCircle2 size={20} /> Add To Inventory</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PharmacyDashboard;

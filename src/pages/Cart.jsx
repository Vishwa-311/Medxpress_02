import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, ChevronRight, MapPin, ShieldCheck, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateDistance } from '../utils/geoUtils';
import { db } from '../firebase';
import { getDoc, doc } from 'firebase/firestore';
import AddressModal from '../components/modals/AddressModal';
import AddressPickerModal from '../components/modals/AddressPickerModal';

const Cart = () => {
    const { cart, updateQuantity, removeFromCart, cartTotal } = useCart();
    const { userData } = useAuth();
    const navigate = useNavigate();

    const addresses = React.useMemo(() => userData?.addresses || [], [userData?.addresses]);
    const [selectedAddressId, setSelectedAddressId] = React.useState(
        addresses.find(a => a.isDefault)?.id || addresses[0]?.id || null
    );

    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [isPickerOpen, setIsPickerOpen] = React.useState(false);

    // Update selected address if addresses change and none selected
    React.useEffect(() => {
        if (!selectedAddressId && addresses.length > 0) {
            setSelectedAddressId(addresses.find(a => a.isDefault)?.id || addresses[0].id);
        }
    }, [addresses, selectedAddressId]);

    const [deliveryFee, setDeliveryFee] = React.useState(25);
    const [pharmacyData, setPharmacyData] = React.useState(null);

    React.useEffect(() => {
        const fetchPharmacy = async () => {
            if (cart.length === 0) return;
            const pharmaId = cart[0].pharmacyId;
            if (!pharmaId) return;

            try {
                const pharmaDoc = await getDoc(doc(db, 'users', pharmaId));
                if (pharmaDoc.exists()) {
                    setPharmacyData(pharmaDoc.data());
                }
            } catch (err) {
                console.error("Error fetching pharmacy info:", err);
            }
        };
        fetchPharmacy();
    }, [cart]);

    React.useEffect(() => {
        if (pharmacyData?.latitude && pharmacyData?.longitude && selectedAddressId) {
            const addr = addresses.find(a => a.id === selectedAddressId);
            if (addr?.latitude && addr?.longitude) {
                const dist = calculateDistance(addr.latitude, addr.longitude, pharmacyData.latitude, pharmacyData.longitude);
                if (dist < 1) setDeliveryFee(20);
                else if (dist < 2) setDeliveryFee(24);
                else if (dist < 3) setDeliveryFee(28);
                else setDeliveryFee(32);
            } else {
                setDeliveryFee(25);
            }
        }
    }, [pharmacyData, selectedAddressId, addresses]);

    const onAddAddress = (newAddr) => {
        setSelectedAddressId(newAddr.id);
    };

    const handleCheckout = () => {
        if (cart.length === 0) return;
        navigate('/checkout');
    };

    const selectedAddress = addresses.find(a => a.id === selectedAddressId);

    if (cart.length === 0) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-white">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                >
                    <div className="w-48 h-48 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
                        <ShoppingBag size={80} className="text-gray-200" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-800 mb-4">Your Tray is Empty</h2>
                    <p className="text-gray-500 font-medium mb-10 max-w-sm mx-auto">
                        Looks like you haven't added any medicines yet. Browse stores nearby to find what you need.
                    </p>
                    <button
                        onClick={() => navigate('/customer-dashboard')}
                        className="px-10 py-4 bg-[#2e7d32] text-white rounded-2xl font-bold hover:bg-[#1b5e20] transition-all shadow-xl shadow-green-900/10 active:scale-95"
                    >
                        Browse Pharmacies
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-10 md:py-16">
            <button
                onClick={() => navigate('/customer-dashboard')}
                className="flex items-center gap-2 text-[#2e7d32] font-bold mb-10 hover:opacity-70 transition-opacity group"
            >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                Back to Dashboard
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Column: Items */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-3xl font-black text-gray-800">Your Tray</h1>
                        <span className="text-sm font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                            {cart.length} {cart.length === 1 ? 'Item' : 'Items'}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {cart.map((item) => (
                            <motion.div
                                key={item.medicineId}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 group hover:shadow-md transition-all"
                            >
                                {/* Item Image */}
                                <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shrink-0">
                                    <img
                                        src={item.imageURL}
                                        alt={item.name}
                                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>

                                {/* Item Info */}
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black text-[#2e7d32] bg-green-50 px-2 py-0.5 rounded-md uppercase">
                                            {item.category || 'Medicine'}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 truncate mb-0.5">{item.name}</h3>
                                    <p className="text-sm font-bold text-[#2e7d32] mb-3">₹{item.price}</p>

                                    <div className="flex items-center justify-between mt-auto">
                                        {/* Quantity Selector */}
                                        <div className="flex items-center bg-gray-50 text-gray-800 rounded-xl border border-gray-100 overflow-hidden">
                                            <button
                                                onClick={() => updateQuantity(item.medicineId, -1)}
                                                className="p-2 hover:bg-gray-200 transition-colors"
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <span className="w-10 text-center font-black text-sm">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.medicineId, 1)}
                                                className="p-2 hover:bg-gray-200 transition-colors"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => removeFromCart(item.medicineId)}
                                            className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                            title="Remove item"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Delivery Info */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Delivery Details</h3>
                            {addresses.length > 0 && (
                                <button
                                    onClick={() => setIsPickerOpen(true)}
                                    className="text-[#2e7d32] text-sm font-bold hover:underline"
                                >
                                    Change
                                </button>
                            )}
                        </div>

                        {selectedAddress ? (
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-[#2e7d32] shrink-0">
                                    <MapPin size={24} />
                                </div>
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="text-sm font-bold text-gray-800">{selectedAddress.label}</p>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selected</span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium truncate max-w-[250px]">
                                        {selectedAddress.addressLine || selectedAddress.address}, {selectedAddress.city}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsPickerOpen(true)}
                                    className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors md:hidden"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 py-2">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 shrink-0">
                                    <MapPin size={24} />
                                </div>
                                <div className="flex-grow">
                                    <p className="text-sm font-bold text-gray-400">No address selected</p>
                                    <p className="text-xs text-gray-300 font-medium tracking-tight">Add a delivery location to continue</p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="px-4 py-2 bg-green-50 text-[#2e7d32] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-100 transition-colors"
                                >
                                    Add New
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Order Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-lg sticky top-24">
                        <h2 className="text-xl font-black text-gray-800 mb-8">Bill Details</h2>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center text-gray-500 font-medium">
                                <span>Item Total</span>
                                <span>₹{cartTotal}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-500 font-medium">
                                <span>Delivery Fee</span>
                                <span>₹{deliveryFee}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-500 font-medium pb-4 border-b border-gray-50">
                                <span>Handling Charge</span>
                                <span>₹2</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-900 font-black text-xl pt-2">
                                <span>To Pay</span>
                                <span>₹{cartTotal + deliveryFee + 2}</span>
                            </div>
                        </div>

                        {/* Order Benefits */}
                        <div className="space-y-4 mb-10">
                            <div className="flex items-start gap-3 bg-[#2e7d32]/5 p-4 rounded-2xl border border-[#2e7d32]/10">
                                <Zap size={18} className="text-[#2e7d32] mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-black text-[#2e7d32] uppercase tracking-wider mb-0.5">Rapid Delivery</p>
                                    <p className="text-[10px] text-gray-500 font-bold leading-tight">Order now to get delivery in 15-20 mins.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                <ShieldCheck size={18} className="text-blue-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-black text-blue-500 uppercase tracking-wider mb-0.5">Safe & Secure</p>
                                    <p className="text-[10px] text-gray-500 font-bold leading-tight">Authentic medicines guaranteed from verified pharmacies.</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleCheckout}
                            className="w-full py-5 bg-[#2e7d32] text-white rounded-2xl font-black text-lg shadow-xl shadow-green-900/10 hover:bg-[#1b5e20] transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            Proceed to Checkout
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <AddressPickerModal
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                addresses={addresses}
                selectedId={selectedAddressId}
                onSelect={(id) => setSelectedAddressId(id)}
                onAddNew={() => setIsModalOpen(true)}
            />

            <AddressModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={onAddAddress}
                initialPhone={userData?.phone}
            />
        </div>
    );
};

export default Cart;

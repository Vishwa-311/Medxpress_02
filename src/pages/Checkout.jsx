import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { arrayUnion, doc, updateDoc, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { ArrowLeft, MapPin, Phone, Building2, CreditCard, Wallet, Truck, CheckCircle2, Loader2, Info, X, Navigation, Plus, ChevronRight, Upload, Download, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentLocation } from '../utils/geoUtils';
import AddressModal from '../components/modals/AddressModal';
import AddressPickerModal from '../components/modals/AddressPickerModal';

const Checkout = () => {
    const { cart, cartTotal, clearCart } = useCart();
    const { userData, currentUser, logout, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Helper to deeply remove undefined values for Firestore
    const sanitizeForFirestore = (obj) => {
        if (Array.isArray(obj)) return obj.map(v => sanitizeForFirestore(v));
        if (obj !== null && typeof obj === 'object') {
            return Object.fromEntries(
                Object.entries(obj).map(([k, v]) => [k, sanitizeForFirestore(v)])
            );
        }
        return obj === undefined ? null : obj;
    };

    const [addresses, setAddresses] = useState(userData?.addresses || []);
    const [selectedAddressId, setSelectedAddressId] = useState(
        addresses.find(a => a.isDefault)?.id || addresses[0]?.id || null
    );
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [pharmacyData, setPharmacyData] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [paymentScreenshot, setPaymentScreenshot] = useState(null);
    const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState(null);
    const [isFetchingPharma, setIsFetchingPharma] = useState(false);

    // Sync addresses from userData when it changes
    useEffect(() => {
        if (userData?.addresses) {
            setAddresses(userData.addresses);
            if (!selectedAddressId && userData.addresses.length > 0) {
                setSelectedAddressId(userData.addresses.find(a => a.isDefault)?.id || userData.addresses[0]?.id);
            }
        }
    }, [userData, selectedAddressId]);

    // Fetch Pharmacy Data for Payment Options
    useEffect(() => {
        const fetchPharmacy = async () => {
            if (cart.length === 0) return;
            const pharmaId = cart[0].pharmacyId;
            if (!pharmaId) return;

            try {
                setIsFetchingPharma(true);
                const pharmaDoc = await getDoc(doc(db, 'users', pharmaId));
                if (pharmaDoc.exists()) {
                    setPharmacyData(pharmaDoc.data());
                }
            } catch (err) {
                console.error("Error fetching pharmacy info:", err);
            } finally {
                setIsFetchingPharma(false);
            }
        };
        fetchPharmacy();
    }, [cart]);

    const onAddAddress = (newAddress) => {
        setAddresses(prev => [...prev, newAddress]);
        setSelectedAddressId(newAddress.id);
    };

    const handleScreenshotChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPaymentScreenshot(file);
            const reader = new FileReader();
            reader.onloadend = () => setPaymentScreenshotPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        if (cart.length === 0) return;

        const finalAddress = addresses.find(a => a.id === selectedAddressId);
        if (!finalAddress) {
            alert("Please select a valid delivery address.");
            return;
        }

        if (paymentMethod === 'UPI' && !paymentScreenshot) {
            alert("Please upload the payment screenshot for UPI verification.");
            return;
        }

        setIsPlacingOrder(true);

        try {
            const firstPharmacyId = cart[0]?.pharmacyId;
            if (!firstPharmacyId) throw new Error("Invalid cart data: missing pharmacy info.");

            let screenshotURL = '';
            // Upload Screenshot if UPI
            if (paymentMethod === 'UPI' && paymentScreenshot) {
                const reader = new FileReader();
                screenshotURL = await new Promise((resolve, reject) => {
                    reader.readAsDataURL(paymentScreenshot);
                    reader.onloadend = async () => {
                        try {
                            const base64Image = reader.result.split(',')[1];
                            const formData = new FormData();
                            formData.append('image', base64Image);
                            const response = await fetch(`https://api.imgbb.com/1/upload?key=6c27feddb60aeeafcd67027ee83cd504`, {
                                method: 'POST',
                                body: formData
                            });
                            const data = await response.json();
                            if (data.success) resolve(data.data.display_url);
                            else reject(new Error("Screenshot Upload Failed"));
                        } catch (err) { reject(err); }
                    };
                });
            }

            const orderData = {
                customerId: currentUser.uid,
                pharmacyId: firstPharmacyId,
                customerInfo: {
                    name: currentUser.displayName || userData?.name || 'Customer',
                    phone: finalAddress.phone,
                },
                selectedAddress: {
                    label: finalAddress.label,
                    addressLine: finalAddress.addressLine || finalAddress.address || "", // Fallback
                    latitude: finalAddress.latitude ?? null, // Fix undefined crash
                    longitude: finalAddress.longitude ?? null, // Fix undefined crash
                    city: finalAddress.city || "",
                    pincode: finalAddress.pincode || ""
                },
                items: cart,
                totalAmount: cartTotal + 2,
                paymentMethod: paymentMethod,
                paymentScreenshotURL: screenshotURL || null,
                paymentStatus: "pending",
                orderStatus: "pending",
                riderId: null, // Critical for Firestore queries
                deliveryStatus: null, // Will be "unassigned" after pharmacy confirms
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'orders'), sanitizeForFirestore(orderData));
            clearCart();
            setOrderSuccess(true);
            setTimeout(() => {
                navigate(`/order-tracking/${docRef.id}`);
            }, 2000);
        } catch (err) {
            console.error("Order placement failed:", err);
            alert('Failed to place order: ' + err.message);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    if (orderSuccess) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 text-[#2e7d32]">
                        <CheckCircle2 size={60} />
                    </div>
                    <h1 className="text-4xl font-black text-gray-800 mb-4">Order Placed!</h1>
                    <p className="text-gray-500 font-bold mb-8 text-lg">Your medicines are on the way.</p>
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-[#2e7d32]" size={24} />
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Opening tracking page...</p>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (authLoading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-[#2e7d32]" size={40} />
                <p className="text-gray-500 font-black uppercase tracking-widest text-sm">Loading checkout...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-16">
            <button onClick={() => navigate('/cart')} className="flex items-center gap-2 text-[#2e7d32] font-bold mb-10 hover:opacity-70 transition-opacity group">
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                Back to Cart
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                    <h1 className="text-4xl font-black text-gray-800 mb-12 italic tracking-tighter">Secure Checkout</h1>

                    <div className="space-y-10">
                        {/* Delivery Section */}
                        <section className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50/50 rounded-bl-full -z-0" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
                                        Delivery Address
                                    </h2>
                                    {addresses.length > 0 && (
                                        <button
                                            onClick={() => setIsPickerOpen(true)}
                                            className="text-sm font-black text-[#2e7d32] bg-green-50 px-4 py-2 rounded-xl hover:bg-green-100 transition-colors flex items-center gap-2"
                                        >
                                            Change
                                        </button>
                                    )}
                                </div>

                                {selectedAddressId ? (
                                    (() => {
                                        const addr = addresses.find(a => a.id === selectedAddressId);
                                        if (!addr) return null;
                                        return (
                                            <div className="p-6 rounded-[2rem] border-2 border-[#2e7d32] bg-green-50/50 shadow-sm flex items-center justify-between group">
                                                <div className="flex items-start gap-4">
                                                    <div className="p-3 rounded-2xl bg-[#2e7d32] text-white">
                                                        <MapPin size={24} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#2e7d32] bg-white px-2 py-0.5 rounded-md border border-green-100">
                                                                {addr.label}
                                                            </span>
                                                            <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Selected</span>
                                                        </div>
                                                        <p className="font-bold text-gray-800 leading-tight">{addr.addressLine || addr.address}</p>
                                                        <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-wider">{addr.city} - {addr.pincode}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setIsPickerOpen(true)}
                                                    className="p-2 text-[#2e7d32] hover:bg-white rounded-full transition-colors md:hidden"
                                                >
                                                    <ChevronRight size={24} />
                                                </button>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] p-12 text-center flex flex-col items-center justify-center">
                                        <MapPin size={48} className="text-gray-300 mb-4" />
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">No addresses found</h3>
                                        <p className="text-gray-500 font-medium mb-6">Please add a delivery address to continue.</p>
                                        <button
                                            onClick={() => setIsModalOpen(true)}
                                            className="px-8 py-3 bg-[#2e7d32] text-white rounded-xl font-black shadow-lg shadow-green-900/10 active:scale-95"
                                        >
                                            Add My First Address
                                        </button>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Payment Method Section */}
                        <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                            <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3">
                                <CreditCard size={24} className="text-[#2e7d32]" />
                                Payment Method
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                                <div
                                    onClick={() => setPaymentMethod('COD')}
                                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'COD' ? 'border-[#2e7d32] bg-green-50' : 'border-gray-100 hover:border-gray-200'}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-colors ${paymentMethod === 'COD' ? 'bg-white text-[#2e7d32]' : 'bg-gray-50 text-gray-400'}`}>
                                        <Wallet size={20} />
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-800 tracking-tight">Cash on Delivery</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Pay at doorstep</p>
                                    </div>
                                    <div className="ml-auto">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === 'COD' ? 'border-[#2e7d32] bg-[#2e7d32]' : 'border-gray-300'}`}>
                                            {paymentMethod === 'COD' && <CheckCircle2 size={12} className="text-white" />}
                                        </div>
                                    </div>
                                </div>

                                {pharmacyData?.acceptUPI ? (
                                    <div
                                        onClick={() => setPaymentMethod('UPI')}
                                        className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'UPI' ? 'border-[#2e7d32] bg-green-50' : 'border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-colors ${paymentMethod === 'UPI' ? 'bg-white text-[#2e7d32]' : 'bg-gray-50 text-gray-400'}`}>
                                            <QrCode size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-800 tracking-tight">Online UPI</p>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Scan & Pay</p>
                                        </div>
                                        <div className="ml-auto">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === 'UPI' ? 'border-[#2e7d32] bg-[#2e7d32]' : 'border-gray-300'}`}>
                                                {paymentMethod === 'UPI' && <CheckCircle2 size={12} className="text-white" />}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 p-5 rounded-2xl border border-gray-100 bg-gray-50/50 opacity-60 cursor-not-allowed">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-300 shadow-sm border border-gray-100">
                                            <QrCode size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-400">Online UPI</p>
                                            <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest mt-0.5">Not Available</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* UPI Instruction Section */}
                            <AnimatePresence>
                                {paymentMethod === 'UPI' && pharmacyData?.qrCodeURL && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        className="mt-10 border-t border-dashed border-gray-200 pt-10"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                                            <div className="space-y-6 text-center md:text-left">
                                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                                                    <Info size={14} /> Step-by-Step Payment
                                                </div>
                                                <h3 className="text-2xl font-black text-gray-800 italic tracking-tighter">Scan & Upload Screenshot</h3>
                                                <ul className="space-y-4 text-sm font-bold text-gray-500">
                                                    <li className="flex items-start gap-4">
                                                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0">1</span>
                                                        <span>Download or Scan the QR code shown here using your payment app (Google Pay, PhonePe, etc.).</span>
                                                    </li>
                                                    <li className="flex items-start gap-4">
                                                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0">2</span>
                                                        <span>Complete the total payment of <span className="text-[#2e7d32]">₹{cartTotal + 2}</span> to the pharmacy.</span>
                                                    </li>
                                                    <li className="flex items-start gap-4">
                                                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0">3</span>
                                                        <span>Take a screenshot of the successful transaction and upload it below.</span>
                                                    </li>
                                                </ul>

                                                <div className="pt-4">
                                                    <a
                                                        href={pharmacyData.qrCodeURL}
                                                        download="PharmacyQR.png"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="px-6 py-3 bg-gray-900 text-white rounded-xl font-black text-sm flex items-center justify-center md:justify-start gap-2 hover:bg-black transition-all w-full md:w-auto active:scale-95"
                                                    >
                                                        <Download size={18} /> Download QR Code
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center gap-8">
                                                <div className="p-4 bg-white rounded-[2rem] border border-gray-100 shadow-2xl relative group">
                                                    <div className="absolute inset-0 bg-green-500/5 blur-2xl rounded-full -z-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="relative z-10 p-2 bg-white rounded-2xl border border-gray-50">
                                                        <img
                                                            src={pharmacyData.qrCodeURL}
                                                            alt="Pharmacy QR"
                                                            className="w-[200px] h-[200px] object-contain rounded-xl"
                                                        />
                                                    </div>
                                                    <div className="mt-4 text-center">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{pharmacyData.ownerName || 'Verified'}'s UPI QR</p>
                                                    </div>
                                                </div>

                                                <div className="w-full">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Upload Payment Proof</p>
                                                    <div
                                                        onClick={() => document.getElementById('screenshot-upload').click()}
                                                        className="border-2 border-dashed border-gray-200 rounded-3xl p-6 text-center hover:border-[#2e7d32] transition-all cursor-pointer bg-gray-50 group min-h-[140px] flex flex-col items-center justify-center"
                                                    >
                                                        <input id="screenshot-upload" type="file" hidden accept="image/*" onChange={handleScreenshotChange} />
                                                        {paymentScreenshotPreview ? (
                                                            <div className="flex items-center gap-4 w-full">
                                                                <img src={paymentScreenshotPreview} alt="Screenshot" className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-md" />
                                                                <div className="text-left flex-grow">
                                                                    <p className="text-sm font-black text-gray-800 line-clamp-1">{paymentScreenshot.name}</p>
                                                                    <p className="text-[10px] text-[#2e7d32] font-black uppercase tracking-widest mt-0.5">Screenshot Ready!</p>
                                                                </div>
                                                                <div className="p-2 bg-white rounded-full text-[#2e7d32] shadow-sm">
                                                                    <CheckCircle2 size={24} />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-[#2e7d32] shadow-sm transition-colors mb-3">
                                                                    <Upload size={24} />
                                                                </div>
                                                                <p className="text-sm font-black text-gray-800">Choose Screenshot</p>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Proof of Successful UPI Payment</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </section>
                    </div>
                </div>

                {/* Order Summary Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl sticky top-24 overflow-hidden">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-green-50 rounded-full blur-3xl -z-0" />

                        <div className="relative z-10">
                            <h2 className="text-xl font-black text-gray-800 mb-8 border-b border-gray-50 pb-4">Order Summary</h2>

                            <div className="max-h-[300px] overflow-y-auto pr-2 mb-8 space-y-4 custom-scrollbar">
                                {cart.map(item => (
                                    <div key={item.medicineId} className="flex justify-between items-center gap-4 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gray-50 rounded-2xl p-2 border border-gray-100 group-hover:bg-white transition-colors">
                                                <img src={item.imageURL} alt="" className="w-full h-full object-contain" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-800 line-clamp-1">{item.name}</p>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{item.quantity} x ₹{item.price}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-black text-gray-700">₹{item.price * item.quantity}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 pt-6 mt-6 border-t border-gray-50 mb-8">
                                <div className="flex justify-between text-gray-500 font-bold text-sm">
                                    <span>Subtotal</span>
                                    <span>₹{cartTotal}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-500 font-bold text-sm">
                                    <span className="flex items-center gap-1">Delivery Fee <Info size={12} /></span>
                                    <span className="text-[#2e7d32] font-black text-[10px] bg-green-50 px-2 py-0.5 rounded-md uppercase tracking-widest">Free</span>
                                </div>
                                <div className="flex justify-between text-gray-500 font-bold text-sm">
                                    <span>Packaging & Handling</span>
                                    <span>₹2</span>
                                </div>
                                <div className="flex justify-between items-center pt-6 text-gray-900 font-black text-2xl tracking-tighter italic">
                                    <span>Total Payable</span>
                                    <span className="text-[#2e7d32]">₹{cartTotal + 2}</span>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 p-4 rounded-2xl flex items-start gap-3 mb-8 border border-blue-50">
                                <Truck size={20} className="text-blue-500 shrink-0" />
                                <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                    Verified MedXpress delivery. Your medicines will reach you in <span className="text-blue-600">30-45 mins</span>.
                                </p>
                            </div>

                            <button
                                onClick={handlePlaceOrder}
                                disabled={isPlacingOrder || addresses.length === 0}
                                className="w-full py-5 bg-[#2e7d32] text-white rounded-2xl font-black text-lg shadow-xl shadow-green-900/20 hover:bg-[#1b5e20] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group"
                            >
                                {isPlacingOrder ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <>
                                        Place Order <CheckCircle2 size={24} className="group-hover:rotate-12 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
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
                userId={currentUser?.uid}
                initialPhone={userData?.phone}
            />
        </div>
    );
};

export default Checkout;

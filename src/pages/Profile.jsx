import React, { useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { User, MapPin, Phone, Mail, Plus, Trash2, Edit2, Shield, HeartPulse, Navigation, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentLocation } from '../utils/geoUtils';

const Profile = () => {
    const { userData, saveAddress, removeAddress, setDefaultAddress } = useAuth();

    const [isAdding, setIsAdding] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        label: 'Home',
        addressLine: '',
        city: '',
        pincode: '',
        phone: userData?.phone || '',
        latitude: null,
        longitude: null
    });

    const addresses = userData?.addresses || [];

    const handleOpenForm = (address = null) => {
        if (address) {
            setForm({
                ...address,
                latitude: address.latitude ?? null,
                longitude: address.longitude ?? null
            });
            setEditingId(address.id);
        } else {
            setForm({
                label: 'Home',
                addressLine: '',
                city: '',
                pincode: '',
                phone: userData?.phone || '',
                latitude: null,
                longitude: null
            });
            setEditingId(null);
        }
        setIsAdding(true);
    };

    const handleCaptureLocation = async () => {
        setIsLocating(true);
        try {
            const loc = await getCurrentLocation();
            setForm(prev => ({ ...prev, latitude: loc.lat, longitude: loc.lng }));
        } catch (err) {
            alert("Error capturing location: " + err.message);
        } finally {
            setIsLocating(false);
        }
    };

    const handleSaveAddress = async (e) => {
        e.preventDefault();
        try {
            await saveAddress({
                ...form,
                id: editingId,
                latitude: form.latitude ?? null,
                longitude: form.longitude ?? null
            });
            setIsAdding(false);
        } catch {
            alert('Failed to save address');
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-16">
            <h1 className="text-4xl font-black text-gray-800 mb-12 flex items-center gap-4">
                <User className="text-[#2e7d32]" size={40} />
                My Profile
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Personal Info */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-[100px] -z-0" />
                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-[#2e7d32] text-white rounded-3xl flex items-center justify-center text-3xl font-black shadow-lg shadow-green-900/20 mb-6">
                                {userData?.name?.charAt(0) || 'U'}
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 mb-2">{userData?.name || 'Customer'}</h2>

                            <div className="space-y-4 mt-8">
                                <div className="flex items-center gap-3 text-gray-600 font-medium">
                                    <Phone size={18} className="text-[#2e7d32]" />
                                    {userData?.phone || 'No phone added'}
                                </div>
                                <div className="flex items-center gap-3 text-gray-600 font-medium">
                                    <Mail size={18} className="text-[#2e7d32]" />
                                    {userData?.email || 'No email added'}
                                </div>
                                <div className="flex items-center gap-3 text-gray-600 font-medium">
                                    <Shield size={18} className="text-[#2e7d32]" />
                                    Account verified
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#2e7d32]/5 p-6 rounded-3xl border border-[#2e7d32]/10 flex items-start gap-4">
                        <HeartPulse className="text-[#2e7d32] shrink-0 mt-1" size={24} />
                        <div>
                            <h3 className="font-bold text-[#2e7d32] mb-1">MedXpress Plus</h3>
                            <p className="text-xs text-gray-600 font-medium leading-relaxed">You are eligible for free deliveries on all orders above ₹500. Save addresses to checkout faster!</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Saved Addresses */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                            <MapPin className="text-[#2e7d32]" size={28} />
                            Saved Addresses
                        </h2>
                        {!isAdding && (
                            <button
                                onClick={() => handleOpenForm()}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#2e7d32] text-white rounded-xl font-bold hover:bg-[#1b5e20] transition-colors active:scale-95 shadow-md shadow-green-900/10"
                            >
                                <Plus size={18} />
                                Add New
                            </button>
                        )}
                    </div>

                    <AnimatePresence mode="wait">
                        {isAdding ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-lg"
                            >
                                <h3 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">
                                    {editingId ? 'Edit Address' : 'Add New Address'}
                                </h3>
                                <form onSubmit={handleSaveAddress} className="space-y-6">
                                    <div className="flex gap-4 mb-8">
                                        {['Home', 'Work', 'Other'].map(lbl => (
                                            <button
                                                type="button"
                                                key={lbl}
                                                onClick={() => setForm({ ...form, label: lbl })}
                                                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${form.label === lbl
                                                    ? 'bg-[#2e7d32] text-white shadow-md'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {lbl}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Complete Address</label>
                                            <textarea
                                                required
                                                value={form.addressLine}
                                                onChange={e => setForm({ ...form, addressLine: e.target.value })}
                                                placeholder="Flat/House No, Floor, Building, Street..."
                                                rows="3"
                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">City</label>
                                            <input
                                                required
                                                value={form.city}
                                                onChange={e => setForm({ ...form, city: e.target.value })}
                                                placeholder="e.g. Bhopal"
                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Pincode</label>
                                            <input
                                                required
                                                value={form.pincode}
                                                onChange={e => setForm({ ...form, pincode: e.target.value })}
                                                placeholder="e.g. 462001"
                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Contact Number for Delivery</label>
                                            <input
                                                required
                                                type="tel"
                                                value={form.phone}
                                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                                placeholder="10 digit mobile number"
                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <button
                                                type="button"
                                                onClick={handleCaptureLocation}
                                                className={`w-full py-4 border-2 border-dashed rounded-2xl flex items-center justify-center gap-3 font-bold transition-all ${form.latitude ? 'bg-green-50 border-[#2e7d32] text-[#2e7d32]' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                                            >
                                                {isLocating ? (
                                                    <Loader2 className="animate-spin" size={20} />
                                                ) : (
                                                    <Navigation size={20} className={form.latitude ? 'fill-[#2e7d32]/20' : ''} />
                                                )}
                                                {form.latitude ? 'Location Captured (GPS)' : 'Capture Current Location'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                                        <button
                                            type="submit"
                                            className="px-8 py-4 bg-[#2e7d32] text-white rounded-2xl font-bold hover:bg-[#1b5e20] transition-colors shadow-lg shadow-green-900/10 active:scale-95"
                                        >
                                            Save Address
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsAdding(false)}
                                            className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors active:scale-95"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                            >
                                {addresses.length === 0 ? (
                                    <div className="col-span-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] p-12 text-center flex flex-col items-center justify-center">
                                        <MapPin size={48} className="text-gray-300 mb-4" />
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">No addresses saved</h3>
                                        <p className="text-gray-500 font-medium max-w-sm">Save your delivery addresses here to breeze through checkout next time.</p>
                                    </div>
                                ) : (
                                    addresses.map(address => (
                                        <div
                                            key={address.id}
                                            className={`p-6 rounded-[2rem] relative group transition-all duration-300 ${address.isDefault
                                                ? 'bg-green-50 border-2 border-[#2e7d32] shadow-sm'
                                                : 'bg-white border border-gray-100 hover:border-[#2e7d32]/30 hover:shadow-md'
                                                }`}
                                        >
                                            {address.isDefault && (
                                                <span className="absolute -top-3 right-6 bg-[#2e7d32] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                                                    Default
                                                </span>
                                            )}

                                            <div className="flex items-start gap-4 mb-4">
                                                <div className={`p-3 rounded-2xl ${address.isDefault ? 'bg-white text-[#2e7d32]' : 'bg-gray-50 text-gray-400 group-hover:bg-green-50 group-hover:text-[#2e7d32]'} transition-colors`}>
                                                    <MapPin size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-lg uppercase">{address.label}</h3>
                                                    <p className="text-sm text-gray-500 font-medium line-clamp-2 mt-1 pr-4">{address.addressLine || address.address}</p>
                                                    <p className="text-sm font-bold text-gray-700 mt-2">{address.city} - {address.pincode}</p>
                                                    <p className="text-sm text-gray-500 font-medium mt-1">📞 {address.phone}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pt-4 border-t border-gray-200/50 mt-auto">
                                                {!address.isDefault && (
                                                    <button
                                                        onClick={() => setDefaultAddress(address.id)}
                                                        className="flex-grow py-2 text-sm font-bold text-gray-600 hover:text-[#2e7d32] bg-white hover:bg-green-50 rounded-xl transition-colors border border-gray-200"
                                                    >
                                                        Set Default
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleOpenForm(address)}
                                                    className="p-2.5 text-gray-400 hover:text-[#2e7d32] hover:bg-green-50 rounded-xl transition-colors border border-transparent hover:border-green-100"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => removeAddress(address.id)}
                                                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Profile;

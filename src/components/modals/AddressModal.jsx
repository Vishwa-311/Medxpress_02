import React, { useState } from 'react';
import { X, MapPin, Phone, Navigation, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentLocation } from '../../utils/geoUtils';
import { useAuth } from '../../context/AuthContext';

const AddressModal = ({ isOpen, onClose, onAdd, initialPhone }) => {
    const { saveAddress } = useAuth();
    const [form, setForm] = useState({
        label: 'Home',
        addressLine: '',
        city: '',
        pincode: '',
        phone: initialPhone || userData?.phone || '',
        latitude: null,
        longitude: null
    });
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);

    const handleCaptureLocation = async () => {
        setLocating(true);
        try {
            const loc = await getCurrentLocation();
            setForm(prev => ({ ...prev, latitude: loc.lat, longitude: loc.lng }));
        } catch (err) {
            let errorMsg = "Could not get your location.";
            if (err.code === 1) errorMsg = "Location permission denied. Please allow location access in your browser settings.";
            else if (err.code === 3) errorMsg = "Location request timed out. Please try again.";

            alert(errorMsg);
            console.error("Location Error:", err);
        } finally {
            setLocating(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const savedAddress = await saveAddress({
                ...form,
                isDefault: false
            });

            onAdd(savedAddress);
            onClose();
        } catch (err) {
            alert("Failed to add address: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-green-50 to-white">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800">Add New Address</h3>
                                <p className="text-sm text-gray-500 font-medium">Where should we deliver your medicines?</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="flex gap-3">
                                {['Home', 'Work', 'Other'].map(lbl => (
                                    <button
                                        type="button"
                                        key={lbl}
                                        onClick={() => setForm({ ...form, label: lbl })}
                                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${form.label === lbl
                                            ? 'bg-[#2e7d32] text-white shadow-lg shadow-green-900/20'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {lbl}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <div className="relative group">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Full Address</label>
                                    <textarea
                                        required
                                        value={form.addressLine}
                                        onChange={e => setForm({ ...form, addressLine: e.target.value })}
                                        placeholder="Flat/House No, Floor, Building, Street..."
                                        rows="2"
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all font-medium"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative group">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">City</label>
                                        <input
                                            required
                                            value={form.city}
                                            onChange={e => setForm({ ...form, city: e.target.value })}
                                            placeholder="e.g. Bhopal"
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all font-medium"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pincode</label>
                                        <input
                                            required
                                            value={form.pincode}
                                            onChange={e => setForm({ ...form, pincode: e.target.value })}
                                            placeholder="e.g. 462001"
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="relative group">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Contact Number</label>
                                    <div className="relative">
                                        <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            required
                                            type="tel"
                                            value={form.phone}
                                            onChange={e => setForm({ ...form, phone: e.target.value })}
                                            placeholder="10 digit mobile number"
                                            className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all font-medium"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleCaptureLocation}
                                className={`w-full py-4 border-2 border-dashed rounded-2xl flex items-center justify-center gap-3 font-bold transition-all ${form.latitude ? 'bg-green-50 border-[#2e7d32] text-[#2e7d32]' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                            >
                                {locating ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <Navigation size={20} className={form.latitude ? 'fill-[#2e7d32]/20' : ''} />
                                )}
                                {form.latitude ? 'Location Captured (GPS)' : 'Capture Current Location'}
                            </button>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-grow py-5 bg-[#2e7d32] text-white rounded-2xl font-black text-lg shadow-xl shadow-green-900/10 hover:bg-[#1b5e20] active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Save & Select Address'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AddressModal;

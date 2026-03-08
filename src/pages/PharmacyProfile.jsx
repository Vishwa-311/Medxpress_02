import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, Phone, Mail, MapPin, Shield, Clock, Package } from 'lucide-react';
import { motion } from 'framer-motion';

const PharmacyProfile = () => {
    const { userData } = useAuth();

    const infoItems = [
        { icon: <Phone size={18} className="text-[#2e7d32]" />, label: 'Phone', value: userData?.phone || 'Not provided' },
        { icon: <Mail size={18} className="text-[#2e7d32]" />, label: 'Email', value: userData?.email || 'Not provided' },
        { icon: <MapPin size={18} className="text-[#2e7d32]" />, label: 'Address', value: userData?.address || 'Not provided' },
        { icon: <Clock size={18} className="text-[#2e7d32]" />, label: 'Hours', value: userData?.hours || 'Mon–Sat, 9am – 9pm' },
        { icon: <Shield size={18} className="text-[#2e7d32]" />, label: 'License', value: userData?.licenseNumber || 'Verified Pharmacy' },
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
            <h1 className="text-4xl font-black text-gray-800 mb-12 flex items-center gap-4">
                <Store className="text-[#2e7d32]" size={40} />
                Pharmacy Profile
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left – Identity Card */}
                <div className="lg:col-span-1 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-[100px] -z-0" />
                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-[#2e7d32] text-white rounded-3xl flex items-center justify-center text-3xl font-black shadow-lg shadow-green-900/20 mb-6">
                                {userData?.name?.charAt(0) || 'P'}
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 mb-1">{userData?.name || 'Pharmacy'}</h2>
                            <span className="text-xs font-black text-[#2e7d32] bg-green-50 px-3 py-1 rounded-full border border-green-100 uppercase tracking-widest">
                                Verified Partner
                            </span>
                        </div>
                    </motion.div>

                    <div className="bg-[#2e7d32]/5 p-6 rounded-3xl border border-[#2e7d32]/10 flex items-start gap-4">
                        <Package className="text-[#2e7d32] shrink-0 mt-1" size={24} />
                        <div>
                            <h3 className="font-bold text-[#2e7d32] mb-1">MedXpress Partner</h3>
                            <p className="text-xs text-gray-600 font-medium leading-relaxed">
                                You are an active pharmacy partner. Manage inventory and incoming orders from your dashboard.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right – Info */}
                <div className="lg:col-span-2">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm"
                    >
                        <h2 className="text-xl font-black text-gray-800 mb-8 pb-4 border-b border-gray-100">Business Information</h2>
                        <div className="space-y-6">
                            {infoItems.map((item, i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center shrink-0 border border-green-100">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                                        <p className="font-bold text-gray-800">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default PharmacyProfile;

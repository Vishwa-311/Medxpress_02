import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Bike, Phone, Mail, Shield, TrendingUp, Star, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const RiderProfile = () => {
    const { userData, currentUser } = useAuth();
    const [stats, setStats] = useState({ totalTrips: 0, totalEarnings: 0 });

    // All-time stats from completed orders
    useEffect(() => {
        if (!currentUser) return;
        const q = query(
            collection(db, 'orders'),
            where('riderId', '==', currentUser.uid),
            where('orderStatus', '==', 'completed')
        );
        const unsubscribe = onSnapshot(q, (snap) => {
            setStats({
                totalTrips: snap.size,
                totalEarnings: snap.size * 30  // ₹30 per delivery
            });
        });
        return () => unsubscribe();
    }, [currentUser]);

    const infoItems = [
        { icon: <Phone size={18} className="text-[#2e7d32]" />, label: 'Phone', value: userData?.phone || 'Not provided' },
        { icon: <Mail size={18} className="text-[#2e7d32]" />, label: 'Email', value: userData?.email || 'Not provided' },
        { icon: <Bike size={18} className="text-[#2e7d32]" />, label: 'Vehicle', value: userData?.vehicleType || 'Not specified' },
        { icon: <Shield size={18} className="text-[#2e7d32]" />, label: 'License No.', value: userData?.licenseNumber || 'Not specified' },
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
            <h1 className="text-4xl font-black text-gray-800 mb-12 flex items-center gap-4">
                <Bike className="text-[#2e7d32]" size={40} />
                Rider Profile
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left – Identity + Stats */}
                <div className="lg:col-span-1 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-[100px] -z-0" />
                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-[#2e7d32] text-white rounded-3xl flex items-center justify-center text-3xl font-black shadow-lg shadow-green-900/20 mb-6">
                                {userData?.name?.charAt(0) || 'R'}
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 mb-1">{userData?.name || 'Rider'}</h2>
                            <span className="text-xs font-black text-[#2e7d32] bg-green-50 px-3 py-1 rounded-full border border-green-100 uppercase tracking-widest">
                                Delivery Partner
                            </span>

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
                                    <p className="text-2xl font-black text-[#2e7d32]">{stats.totalTrips}</p>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Total Trips</p>
                                </div>
                                <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
                                    <p className="text-2xl font-black text-[#2e7d32]">₹{stats.totalEarnings}</p>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Earned</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Rating Tile */}
                    <div className="bg-[#2e7d32]/5 p-6 rounded-3xl border border-[#2e7d32]/10 flex items-start gap-4">
                        <Star className="text-yellow-500 shrink-0 mt-1" size={24} />
                        <div>
                            <h3 className="font-bold text-[#2e7d32] mb-1">Your Rating</h3>
                            <p className="text-3xl font-black text-gray-800">4.8 <span className="text-sm font-bold text-gray-400">/ 5.0</span></p>
                        </div>
                    </div>
                </div>

                {/* Right – Details */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm"
                    >
                        <h2 className="text-xl font-black text-gray-800 mb-8 pb-4 border-b border-gray-100">Rider Information</h2>
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

                    {/* Achievements */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm"
                    >
                        <h2 className="text-xl font-black text-gray-800 mb-6 pb-4 border-b border-gray-100 flex items-center gap-3">
                            <TrendingUp className="text-[#2e7d32]" size={22} /> Achievements
                        </h2>
                        <div className="space-y-3">
                            {[
                                { label: 'Active Delivery Partner', earned: true },
                                { label: 'First Delivery Completed', earned: stats.totalTrips >= 1 },
                                { label: '10 Deliveries Milestone', earned: stats.totalTrips >= 10 },
                                { label: '50 Deliveries Milestone', earned: stats.totalTrips >= 50 },
                            ].map((badge, i) => (
                                <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl border ${badge.earned ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                                    <CheckCircle2 size={20} className={badge.earned ? 'text-[#2e7d32]' : 'text-gray-300'} />
                                    <span className={`font-bold text-sm ${badge.earned ? 'text-gray-800' : 'text-gray-400'}`}>{badge.label}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default RiderProfile;

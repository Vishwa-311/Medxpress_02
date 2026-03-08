import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShieldCheck, Zap, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
    const [searchInput, setSearchInput] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchInput.trim()) {
            navigate('/customer-dashboard', { state: { searchMedicine: searchInput.trim() } });
        }
    };

    return (
        <div className="fade-in">
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-[#2e7d32] to-[#1b5e20] text-white py-16 md:py-24 lg:py-32 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="max-w-2xl z-10 text-center lg:text-left">
                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6 }}
                            className="text-4xl md:text-5xl lg:text-7xl font-extrabold leading-tight mb-6"
                        >
                            Medicines delivered in <span className="text-[#81c784]">10 mins.</span>
                        </motion.h1>
                        <p className="text-lg md:text-xl mb-10 opacity-90 max-w-xl mx-auto lg:mx-0">
                            Get all your healthcare essentials delivered to your doorstep. Genuine medicines from verified pharmacies near you.
                        </p>

                        {/* Swiggy-like Search Bar */}
                        <form onSubmit={handleSearch} className="bg-white p-2 rounded-2xl flex flex-col sm:flex-row items-center shadow-xl w-full max-w-2xl mx-auto lg:mx-0">
                            <div className="flex items-center flex-grow w-full px-4 mb-2 sm:mb-0">
                                <Search className="text-gray-400 mr-3" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search for medicines (e.g. Paracetamol)..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="border-none outline-none flex-grow text-gray-800 py-3 text-base"
                                />
                            </div>
                            <button type="submit" className="w-full sm:w-auto px-8 py-4 bg-[#2e7d32] text-white rounded-xl font-bold hover:bg-[#1b5e20] transition-all whitespace-nowrap">
                                FIND MEDICINE
                            </button>
                        </form>
                    </div>

                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8 }}
                        className="relative hidden lg:block"
                    >
                        <div className="w-[400px] h-[400px] bg-white/10 rounded-full flex items-center justify-center text-8xl shadow-2xl backdrop-blur-sm border border-white/20">
                            💊
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl shadow-sm text-center border border-gray-100 transition-all">
                            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#2e7d32]">
                                <Zap size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-800">Superfast Delivery</h3>
                            <p className="text-gray-500 leading-relaxed">Get your medicines delivered within 10-20 minutes.</p>
                        </motion.div>
                        <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl shadow-sm text-center border border-gray-100 transition-all">
                            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#2e7d32]">
                                <ShieldCheck size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-800">Verified Pharmacies</h3>
                            <p className="text-gray-500 leading-relaxed">We only partner with licensed and verified local pharmacies.</p>
                        </motion.div>
                        <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl shadow-sm text-center border border-gray-100 transition-all">
                            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#2e7d32]">
                                <Clock size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-800">24/7 Service</h3>
                            <p className="text-gray-500 leading-relaxed">Order anytime, day or night, for your emergency needs.</p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Categories */}
            <section className="py-20 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-extrabold mb-10 text-gray-800">Shop by Category</h2>
                    <div className="flex gap-6 md:gap-10 overflow-x-auto pb-8 scrollbar-hide no-scrollbar">
                        {['Prescription', 'Wellness', 'Baby Care', 'Personal Care', 'Ayurveda', 'Homeopathy'].map((cat, i) => (
                            <div key={i} className="flex flex-col items-center gap-4 min-w-[120px] transition-transform hover:scale-105 cursor-pointer">
                                <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center text-4xl shadow-md border border-gray-100">
                                    {['📄', '🧘', '👶', '🧴', '🌿', '🧪'][i]}
                                </div>
                                <span className="font-bold text-gray-700 text-sm md:text-base whitespace-nowrap">{cat}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;

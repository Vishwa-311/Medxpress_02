import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bike, Mail, Lock, Phone, User, Shield, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const RiderSignup = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [vehicleType, setVehicleType] = useState('Bike');
    const [licenseNumber, setLicenseNumber] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!name || !email || !phone || !password || !licenseNumber) {
            setError("All fields are required.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        try {
            setError('');
            setLoading(true);

            const extraData = {
                vehicleType,
                licenseNumber
            };

            // Use the existing signup function from AuthContext
            await signup(email, password, name, phone, 'rider', null, "", extraData);

            navigate('/rider-dashboard');
        } catch (err) {
            setError('Registration failed: ' + err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8faf8] flex items-center justify-center p-4 py-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] shadow-2xl shadow-green-900/5 border border-gray-100 w-full max-w-4xl overflow-hidden flex flex-col md:flex-row"
            >
                {/* Visual Side */}
                <div className="md:w-5/12 bg-[#2e7d32] p-12 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute -right-20 -bottom-20 opacity-10">
                        <Bike size={300} />
                    </div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm">
                            <Bike size={32} />
                        </div>
                        <h1 className="text-4xl font-black leading-tight mb-4">Deliver Health, Gain Freedom.</h1>
                        <p className="text-white/80 font-medium text-lg">Join the MedXpress delivery network and start earning on your own schedule.</p>
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <Shield size={20} />
                            </div>
                            <p className="font-bold">Fully Insured Deliveries</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <Shield size={20} />
                            </div>
                            <p className="font-bold">Weekly Payouts</p>
                        </div>
                    </div>
                </div>

                {/* Form Side */}
                <div className="md:w-7/12 p-8 md:p-12 lg:p-16">
                    <div className="mb-10">
                        <h2 className="text-3xl font-black text-gray-900 mb-2">Rider Registration</h2>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Partner with MedXpress</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 flex items-center gap-3 text-sm font-bold border border-red-100"
                        >
                            <AlertCircle size={20} />
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                <div className="relative group">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#2e7d32]/5 focus:border-[#2e7d32] transition-all font-bold text-gray-800"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                                <div className="relative group">
                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#2e7d32]/5 focus:border-[#2e7d32] transition-all font-bold text-gray-800"
                                        placeholder="9988776655"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#2e7d32]/5 focus:border-[#2e7d32] transition-all font-bold text-gray-800"
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Password (Min 6 chars)</label>
                            <div className="relative group">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#2e7d32]/5 focus:border-[#2e7d32] transition-all font-bold text-gray-800"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Vehicle Type</label>
                                <select
                                    value={vehicleType}
                                    onChange={(e) => setVehicleType(e.target.value)}
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#2e7d32]/5 focus:border-[#2e7d32] transition-all font-bold text-gray-800 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%232e7d32%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:24px_24px] bg-[right_16px_center] bg-no-repeat"
                                    required
                                >
                                    <option value="Bike">Bike</option>
                                    <option value="Scooter">Scooter</option>
                                    <option value="Cycle">Cycle</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">License Number</label>
                                <input
                                    type="text"
                                    value={licenseNumber}
                                    onChange={(e) => setLicenseNumber(e.target.value)}
                                    required
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#2e7d32]/5 focus:border-[#2e7d32] transition-all font-bold text-gray-800"
                                    placeholder="DL-XXXXXXXXXX"
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full py-5 bg-[#2e7d32] text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-green-900/10 hover:bg-[#1b5e20] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={24} />
                            ) : (
                                <>
                                    <span>Register as Rider</span>
                                    <ChevronRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-gray-400 font-bold text-sm">
                        Already a partner? <Link to="/login" className="text-[#2e7d32] hover:underline">Sign In</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default RiderSignup;

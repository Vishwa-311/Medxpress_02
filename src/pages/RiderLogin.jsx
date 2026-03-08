import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, AlertCircle, Loader2, Bike, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const RiderLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, logout } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);
            const userCredential = await login(email, password);
            const user = userCredential.user;

            // Dedicated verification for Rider role
            const { db } = await import('../firebase');
            const { doc, getDoc } = await import('firebase/firestore');

            const riderDoc = await getDoc(doc(db, 'riders', user.uid));

            if (riderDoc.exists()) {
                navigate('/rider-dashboard');
            } else {
                // If the user authenticated but isn't in 'riders' collection
                await logout();
                setError("Account not registered as Rider");
            }
        } catch (err) {
            setError(err.message || 'Failed to log in. Please check your credentials.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8faf8] flex items-center justify-center p-4 py-24">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] shadow-2xl shadow-green-900/5 border border-gray-100 w-full max-w-md overflow-hidden"
            >
                <div className="bg-[#2e7d32] p-8 text-white text-center relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 opacity-10">
                        <Bike size={150} />
                    </div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                            <Bike size={32} />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight">Rider Login</h2>
                        <p className="text-white/70 text-sm font-bold uppercase tracking-widest mt-1">Welcome back partner</p>
                    </div>
                </div>

                <div className="p-8 md:p-10">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 flex items-center gap-3 text-sm font-bold border border-red-100"
                        >
                            <AlertCircle size={20} />
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
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
                                    placeholder="partner@medxpress.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#2e7d32]/5 focus:border-[#2e7d32] transition-all font-bold text-gray-800"
                                    placeholder="••••••••"
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
                                    <span>Sign In</span>
                                    <LogIn size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center space-y-4">
                        <p className="text-gray-400 font-bold text-sm">
                            New partner? <Link to="/rider-signup" className="text-[#2e7d32] hover:underline flex items-center justify-center gap-1 mt-1">
                                Create Rider Account <ChevronRight size={16} />
                            </Link>
                        </p>
                        <div className="pt-6 border-t border-gray-50">
                            <Link to="/login" className="text-gray-400 hover:text-gray-600 text-xs font-bold uppercase tracking-widest transition-colors">
                                Are you a Customer or Pharmacy?
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default RiderLogin;

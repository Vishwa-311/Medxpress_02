import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
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

            // Fetch user role from Firestore (already handled by AuthContext but we need it here for redirection)
            // Actually AuthContext updates `userRole` asynchronously. 
            // Let's do a direct check here for rider specifically as per requirements.
            const { db } = await import('../firebase');
            const { doc, getDoc } = await import('firebase/firestore');

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.role === 'rider') {
                    const riderDoc = await getDoc(doc(db, 'riders', user.uid));
                    if (!riderDoc.exists()) {
                        await logout();
                        setError("Not registered as rider");
                        setLoading(false);
                        return;
                    }
                    navigate('/rider-dashboard');
                } else if (userData.role === 'pharmacy') {
                    navigate('/pharmacy-dashboard');
                } else {
                    navigate('/'); // Customer goes to Home
                }
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.message || 'Failed to log in. Please check your credentials.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-gray-50">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl border border-gray-100 w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-[#2e7d32] mb-2">Welcome Back</h2>
                    <p className="text-gray-500">Login to access your MedXpress account</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-3 text-sm font-medium border border-red-100">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                        <div className="relative group">
                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="Enter your email"
                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all text-gray-800"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                        <div className="relative group">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all text-gray-800"
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full py-4 bg-[#2e7d32] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1b5e20] active:scale-[0.98] transition-all disabled:opacity-70 shadow-lg shadow-green-900/10"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Logging in...
                            </>
                        ) : (
                            <>
                                <LogIn size={20} />
                                Login
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-gray-500 text-sm font-medium">
                    Don't have an account? <Link to="/signup" className="text-[#2e7d32] font-bold hover:underline underline-offset-4">Sign Up</Link>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;

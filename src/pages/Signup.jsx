import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Phone, UserCircle, AlertCircle, MapPin, Loader2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentLocation } from '../utils/geoUtils';

const Signup = () => {
    // Basic User States
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user'); // Default to 'user' (customer)
    const [address, setAddress] = useState('');

    // Rider Specific States
    const [vehicleType, setVehicleType] = useState('Bike');
    const [licenseNumber, setLicenseNumber] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    // 2️⃣ Capture GPS Location (Used for Pharmacy)
    const handleCaptureLocation = async () => {
        try {
            setLoading(true);
            const loc = await getCurrentLocation();
            setLatitude(loc.lat.toString());
            setLongitude(loc.lng.toString());
        } catch (err) {
            console.error("Location Error:", err);
            setError("Location access denied. Please enter manually.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (role === 'pharmacy') {
            if (!acceptCOD && !acceptUPI) {
                setError("Please select at least one payment method (COD or UPI).");
                return;
            }
            if (acceptUPI && !qrImage) {
                setError("Please upload your UPI QR code to accept online payments.");
                return;
            }
        }

        if (role === 'rider') {
            if (!licenseNumber) {
                setError("Please enter your license number.");
                return;
            }
        }

        try {
            setError('');
            setLoading(true);

            let qrCodeURL = '';
            // Upload QR Code if UPI is enabled
            if (role === 'pharmacy' && acceptUPI && qrImage) {
                const reader = new FileReader();
                qrCodeURL = await new Promise((resolve, reject) => {
                    reader.readAsDataURL(qrImage);
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
                            else reject(new Error("QR Upload Failed"));
                        } catch (err) { reject(err); }
                    };
                });
            }

            let extraData = {};
            if (role === 'pharmacy') {
                extraData = {
                    ownerName,
                    acceptCOD,
                    acceptUPI,
                    qrCodeURL
                };
            } else if (role === 'rider') {
                extraData = {
                    vehicleType,
                    licenseNumber
                };
            }

            const locationData = role === 'pharmacy' ? {
                lat: parseFloat(latitude),
                lng: parseFloat(longitude)
            } : null;

            // Save to Firebase via AuthContext
            await signup(email, password, name, phone, role, locationData, address, extraData);

            navigate('/');
        } catch (err) {
            setError('Signup failed: ' + err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleQrChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setQrImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setQrImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-gray-50 flex-col py-12">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-gray-100 w-full max-w-2xl px-6 md:px-12"
            >
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-black text-[#2e7d32] mb-3">Create Account</h2>
                    <p className="text-gray-500 font-medium">Join MedXpress as a Customer or Pharmacy Owner</p>
                </div>

                {error && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 flex items-center gap-3 text-sm font-bold border border-red-100">
                        <AlertCircle size={20} />
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest ml-1">
                                {role === 'pharmacy' ? 'Pharmacy Name' : 'Full Name'}
                            </label>
                            <div className="relative group">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    placeholder={role === 'pharmacy' ? "e.g. Life Care Pharmacy" : "e.g. John Doe"}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all text-gray-800 font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="name@example.com"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all text-gray-800 font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Basic Info Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest ml-1">Phone Number</label>
                            <div className="relative group">
                                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    placeholder="9999999999"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all text-gray-800 font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest ml-1">I am a...</label>
                            <div className="relative group">
                                <UserCircle size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all text-gray-800 font-bold appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%232e7d32%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:24px_24px] bg-[right_16px_center] bg-no-repeat"
                                    required
                                >
                                    <option value="user">Customer</option>
                                    <option value="pharmacy">Pharmacy Owner</option>
                                    <option value="rider">Delivery Rider</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <AnimatePresence>
                        {role === 'pharmacy' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-8 pt-4 border-t border-gray-100"
                            >
                                <div className="space-y-6">
                                    <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                        <Building2 size={24} className="text-[#2e7d32]" /> Pharmacy Details
                                    </h3>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-black text-gray-700 uppercase tracking-widest ml-1">Owner Name</label>
                                        <input
                                            type="text"
                                            value={ownerName}
                                            onChange={(e) => setOwnerName(e.target.value)}
                                            required
                                            placeholder="Enter Owner's Full Name"
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-black text-gray-700 uppercase tracking-widest ml-1">Store Address</label>
                                        <div className="relative">
                                            <MapPin size={18} className="absolute left-4 top-4 text-gray-400" />
                                            <textarea
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                required
                                                rows="2"
                                                placeholder="Street, City, Pincode"
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest ml-1">Latitude</label>
                                            <input
                                                type="text"
                                                readOnly
                                                value={latitude}
                                                placeholder="0.0000"
                                                className="w-full px-5 py-4 bg-gray-100 border border-gray-200 rounded-2xl text-gray-500 cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest ml-1">Longitude</label>
                                            <input
                                                type="text"
                                                readOnly
                                                value={longitude}
                                                placeholder="0.0000"
                                                className="w-full px-5 py-4 bg-gray-100 border border-gray-200 rounded-2xl text-gray-500 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleCaptureLocation}
                                        className="w-full py-3 bg-green-50 text-[#2e7d32] border-2 border-[#2e7d32] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-100 transition-all"
                                    >
                                        <MapPin size={18} /> {latitude ? "Location Captured" : "Capture Store GPS"}
                                    </button>
                                </div>

                                {/* Payment Methods Selection */}
                                <div className="space-y-4">
                                    <h3 className="text-base font-black text-gray-800">Accepted Payment Methods</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${acceptCOD ? 'border-[#2e7d32] bg-green-50' : 'border-gray-100'}`}>
                                            <input type="checkbox" checked={acceptCOD} onChange={(e) => setAcceptCOD(e.target.checked)} className="accent-[#2e7d32] w-5 h-5" />
                                            <span className="font-bold text-sm">Cash On Delivery</span>
                                        </label>

                                        <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${acceptUPI ? 'border-[#2e7d32] bg-green-50' : 'border-gray-100'}`}>
                                            <input type="checkbox" checked={acceptUPI} onChange={(e) => setAcceptUPI(e.target.checked)} className="accent-[#2e7d32] w-5 h-5" />
                                            <span className="font-bold text-sm">UPI / QR Payment</span>
                                        </label>
                                    </div>

                                    {acceptUPI && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest ml-1">Upload Your Business QR Code</label>
                                            <div
                                                onClick={() => document.getElementById('qr-upload').click()}
                                                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-[#2e7d32] transition-colors cursor-pointer bg-gray-50 group"
                                            >
                                                <input id="qr-upload" type="file" hidden accept="image/*" onChange={handleQrChange} />
                                                {qrImagePreview ? (
                                                    <div className="relative inline-block">
                                                        <img src={qrImagePreview} alt="QR Preview" className="max-w-[200px] h-auto rounded-xl shadow-lg border-4 border-white" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white font-bold text-sm">Update QR</div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-[#2e7d32] shadow-sm transition-colors">
                                                            <Upload size={32} />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-gray-800">Choose QR Code Image</p>
                                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">PNG, JPG or JPEG (Max 5MB)</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {role === 'rider' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-8 pt-4 border-t border-gray-100"
                            >
                                <div className="space-y-6">
                                    <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                        <AlertCircle size={24} className="text-[#2e7d32]" /> Rider Details
                                    </h3>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-black text-gray-700 uppercase tracking-widest ml-1">Vehicle Type</label>
                                        <div className="relative group">
                                            <select
                                                value={vehicleType}
                                                onChange={(e) => setVehicleType(e.target.value)}
                                                className="w-full pl-5 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all text-gray-800 font-bold appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%232e7d32%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:24px_24px] bg-[right_16px_center] bg-no-repeat"
                                                required
                                            >
                                                <option value="Bike">Bike</option>
                                                <option value="Scooter">Scooter</option>
                                                <option value="Cycle">Cycle</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-black text-gray-700 uppercase tracking-widest ml-1">License Number</label>
                                        <input
                                            type="text"
                                            value={licenseNumber}
                                            onChange={(e) => setLicenseNumber(e.target.value)}
                                            required
                                            placeholder="Enter your driving license number"
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="space-y-2">
                        <label className="block text-sm font-black text-gray-700 uppercase tracking-widest ml-1">Create Password</label>
                        <div className="relative group">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2e7d32] transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#2e7d32]/20 focus:border-[#2e7d32] transition-all text-gray-800 font-medium"
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full py-5 bg-[#2e7d32] text-white rounded-2xl font-black text-lg shadow-xl shadow-green-900/10 hover:bg-[#1b5e20] active:scale-[0.98] transition-all disabled:opacity-50 mt-6"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-3">
                                <Loader2 className="animate-spin" size={24} />
                                <span>Verifying...</span>
                            </div>
                        ) : 'Create My Account'}
                    </button>
                </form>

                <div className="mt-10 text-center text-gray-500 text-sm font-bold">
                    Already an owner? <Link to="/login" className="text-[#2e7d32] font-black hover:underline underline-offset-8">Sign In</Link>
                </div>
            </motion.div>
        </div>
    );
};

// Simple Icon Fallback for Building2
const Building2 = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
        <path d="M10 6h4" />
        <path d="M10 10h4" />
        <path d="M10 14h4" />
        <path d="M10 18h4" />
    </svg>
);

export default Signup;

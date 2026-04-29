import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, MapPin, Upload, Phone, CheckCircle2, Loader2, Camera, User, Siren, FileText, Plus } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const EmergencyOrderModal = ({ isOpen, onClose, userLat, userLng }) => {
    const { currentUser, userData } = useAuth();
    const navigate = useNavigate();
    
    const [inputMethod, setInputMethod] = useState('manual'); // 'manual' or 'prescription'
    const [medicinesList, setMedicinesList] = useState([{ name: '', quantity: 1 }]);
    const [addressText, setAddressText] = useState(userData?.addresses?.[0]?.addressLine || '');
    const [phone, setPhone] = useState(userData?.phone || '');
    const [name, setName] = useState(userData?.name || '');
    const [prescription, setPrescription] = useState(null);
    const [prescriptionPreview, setPrescriptionPreview] = useState(null);
    
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setAddressText(userData?.addresses?.[0]?.addressLine || '');
            setPhone(userData?.phone || '');
            setName(userData?.name || '');
            setMedicinesList([{ name: '', quantity: 1 }]);
            setPrescription(null);
            setPrescriptionPreview(null);
            setError(null);
            setSuccess(false);
            setInputMethod('manual');
        }
    }, [isOpen, userData]);

    const addRow = () => setMedicinesList([...medicinesList, { name: '', quantity: 1 }]);
    const removeRow = (index) => {
        if (medicinesList.length > 1) {
            setMedicinesList(medicinesList.filter((_, i) => i !== index));
        }
    };
    const updateRow = (index, field, value) => {
        const newList = [...medicinesList];
        newList[index][field] = value;
        setMedicinesList(newList);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPrescription(file);
            const reader = new FileReader();
            reader.onloadend = () => setPrescriptionPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; 
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handlePlaceEmergencyOrder = async () => {
        const hasMedicines = medicinesList.some(m => m.name.trim() !== '');
        
        if (inputMethod === 'manual' && !hasMedicines) {
            setError("Please list at least one medicine.");
            return;
        }

        if (inputMethod === 'prescription' && !prescription) {
            setError("Please upload a prescription.");
            return;
        }

        if (!addressText.trim() || !phone.trim() || !name.trim()) {
            setError("Please fill in your contact and address details.");
            return;
        }

        if (!userLat || !userLng) {
            setError("Location is required for emergency orders.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Find nearest pharmacy
            const pharmacyQuery = query(collection(db, "users"), where("role", "==", "pharmacy"));
            const pharmacySnapshot = await getDocs(pharmacyQuery);
            let nearestPharma = null;
            let minDistance = Infinity;

            pharmacySnapshot.docs.forEach(doc => {
                const p = doc.data();
                if (p.latitude && p.longitude) {
                    const dist = getDistance(userLat, userLng, p.latitude, p.longitude);
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearestPharma = { id: doc.id, ...p };
                    }
                }
            });

            if (!nearestPharma) throw new Error("No pharmacies available in the network.");

            // 2. Upload Prescription if exists
            let prescriptionURL = null;
            if (prescription && (inputMethod === 'prescription' || hasMedicines)) {
                setUploading(true);
                const base64Image = prescriptionPreview.split(',')[1];
                const formData = new FormData();
                formData.append('image', base64Image);

                const response = await fetch(`https://api.imgbb.com/1/upload?key=6c27feddb60aeeafcd67027ee83cd504`, {
                    method: 'POST', body: formData
                });
                const data = await response.json();
                if (!data.success) throw new Error("Failed to upload prescription image.");
                prescriptionURL = data.data.display_url;
                setUploading(false);
            }

            // 3. Create Emergency Order
            const items = inputMethod === 'manual' 
                ? medicinesList.filter(m => m.name.trim() !== '').map((m, i) => ({
                    name: m.name,
                    quantity: m.quantity,
                    price: 0,
                    isEmergencyItem: true,
                    requestId: `EMG_${Date.now()}_${i}`
                }))
                : [{
                    name: "Medicines from Prescription",
                    quantity: 1,
                    price: 0,
                    isEmergencyItem: true,
                    requestId: `EMG_PRES_${Date.now()}`
                }];

            const orderData = {
                customerId: currentUser.uid,
                pharmacyId: nearestPharma.id,
                customerInfo: { name, phone },
                selectedAddress: { addressLine: addressText, latitude: userLat, longitude: userLng },
                items,
                prescriptionURL,
                baseCharges: 45,
                totalAmount: 45,
                paymentMethod: 'COD',
                paymentStatus: "pending",
                orderStatus: "pending",
                deliveryStatus: "unassigned",
                isEmergency: true,
                isPricingPending: true,
                inputMethod,
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'orders'), orderData);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                navigate(`/order-tracking/${docRef.id}`);
            }, 2000);

        } catch (err) {
            console.error(err);
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <div className="bg-red-600 p-6 flex items-center justify-between sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <Siren size={30} className="text-white animate-pulse" />
                            <h2 className="text-2xl font-black text-white italic tracking-tighter">EMERGENCY ORDER</h2>
                        </div>
                        <button onClick={!loading ? onClose : null} className="p-2 bg-red-700/50 hover:bg-red-700 rounded-full text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {success ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <CheckCircle2 size={80} className="text-[#2e7d32] mb-4" />
                            <h3 className="text-2xl font-black text-gray-800 mb-2">Emergency Request Sent!</h3>
                            <p className="text-gray-500 font-medium">Notifying the nearest pharmacy immediately.</p>
                            <Loader2 className="animate-spin text-[#2e7d32] mt-6" size={30} />
                        </div>
                    ) : (
                        <div className="p-6 overflow-y-auto space-y-5">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-2 text-sm font-bold">
                                    <AlertCircle size={18} /> {error}
                                </div>
                            )}

                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3">
                                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs font-bold text-red-800 leading-relaxed">
                                    {inputMethod === 'manual' 
                                        ? "List the medicines you need. The pharmacy will enter the prices and the final bill will be shown after a rider accepts."
                                        : "Upload your prescription. The pharmacy will identify the medicines and enter the prices."}
                                </p>
                            </div>

                            {/* Method Selector */}
                            <div className="flex p-1 bg-gray-100 rounded-2xl">
                                <button
                                    onClick={() => setInputMethod('manual')}
                                    className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${inputMethod === 'manual' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <FileText size={14} /> Manual List
                                </button>
                                <button
                                    onClick={() => setInputMethod('prescription')}
                                    className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${inputMethod === 'prescription' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <Camera size={14} /> Prescription
                                </button>
                            </div>

                            <div className="space-y-4 pt-2">
                                {inputMethod === 'manual' ? (
                                    <div className="space-y-3">
                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Medicines Needed</label>
                                        <div className="space-y-3">
                                            {medicinesList.map((med, index) => (
                                                <div key={index} className="flex items-center gap-2 group">
                                                    <div className="flex-grow flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl focus-within:border-red-400 focus-within:bg-white transition-all">
                                                        <span className="text-xs font-black text-gray-400 w-4">{index + 1}.</span>
                                                        <input
                                                            type="text"
                                                            value={med.name}
                                                            onChange={(e) => updateRow(index, 'name', e.target.value)}
                                                            placeholder="Medicine Name..."
                                                            className="bg-transparent outline-none text-sm w-full font-bold"
                                                        />
                                                    </div>
                                                    <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
                                                        <button 
                                                            onClick={() => updateRow(index, 'quantity', Math.max(1, med.quantity - 1))}
                                                            className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-gray-600 font-bold hover:bg-gray-200"
                                                        >-</button>
                                                        <span className="w-6 text-center text-xs font-black">{med.quantity}</span>
                                                        <button 
                                                            onClick={() => updateRow(index, 'quantity', med.quantity + 1)}
                                                            className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-gray-600 font-bold hover:bg-gray-200"
                                                        >+</button>
                                                    </div>
                                                    {medicinesList.length > 1 && (
                                                        <button onClick={() => removeRow(index)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button 
                                                onClick={addRow}
                                                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-black hover:border-red-400 hover:text-red-500 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Plus size={14} /> Add Another Medicine
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Upload Prescription</label>
                                        <div 
                                            onClick={() => document.getElementById('emergencyPrescription').click()}
                                            className="w-full border-2 border-dashed border-gray-200 hover:border-red-400 bg-gray-50 rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center relative overflow-hidden h-40"
                                        >
                                            {prescriptionPreview ? (
                                                <>
                                                    <img src={prescriptionPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                                    <div className="relative z-10 bg-white/90 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm text-gray-800"><CheckCircle2 size={14} className="text-[#2e7d32]"/> Image Attached</div>
                                                </>
                                            ) : (
                                                <>
                                                    <Camera size={28} className="text-gray-400 mb-2" />
                                                    <p className="text-xs font-bold text-gray-500">Tap to upload prescription or medicine photo</p>
                                                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-black tracking-widest">Supports JPG, PNG</p>
                                                </>
                                            )}
                                            <input id="emergencyPrescription" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Name</label>
                                        <div className="relative">
                                            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Phone</label>
                                        <div className="relative">
                                            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Delivery Address</label>
                                    <div className="relative flex">
                                        <MapPin size={14} className="absolute left-3 top-3 text-gray-400" />
                                        <textarea value={addressText} onChange={e => setAddressText(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-400 h-20 resize-none" />
                                    </div>
                                </div>
                                
                                <div className="border-t border-dashed border-gray-200 pt-4 mt-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-gray-500 font-bold">Standard Delivery</span>
                                        <span className="text-xs font-black text-gray-800">₹25</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-red-500 font-bold">Emergency Surcharge</span>
                                        <span className="text-xs font-black text-red-600">₹20</span>
                                    </div>
                                    <div className="flex justify-between items-end border-t border-gray-100 pt-2">
                                        <div>
                                            <span className="text-xs text-gray-500 font-bold">Base Total</span>
                                            <p className="text-[10px] text-gray-400 leading-tight w-40">Medicine cost will be added by pharmacy.</p>
                                        </div>
                                        <span className="text-xl font-black text-gray-900">₹45</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {!success && (
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                            <button onClick={onClose} disabled={loading} className="w-1/3 py-4 text-gray-500 font-black hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 text-sm">Cancel</button>
                            <button 
                                onClick={handlePlaceEmergencyOrder}
                                disabled={loading} 
                                className="w-2/3 py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-xl shadow-red-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest disabled:opacity-70 disabled:scale-100"
                            >
                                {loading ? <><Loader2 size={18} className="animate-spin" /> {uploading ? 'Uploading...' : 'Sending...'}</> : <><Siren size={18}/> Order Now</>}
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default EmergencyOrderModal;

import React from 'react';
import { X, MapPin, CheckCircle2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AddressPickerModal = ({ isOpen, onClose, addresses, selectedId, onSelect, onAddNew }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                    >
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 tracking-tight">Select Address</h3>
                                <p className="text-sm text-gray-500 font-medium">Choose a delivery location</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-4">
                            {Array.isArray(addresses) && addresses.length > 0 ? (
                                addresses.map(addr => (
                                    <div
                                        key={addr.id}
                                        onClick={() => { onSelect(addr.id); onClose(); }}
                                        className={`relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 group ${selectedId === addr.id
                                            ? 'border-[#2e7d32] bg-green-50 shadow-md'
                                            : 'border-gray-50 bg-white hover:border-green-200'
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-2xl ${selectedId === addr.id ? 'bg-[#2e7d32] text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-green-50 group-hover:text-[#2e7d32]'}`}>
                                                <MapPin size={20} />
                                            </div>
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#2e7d32] bg-white px-2 py-0.5 rounded-md border border-green-100">
                                                        {addr.label}
                                                    </span>
                                                    {addr.isDefault && <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Default</span>}
                                                </div>
                                                <p className="text-sm text-gray-800 font-bold leading-relaxed">{addr.addressLine || addr.address || 'Address detail missing'}</p>
                                                <p className="text-xs text-gray-500 font-medium mt-1">{addr.city || ''} {addr.pincode ? `- ${addr.pincode}` : ''}</p>
                                            </div>
                                            {selectedId === addr.id && (
                                                <CheckCircle2 size={24} className="text-[#2e7d32] shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 text-center text-gray-400 font-medium">
                                    No saved addresses found.
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-gray-50 border-t border-gray-100 sticky bottom-0 z-10">
                            <button
                                onClick={() => { onAddNew(); onClose(); }}
                                className="w-full py-4 bg-white text-[#2e7d32] border-2 border-[#2e7d32] rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-green-50 active:scale-[0.98] transition-all"
                            >
                                <Plus size={18} /> Add New Address
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AddressPickerModal;

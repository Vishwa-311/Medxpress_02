import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { ShoppingBag, User, LogOut, Menu, X, ShoppingCart, ClipboardList, Home } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import logo from '../../assets/logo/medlogo.png';

const Navbar = () => {
    const { currentUser, logout, userRole } = useAuth();
    const { cartCount } = useCart();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = React.useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
            setIsOpen(false);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const getDashboardLink = () => {
        if (userRole === 'pharmacy') return '/pharmacy-dashboard';
        if (userRole === 'rider') return '/rider-dashboard';
        return '/customer-dashboard';
    };

    const navLinks = [
        { name: 'Home', href: '/', icon: <Home size={20} /> },
        ...(currentUser ? [
            {
                name: userRole === 'pharmacy' ? 'Pharmacy Panel' : userRole === 'rider' ? 'Rider Panel' : 'Customer Panel',
                href: getDashboardLink(),
                icon: <User size={20} />
            },
            ...(userRole === 'user' ? [
                { name: 'Order History', href: '/customer-dashboard', state: { activeTab: 'orders' }, icon: <ClipboardList size={20} /> },
                { name: 'My Profile', href: '/profile', icon: <User size={20} /> }
            ] : []),
            ...(userRole === 'pharmacy' ? [
                { name: 'My Profile', href: '/pharmacy-profile', icon: <User size={20} /> }
            ] : []),
            ...(userRole === 'rider' ? [
                { name: 'My Profile', href: '/rider-profile', icon: <User size={20} /> }
            ] : [])
        ] : [
            { name: 'Login', href: '/login' },
            { name: 'Sign Up', href: '/signup', primary: true },
        ])
    ];

    return (
        <nav className="sticky top-0 z-[1000] h-20 bg-white shadow-sm flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex justify-between items-center">
                {/* Brand */}
                <Link to="/" className="flex items-center" onClick={() => setIsOpen(false)}>
                    <img src={logo} alt="MedXpress" className="h-20 w-auto object-contain" />
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            to={link.href}
                            state={link.state}
                            className={`${link.primary ? 'px-6 py-2.5 bg-[#2e7d32] text-white rounded-xl font-bold hover:bg-[#1b5e20] transition-colors' : 'font-semibold text-gray-700 hover:text-[#2e7d32] transition-colors'} flex items-center gap-2`}
                        >
                            {link.icon}
                            {link.name}
                        </Link>
                    ))}

                    {currentUser && userRole !== 'pharmacy' && userRole !== 'rider' && (
                        <Link to="/cart" className="relative p-2 text-gray-700 hover:text-[#2e7d32] transition-colors flex items-center" title="Cart">
                            <ShoppingCart size={24} />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                    )}

                    {currentUser && (
                        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 border-2 border-[#2e7d32] text-[#2e7d32] rounded-xl font-bold hover:bg-[#2e7d32] hover:text-white transition-all">
                            <LogOut size={18} />
                            Logout
                        </button>
                    )}
                </div>

                {/* Mobile Menu Button + Cart */}
                <div className="md:hidden flex items-center gap-4">
                    {currentUser && userRole !== 'pharmacy' && userRole !== 'rider' && (
                        <Link to="/cart" className="relative p-2 text-gray-700 active:text-[#2e7d32] transition-colors flex items-center">
                            <ShoppingCart size={24} />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                    )}
                    <button className="p-2 text-gray-600" onClick={() => setIsOpen(!isOpen)}>
                        {isOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>
            </div>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1100] md:hidden"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-[280px] bg-white z-[1200] shadow-2xl p-8 md:hidden"
                        >
                            <div className="flex flex-col gap-6 mt-12">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        to={link.href}
                                        state={link.state}
                                        onClick={() => setIsOpen(false)}
                                        className={`${link.primary ? 'w-full py-4 bg-[#2e7d32] text-white rounded-xl text-center font-bold text-lg' : 'text-xl font-bold text-gray-800'} flex items-center gap-3`}
                                    >
                                        {link.icon}
                                        {link.name}
                                    </Link>
                                ))}
                                {currentUser && userRole !== 'pharmacy' && userRole !== 'rider' && (
                                    <Link
                                        to="/cart"
                                        onClick={() => setIsOpen(false)}
                                        className="text-xl font-bold text-gray-800 flex items-center gap-3"
                                    >
                                        <ShoppingCart size={22} className="text-[#2e7d32]" />
                                        Cart
                                        {cartCount > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-auto">
                                                {cartCount} Items
                                            </span>
                                        )}
                                    </Link>
                                )}
                                {currentUser && (
                                    <button
                                        onClick={handleLogout}
                                        className="mt-4 flex items-center justify-center gap-2 w-full py-4 border-2 border-red-500 text-red-500 rounded-xl font-bold text-lg hover:bg-red-500 hover:text-white transition-all"
                                    >
                                        <LogOut size={22} />
                                        Logout
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;

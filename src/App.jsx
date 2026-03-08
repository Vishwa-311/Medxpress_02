import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RiderSignup from './pages/RiderSignup';
import RiderLogin from './pages/RiderLogin';
import CustomerDashboard from './pages/dashboards/CustomerDashboard';
import PharmacyDashboard from './pages/dashboards/PharmacyDashboard';
import RiderDashboard from './pages/dashboards/RiderDashboard';
import RiderPickup from './pages/RiderPickup';
import RiderDelivery from './pages/RiderDelivery';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderTracking from './pages/OrderTracking';
import Profile from './pages/Profile';
import PharmacyProfile from './pages/PharmacyProfile';
import RiderProfile from './pages/RiderProfile';
import './styles/index.css';
import { Loader2 } from 'lucide-react';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth(); // Global loading state while checking auth
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 border-4 border-green-50 rounded-full animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#2e7d32] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-black text-gray-800 mb-2">MedXpress</h2>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">
          Setting up your experience...
        </p>
      </div>
    );
  }
  if (!currentUser) return <Navigate to="/login" />;
  return children;
};

// General Dashboard Redirector
const DashboardRedirector = () => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading || (currentUser && !userRole)) return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <Loader2 className="animate-spin text-[#2e7d32] mb-4" size={48} />
      <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Redirecting...</p>
    </div>
  );

  if (userRole === 'pharmacy') return <Navigate to="/pharmacy-dashboard" replace />;
  if (userRole === 'rider') return <Navigate to="/rider-dashboard" replace />;
  return <Navigate to="/customer-dashboard" replace />;
};

// Role-Based Protected Routes
const CustomerRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();
  if (loading || (currentUser && !userRole)) return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <Loader2 className="animate-spin text-[#2e7d32] mb-4" size={48} />
      <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Loading...</p>
    </div>
  );
  if (!currentUser) return <Navigate to="/login" replace />;
  if (userRole === 'pharmacy') return <Navigate to="/pharmacy-dashboard" replace />;
  if (userRole === 'rider') return <Navigate to="/rider-dashboard" replace />;
  return children;
};

const PharmacyRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();
  if (loading || (currentUser && !userRole)) return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <Loader2 className="animate-spin text-[#2e7d32] mb-4" size={48} />
      <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Loading...</p>
    </div>
  );
  if (!currentUser) return <Navigate to="/login" replace />;
  if (userRole === 'rider') return <Navigate to="/rider-dashboard" replace />;
  if (userRole !== 'pharmacy') return <Navigate to="/customer-dashboard" replace />;
  return children;
};

const RiderRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();
  if (loading || (currentUser && !userRole)) return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <Loader2 className="animate-spin text-[#2e7d32] mb-4" size={48} />
      <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Loading...</p>
    </div>
  );
  if (!currentUser) return <Navigate to="/login" replace />;
  if (userRole !== 'rider') return <Navigate to="/customer-dashboard" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="App min-h-screen bg-[#f9fbf9]">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/rider-signup" element={<RiderSignup />} />
              <Route path="/rider-login" element={<RiderLogin />} />

              {/* Specific Dashboards */}
              <Route path="/customer-dashboard" element={<CustomerRoute><CustomerDashboard /></CustomerRoute>} />
              <Route path="/pharmacy-dashboard" element={<PharmacyRoute><PharmacyDashboard /></PharmacyRoute>} />
              <Route path="/rider-dashboard" element={<RiderRoute><RiderDashboard /></RiderRoute>} />
              <Route path="/rider-pickup/:orderId" element={<RiderRoute><RiderPickup /></RiderRoute>} />
              <Route path="/rider-delivery/:orderId" element={<RiderRoute><RiderDelivery /></RiderRoute>} />
              <Route path="/profile" element={<CustomerRoute><Profile /></CustomerRoute>} />
              <Route path="/cart" element={<CustomerRoute><Cart /></CustomerRoute>} />
              <Route path="/checkout" element={<CustomerRoute><Checkout /></CustomerRoute>} />
              <Route path="/order-tracking/:orderId" element={<CustomerRoute><OrderTracking /></CustomerRoute>} />
              <Route path="/pharmacy-profile" element={<PharmacyRoute><PharmacyProfile /></PharmacyRoute>} />
              <Route path="/rider-profile" element={<RiderRoute><RiderProfile /></RiderRoute>} />

              {/* Catch-all dashboard redirect */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirector /></ProtectedRoute>} />
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;

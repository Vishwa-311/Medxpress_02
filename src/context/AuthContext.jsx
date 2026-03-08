/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    const signup = async (email, password, name, phone, role, locationData = null, address = "", extraData = {}) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // As per latest request: All roles in 'users' collection
        const docData = {
            uid: user.uid,
            email,
            phone,
            role,
            name,
            addresses: [],
            createdAt: new Date().toISOString(),
            ...extraData
        };

        if (role === 'pharmacy' && locationData) {
            docData.latitude = locationData.lat;
            docData.longitude = locationData.lng;
            docData.address = address;
        }

        await setDoc(doc(db, 'users', user.uid), docData);

        // 2️⃣ Save Pharmacy to 'pharmacies' Collection explicitly
        if (role === 'pharmacy') {
            const pharmacyRef = doc(db, 'pharmacies', user.uid);
            await setDoc(pharmacyRef, {
                name: name,
                ownerName: extraData.ownerName || "",
                phone: phone,
                address: address,
                latitude: locationData ? locationData.lat : "",
                longitude: locationData ? locationData.lng : "",
                acceptCOD: true,
                acceptUPI: false,
                qrImage: "",
                createdAt: serverTimestamp()
            });
        }

        // 3️⃣ Save Rider to 'riders' Collection explicitly
        if (role === 'rider') {
            const riderRef = doc(db, 'riders', user.uid);
            await setDoc(riderRef, {
                name: name,
                email: email,
                phone: phone,
                vehicleType: extraData.vehicleType || "",
                licenseNumber: extraData.licenseNumber || "",
                isAvailable: true,
                currentLocation: null,
                createdAt: serverTimestamp()
            });
        }

        return userCredential;
    };

    const saveAddress = async (newAddress) => {
        if (!currentUser) return;
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            let updatedAddresses = [];

            if (userData?.addresses) {
                updatedAddresses = [...userData.addresses];
            }

            // Generate an ID if it's new
            const addressObj = {
                id: newAddress.id || `addr_${Date.now()}`,
                ...newAddress
            };

            // If it's set as default, remove default flag from others
            if (addressObj.isDefault) {
                updatedAddresses = updatedAddresses.map(a => ({ ...a, isDefault: false }));
            } else if (updatedAddresses.length === 0) {
                // Always make the first one default
                addressObj.isDefault = true;
            }

            // Check if editing or adding
            const existingIndex = updatedAddresses.findIndex(a => a.id === addressObj.id);
            if (existingIndex >= 0) {
                updatedAddresses[existingIndex] = addressObj;
            } else {
                updatedAddresses.push(addressObj);
            }

            await setDoc(userRef, { addresses: updatedAddresses }, { merge: true });

            // Update local state immediately to avoid reload delay
            setUserData(prev => ({ ...prev, addresses: updatedAddresses }));
            return addressObj;

        } catch (error) {
            console.error("Error saving address:", error);
            throw error;
        }
    };

    const removeAddress = async (addressId) => {
        if (!currentUser || !userData?.addresses) return;
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            const updatedAddresses = userData.addresses.filter(a => a.id !== addressId);

            // If we removed the default, make the first remaining one default
            if (updatedAddresses.length > 0 && !updatedAddresses.some(a => a.isDefault)) {
                updatedAddresses[0].isDefault = true;
            }

            await setDoc(userRef, { addresses: updatedAddresses }, { merge: true });
            setUserData(prev => ({ ...prev, addresses: updatedAddresses }));
        } catch (error) {
            console.error("Error removing address:", error);
            throw error;
        }
    };

    const setDefaultAddress = async (addressId) => {
        if (!currentUser || !userData?.addresses) return;
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            const updatedAddresses = userData.addresses.map(a => ({
                ...a,
                isDefault: a.id === addressId
            }));

            await setDoc(userRef, { addresses: updatedAddresses }, { merge: true });
            setUserData(prev => ({ ...prev, addresses: updatedAddresses }));
        } catch (error) {
            console.error("Error setting default address:", error);
            throw error;
        }
    };

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        return signOut(auth);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                setCurrentUser(user);
                if (user) {
                    const userSnap = await getDoc(doc(db, 'users', user.uid));
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        setUserRole(data.role);
                        setUserData(data);
                    } else {
                        console.warn("No user document found for UID:", user.uid);
                        setUserRole(null);
                        setUserData(null);
                    }
                } else {
                    setUserRole(null);
                    setUserData(null);
                }
            } catch (error) {
                console.error("Auth state change error:", error);
            } finally {
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userRole,
        userData,
        signup,
        login,
        logout,
        saveAddress,
        removeAddress,
        setDefaultAddress
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

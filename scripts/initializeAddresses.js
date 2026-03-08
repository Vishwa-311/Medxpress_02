import { db } from "../src/firebase.js";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

/**
 * Maintenance script to initialize the "addresses" field for all existing users.
 * 
 * To run this script:
 * 1. Ensure you have the necessary dependencies installed.
 * 2. Run with a tool that supports ES modules and has access to your Firebase project.
 *    (e.g., node scripts/initializeAddresses.js)
 */

async function initializeAddresses() {
    console.log("Starting address initialization for existing users...");

    try {
        const usersCollection = collection(db, "users");
        const userSnapshot = await getDocs(usersCollection);

        console.log(`Found ${userSnapshot.size} total users.`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const userDoc of userSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;

            // Check if "addresses" field already exists
            if (userData.addresses && Array.isArray(userData.addresses) && userData.addresses.length > 0) {
                console.log(`User ${userId} already has addresses. Skipping.`);
                skippedCount++;
                continue;
            }

            // Default addresses to add
            const defaultAddresses = [
                {
                    id: `addr_home_${Date.now()}`,
                    label: "Home",
                    address: "123 Main Street, City",
                    city: "Bangalore",
                    pincode: "560001",
                    phone: userData.phone || "",
                    latitude: 12.9716,
                    longitude: 77.5946,
                    isDefault: true
                },
                {
                    id: `addr_work_${Date.now()}`,
                    label: "Work",
                    address: "456 Office Road, City",
                    city: "Bangalore",
                    pincode: "560002",
                    phone: userData.phone || "",
                    latitude: 12.9352,
                    longitude: 77.6245,
                    isDefault: false
                }
            ];

            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                addresses: defaultAddresses
            });

            console.log(`Updated user ${userId}: Added default addresses.`);
            updatedCount++;
        }

        console.log("Initialization complete!");
        console.log(`Total users updated: ${updatedCount}`);
        console.log(`Total users skipped: ${skippedCount}`);

    } catch (error) {
        console.error("Error during address initialization:", error);
    }
}

// Run the function
initializeAddresses().catch(console.error);

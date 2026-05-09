import { db, storage } from './firebase';
import {
    collection,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Department, CompanySettings } from './types';

const COLLECTION_NAME = 'departments';
const SETTINGS_COLLECTION = 'system_settings';

export async function getDepartments(): Promise<Department[]> {
    // Removed orderBy to avoid requiring a Firestore index
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    const departments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Department[];
    // Sort client-side
    return departments.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addDepartment(name: string): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        name,
        createdAt: Timestamp.now()
    });
    return docRef.id;
}

export async function updateDepartment(id: string, name: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { name });
}

export async function deleteDepartment(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
}

/**
 * Get company settings
 */
export async function getCompanySettings(): Promise<CompanySettings | null> {
    const docRef = doc(db, SETTINGS_COLLECTION, 'company');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as CompanySettings;
    }
    return null;
}

/**
 * Update company settings
 */
export async function updateCompanySettings(settings: Partial<CompanySettings>): Promise<void> {
    const docRef = doc(db, SETTINGS_COLLECTION, 'company');
    await setDoc(docRef, {
        ...settings,
        updatedAt: Timestamp.now()
    }, { merge: true });
}

/**
 * Upload company logo
 */
export async function uploadCompanyLogo(file: File): Promise<string> {
    const storageRef = ref(storage, `brand/company_logo_${Date.now()}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

export async function seedInitialDepartments(): Promise<void> {
    const existing = await getDepartments();
    if (existing.length > 0) return;

    const initialDepartments = [
        "Operations & Performance",
        "Outage Planning",
        "Mechanical Maintenance",
        "Electrical Maintenance",
        "Maintenance Planning",
        "Sales and Marketing",
        "I&C Maintenance",
        "Materials Handling",
        "Water Treatment Plant",
        "Human Resources",
        "Logistics and Facilities",
        "Warehouse and Chemical Handling",
        "Security",
        "Safety"
    ];

    for (const name of initialDepartments) {
        await addDepartment(name);
    }
}

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { OTPKPI, OTPMonthlyUpdate } from './types';

const OTP_COLLECTION = 'otp_kpis';

// ==================== CREATE ====================

export async function createOTPKPI(data: Omit<OTPKPI, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const docData = {
        ...data,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
    };
    const docRef = await addDoc(collection(db, OTP_COLLECTION), docData);
    return docRef.id;
}

// ==================== READ ====================

export async function getOTPKPIsByDepartment(department: string, year: number): Promise<OTPKPI[]> {
    const q = query(
        collection(db, OTP_COLLECTION),
        where('department', '==', department),
        where('year', '==', year),
        orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OTPKPI));
}

export async function getAllOTPKPIs(): Promise<OTPKPI[]> {
    const q = query(collection(db, OTP_COLLECTION));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OTPKPI));
}

// ==================== UPDATE ====================

export async function updateOTPKPI(id: string, updates: Partial<OTPKPI>): Promise<void> {
    const docRef = doc(db, OTP_COLLECTION, id);
    await updateDoc(docRef, {
        ...updates,
        updated_at: Timestamp.now()
    });
}

export async function updateOTPKPIMonthlyData(
    id: string,
    month: number,
    updateData: Omit<OTPMonthlyUpdate, 'month'>
): Promise<void> {
    const docRef = doc(db, OTP_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
        throw new Error("OTP KPI not found");
    }

    const currentData = docSnap.data() as OTPKPI;
    let monthlyUpdates = currentData.monthlyUpdates || [];
    
    const monthIndex = monthlyUpdates.findIndex(m => m.month === month);
    
    if (monthIndex >= 0) {
        monthlyUpdates[monthIndex] = { month, ...updateData };
    } else {
        monthlyUpdates.push({ month, ...updateData });
    }

    await updateDoc(docRef, {
        monthlyUpdates,
        updated_at: Timestamp.now()
    });
}

// ==================== DELETE ====================

export async function deleteOTPKPI(id: string): Promise<void> {
    await deleteDoc(doc(db, OTP_COLLECTION, id));
}

// ==================== NOTIFICATIONS ====================

export async function getOverdueOTPKPIs(): Promise<{ department: string, missingMonths: number[] }[]> {
    const allKPIs = await getAllOTPKPIs();
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();
    
    const overdueMap: Record<string, Set<number>> = {};
    
    // Logic: If it's month X, month X-1 should be updated.
    // If we are in Feb (2), Jan (1) must be updated. If not, it's overdue.
    // We will check up to currentMonth - 1.
    
    allKPIs.forEach(kpi => {
        if (kpi.year !== currentYear) return; // Only notify for current year
        
        const updatedMonths = new Set(kpi.monthlyUpdates?.map(m => m.month) || []);
        
        for (let m = 1; m < currentMonth; m++) {
            if (!updatedMonths.has(m)) {
                if (!overdueMap[kpi.department]) {
                    overdueMap[kpi.department] = new Set();
                }
                overdueMap[kpi.department].add(m);
            }
        }
    });

    return Object.entries(overdueMap).map(([dept, monthsSet]) => ({
        department: dept,
        missingMonths: Array.from(monthsSet).sort((a,b) => a - b)
    }));
}

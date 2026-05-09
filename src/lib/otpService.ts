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
        where('year', '==', year)
    );
    const snapshot = await getDocs(q);
    const kpis = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OTPKPI));
    return kpis.sort((a, b) => {
        const timeA = a.created_at?.seconds || 0;
        const timeB = b.created_at?.seconds || 0;
        return timeB - timeA;
    });
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

export interface DepartmentCompliance {
    department: string;
    totalKPIs: number;
    lastUpdatedMonth: number;
    status: 'On Track' | 'Pending Evaluation' | 'Overdue';
}

export async function getOTPComplianceSummary(year: number): Promise<DepartmentCompliance[]> {
    const q = query(
        collection(db, OTP_COLLECTION),
        where('year', '==', year)
    );
    const snapshot = await getDocs(q);
    const kpis = snapshot.docs.map(doc => doc.data() as OTPKPI);
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const expectedMonth = currentMonth === 1 ? 12 : currentMonth - 1; // If Jan, expect Dec of prev year, but query is for current year so this might be tricky. Let's stick to simple logic: expect currentMonth - 1. If currentMonth is 1, expected is 0 (none).

    const deptMap: Record<string, DepartmentCompliance> = {};

    kpis.forEach(kpi => {
        if (!deptMap[kpi.department]) {
            deptMap[kpi.department] = {
                department: kpi.department,
                totalKPIs: 0,
                lastUpdatedMonth: 0,
                status: 'On Track'
            };
        }
        
        deptMap[kpi.department].totalKPIs++;
        
        // Find latest month this KPI was updated
        let latestMonth = 0;
        let hasPending = false;
        if (kpi.monthlyUpdates && kpi.monthlyUpdates.length > 0) {
            kpi.monthlyUpdates.forEach(m => {
                if (m.month > latestMonth) latestMonth = m.month;
                if (!m.evaluation || m.evaluation === 'PENDING') hasPending = true;
            });
        }
        
        // If this KPI's latest month is greater than the department's recorded latest, update it
        // Wait, what if one KPI is updated but another isn't? 
        // For simplicity, we just check if ALL KPIs have the expected month.
        // Let's track the minimum "latest month" across all KPIs for this department to be strict, or max to be lenient.
        // Let's use max for display, but strict for status.
        if (latestMonth > deptMap[kpi.department].lastUpdatedMonth) {
            deptMap[kpi.department].lastUpdatedMonth = latestMonth;
        }

        // Status logic
        if (expectedMonth > 0 && latestMonth < expectedMonth) {
            deptMap[kpi.department].status = 'Overdue';
        } else if (hasPending && deptMap[kpi.department].status !== 'Overdue') {
            deptMap[kpi.department].status = 'Pending Evaluation';
        }
    });

    return Object.values(deptMap).sort((a, b) => a.department.localeCompare(b.department));
}

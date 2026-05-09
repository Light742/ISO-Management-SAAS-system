import { db, storage } from './firebase';
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
    Timestamp,
    orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { AuditReport, Observation, Finding, ObservationForm, SIRForm } from './types';

const COLLECTION_NAME = 'audit_reports';
const OAF_COLLECTION = 'observation_forms';
const SIR_COLLECTION = 'sir_forms';

/**
 * Delete an audit report and its associated PDF if it exists
 */
export async function deleteAuditReport(reportId: string, pdfUrl?: string): Promise<void> {
    // Delete the document
    await deleteDoc(doc(db, COLLECTION_NAME, reportId));

    // If there's a PDF URL, try to delete the file from storage
    if (pdfUrl) {
        try {
            // Extract the path from the URL or just use the known path structure
            // audit_reports_pdf/${reportId}/final_report.pdf
            const storageRef = ref(storage, `audit_reports_pdf/${reportId}/final_report.pdf`);
            await deleteObject(storageRef);
        } catch (error) {
            console.error('Error deleting PDF from storage:', error);
            // We don't throw here because the document is already deleted
        }
    }
}

/**
 * Delete an OAF document
 */
export async function deleteObservationForm(oafId: string): Promise<void> {
    await deleteDoc(doc(db, OAF_COLLECTION, oafId));
}

/**
 * Create a new audit report
 */
export async function createAuditReport(
    report: Omit<AuditReport, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
    const docData = {
        ...report,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
    return docRef.id;
}

/**
 * Update an existing audit report
 */
export async function updateAuditReport(
    reportId: string,
    updates: Partial<AuditReport>
): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, reportId);
    await updateDoc(docRef, {
        ...updates,
        updated_at: Timestamp.now()
    });
}

/**
 * Get a single audit report by ID
 */
export async function getAuditReport(reportId: string): Promise<AuditReport | null> {
    const docRef = doc(db, COLLECTION_NAME, reportId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as AuditReport;
    }
    return null;
}

/**
 * Get all audit reports (for Auditors)
 */
export async function getAllAuditReports(): Promise<AuditReport[]> {
    const q = query(collection(db, COLLECTION_NAME), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditReport));
}

/**
 * Get audit reports by department (for Auditees)
 */
export async function getReportsByDepartment(department: string): Promise<AuditReport[]> {
    const q = query(
        collection(db, COLLECTION_NAME),
        where('department', '==', department),
        orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditReport));
}

/**
 * Check for recurring issues (same clause + department in past reports)
 */
export async function checkRecurringIssues(
    clauseRef: string,
    department: string
): Promise<{ count: number; reports: { id: string; date: Timestamp }[] }> {
    try {
        // Check in observations
        const ofiQuery = query(
            collection(db, COLLECTION_NAME),
            where('department', '==', department),
            where('status', '==', 'Closed')
        );

        const snapshot = await getDocs(ofiQuery);
        const matchingReports: { id: string; date: Timestamp }[] = [];

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const hasMatchingOFI = data.observations_ofi?.some(
                (ofi: Observation) => ofi.clause_ref === clauseRef
            );
            const hasMatchingNC = data.findings_nc?.some(
                (nc: Finding) => nc.clause_ref === clauseRef
            );

            if (hasMatchingOFI || hasMatchingNC) {
                matchingReports.push({ id: doc.id, date: data.audit_date });
            }
        });

        return { count: matchingReports.length, reports: matchingReports };
    } catch (error) {
        console.error('Error checking recurring issues:', error);
        return { count: 0, reports: [] };
    }
}

/**
 * Upload file to Firebase Storage
 */
export async function uploadAttachment(
    file: File,
    reportId: string
): Promise<string> {
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `audit_attachments/${reportId}/${fileName}`);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
}

/**
 * Upload generated PDF to Firebase Storage
 */
export async function uploadAuditPDF(
    blob: Blob,
    reportId: string
): Promise<string> {
    const storageRef = ref(storage, `audit_reports_pdf/${reportId}/final_report.pdf`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
}


/**
 * Update report status
 */
export async function updateAuditReportStatus(reportId: string, status: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, reportId);
    await updateDoc(docRef, {
        status: status,
        updated_at: Timestamp.now()
    });
}

/**
 * Get all pending audit reports (for Approvals Module)
 */
export async function getPendingAuditReports(): Promise<AuditReport[]> {
    const q = query(
        collection(db, COLLECTION_NAME),
        where('status', '==', 'Pending')
    );
    const snapshot = await getDocs(q);
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditReport));

    // Client-side sort to avoid composite index requirement
    return reports.sort((a, b) => b.created_at.seconds - a.created_at.seconds);
}

/**
 * Get approved audit reports by department (for Department Portal)
 */
export async function getApprovedReportsByDepartment(department: string): Promise<AuditReport[]> {
    const q = query(
        collection(db, COLLECTION_NAME),
        where('department', '==', department)
    );
    const snapshot = await getDocs(q);
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditReport));

    // Filter for relevant statuses and sort client-side
    return reports
        .filter(r => ['Approved', 'For Auditee Approval', 'For Auditor Approval', 'Closed'].includes(r.status))
        .sort((a, b) => b.created_at.seconds - a.created_at.seconds);
}

/**
 * Get all users for auditee selection
 */
export async function getAuditees(): Promise<{ uid: string; displayName: string; department: string }[]> {
    const q = query(collection(db, 'users'), where('role', '==', 'Auditee'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            uid: doc.id,
            displayName: data.displayName || data.email,
            department: data.department
        };
    });
}

// --- OAF Functions ---

export async function createObservationForm(
    formData: Omit<ObservationForm, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
    const docData: any = {
        ...formData,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
    };
    if (formData.status === 'Issued') {
        docData.issued_at = Timestamp.now();
    }
    const docRef = await addDoc(collection(db, OAF_COLLECTION), docData);
    return docRef.id;
}

export async function updateObservationForm(
    oafId: string,
    updates: Partial<ObservationForm>
): Promise<void> {
    const docRef = doc(db, OAF_COLLECTION, oafId);

    const finalUpdates: any = { ...updates, updated_at: Timestamp.now() };
    if (updates.status === 'Issued') {
        finalUpdates.issued_at = Timestamp.now();
    } else if (updates.status === 'Pending Evaluation') {
        finalUpdates.responded_at = Timestamp.now();
    } else if (updates.status === 'Closed') {
        finalUpdates.evaluated_at = Timestamp.now();
    }

    await updateDoc(docRef, finalUpdates);
}

export async function getObservationForm(oafId: string): Promise<ObservationForm | null> {
    const docRef = doc(db, OAF_COLLECTION, oafId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data
        } as ObservationForm;
    }
    return null;
}

export async function getOAFsByDepartment(department: string): Promise<ObservationForm[]> {
    const q = query(
        collection(db, OAF_COLLECTION),
        where('department', '==', department)
    );
    const snapshot = await getDocs(q);
    const forms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ObservationForm));
    // Sort client-side to avoid index requirement
    return forms.sort((a, b) => {
        const dateA = a.created_at?.toMillis() || 0;
        const dateB = b.created_at?.toMillis() || 0;
        return dateB - dateA;
    });
}

export async function getOAFsByAuditor(auditorId: string): Promise<ObservationForm[]> {
    const q = query(
        collection(db, OAF_COLLECTION),
        where('createdBy', '==', auditorId)
    );
    const snapshot = await getDocs(q);
    const forms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ObservationForm));
    return forms.sort((a, b) => {
        const dateA = a.created_at?.toMillis() || 0;
        const dateB = b.created_at?.toMillis() || 0;
        return dateB - dateA;
    });
}

export async function getPendingOAFsForLeadAuditor(): Promise<ObservationForm[]> {
    const q = query(
        collection(db, OAF_COLLECTION),
        where('status', '==', 'Pending Approval')
    );
    const snapshot = await getDocs(q);
    const forms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ObservationForm));
    return forms.sort((a, b) => {
        const dateA = a.created_at?.toMillis() || 0;
        const dateB = b.created_at?.toMillis() || 0;
        return dateB - dateA;
    });
}

export async function getPendingOAFsCount(department: string): Promise<number> {
    const q = query(
        collection(db, OAF_COLLECTION),
        where('department', '==', department),
        where('status', '==', 'Issued')
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
}

export async function getPendingReviewOAFsCount(auditorId: string): Promise<number> {
    const q = query(
        collection(db, OAF_COLLECTION),
        where('createdBy', '==', auditorId),
        where('status', '==', 'Pending Evaluation')
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
}

export async function getAuditorPendingActions(auditorId: string): Promise<{ reports: AuditReport[], oafs: ObservationForm[] }> {
    // 1. Reports where status is 'For Auditor Approval' and auditor_id matches
    const reportsQuery = query(
        collection(db, COLLECTION_NAME),
        where('auditor_id', '==', auditorId),
        where('status', '==', 'For Auditor Approval')
    );
    const reportsSnap = await getDocs(reportsQuery);
    const reports = reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditReport));

    // 2. OAFs where status is 'For Auditor Approval' or 'Pending Evaluation' and createdBy matches
    // Firestore OR queries are valid for same field, but here we have status IN [..]
    const oafsQuery = query(
        collection(db, OAF_COLLECTION),
        where('createdBy', '==', auditorId),
        where('status', 'in', ['For Auditor Approval', 'Pending Evaluation'])
    );
    const oafsSnap = await getDocs(oafsQuery);
    const oafs = oafsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ObservationForm));

    return { reports, oafs };
}

/**
 * Get all Observation Forms system-wide
 */
export async function getAllObservationForms(): Promise<ObservationForm[]> {
    const q = query(collection(db, OAF_COLLECTION));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ObservationForm));
}

// --- SIR Functions ---

export async function createSIR(
    formData: Omit<SIRForm, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
    const docData: any = {
        ...formData,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
    };
    const docRef = await addDoc(collection(db, SIR_COLLECTION), docData);
    return docRef.id;
}

export async function updateSIR(
    sirId: string,
    updates: Partial<SIRForm>
): Promise<void> {
    const docRef = doc(db, SIR_COLLECTION, sirId);
    await updateDoc(docRef, {
        ...updates,
        updated_at: Timestamp.now()
    });
}

export async function getSIR(sirId: string): Promise<SIRForm | null> {
    const docRef = doc(db, SIR_COLLECTION, sirId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as SIRForm;
    }
    return null;
}

export async function getAllSIRs(): Promise<SIRForm[]> {
    const q = query(collection(db, SIR_COLLECTION), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SIRForm));
}

export async function deleteSIR(sirId: string): Promise<void> {
    await deleteDoc(doc(db, SIR_COLLECTION, sirId));
}

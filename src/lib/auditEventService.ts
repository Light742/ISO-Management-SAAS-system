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
    Timestamp,
    writeBatch,
    limit
} from 'firebase/firestore';
import { db } from './firebase';
import type { AuditEvent, AuditReport, ObservationForm, SIRForm } from './types';

const EVENTS_COLLECTION = 'audit_events';
const REPORTS_COLLECTION = 'audit_reports';
const OAF_COLLECTION = 'observation_forms';
const SIR_COLLECTION = 'sir_forms';

// ==================== CREATE ====================

export async function createEvent(
    data: Omit<AuditEvent, 'id' | 'createdAt'>
): Promise<string> {
    const docData = {
        ...data,
        createdAt: Timestamp.now(),
        status: 'Draft' as const
    };
    const docRef = await addDoc(collection(db, EVENTS_COLLECTION), docData);
    return docRef.id;
}

// ==================== READ ====================

export async function getEventById(eventId: string): Promise<AuditEvent | null> {
    const docRef = doc(db, EVENTS_COLLECTION, eventId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as AuditEvent;
    }
    return null;
}

export async function getActiveEvent(): Promise<AuditEvent | null> {
    const q = query(
        collection(db, EVENTS_COLLECTION),
        where('status', '==', 'Active'),
        limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as AuditEvent;
}

export async function getAllEvents(): Promise<AuditEvent[]> {
    const q = query(
        collection(db, EVENTS_COLLECTION)
    );
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditEvent));
    return events.sort((a, b) => {
        // Handle potential missing createdAt
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
    });
}

export async function getArchivedEvents(): Promise<AuditEvent[]> {
    const q = query(
        collection(db, EVENTS_COLLECTION),
        where('status', '==', 'Archived')
    );
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditEvent));
    return events.sort((a, b) => {
        const timeA = a.archivedAt?.seconds || 0;
        const timeB = b.archivedAt?.seconds || 0;
        return timeB - timeA;
    });
}

export async function getDraftEvents(): Promise<AuditEvent[]> {
    const q = query(
        collection(db, EVENTS_COLLECTION),
        where('status', '==', 'Draft')
    );
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditEvent));
    return events.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
    });
}

export async function getSelectableEvents(): Promise<AuditEvent[]> {
    const q = query(
        collection(db, EVENTS_COLLECTION),
        where('status', 'in', ['Active', 'Draft'])
    );
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditEvent));
    return events.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
    });
}

// ==================== UPDATE ====================

export async function updateEvent(
    eventId: string,
    updates: Partial<AuditEvent>
): Promise<void> {
    const docRef = doc(db, EVENTS_COLLECTION, eventId);
    await updateDoc(docRef, updates);
}

// ==================== LIFECYCLE ====================

export async function activateEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    // Check if there's already an active event
    const activeEvent = await getActiveEvent();

    if (activeEvent) {
        return {
            success: false,
            error: `Event "${activeEvent.name}" is already active. Archive it first before activating a new event.`
        };
    }

    // Get the event to activate
    const eventToActivate = await getEventById(eventId);
    if (!eventToActivate) {
        return { success: false, error: 'Event not found.' };
    }

    if (eventToActivate.status !== 'Draft') {
        return { success: false, error: 'Only draft events can be activated.' };
    }

    // Activate the event
    await updateEvent(eventId, {
        status: 'Active',
        activatedAt: Timestamp.now()
    });

    return { success: true };
}

export async function archiveEvent(
    eventId: string,
    archivedBy: string
): Promise<{ success: boolean; error?: string; openDocuments?: { oafs: number; sirs: number } }> {
    const event = await getEventById(eventId);

    if (!event) {
        return { success: false, error: 'Event not found.' };
    }

    if (event.status !== 'Active') {
        return { success: false, error: 'Only active events can be archived.' };
    }

    // Get document counts for this event
    const [reports, oafs, sirs] = await Promise.all([
        getReportsByEventId(eventId),
        getOAFsByEventId(eventId),
        getSIRsByEventId(eventId)
    ]);

    // Check for unapproved audit reports (blocking)
    const unapprovedReports = reports.filter(r =>
        r.status !== 'Approved' && r.status !== 'Closed' && r.status !== 'Rejected'
    );

    if (unapprovedReports.length > 0) {
        return {
            success: false,
            error: `Cannot archive: ${unapprovedReports.length} audit report(s) are not yet approved/closed.`
        };
    }

    // Count open OAFs and SIRs (warning, not blocking)
    const openOAFs = oafs.filter(o => o.status !== 'Closed');
    const openSIRs = sirs.filter(s => s.status !== 'Closed');

    // Compute statistics
    const departmentsCovered = [...new Set([
        ...reports.map(r => r.department),
        ...oafs.map(o => o.department),
        ...sirs.map(s => s.department)
    ])];

    const totalFindings = reports.reduce((sum, r) => sum + (r.findings_nc?.length || 0), 0);

    // Update event with stats and archive status
    await updateEvent(eventId, {
        status: 'Archived',
        archivedAt: Timestamp.now(),
        archivedBy,
        stats: {
            totalReports: reports.length,
            totalOAFs: oafs.length,
            totalSIRs: sirs.length,
            totalFindings,
            departmentsCovered
        }
    });

    return {
        success: true,
        openDocuments: {
            oafs: openOAFs.length,
            sirs: openSIRs.length
        }
    };
}

// ==================== DELETE ====================

export async function deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    const event = await getEventById(eventId);

    if (!event) {
        return { success: false, error: 'Event not found.' };
    }

    if (event.status !== 'Draft') {
        return { success: false, error: 'Only draft events can be deleted.' };
    }

    // Check for associated documents
    const [reports, oafs, sirs] = await Promise.all([
        getReportsByEventId(eventId),
        getOAFsByEventId(eventId),
        getSIRsByEventId(eventId)
    ]);

    if (reports.length > 0 || oafs.length > 0 || sirs.length > 0) {
        return {
            success: false,
            error: `Cannot delete: Event has ${reports.length} reports, ${oafs.length} OAFs, and ${sirs.length} SIRs associated.`
        };
    }

    await deleteDoc(doc(db, EVENTS_COLLECTION, eventId));
    return { success: true };
}

// ==================== DOCUMENT QUERIES BY EVENT ====================

export async function getReportsByEventId(eventId: string): Promise<AuditReport[]> {
    const q = query(
        collection(db, REPORTS_COLLECTION),
        where('eventId', '==', eventId),
        orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditReport));
}

export async function getOAFsByEventId(eventId: string): Promise<ObservationForm[]> {
    const q = query(
        collection(db, OAF_COLLECTION),
        where('eventId', '==', eventId),
        orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ObservationForm));
}

export async function getSIRsByEventId(eventId: string): Promise<SIRForm[]> {
    const q = query(
        collection(db, SIR_COLLECTION),
        where('eventId', '==', eventId),
        orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SIRForm));
}

// ==================== OPEN CORRECTIVE ACTIONS ====================

export async function getOpenCorrectiveActions(): Promise<{
    oafs: ObservationForm[];
    sirs: SIRForm[];
}> {
    // Get all OAFs that are not closed
    const oafQuery = query(
        collection(db, OAF_COLLECTION),
        where('status', '!=', 'Closed'),
        orderBy('status'),
        orderBy('created_at', 'desc')
    );

    // Get all SIRs that are not closed
    const sirQuery = query(
        collection(db, SIR_COLLECTION),
        where('status', '!=', 'Closed'),
        orderBy('status'),
        orderBy('created_at', 'desc')
    );

    const [oafSnapshot, sirSnapshot] = await Promise.all([
        getDocs(oafQuery),
        getDocs(sirQuery)
    ]);

    return {
        oafs: oafSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ObservationForm)),
        sirs: sirSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SIRForm))
    };
}

// ==================== EDITABILITY CHECK ====================

export function isDocumentEditable(
    doc: AuditReport | ObservationForm | SIRForm,
    eventStatus: 'Draft' | 'Active' | 'Archived' | undefined
): boolean {
    // If no event (legacy), treat as editable based on status
    if (!eventStatus) {
        // For reports, editable until approved/closed
        if ('audit_date' in doc) {
            return !['Approved', 'Closed'].includes(doc.status);
        }
        // For OAFs/SIRs, editable until closed
        return doc.status !== 'Closed';
    }

    // With event context:
    // Audit Reports: Only editable if event is active
    if ('audit_date' in doc) {
        return eventStatus === 'Active' && !['Approved', 'Closed'].includes(doc.status);
    }

    // OAFs and SIRs: Editable until individually closed (regardless of event status)
    return doc.status !== 'Closed';
}

// ==================== MIGRATION UTILITY ====================

export async function createLegacyEvent(userId: string): Promise<string> {
    // Check if legacy event already exists
    const allEvents = await getAllEvents();
    const existingLegacy = allEvents.find(e => e.name === 'Legacy - Pre-Event System');

    if (existingLegacy) {
        return existingLegacy.id!;
    }

    // Create new legacy event
    const eventId = await createEvent({
        name: 'Legacy - Pre-Event System',
        description: 'Documents created before event management system was implemented',
        createdBy: userId,
        status: 'Archived',
        archivedAt: Timestamp.now(),
        archivedBy: userId
    });

    return eventId;
}

export async function migrateDocumentsToEvent(eventId: string, eventName: string): Promise<{
    reports: number;
    oafs: number;
    sirs: number;
}> {
    const batch = writeBatch(db);
    let reportCount = 0;
    let oafCount = 0;
    let sirCount = 0;

    // Get all documents without eventId
    const reportsQ = query(collection(db, REPORTS_COLLECTION));
    const oafsQ = query(collection(db, OAF_COLLECTION));
    const sirsQ = query(collection(db, SIR_COLLECTION));

    const [reportsSnap, oafsSnap, sirsSnap] = await Promise.all([
        getDocs(reportsQ),
        getDocs(oafsQ),
        getDocs(sirsQ)
    ]);

    // Migrate reports
    reportsSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.eventId) {
            batch.update(doc(db, REPORTS_COLLECTION, docSnap.id), {
                eventId,
                eventName
            });
            reportCount++;
        }
    });

    // Migrate OAFs
    oafsSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.eventId) {
            batch.update(doc(db, OAF_COLLECTION, docSnap.id), {
                eventId,
                eventName
            });
            oafCount++;
        }
    });

    // Migrate SIRs
    sirsSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.eventId) {
            batch.update(doc(db, SIR_COLLECTION, docSnap.id), {
                eventId,
                eventName
            });
            sirCount++;
        }
    });

    // Commit batch (max 500 operations)
    if (reportCount + oafCount + sirCount > 0) {
        await batch.commit();
    }

    return { reports: reportCount, oafs: oafCount, sirs: sirCount };
}

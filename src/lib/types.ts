import type { Timestamp } from 'firebase/firestore';

// User roles
export type UserRole = 'Auditor' | 'LeadAuditor' | 'QMSAdmin' | 'Auditee';

// User document in Firestore
export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    role: UserRole;
    department: string;
    createdAt?: Timestamp;
}

// Audit Event Status
export type EventStatus = 'Draft' | 'Active' | 'Archived';

// Audit Event - Container for all audit activities
export interface AuditEvent {
    id?: string;
    name: string;                    // e.g., "Q1 2026 Internal Audit"
    description?: string;
    createdBy: string;               // Lead Auditor UID
    createdAt: Timestamp;

    // Lifecycle
    status: EventStatus;
    activatedAt?: Timestamp;
    archivedAt?: Timestamp;
    archivedBy?: string;

    // Statistics (computed on archive)
    stats?: {
        totalReports: number;
        totalOAFs: number;
        totalSIRs: number;
        totalFindings: number;
        departmentsCovered: string[];
    };
}

// Status of audit report
export type AuditStatus = 'Draft' | 'Pending' | 'For Auditee Approval' | 'For Auditor Approval' | 'Approved' | 'Closed' | 'Rejected';

// Status of Observation Action Form
export type OAFStatus = 'Draft' | 'Pending Approval' | 'Issued' | 'Pending Response' | 'Pending Evaluation' | 'For Auditee Approval' | 'For Auditor Approval' | 'Closed' | 'Rejected';

// Finding type
export type FindingType = 'Minor' | 'Major';

// Good Point entry
export interface GoodPoint {
    id: string;
    text: string;
}

// Observation / OFI entry
export interface Observation {
    id: string;
    description: string;
    clause_ref: string;
    status: 'Open' | 'Closed';
}

// Finding / NC entry
export interface Finding {
    id: string;
    description: string;
    objective_evidence: { id: string; text: string }[];
    clause_ref: string;
    sir_ref?: string;
    type: FindingType;
    status: 'Open' | 'Closed';
}

// Audit Report document in Firestore
export interface AuditReport {
    id?: string;
    area_process: string;
    audit_date: Timestamp;
    auditor_id: string;
    auditor_name?: string;
    auditee_id: string;
    auditee_name?: string;
    department: string;
    status: AuditStatus;
    rejection_reason?: string;

    // Event Association
    eventId?: string;            // Associates report with audit event
    eventName?: string;          // Denormalized for display

    // Data arrays
    good_points: GoodPoint[];
    observations_ofi: Observation[];
    findings_nc: Finding[];

    // Meta
    conclusion_text: string;
    attachments_list: string[]; // URLs
    pdf_url?: string; // URL to the generated PDF report

    // Audit trail
    created_at: Timestamp;
    updated_at: Timestamp;
    acknowledged_at?: Timestamp;
}

// ISO News item
export interface ISONews {
    id?: string;
    title: string;
    link: string;
    date: Timestamp;
}
export interface Department {
    id: string;
    name: string;
    createdAt?: Timestamp;
}

export interface CompanySettings {
    logoUrl?: string;
    companyName?: string;
    updatedAt?: Timestamp;
}

export interface ObservationRow {
    id: string;
    observation: string;
    action: string;
    responsiblePerson: string;
    dueDate: string;
    evalDate: string;
    status: 'A' | 'E' | '';
    evidence: string[];
}

export interface ObservationForm {
    id?: string;
    department: string;
    auditDate: string;
    auditeeName: string;
    auditorName: string;
    evaluatedByName: string;
    rows: ObservationRow[];
    status: OAFStatus;
    rejection_reason?: string;
    createdBy: string;
    created_at: Timestamp;
    updated_at: Timestamp;
    issued_at?: Timestamp;
    responded_at?: Timestamp;
    evaluated_at?: Timestamp;

    // Event Association
    eventId?: string;            // Associates OAF with audit event
    eventName?: string;          // Denormalized for display
}

// SIR Status
export type SIRStatus = 'Draft' | 'Issued' | 'Pending Response' | 'Pending Evaluation' | 'Closed' | 'Rejected';

// SIR Action Row (Correction / Corrective Action)
export interface SIRActionRow {
    id: string;
    description: string;
    hiracNeeded: boolean;
    accountability: string;
    completionDate: string;
}

// SIR Effectiveness Row (Implementation / Effectiveness)
export interface SIREffectivenessRow {
    id: string;
    date: string;
    evidence: string;
    status: 'Closed' | 'Open';
    remarks: string;
}

// SIR Form Document
export interface SIRForm {
    id?: string;
    // Header
    department: string; // Issued To
    auditorName: string; // Issued By
    sirNo: string;
    issueDate: string;

    // Type Checkboxes
    natureOfNonConformity: string[];

    // Section 1
    findings: string;
    objectiveEvidence: string;
    reference: string;
    classification: 'Major' | 'Minor';
    relevantClause: string;
    docCode: string;

    // Signatures Sec 1
    auditeeAcknowledgedBy: string;
    auditeeAcknowledgedDate: string;
    auditeeSuperiorNotedBy: string;
    auditeeSuperiorNotedDate: string;

    // Section 2
    rootCause: string;
    rootCauseDeterminedBy: string; // auditee & team
    rootCauseApprovedBy: string; // superior

    // Section 3 (Agreed Correction)
    corrections: SIRActionRow[];
    correctionRecommendedBy: string;
    correctionApprovedBy: string;

    // Section 4 (Agreed Corrective Action)
    correctiveActions: SIRActionRow[];
    correctiveActionRecommendedBy: string;
    correctiveActionApprovedBy: string;

    // Section 5 (Follow-up)
    extensionRequested: boolean;
    newCommitmentDate?: string;

    implementationRows: SIREffectivenessRow[];
    implementationFollowedUpBy: string;
    implementationNotedBy: string;

    effectivenessEffective: boolean | null; // Yes/No (null if not set)
    dispositionTaken?: string; // If no

    effectivenessRows: SIREffectivenessRow[];
    effectivenessFollowedUpBy: string;
    effectivenessNotedBy: string;

    // Meta
    status: SIRStatus;
    rejection_reason?: string;
    createdBy: string;
    created_at: Timestamp;
    updated_at: Timestamp;

    // Event Association
    eventId?: string;            // Associates SIR with audit event
    eventName?: string;          // Denormalized for display
}

// OTP Monthly Update item
export interface OTPMonthlyUpdate {
    month: number; // 1-12
    target: string;
    actual: string;
    evaluation: 'PASSED' | 'FAILED' | 'PENDING' | 'N/A';
    remarks: string;
}

// OTP KPI Document
export interface OTPKPI {
    id?: string;
    department: string;
    objective: string;
    target: string;
    programsActions: string;
    responsiblePerson: string;
    resourcesNeeded: string;
    timeline: string;
    year: number;
    monthlyUpdates: OTPMonthlyUpdate[];
    created_at: Timestamp;
    updated_at: Timestamp;
}

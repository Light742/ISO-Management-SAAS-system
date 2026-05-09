import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { DynamicList } from '../components/form/DynamicList';
import { DynamicTable, type TableColumn } from '../components/form/DynamicTable';
import { FileUpload } from '../components/form/FileUpload';
import { useRecurringCheck } from '../hooks/useRecurringCheck';
import {
    createAuditReport,
    updateAuditReport,
    getAuditReport,
    uploadAttachment,
    uploadAuditPDF
} from '../lib/auditService';
import { getSelectableEvents } from '../lib/auditEventService';
import { getDepartments, getCompanySettings } from '../lib/settingsService';
import type { GoodPoint, Observation, Finding, AuditStatus, Department as DeptType, CompanySettings, AuditEvent } from '../lib/types';
import { ArrowLeft, Save, Send, AlertTriangle, FileText, Calendar, CheckCircle, Info, Paperclip, User, ChevronDown, Search, FileDown, Loader2 } from 'lucide-react';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { AuditPDF } from '../components/pdf/AuditPDF';

const ofiColumns: TableColumn[] = [
    { key: 'description', label: 'Description', width: '400px' },
    { key: 'clause_ref', label: 'Clause Ref.', width: '200px' },
    {
        key: 'status', label: 'Status', type: 'select', options: [
            { value: 'Open', label: 'Open' },
            { value: 'Closed', label: 'Closed' }
        ], width: '150px'
    }
];

const ncColumns: TableColumn[] = [
    { key: 'description', label: 'Findings', width: '500px' },
    { key: 'objective_evidence', label: 'Objective Evidence', type: 'list', width: '500px' },
    { key: 'clause_ref', label: 'Ref. Clause', width: '200px' },
    {
        key: 'type', label: 'Type', type: 'select', options: [
            { value: 'Minor', label: 'Minor' },
            { value: 'Major', label: 'Major' }
        ], width: '150px'
    }
];

export const AuditFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, userData } = useAuth();
    const isEdit = !!id;

    const [areaProcess, setAreaProcess] = useState('');
    const [auditDate, setAuditDate] = useState('');
    const [conclusion, setConclusion] = useState('');
    const [goodPoints, setGoodPoints] = useState<GoodPoint[]>([]);
    const [observations, setObservations] = useState<Observation[]>([]);
    const [findings, setFindings] = useState<Finding[]>([]);
    const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
    const [auditeeName, setAuditeeName] = useState('');
    const [auditorName, setAuditorName] = useState('');
    const [department, setDepartment] = useState('');
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

    const [availableDepartments, setAvailableDepartments] = useState<DeptType[]>([]);
    const [saving, setSaving] = useState(false);
    const [reportId, setReportId] = useState<string | null>(id || null);
    const [status, setStatus] = useState<AuditStatus>('Draft');
    const [showDeptDropdown, setShowDeptDropdown] = useState(false);
    const [deptSearch, setDeptSearch] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    const isAuditor = userData?.role === 'Auditor' || userData?.role === 'LeadAuditor' || userData?.role === 'QMSAdmin';
    const isAuditee = userData?.role === 'Auditee';
    const isReadOnly = status !== 'Draft' && status !== 'Rejected'; // Editable if Draft or Rejected

    const [availableEvents, setAvailableEvents] = useState<AuditEvent[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');

    const { alerts, checkClause } = useRecurringCheck(department);

    useEffect(() => {
        const loadDepartmentsList = async () => {
            try {
                const departments = await getDepartments();
                setAvailableDepartments(departments);
            } catch (error) {
                console.error('Error loading departments:', error);
            }
        };

        const loadReport = async (reportId: string) => {
            try {
                const report = await getAuditReport(reportId);
                if (report) {
                    setAreaProcess(report.area_process);
                    setAuditDate(report.audit_date.toDate().toISOString().split('T')[0]);
                    setConclusion(report.conclusion_text);
                    setGoodPoints(report.good_points);
                    setObservations(report.observations_ofi);
                    setFindings(report.findings_nc.map(f => ({ ...f, objective_evidence: f.objective_evidence || [] })));
                    setAttachments(report.attachments_list.map(url => ({ name: url.split('/').pop() || 'file', url })));
                    setAuditeeName(report.auditee_name || '');
                    setAuditorName(report.auditor_name || '');
                    setDepartment(report.department || '');
                    setStatus(report.status);
                    setRejectionReason(report.rejection_reason || '');
                }
            } catch (error) {
                console.error('Error loading audit report:', error);
            }
        };

        const loadCompanyInfo = async () => {
            try {
                const settings = await getCompanySettings();
                setCompanySettings(settings);
            } catch (error) {
                console.error('Error loading company info:', error);
            }
        };

        if (id) {
            loadReport(id);
        } else if (userData) {
            setAuditorName(userData.displayName || user?.email || '');
        }
        loadDepartmentsList();
        loadCompanyInfo();
    }, [id, userData, user]);

    // Load selectable events for new documents
    useEffect(() => {
        const loadEvents = async () => {
            const events = await getSelectableEvents();
            setAvailableEvents(events);
            // Auto-select the active event
            const active = events.find(e => e.status === 'Active');
            if (active) {
                setSelectedEventId(active.id!);
            }
        };
        if (!id) {
            loadEvents();
        }
    }, [id]);

    const handleUpload = async (file: File): Promise<string> => {
        if (!reportId) {
            const newId = await handleSave('Draft');
            if (!newId) throw new Error('Failed to create draft');
            return uploadAttachment(file, newId);
        }
        return uploadAttachment(file, reportId);
    };

    const handleSave = async (statusArg: AuditStatus = 'Draft'): Promise<string | null> => {
        if (!user || !userData) {
            alert('User profile not fully loaded. Please refresh the page.');
            return null;
        }

        setSaving(true);
        try {
            const reportData = {
                area_process: areaProcess,
                audit_date: Timestamp.fromDate(new Date(auditDate)),
                auditor_id: user.uid,
                auditor_name: auditorName,
                auditee_id: 'manual_entry',
                auditee_name: auditeeName,
                department,
                status: statusArg,
                good_points: goodPoints,
                observations_ofi: observations as Observation[],
                findings_nc: findings as Finding[],
                conclusion_text: conclusion,
                attachments_list: attachments.map(a => a.url),
                created_at: Timestamp.now(),
                updated_at: Timestamp.now(),
                // Event context - only set on new documents
                ...(selectedEventId ? {
                    eventId: selectedEventId,
                    eventName: availableEvents.find(e => e.id === selectedEventId)?.name || ''
                } : {})
            };

            if (reportId) {
                await updateAuditReport(reportId, reportData as any);
                return reportId;
            } else {
                const newId = await createAuditReport(reportData as any);
                setReportId(newId);
                navigate(`/audit-form/${newId}`, { replace: true });
                return newId;
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save report');
            return null;
        } finally {
            setSaving(false);
            if (statusArg === 'Draft') {
                alert('Draft saved successfully!');
            }
        }
    };

    const handleSubmit = async () => {
        if (!user) {
            alert('You must be logged in to submit a report.');
            return;
        }

        // Validation with specific error messages
        if (!areaProcess) {
            alert('Please select an Area / Process');
            return;
        }
        if (!auditDate) {
            alert('Please select an Audit Date');
            return;
        }
        if (!selectedEventId && !id) {
            alert('Please select an Audit Event');
            return;
        }
        if (!auditeeName.trim()) {
            alert('Please enter an Auditee name');
            return;
        }

        setSaving(true);

        try {
            let nextStatus: AuditStatus = 'Pending';
            let successMessage = 'Audit Report submitted for Lead Auditor approval!';

            if (isAuditee && status === 'For Auditee Approval') {
                nextStatus = 'For Auditor Approval';
                successMessage = 'Report approved and sent to Auditor for finalization!';
            } else if (isAuditor && status === 'For Auditor Approval') {
                nextStatus = 'Closed'; // or Approved/Closed
                successMessage = 'Audit Report finalized and closed!';
            }

            // If it's a new submission (Draft or Rejected -> Pending/For Auditee Approval), we do the full save+upload
            if (status === 'Draft' || status === 'Rejected') {
                // Determine ID first
                let targetId = reportId;
                if (!targetId) {
                    targetId = await handleSave('Draft'); // Save as draft first if not exist
                }
                if (!targetId) return;

                // Determine initial status based on role
                // Lead Auditors bypass the "Pending" review and send directly to Auditee
                const isLeadAuditor = userData?.role === 'LeadAuditor' || userData?.role === 'QMSAdmin';
                const initialStatus = isLeadAuditor ? 'For Auditee Approval' : 'Pending';

                // If resubmitting a rejected report, update the success message
                if (status === 'Rejected') {
                    successMessage = isLeadAuditor
                        ? 'Revised report approved and sent to Auditee!'
                        : 'Revised report resubmitted for Lead Auditor approval!';
                }

                if (isLeadAuditor) {
                    successMessage = 'Audit Report approved and sent to Auditee!';
                }

                // Generate PDF
                const blob = await pdf(
                    <AuditPDF
                        report={{
                            area_process: areaProcess,
                            audit_date: Timestamp.fromDate(new Date(auditDate)),
                            auditor_name: auditorName,
                            auditee_name: auditeeName,
                            department,
                            conclusion_text: conclusion,
                            good_points: goodPoints,
                            observations_ofi: observations,
                            findings_nc: findings,
                            attachments_list: attachments.map(a => a.url),
                            created_at: Timestamp.now(), updated_at: Timestamp.now(), status: initialStatus, auditor_id: user.uid, auditee_id: ''
                        }}
                        companySettings={companySettings}
                    />
                ).toBlob();

                const pdfUrl = await uploadAuditPDF(blob, targetId);
                await updateAuditReport(targetId, {
                    status: initialStatus,
                    pdf_url: pdfUrl,
                    updated_at: Timestamp.now(),
                    rejection_reason: '' // Clear rejection reason on resubmission
                });
            } else {
                // For approvals, just update status
                if (reportId) {
                    await updateAuditReport(reportId, { status: nextStatus, updated_at: Timestamp.now() });
                }
            }

            alert(successMessage);
            navigate(isAuditee ? `/department/${department}` : '/dashboard');
        } catch (error) {
            console.error('Submission error:', error);
            alert('Failed to submit report');
        } finally {
            setSaving(false);
        }
    };

    const handleReject = async () => {
        if (!window.confirm('Are you sure you want to reject this report? It will be returned to the Auditor for revision.')) return;

        setSaving(true);
        try {
            if (reportId) {
                await updateAuditReport(reportId, {
                    status: 'Pending',
                    updated_at: Timestamp.now()
                });
                alert('Report rejected and returned to Pending status.');
                navigate(isAuditee ? `/department/${department}` : '/dashboard');
            }
        } catch (error) {
            console.error('Rejection error:', error);
            alert('Failed to reject report');
        } finally {
            setSaving(false);
        }
    };

    const handlePreview = async () => {
        try {
            const blob = await pdf(
                <AuditPDF
                    report={{
                        id: reportId || 'preview',
                        area_process: areaProcess || 'Untitled Area',
                        audit_date: auditDate ? Timestamp.fromDate(new Date(auditDate)) : Timestamp.now(),
                        auditor_name: auditorName,
                        auditee_name: auditeeName,
                        department,
                        conclusion_text: conclusion,
                        good_points: goodPoints,
                        observations_ofi: observations,
                        findings_nc: findings,
                        attachments_list: attachments.map(a => a.url),
                        created_at: Timestamp.now(), updated_at: Timestamp.now(), status: status, auditor_id: user?.uid || '', auditee_id: ''
                    }}
                    companySettings={companySettings}
                />
            ).toBlob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Preview error:', error);
            alert('Failed to generate preview');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {status === 'Rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800">
                    <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                    <div>
                        <h3 className="font-bold">This report has been rejected</h3>
                        <p className="text-sm mt-1">{rejectionReason}</p>
                        <p className="text-xs mt-2 text-red-600 font-medium">Please revise and submit again.</p>
                    </div>
                </div>
            )}
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => navigate('/')}
                        className="p-3 bg-white rounded-2xl shadow-soft hover:shadow-premium transition-all group"
                    >
                        <ArrowLeft size={20} className="text-muted group-hover:text-primary transition-colors" />
                    </button>
                    <div className="flex items-center gap-4">
                        {companySettings?.logoUrl && (
                            <img
                                src={companySettings.logoUrl}
                                alt="Company Logo"
                                className="h-12 w-auto object-contain"
                            />
                        )}
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                {companySettings?.companyName || 'Internal Audit'}
                            </h1>
                            <p className="text-muted text-sm font-medium">
                                {isEdit ? 'Edit Audit Report' : 'New Audit Report'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handlePreview}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors font-medium"
                    >
                        <FileText size={18} />
                        Preview Report
                    </button>
                    <PDFDownloadLink
                        document={
                            <AuditPDF
                                report={{
                                    id: reportId || 'preview',
                                    area_process: areaProcess || 'Untitled Area',
                                    audit_date: auditDate ? Timestamp.fromDate(new Date(auditDate)) : Timestamp.now(),
                                    auditor_id: user?.uid || '',
                                    auditor_name: auditorName,
                                    auditee_id: '',
                                    auditee_name: auditeeName || 'Auditee',
                                    department: department || '',
                                    status: 'Draft',
                                    good_points: goodPoints,
                                    observations_ofi: observations,
                                    findings_nc: findings,
                                    conclusion_text: conclusion || '',
                                    attachments_list: attachments.map(a => a.url),
                                    created_at: Timestamp.now(),
                                    updated_at: Timestamp.now()
                                }}
                                companySettings={companySettings}
                            />
                        }
                        fileName={`AuditReport_${areaProcess || 'draft'}.pdf`}
                        className="btn-secondary flex items-center justify-center gap-2 px-4 py-3 rounded-2xl shadow-soft hover:shadow-premium transition-all text-sm font-semibold"
                    >
                        {({ loading }) => (
                            <>
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                                <span className="hidden sm:inline">{loading ? 'Generating...' : 'PDF'}</span>
                            </>
                        )}
                    </PDFDownloadLink>

                    <div className="flex gap-4">
                        {!isReadOnly && (
                            <button
                                onClick={() => handleSave('Draft')}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                <Save size={20} />
                                Save Draft
                            </button>
                        )}

                        {/* Show Submit button if:
                        1. Auditor & Draft (Submit to Lead Auditor)
                        2. Auditee & For Auditee Approval (Approve)
                        3. Auditor & For Auditor Approval (Finalize)
                    */}
                        {(
                            (isAuditor && (status === 'Draft' || status === 'Rejected')) ||
                            (isAuditee && status === 'For Auditee Approval') ||
                            (isAuditor && status === 'For Auditor Approval')
                        ) && (
                                <div className="flex gap-2">
                                    {(status === 'For Auditee Approval' || status === 'For Auditor Approval') && (
                                        <button
                                            onClick={handleReject}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                                        >
                                            <AlertTriangle size={18} />
                                            Reject
                                        </button>
                                    )}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50"
                                    >
                                        {isAuditee && status === 'For Auditee Approval' ? (
                                            <>
                                                <CheckCircle size={20} />
                                                Approve Report
                                            </>
                                        ) : status === 'For Auditor Approval' ? (
                                            <>
                                                <CheckCircle size={20} />
                                                Finalize & Close
                                            </>
                                        ) : (
                                            <>
                                                <Send size={20} />
                                                Submit Report
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                    </div>
                </div>
            </div>

            {/* Main Form Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Basic Info */}
                    <div className="card-modern space-y-6">
                        <div className="flex items-center gap-2 text-accent font-bold mb-2">
                            <Info size={20} />
                            <span>REPORT DETAILS</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-muted ml-1">Area / Process</label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-muted z-10" size={18} />
                                    <div
                                        onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                                        className={`input-modern w-full pl-12 pr-10 cursor-pointer flex items-center justify-between min-h-[52px] ${isReadOnly ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        <span className={areaProcess ? 'text-primary' : 'text-gray-400'}>
                                            {areaProcess || "Select Area / Process..."}
                                        </span>
                                        <ChevronDown size={18} className={`text-muted transition-transform ${showDeptDropdown ? 'rotate-180' : ''}`} />
                                    </div>

                                    {showDeptDropdown && !isReadOnly && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-premium border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="p-3 border-b border-gray-50 flex items-center gap-2">
                                                <Search size={14} className="text-muted" />
                                                <input
                                                    type="text"
                                                    value={deptSearch}
                                                    onChange={(e) => setDeptSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    placeholder="Search departments..."
                                                    className="w-full bg-transparent border-none text-sm focus:ring-0 outline-none p-1"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                {availableDepartments
                                                    .filter(d => d.name.toLowerCase().includes(deptSearch.toLowerCase()))
                                                    .map((dept) => (
                                                        <button
                                                            key={dept.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setAreaProcess(dept.name);
                                                                setDepartment(dept.name);
                                                                setShowDeptDropdown(false);
                                                                setDeptSearch('');
                                                            }}
                                                            className="w-full text-left px-5 py-3 text-sm hover:bg-accent/5 transition-colors font-medium border-b border-gray-50 last:border-none"
                                                        >
                                                            {dept.name}
                                                        </button>
                                                    ))}
                                                {availableDepartments.length === 0 && (
                                                    <div className="px-5 py-4 text-xs text-muted italic">
                                                        No departments found. Add them in Settings.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {/* Overlay to close dropdown */}
                                    {showDeptDropdown && (
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setShowDeptDropdown(false)}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-muted ml-1">Audit Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                                    <input
                                        type="date"
                                        value={auditDate}
                                        disabled={isReadOnly}
                                        onChange={(e) => setAuditDate(e.target.value)}
                                        className="input-modern w-full pl-12 disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Event Selection for New Reports */}
                        {!id && (
                            <div className="space-y-2 col-span-full">
                                <label className="text-sm font-semibold text-muted ml-1">Audit Event *</label>
                                <select
                                    value={selectedEventId}
                                    onChange={(e) => setSelectedEventId(e.target.value)}
                                    className="input-modern w-full"
                                >
                                    <option value="">Select an audit event...</option>
                                    {availableEvents.map(ev => (
                                        <option key={ev.id} value={ev.id!}>
                                            {ev.name} {ev.status === 'Active' ? '(Active)' : '(Draft)'}
                                        </option>
                                    ))}
                                </select>
                                {availableEvents.length === 0 && (
                                    <p className="text-xs text-amber-600 font-medium">
                                        No audit events found. Please create one in Event Management first.
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-muted ml-1">Overall Conclusion</label>
                            <textarea
                                value={conclusion}
                                disabled={isReadOnly}
                                onChange={(e) => setConclusion(e.target.value)}
                                placeholder="Summarize the audit results and general compliance..."
                                rows={4}
                                className="input-modern w-full resize-none disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* Quality Insights */}
                    <div className="card-modern">
                        <div className="flex items-center gap-2 text-green-600 font-bold mb-6">
                            <CheckCircle size={20} />
                            <span>GOOD POINTS & COMMENDATIONS</span>
                        </div>
                        <DynamicList
                            label=""
                            items={goodPoints}
                            onChange={setGoodPoints}
                            placeholder="Add a positive observation..."
                            readOnly={isReadOnly}
                        />
                    </div>

                    {/* Observations */}
                    <div className="card-modern overflow-hidden">
                        <div className="flex items-center gap-2 text-accent font-bold mb-6">
                            <Info size={20} />
                            <span>OBSERVATIONS / OFI</span>
                        </div>
                        <div className="overflow-x-auto -mx-6">
                            <div className="px-6 pb-2 min-w-[600px]">
                                <DynamicTable
                                    columns={ofiColumns}
                                    rows={observations}
                                    onChange={(rows) => setObservations(rows as Observation[])}
                                    onClauseChange={checkClause}
                                    readOnly={isReadOnly}
                                />
                            </div>
                        </div>
                    </div>


                </div>

                {/* Sidebar Section */}
                <div className="space-y-8">
                    {/* Personnel Section */}
                    <div className="card-modern">
                        <div className="flex items-center gap-2 text-primary font-bold mb-6">
                            <User size={20} />
                            <span>PERSONNEL</span>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">Auditor Name(s)</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                                    <input
                                        type="text"
                                        value={auditorName}
                                        disabled={isReadOnly}
                                        onChange={(e) => setAuditorName(e.target.value)}
                                        placeholder="Add auditor name(s)..."
                                        className="input-modern w-full pl-12 disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">Auditee Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                                    <input
                                        type="text"
                                        value={auditeeName}
                                        disabled={isReadOnly}
                                        onChange={(e) => setAuditeeName(e.target.value)}
                                        placeholder="Type auditee name..."
                                        className="input-modern w-full pl-12 disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recurring Alerts */}
                    {alerts.length > 0 && (
                        <div className="card-modern bg-yellow-50 border-yellow-200">
                            <div className="flex items-center gap-2 text-yellow-800 font-bold mb-4">
                                <AlertTriangle size={20} />
                                <span>RECURRING ISSUES</span>
                            </div>
                            <div className="space-y-3">
                                {alerts.map((alert, i) => (
                                    <div key={i} className="bg-white p-3 rounded-xl border border-yellow-100 shadow-sm text-sm">
                                        Clause <span className="font-bold">"{alert.clause}"</span> has {alert.count} past finding(s).
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Attachments Section */}
                    <div className="card-modern">
                        <div className="flex items-center gap-2 text-primary font-bold mb-6">
                            <Paperclip size={20} />
                            <span>ATTACHMENTS</span>
                        </div>
                        <FileUpload
                            files={attachments}
                            onFilesChange={setAttachments}
                            onUpload={handleUpload}
                            readOnly={isReadOnly}
                        />
                    </div>
                </div>
            </div>

            {/* Findings Section - Full Width */}
            <div className="card-modern overflow-hidden">
                <div className="flex items-center gap-2 text-red-500 font-bold mb-6">
                    <AlertTriangle size={20} />
                    <span>FINDINGS / NON-CONFORMITIES</span>
                </div>
                <div className="overflow-x-auto -mx-6">
                    <div className="px-6 pb-2 min-w-full">
                        <DynamicTable
                            columns={ncColumns}
                            rows={findings}
                            onChange={(rows) => setFindings(rows as Finding[])}
                            onClauseChange={checkClause}
                            readOnly={isReadOnly}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

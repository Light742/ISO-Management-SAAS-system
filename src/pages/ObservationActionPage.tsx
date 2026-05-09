import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDepartments, getCompanySettings } from '../lib/settingsService';
import { getSelectableEvents } from '../lib/auditEventService';
import type { Department as DeptType, CompanySettings, ObservationRow, ObservationForm, OAFStatus, AuditEvent } from '../lib/types';
import {
    ArrowLeft,
    Save,
    Trash2,
    Plus,
    Search,
    ChevronDown,
    FileDown,
    Loader2,
    Paperclip,
    X,
    ExternalLink
} from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ObservationActionPDF } from '../components/pdf/ObservationActionPDF';
import { uploadAttachment, createObservationForm, getObservationForm, updateObservationForm } from '../lib/auditService';

export const ObservationActionPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { userData } = useAuth();

    // State
    const [status, setStatus] = useState<OAFStatus>('Draft');
    const [formId, setFormId] = useState<string | null>(null);
    const [department, setDepartment] = useState('');
    const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
    const [auditeeName, setAuditeeName] = useState('');
    const [auditorName, setAuditorName] = useState(userData?.displayName || '');
    const [evaluatedByName, setEvaluatedByName] = useState(userData?.displayName || '');
    const [rejectionReason, setRejectionReason] = useState('');

    const [rows, setRows] = useState<ObservationRow[]>([
        { id: '1', observation: '', action: '', responsiblePerson: '', dueDate: '', evalDate: '', status: '', evidence: [] }
    ]);

    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [availableDepartments, setAvailableDepartments] = useState<DeptType[]>([]);
    const [showDeptDropdown, setShowDeptDropdown] = useState(false);
    const [deptSearch, setDeptSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploadingRowId, setUploadingRowId] = useState<string | null>(null);
    const [availableEvents, setAvailableEvents] = useState<AuditEvent[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');

    // Permissions Logic
    const isAuditor = userData?.role === 'Auditor' || userData?.role === 'LeadAuditor' || userData?.role === 'QMSAdmin';
    const isAuditee = userData?.role === 'Auditee';

    const canEditHeader = isAuditor && (status === 'Draft' || status === 'Pending Approval' || status === 'Rejected');
    const canEditObservations = isAuditor && (status === 'Draft' || status === 'Pending Approval' || status === 'Rejected');

    // Auditee can edit Action/Responsible/Due Date when OAF is routed to them (For Auditee Approval) or Issued.
    const canSafeEditAction = isAuditee && (status === 'For Auditee Approval' || status === 'Issued');

    // Auditor evaluates when Auditee has responded (Pending Evaluation).
    const canEditEvaluation = isAuditor && (status === 'Pending Evaluation' || status === 'Closed');

    const canSubmitToPendingApproval = isAuditor && (status === 'Draft' || status === 'Rejected'); // Submit to Lead Auditor
    // const canSubmitToAuditeeForApproval = isAuditor && status === 'Pending Approval'; // Done in Approvals Page, but logic here for reference

    // Agreement Phase
    const canAuditeeApprove = isAuditee && status === 'For Auditee Approval'; // Approve -> For Auditor Approval
    const canAuditorIssue = isAuditor && status === 'For Auditor Approval'; // Approve -> Issued

    // Action Phase
    const canSubmitToAuditor = isAuditee && status === 'Issued'; // Submit to Auditor (Pending Evaluation)

    // Evaluation Phase
    const canAuditorFinalize = isAuditor && status === 'Pending Evaluation'; // Evaluate -> Closed

    useEffect(() => {
        const loadInitData = async () => {
            try {
                const [depts, settings] = await Promise.all([
                    getDepartments(),
                    getCompanySettings()
                ]);
                setAvailableDepartments(depts);
                setCompanySettings(settings);

                if (id) {
                    setFormId(id);
                    const form = await getObservationForm(id);
                    if (form) {
                        setDepartment(form.department);
                        setAuditDate(typeof form.auditDate === 'string' ? form.auditDate : (form.auditDate as any).toDate().toISOString().split('T')[0]);
                        setAuditeeName(form.auditeeName);
                        setAuditorName(form.auditorName);
                        setEvaluatedByName(form.evaluatedByName);
                        setRows(form.rows);
                        setStatus(form.status);
                        setRejectionReason(form.rejection_reason || '');
                    }
                }
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };
        loadInitData();
    }, [id]);

    // Load selectable events for new documents
    useEffect(() => {
        const loadEvents = async () => {
            const events = await getSelectableEvents();
            setAvailableEvents(events);
            // Auto-select the active event if there is one
            const active = events.find(e => e.status === 'Active');
            if (active) {
                setSelectedEventId(active.id!);
            }
        };
        if (!id) {
            loadEvents();
        }
    }, [id]);

    const addRow = () => {
        if (!canEditObservations) return;
        setRows([...rows, {
            id: Date.now().toString(),
            observation: '',
            action: '',
            responsiblePerson: '',
            dueDate: '',
            evalDate: '',
            status: '',
            evidence: []
        }]);
    };

    const removeRow = (id: string) => {
        if (!canEditObservations) return;
        if (rows.length === 1) return;
        setRows(rows.filter(r => r.id !== id));
    };

    const updateRow = (id: string, field: keyof ObservationRow, value: any) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleFileChange = async (rowId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadingRowId(rowId);
        try {
            const uploadPromises = Array.from(files).map(file => uploadAttachment(file, 'OAF_TEMP'));
            const urls = await Promise.all(uploadPromises);

            setRows(prevRows => prevRows.map(row =>
                row.id === rowId ? { ...row, evidence: [...row.evidence, ...urls] } : row
            ));
        } catch (error) {
            console.error('File upload failed:', error);
            alert('Some files failed to upload.');
        } finally {
            setUploadingRowId(null);
            e.target.value = '';
        }
    };

    const removeAttachment = (rowId: string, urlToRemove: string) => {
        setRows(prevRows => prevRows.map(row =>
            row.id === rowId ? { ...row, evidence: row.evidence.filter(url => url !== urlToRemove) } : row
        ));
    };

    const handleSave = async (newStatus?: OAFStatus) => {
        if (!userData) return;
        setSaving(true);
        try {
            const statusToSave = newStatus || status;

            const formData: Partial<ObservationForm> = {
                department,
                auditDate,
                auditeeName,
                auditorName,
                evaluatedByName,
                rows,
                status: statusToSave,
                // Clear rejection reason if resubmitting from Rejected status
                ...(status === 'Rejected' && statusToSave === 'Pending Approval' ? { rejection_reason: '' } : {}),
                // updated_at will be set by service
            };

            if (formId) {
                await updateObservationForm(formId, formData);
                setStatus(statusToSave);
                alert(`Form ${newStatus ? 'submitted' : 'saved'} successfully.`);
            } else {
                // Get selected event
                const selEvent = availableEvents.find(e => e.id === selectedEventId);
                if (!selEvent) {
                    alert('Please select an audit event before saving.');
                    setSaving(false);
                    return;
                }
                const createData = {
                    ...formData,
                    createdBy: userData.uid,
                    status: statusToSave || 'Draft',
                    eventId: selEvent.id,
                    eventName: selEvent.name
                } as any;
                const newId = await createObservationForm(createData);
                setFormId(newId);
                setStatus(statusToSave || 'Draft');
                alert(`Form created successfully.`);
                navigate(`/observation-form/${newId}`, { replace: true });
            }
            if (newStatus && newStatus !== 'Draft') {
                navigate(-1);
            }
        } catch (error) {
            console.error('Error saving form:', error);
            alert('Failed to save form.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {status === 'Rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 mb-4">
                    <h3 className="font-bold">This OAF has been rejected</h3>
                    <p className="text-sm mt-1">{rejectionReason}</p>
                    <p className="text-xs mt-2 text-red-600 font-medium">Please revise and submit again.</p>
                </div>
            )}
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-3 bg-white rounded-2xl shadow-soft hover:shadow-premium transition-all group"
                    >
                        <ArrowLeft size={20} className="text-muted group-hover:text-primary transition-colors" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">IMS Observation Action Form</h1>
                        <div className="flex items-center gap-2 text-muted text-sm">
                            <span>Status:</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${status === 'Draft' ? 'bg-gray-100 text-gray-700' :
                                status === 'Issued' ? 'bg-blue-100 text-blue-700' :
                                    status === 'Pending Evaluation' ? 'bg-yellow-100 text-yellow-700' :
                                        status === 'Closed' ? 'bg-green-100 text-green-700' : ''
                                }`}>
                                {status}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <PDFDownloadLink
                        document={
                            <ObservationActionPDF
                                data={{
                                    department,
                                    auditDate,
                                    auditeeName,
                                    auditorName,
                                    evaluatedByName,
                                    rows
                                }}
                                companySettings={companySettings}
                            />
                        }
                        fileName={`OAF_${department || 'Form'}_${auditDate}.pdf`}
                    >
                        {({ loading }) => (
                            <button
                                className="btn-secondary h-11 flex items-center gap-2 px-5"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <FileDown size={18} />
                                )}
                                <span>Export PDF</span>
                            </button>
                        )}
                    </PDFDownloadLink>

                    <button
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Save size={18} />
                        <span>Save Draft</span>
                    </button>
                </div>
            </div>

            {/* Event Selection for New OAFs */}
            {!formId && (
                <div className="bg-white rounded-xl shadow-soft p-5 border border-indigo-100">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Audit Event *</label>
                    <select
                        value={selectedEventId}
                        onChange={(e) => {
                            setSelectedEventId(e.target.value);
                        }}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-medium"
                    >
                        <option value="">Select an audit event...</option>
                        {availableEvents.map(ev => (
                            <option key={ev.id} value={ev.id!}>
                                {ev.name} {ev.status === 'Active' ? '(Active)' : '(Draft)'}
                            </option>
                        ))}
                    </select>
                    {availableEvents.length === 0 && (
                        <p className="text-xs text-amber-600 mt-2 font-medium">
                            No audit events found. Please create one in Event Management first.
                        </p>
                    )}
                </div>
            )}

            {/* Form Container imitating the paper form */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden text-sm">

                {/* Form Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-end justify-between mb-2">
                        <div className="flex items-center gap-3">
                            {companySettings?.logoUrl ? (
                                <img src={companySettings.logoUrl} alt="Logo" className="h-14 w-auto" />
                            ) : (
                                <div className="h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                    S
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <span className="font-bold text-sm text-gray-800">{companySettings?.companyName || 'Malita Power Inc.'}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 border border-gray-800">
                        {/* Row 1: Title */}
                        <div className="col-span-12 bg-white border-b border-gray-800 p-2 text-center font-bold text-sm uppercase tracking-wider">
                            IMS Observation Action Form
                        </div>

                        {/* Row 2: Department & Date */}
                        <div className="col-span-2 bg-white border-r border-gray-800 p-2 flex items-center font-semibold">
                            Department :
                        </div>
                        <div className="col-span-5 bg-white border-r border-gray-800 p-1 flex items-center">
                            <div className="relative w-full">
                                {canEditHeader ? (
                                    <>
                                        <div
                                            onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                                            className="w-full p-1 cursor-pointer flex items-center justify-between hover:bg-gray-50 rounded"
                                        >
                                            <span className={department ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                                {department || "Select..."}
                                            </span>
                                            <ChevronDown size={14} className="text-gray-400" />
                                        </div>
                                        {showDeptDropdown && (
                                            <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                                                <div className="p-2 border-b border-gray-100 relative">
                                                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={deptSearch}
                                                        onChange={(e) => setDeptSearch(e.target.value)}
                                                        placeholder="Search..."
                                                        className="w-full pl-8 py-1 text-sm border-none focus:ring-0"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto">
                                                    {availableDepartments
                                                        .filter(d => d.name.toLowerCase().includes(deptSearch.toLowerCase()))
                                                        .map((dept) => (
                                                            <div
                                                                key={dept.id}
                                                                onClick={() => {
                                                                    setDepartment(dept.name);
                                                                    setShowDeptDropdown(false);
                                                                }}
                                                                className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                                            >
                                                                {dept.name}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full p-1 text-gray-900 font-medium">{department}</div>
                                )}
                            </div>
                        </div>
                        <div className="col-span-2 bg-white border-r border-gray-800 p-2 flex items-center font-semibold text-center justify-center">
                            Date
                        </div>
                        <div className="col-span-3 bg-white p-1 flex items-center">
                            <input
                                type="date"
                                value={auditDate}
                                disabled={!canEditHeader}
                                onChange={(e) => setAuditDate(e.target.value)}
                                className="w-full p-1 border-none focus:ring-0 text-center font-medium disabled:bg-white disabled:text-gray-900"
                            />
                        </div>

                        {/* Row 3: Auditee & Auditors */}
                        <div className="col-span-2 bg-white border-t border-r border-gray-800 p-2 flex items-center font-semibold">
                            Auditee :
                        </div>
                        <div className="col-span-5 bg-white border-t border-r border-gray-800 p-1 flex items-center">
                            <input
                                type="text"
                                value={auditeeName}
                                disabled={!canEditHeader}
                                onChange={(e) => setAuditeeName(e.target.value)}
                                placeholder="Enter Name"
                                className="w-full p-1 border-none focus:ring-0 font-medium disabled:bg-white"
                            />
                        </div>
                        <div className="col-span-2 bg-white border-t border-r border-gray-800 p-2 flex items-center font-semibold text-center justify-center">
                            Auditors :
                        </div>
                        <div className="col-span-3 bg-white border-t p-1 flex items-center">
                            <input
                                type="text"
                                value={auditorName}
                                disabled={!canEditHeader}
                                onChange={(e) => setAuditorName(e.target.value)}
                                placeholder="Enter Names"
                                className="w-full p-1 border-none focus:ring-0 text-center font-medium disabled:bg-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Main Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th rowSpan={2} className="border border-gray-300 bg-gray-50 p-2 w-12 text-center align-middle font-bold text-xs text-gray-700">No.</th>
                                <th rowSpan={2} className="border border-gray-300 bg-gray-50 p-2 w-1/4 align-middle font-bold text-xs text-gray-700">Observations Statement</th>
                                <th colSpan={3} className="border border-gray-300 bg-gray-50 p-2 text-center font-bold text-xs text-gray-700">
                                    Intended Correction and Corrective Action<br />
                                    <span className="font-normal italic text-[10px]">(Completed by Auditee)</span>
                                </th>
                                <th colSpan={3} className="border border-gray-300 bg-gray-50 p-2 text-center font-bold text-xs text-gray-700">
                                    Evaluation of CA<br />
                                    <span className="font-normal italic text-[10px]">(to be completed by auditor)</span>
                                </th>
                            </tr>
                            <tr>
                                <th className="border border-gray-300 bg-gray-50 p-2 w-1/5 text-center font-bold text-xs text-gray-700">Action</th>
                                <th className="border border-gray-300 bg-gray-50 p-2 w-24 text-center font-bold text-xs text-gray-700">Responsible Person</th>
                                <th className="border border-gray-300 bg-gray-50 p-2 w-28 text-center font-bold text-xs text-gray-700">Due Date</th>
                                <th className="border border-gray-300 bg-gray-50 p-2 w-28 text-center font-bold text-xs text-gray-700">Date</th>
                                <th className="border border-gray-300 bg-gray-50 p-2 w-24 text-center font-bold text-xs text-gray-700">Accepted (A) / Effective (E)</th>
                                <th className="border border-gray-300 bg-gray-50 p-2 w-1/6 text-center font-bold text-xs text-gray-700">Evidence provided</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr key={row.id} className="group hover:bg-gray-50/50">
                                    <td className="border border-gray-300 p-2 text-center align-top relative">
                                        <span className="font-bold text-gray-500">{index + 1}</span>
                                        {canEditObservations && (
                                            <button
                                                onClick={() => removeRow(row.id)}
                                                className="absolute left-1 top-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Remove Row"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </td>
                                    <td className="border border-gray-300 p-0 align-top">
                                        <textarea
                                            value={row.observation}
                                            disabled={!canEditObservations}
                                            onChange={(e) => updateRow(row.id, 'observation', e.target.value)}
                                            className="w-full h-full min-h-[120px] p-2 border-none focus:ring-inset focus:ring-1 focus:ring-primary resize-none text-sm disabled:bg-white"
                                            placeholder={canEditObservations ? "Enter observation..." : ""}
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-0 align-top">
                                        <textarea
                                            value={row.action}
                                            disabled={!canSafeEditAction}
                                            onChange={(e) => updateRow(row.id, 'action', e.target.value)}
                                            className="w-full h-full min-h-[120px] p-2 border-none focus:ring-inset focus:ring-1 focus:ring-primary resize-none text-sm disabled:bg-white"
                                            placeholder={canSafeEditAction ? "Action taken..." : ""}
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-0 align-top">
                                        <textarea
                                            value={row.responsiblePerson}
                                            disabled={!canSafeEditAction}
                                            onChange={(e) => updateRow(row.id, 'responsiblePerson', e.target.value)}
                                            className="w-full h-full min-h-[120px] p-2 border-none focus:ring-inset focus:ring-1 focus:ring-primary resize-none text-sm text-center disabled:bg-white"
                                            placeholder={canSafeEditAction ? "Initials" : ""}
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-0 align-top">
                                        <input
                                            type="date"
                                            value={row.dueDate}
                                            disabled={!canSafeEditAction}
                                            onChange={(e) => updateRow(row.id, 'dueDate', e.target.value)}
                                            className="w-full p-2 border-none focus:ring-inset focus:ring-1 focus:ring-primary text-xs text-center disabled:bg-white"
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-0 align-top">
                                        <input
                                            type="date"
                                            value={row.evalDate}
                                            disabled={!canEditEvaluation}
                                            onChange={(e) => updateRow(row.id, 'evalDate', e.target.value)}
                                            className="w-full p-2 border-none focus:ring-inset focus:ring-1 focus:ring-primary text-xs text-center disabled:bg-white"
                                        />
                                    </td>
                                    <td className="border border-gray-300 p-0 align-top bg-white">
                                        <select
                                            value={row.status}
                                            disabled={!canEditEvaluation}
                                            onChange={(e) => updateRow(row.id, 'status', e.target.value as any)}
                                            className="w-full p-2 border-none focus:ring-inset focus:ring-1 focus:ring-primary text-sm text-center font-bold bg-transparent h-full min-h-[120px] disabled:bg-white disabled:opacity-100"
                                            style={{
                                                color: row.status === 'E' ? '#16a34a' : row.status === 'A' ? '#2563eb' : 'inherit'
                                            }}
                                        >
                                            <option value=""></option>
                                            <option value="A">A</option>
                                            <option value="E">E</option>
                                        </select>
                                    </td>
                                    <td className="border border-gray-300 p-2 align-top bg-white">
                                        <div className="flex flex-col gap-2">
                                            <label className={`flex items-center justify-center gap-2 p-2 bg-gray-50 border border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-100 transition-colors text-xs text-gray-600 ${(!canEditEvaluation && !canSafeEditAction) ? 'opacity-50 pointer-events-none' : ''}`}>
                                                {uploadingRowId === row.id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Paperclip size={14} />
                                                )}
                                                <span>{uploadingRowId === row.id ? 'Uploading...' : 'Attach Files'}</span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    className="hidden"
                                                    onChange={(e) => handleFileChange(row.id, e)}
                                                    disabled={uploadingRowId === row.id || (!canEditEvaluation && !canSafeEditAction)}
                                                />
                                            </label>

                                            <div className="flex flex-col gap-1">
                                                {row.evidence.map((url, i) => (
                                                    <div key={i} className="flex items-center justify-between gap-1 p-1 bg-blue-50/50 rounded border border-blue-100/50 group/file">
                                                        <a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] text-blue-700 hover:underline truncate flex-1 flex items-center gap-1"
                                                        >
                                                            <ExternalLink size={10} />
                                                            Attachment {i + 1}
                                                        </a>
                                                        {(canEditEvaluation || canSafeEditAction) && (
                                                            <button
                                                                onClick={() => removeAttachment(row.id, url)}
                                                                className="text-gray-400 hover:text-red-500 transition-colors px-1"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {canEditObservations && (
                        <button
                            onClick={addRow}
                            className="w-full p-3 flex items-center justify-center gap-2 text-primary font-semibold hover:bg-gray-50 transition-colors border-t border-gray-200"
                        >
                            <Plus size={16} />
                            Add Observation Row
                        </button>
                    )}
                </div>

                {/* Footer Signatures */}
                <div className="p-8 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-12 text-sm mt-4">
                    <div className="space-y-4">
                        <p className="font-semibold text-gray-600">Prepared by:</p>
                        <input
                            type="text"
                            value={auditorName}
                            disabled={!canEditHeader}
                            onChange={(e) => setAuditorName(e.target.value)}
                            placeholder="Enter Name"
                            className="w-full border-b border-gray-400 pb-2 text-xl text-blue-900 font-script focus:outline-none focus:border-primary bg-transparent disabled:bg-white"
                        />
                        <p className="text-xs text-center font-bold uppercase tracking-wider">
                            Auditor (Sign & Date)
                        </p>
                    </div>

                    <div className="space-y-4">
                        <p className="font-semibold text-gray-600">Accepted by:</p>
                        <input
                            type="text"
                            value={auditeeName}
                            disabled={!canSafeEditAction && !canAuditeeApprove}
                            onChange={(e) => setAuditeeName(e.target.value)}
                            placeholder="Enter Name"
                            className="w-full border-b border-gray-400 pb-2 text-xl text-blue-900 font-script focus:outline-none focus:border-primary bg-transparent disabled:bg-white"
                        />
                        <p className="text-xs text-center font-bold uppercase tracking-wider">
                            Auditee (Sign & Date)
                        </p>
                    </div>

                    <div className="space-y-4">
                        <p className="font-semibold text-gray-600">Evaluated by:</p>
                        <input
                            type="text"
                            value={evaluatedByName}
                            disabled={!canEditEvaluation}
                            onChange={(e) => setEvaluatedByName(e.target.value)}
                            placeholder="Enter Name"
                            className="w-full border-b border-gray-400 pb-2 text-xl text-blue-900 font-script focus:outline-none focus:border-primary bg-transparent disabled:bg-white"
                        />
                        <p className="text-xs text-center font-bold uppercase tracking-wider">
                            Auditor (Sign & Date)
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end p-4">
                <button
                    onClick={() => handleSave(
                        canSubmitToPendingApproval ? 'Pending Approval' :
                            canAuditeeApprove ? 'For Auditor Approval' :
                                canAuditorIssue ? 'Issued' :
                                    canSubmitToAuditor ? 'Pending Evaluation' :
                                        canAuditorFinalize ? 'Closed' : undefined
                    )}
                    disabled={saving || (!canSubmitToPendingApproval && !canAuditeeApprove && !canAuditorIssue && !canSubmitToAuditor && !canAuditorFinalize && status === 'Closed')}
                    className="btn-primary w-full md:w-auto px-8 py-3 text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save size={20} />
                    <span>
                        {canSubmitToPendingApproval ? 'Submit for Approval' :
                            canAuditeeApprove ? 'Accept Findings' :
                                canAuditorIssue ? 'Issue OAF' :
                                    canSubmitToAuditor ? 'Submit Response' :
                                        canAuditorFinalize ? 'Finalize & Close' : 'Save'}
                    </span>
                </button>
            </div>
        </div>
    );
};

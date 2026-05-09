import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDepartments, getCompanySettings } from '../lib/settingsService';
import { getSelectableEvents } from '../lib/auditEventService';
import type { Department as DeptType, CompanySettings, SIRForm, SIRStatus, SIRActionRow, SIREffectivenessRow, AuditEvent } from '../lib/types';
import {
    ArrowLeft,
    Save,
    Plus,
    X,
    CheckSquare,
    Square
} from 'lucide-react';
import { createSIR, getSIR, updateSIR } from '../lib/auditService';

const SIR_TYPES = [
    'Internal audit finding [IA]',
    'Legal non-compliance [LC]',
    'Non-conforming process/ product [PN]',
    'Valid complaints/ feedback/ concerns [CS]',
    'Problems identified during management review [MR]',
    'Objectives and targets not met or programs not implemented as planned',
    'Actual Non-conformity',
    'Potential Non-conformity',
    'Recurring system non-conformity [RS]',
    'Poor Supplier/ Sub-contractor performance [PA]'
];

export const SIRFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { userData } = useAuth();

    // State
    const [formId, setFormId] = useState<string | null>(id || null);
    const [status, setStatus] = useState<SIRStatus>('Draft');
    const [saving, setSaving] = useState(false);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [availableDepartments, setAvailableDepartments] = useState<DeptType[]>([]);
    const [rejectionReason, setRejectionReason] = useState('');

    // Header
    const [department, setDepartment] = useState(''); // Issued To
    const [auditorName, setAuditorName] = useState(userData?.displayName || '');
    const [sirNo, setSirNo] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);

    // Type
    const [natureOfNonConformity, setNatureOfNonConformity] = useState<string[]>([]);

    // Section 1
    const [findings, setFindings] = useState('');
    const [objectiveEvidence, setObjectiveEvidence] = useState('');
    const [reference, setReference] = useState('');
    const [classification, setClassification] = useState<'Major' | 'Minor'>('Minor');
    const [relevantClause, setRelevantClause] = useState('');
    const [docCode, setDocCode] = useState('');

    // Signatures Sec 1
    const [auditeeAcknowledgedBy, setAuditeeAcknowledgedBy] = useState('');
    const [auditeeAcknowledgedDate, setAuditeeAcknowledgedDate] = useState('');
    const [auditeeSuperiorNotedBy, setAuditeeSuperiorNotedBy] = useState('');
    const [auditeeSuperiorNotedDate, setAuditeeSuperiorNotedDate] = useState('');

    // Section 2
    const [rootCause, setRootCause] = useState('');
    const [rootCauseDeterminedBy, setRootCauseDeterminedBy] = useState('');
    const [rootCauseApprovedBy, setRootCauseApprovedBy] = useState('');

    // Section 3
    const [corrections, setCorrections] = useState<SIRActionRow[]>([{ id: '1', description: '', hiracNeeded: false, accountability: '', completionDate: '' }]);
    const [correctionRecommendedBy, setCorrectionRecommendedBy] = useState('');
    const [correctionApprovedBy, setCorrectionApprovedBy] = useState('');

    // Section 4
    const [correctiveActions, setCorrectiveActions] = useState<SIRActionRow[]>([{ id: '1', description: '', hiracNeeded: false, accountability: '', completionDate: '' }]);
    const [correctiveActionRecommendedBy, setCorrectiveActionRecommendedBy] = useState('');
    const [correctiveActionApprovedBy, setCorrectiveActionApprovedBy] = useState('');

    // Section 5
    const [extensionRequested, setExtensionRequested] = useState(false);
    const [newCommitmentDate, setNewCommitmentDate] = useState('');

    const [implementationRows, setImplementationRows] = useState<SIREffectivenessRow[]>([{ id: '1', date: '', evidence: '', status: 'Open', remarks: '' }]);
    const [implementationFollowedUpBy, setImplementationFollowedUpBy] = useState('');
    const [implementationNotedBy, setImplementationNotedBy] = useState('');

    const [effectivenessEffective, setEffectivenessEffective] = useState<boolean | null>(null);
    const [dispositionTaken, setDispositionTaken] = useState('');

    const [effectivenessRows, setEffectivenessRows] = useState<SIREffectivenessRow[]>([{ id: '1', date: '', evidence: '', status: 'Open', remarks: '' }]);
    const [effectivenessFollowedUpBy, setEffectivenessFollowedUpBy] = useState('');
    const [effectivenessNotedBy, setEffectivenessNotedBy] = useState('');

    // Helpers
    const [showDeptDropdown, setShowDeptDropdown] = useState(false);
    const [availableEvents, setAvailableEvents] = useState<AuditEvent[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');

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
                    const form = await getSIR(id);
                    if (form) {
                        setDepartment(form.department);
                        setAuditorName(form.auditorName);
                        setSirNo(form.sirNo);
                        setIssueDate(form.issueDate);
                        setNatureOfNonConformity(form.natureOfNonConformity);
                        setFindings(form.findings);
                        setObjectiveEvidence(form.objectiveEvidence);
                        setReference(form.reference);
                        setClassification(form.classification);
                        setRelevantClause(form.relevantClause);
                        setDocCode(form.docCode);
                        setAuditeeAcknowledgedBy(form.auditeeAcknowledgedBy);
                        setAuditeeAcknowledgedDate(form.auditeeAcknowledgedDate);
                        setAuditeeSuperiorNotedBy(form.auditeeSuperiorNotedBy);
                        setAuditeeSuperiorNotedDate(form.auditeeSuperiorNotedDate);
                        setRootCause(form.rootCause);
                        setRootCauseDeterminedBy(form.rootCauseDeterminedBy);
                        setRootCauseApprovedBy(form.rootCauseApprovedBy);
                        setCorrections(form.corrections);
                        setCorrectionRecommendedBy(form.correctionRecommendedBy);
                        setCorrectionApprovedBy(form.correctionApprovedBy);
                        setCorrectiveActions(form.correctiveActions);
                        setCorrectiveActionRecommendedBy(form.correctiveActionRecommendedBy);
                        setCorrectiveActionApprovedBy(form.correctiveActionApprovedBy);
                        setExtensionRequested(form.extensionRequested);
                        setNewCommitmentDate(form.newCommitmentDate || '');
                        setImplementationRows(form.implementationRows);
                        setImplementationFollowedUpBy(form.implementationFollowedUpBy);
                        setImplementationNotedBy(form.implementationNotedBy);
                        setEffectivenessEffective(form.effectivenessEffective);
                        setDispositionTaken(form.dispositionTaken || '');
                        setEffectivenessRows(form.effectivenessRows);
                        setEffectivenessFollowedUpBy(form.effectivenessFollowedUpBy);
                        setEffectivenessNotedBy(form.effectivenessNotedBy);
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
            const active = events.find(e => e.status === 'Active');
            if (active) {
                setSelectedEventId(active.id!);
            }
        };
        if (!id) {
            loadEvents();
        }
    }, [id]);

    const handleSave = async (newStatus?: SIRStatus) => {
        if (!userData) return;
        setSaving(true);
        try {
            const formData: Partial<SIRForm> = {
                department,
                auditorName,
                sirNo,
                issueDate,
                natureOfNonConformity,
                findings,
                objectiveEvidence,
                reference,
                classification,
                relevantClause,
                docCode,
                auditeeAcknowledgedBy,
                auditeeAcknowledgedDate,
                auditeeSuperiorNotedBy,
                auditeeSuperiorNotedDate,
                rootCause,
                rootCauseDeterminedBy,
                rootCauseApprovedBy,
                corrections,
                correctionRecommendedBy,
                correctionApprovedBy,
                correctiveActions,
                correctiveActionRecommendedBy,
                correctiveActionApprovedBy,
                extensionRequested,
                newCommitmentDate,
                implementationRows,
                implementationFollowedUpBy,
                implementationNotedBy,
                effectivenessEffective,
                dispositionTaken,
                effectivenessRows,
                effectivenessFollowedUpBy,
                effectivenessNotedBy,
                status: newStatus || status,
                // Clear rejection reason if resubmitting from Rejected status
                ...(status === 'Rejected' && (newStatus === 'Issued' || newStatus === 'Draft') ? { rejection_reason: '' } : {})
            };

            if (formId) {
                await updateSIR(formId, formData);
                alert('Saved successfully!');
            } else {
                // Validate event selection
                const selEvent = availableEvents.find(e => e.id === selectedEventId);
                if (!selEvent) {
                    alert('Please select an audit event before saving.');
                    setSaving(false);
                    return;
                }
                const newId = await createSIR({
                    ...formData,
                    createdBy: userData.uid,
                    status: newStatus || 'Draft',
                    eventId: selEvent.id,
                    eventName: selEvent.name
                } as any);
                setFormId(newId);
                navigate(`/sir-form/${newId}`, { replace: true });
                alert('Created successfully!');
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    const toggleNature = (type: string) => {
        if (natureOfNonConformity.includes(type)) {
            setNatureOfNonConformity(prev => prev.filter(t => t !== type));
        } else {
            setNatureOfNonConformity(prev => [...prev, type]);
        }
    };

    // Table Helpers
    const addActionRow = (setter: React.Dispatch<React.SetStateAction<SIRActionRow[]>>, rows: SIRActionRow[]) => {
        setter([...rows, { id: Date.now().toString(), description: '', hiracNeeded: false, accountability: '', completionDate: '' }]);
    };
    const removeActionRow = (id: string, setter: React.Dispatch<React.SetStateAction<SIRActionRow[]>>, rows: SIRActionRow[]) => {
        if (rows.length === 1) return;
        setter(rows.filter(r => r.id !== id));
    };
    const updateActionRow = (id: string, field: keyof SIRActionRow, value: any, setter: React.Dispatch<React.SetStateAction<SIRActionRow[]>>, rows: SIRActionRow[]) => {
        setter(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const addEffectivenessRow = (setter: React.Dispatch<React.SetStateAction<SIREffectivenessRow[]>>, rows: SIREffectivenessRow[]) => {
        setter([...rows, { id: Date.now().toString(), date: '', evidence: '', status: 'Open', remarks: '' }]);
    };
    const removeEffectivenessRow = (id: string, setter: React.Dispatch<React.SetStateAction<SIREffectivenessRow[]>>, rows: SIREffectivenessRow[]) => {
        if (rows.length === 1) return;
        setter(rows.filter(r => r.id !== id));
    };
    const updateEffectivenessRow = (id: string, field: keyof SIREffectivenessRow, value: any, setter: React.Dispatch<React.SetStateAction<SIREffectivenessRow[]>>, rows: SIREffectivenessRow[]) => {
        setter(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };


    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {status === 'Rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 mb-4">
                    <h3 className="font-bold">This SIR has been rejected</h3>
                    <p className="text-sm mt-1">{rejectionReason}</p>
                    <p className="text-xs mt-2 text-red-600 font-medium">Please revise and submit again.</p>
                </div>
            )}
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => navigate('/directory')}
                        className="p-3 bg-white rounded-2xl shadow-soft hover:shadow-premium transition-all group"
                    >
                        <ArrowLeft size={20} className="text-muted group-hover:text-primary transition-colors" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">System Improvement Request</h1>
                        <p className="text-sm text-muted">SIR Form</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="btn-secondary flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                        <Save size={18} />
                        <span>Save Draft</span>
                    </button>
                    <button
                        onClick={() => {
                            if (window.confirm('Are you sure you want to submit this SIR? This will officially issue the request.')) {
                                handleSave('Issued');
                            }
                        }}
                        disabled={saving}
                        className="btn-primary flex items-center gap-2 px-4 py-2"
                    >
                        <CheckSquare size={18} />
                        <span>Submit SIR</span>
                    </button>
                </div>
            </div>

            {/* Form Container */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden text-sm max-w-5xl mx-auto">

                {/* Event Selection for New SIRs */}
                {!formId && (
                    <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Audit Event *</label>
                        <select
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-medium bg-white"
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
                {/* Header Section */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        {companySettings?.logoUrl && <img src={companySettings.logoUrl} alt="Logo" className="h-12 w-auto" />}
                        <h2 className="text-xl font-bold uppercase tracking-wider text-center flex-1">SYSTEM IMPROVEMENT REQUEST (SIR)</h2>
                        <div className="text-right text-xs">
                            <p className="font-bold">{companySettings?.companyName || 'Malita Power Inc.'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 border border-gray-800">
                        <div className="border-r border-gray-800 p-2 font-bold bg-gray-50 flex items-center justify-center">ISSUED TO (audit area):</div>
                        <div className="border-r border-gray-800 p-2 font-bold bg-gray-50 flex items-center justify-center">ISSUED BY:</div>
                        <div className="border-r border-gray-800 p-2 font-bold bg-gray-50 flex items-center justify-center">SIR NO:</div>
                        <div className="p-2 font-bold bg-gray-50 flex items-center justify-center">ISSUE DATE:</div>

                        <div className="border-r border-t border-gray-800 p-2 relative">
                            {/* Dept Dropdown */}
                            <div
                                onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                                className="w-full text-center font-bold cursor-pointer hover:bg-gray-100 p-1 rounded"
                            >
                                {department || "Select..."}
                            </div>
                            {showDeptDropdown && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-300 shadow-lg z-50 max-h-48 overflow-y-auto">
                                    {availableDepartments.map(d => (
                                        <div key={d.id} onClick={() => { setDepartment(d.name); setShowDeptDropdown(false); }} className="p-2 hover:bg-gray-100 cursor-pointer">
                                            {d.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="border-r border-t border-gray-800 p-2 text-center">
                            <input type="text" value={auditorName} onChange={e => setAuditorName(e.target.value)} className="w-full text-center font-bold outline-none uppercase" placeholder="NAME / INITIALS" />
                        </div>
                        <div className="border-r border-t border-gray-800 p-2 text-center">
                            <input type="text" value={sirNo} onChange={e => setSirNo(e.target.value)} className="w-full text-center font-bold outline-none" placeholder="IA-XX-XX-XX" />
                        </div>
                        <div className="border-t border-gray-800 p-2 text-center">
                            <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="w-full text-center font-bold outline-none" />
                        </div>
                    </div>

                    {/* Nature / Type */}
                    <div className="mt-4 border border-gray-800">
                        <div className="p-2 bg-gray-50 font-bold border-b border-gray-800">Nature/ TYPE of Non-conformity Request (tick where appropriate):</div>
                        <div className="grid grid-cols-2">
                            {SIR_TYPES.map((type, i) => (
                                <div key={i} className={`flex items-center gap-2 p-2 border-gray-200 ${i % 2 === 0 ? 'border-r' : ''} ${i < SIR_TYPES.length - 2 ? 'border-b' : ''}`}>
                                    <button onClick={() => toggleNature(type)} className="text-primary hover:text-primary/80">
                                        {natureOfNonConformity.includes(type) ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </button>
                                    <span className="text-xs font-medium uppercase">{type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Section 1 */}
                <div className="border-b border-gray-200 p-6">
                    <div className="bg-green-500 text-white font-bold p-1 px-2 mb-4">1. DESCRIPTION OF NON-CONFORMITY</div>
                    <div className="space-y-4">
                        <div>
                            <label className="block font-bold mb-1">Findings:</label>
                            <textarea value={findings} onChange={e => setFindings(e.target.value)} className="w-full border border-gray-300 rounded p-2 min-h-[80px]" />
                        </div>
                        <div>
                            <label className="block font-bold mb-1">Objective Evidence:</label>
                            <textarea value={objectiveEvidence} onChange={e => setObjectiveEvidence(e.target.value)} className="w-full border border-gray-300 rounded p-2 min-h-[60px]" />
                        </div>
                        <div>
                            <label className="block font-bold mb-1">Reference:</label>
                            <textarea value={reference} onChange={e => setReference(e.target.value)} className="w-full border border-gray-300 rounded p-2 min-h-[40px]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4 border border-gray-300 p-2">
                        <div className="flex items-center gap-2">
                            <span className="font-bold">Classification:</span>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="radio" checked={classification === 'Major'} onChange={() => setClassification('Major')} /> Major
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="radio" checked={classification === 'Minor'} onChange={() => setClassification('Minor')} /> Minor
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold">Relevant Clause:</span>
                            <input type="text" value={relevantClause} onChange={e => setRelevantClause(e.target.value)} className="border-b border-gray-400 outline-none px-1" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold">Doc CODE:</span>
                            <input type="text" value={docCode} onChange={e => setDocCode(e.target.value)} className="border-b border-gray-400 outline-none px-1" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 mt-4 gap-8">
                        <div>
                            <div className="font-bold mb-2">Acknowledged by (auditee):</div>
                            <input type="text" value={auditeeAcknowledgedBy} onChange={e => setAuditeeAcknowledgedBy(e.target.value)} placeholder="Print Name" className="w-full border-b border-gray-300 p-1 mb-1" />
                            <input type="date" value={auditeeAcknowledgedDate} onChange={e => setAuditeeAcknowledgedDate(e.target.value)} className="text-xs text-gray-500" />
                        </div>
                        <div>
                            <div className="font-bold mb-2">Noted by (immediate superior of auditee):</div>
                            <input type="text" value={auditeeSuperiorNotedBy} onChange={e => setAuditeeSuperiorNotedBy(e.target.value)} placeholder="Print Name" className="w-full border-b border-gray-300 p-1 mb-1" />
                            <input type="date" value={auditeeSuperiorNotedDate} onChange={e => setAuditeeSuperiorNotedDate(e.target.value)} className="text-xs text-gray-500" />
                        </div>
                    </div>
                </div>

                {/* Section 2 */}
                <div className="border-b border-gray-200 p-6">
                    <div className="bg-green-500 text-white font-bold p-1 px-2 mb-4">2. ROOT CAUSE/S OF NON-CONFORMITY</div>
                    <textarea value={rootCause} onChange={e => setRootCause(e.target.value)} className="w-full border border-gray-300 rounded p-2 min-h-[100px] mb-4" />

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <div className="font-bold mb-2">Determined by (auditee & team):</div>
                            <input type="text" value={rootCauseDeterminedBy} onChange={e => setRootCauseDeterminedBy(e.target.value)} placeholder="Print Name" className="w-full border-b border-gray-300 p-1 mb-1" />
                        </div>
                        <div>
                            <div className="font-bold mb-2">Approved by (immediate superior of auditee):</div>
                            <input type="text" value={rootCauseApprovedBy} onChange={e => setRootCauseApprovedBy(e.target.value)} placeholder="Print Name" className="w-full border-b border-gray-300 p-1 mb-1" />
                        </div>
                    </div>
                </div>

                {/* Section 3 */}
                <div className="border-b border-gray-200 p-6">
                    <div className="bg-green-500 text-white font-bold p-1 px-2 mb-4">3. AGREED CORRECTION</div>
                    <table className="w-full border border-gray-300 mb-2">
                        <thead>
                            <tr className="bg-gray-50 text-xs uppercase">
                                <th className="border p-2">Description of Action</th>
                                <th className="border p-2 w-24">HIRAC NEEDED? (Y/N)</th>
                                <th className="border p-2 w-32">Accountability</th>
                                <th className="border p-2 w-32">Completion Date(s)</th>
                                <th className="border p-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {corrections.map((row) => (
                                <tr key={row.id}>
                                    <td className="border p-0">
                                        <input type="text" value={row.description} onChange={e => updateActionRow(row.id, 'description', e.target.value, setCorrections, corrections)} className="w-full h-full p-2 outline-none" />
                                    </td>
                                    <td className="border p-0 text-center">
                                        <input type="checkbox" checked={row.hiracNeeded} onChange={e => updateActionRow(row.id, 'hiracNeeded', e.target.checked, setCorrections, corrections)} />
                                    </td>
                                    <td className="border p-0">
                                        <input type="text" value={row.accountability} onChange={e => updateActionRow(row.id, 'accountability', e.target.value, setCorrections, corrections)} className="w-full h-full p-2 outline-none text-center" />
                                    </td>
                                    <td className="border p-0">
                                        <input type="date" value={row.completionDate} onChange={e => updateActionRow(row.id, 'completionDate', e.target.value, setCorrections, corrections)} className="w-full h-full p-2 outline-none" />
                                    </td>
                                    <td className="border p-1 text-center">
                                        <button onClick={() => removeActionRow(row.id, setCorrections, corrections)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={() => addActionRow(setCorrections, corrections)} className="text-xs font-bold text-primary flex items-center gap-1 mb-4"><Plus size={14} /> ADD ROW</button>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <div className="font-bold mb-2">Recommended by (auditee & team):</div>
                            <input type="text" value={correctionRecommendedBy} onChange={e => setCorrectionRecommendedBy(e.target.value)} placeholder="Print Name" className="w-full border-b border-gray-300 p-1 mb-1" />
                        </div>
                        <div>
                            <div className="font-bold mb-2">Approved by (immediate superior of auditee):</div>
                            <input type="text" value={correctionApprovedBy} onChange={e => setCorrectionApprovedBy(e.target.value)} placeholder="Print Name" className="w-full border-b border-gray-300 p-1 mb-1" />
                        </div>
                    </div>
                </div>

                {/* Section 4 */}
                <div className="border-b border-gray-200 p-6">
                    <div className="bg-green-500 text-white font-bold p-1 px-2 mb-4">4. AGREED CORRECTIVE ACTION</div>
                    <table className="w-full border border-gray-300 mb-2">
                        <thead>
                            <tr className="bg-gray-50 text-xs uppercase">
                                <th className="border p-2">Description of Action</th>
                                <th className="border p-2 w-24">HIRAC NEEDED? (Y/N)</th>
                                <th className="border p-2 w-32">Accountability</th>
                                <th className="border p-2 w-32">Completion Date(s)</th>
                                <th className="border p-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {correctiveActions.map((row) => (
                                <tr key={row.id}>
                                    <td className="border p-0">
                                        <input type="text" value={row.description} onChange={e => updateActionRow(row.id, 'description', e.target.value, setCorrectiveActions, correctiveActions)} className="w-full h-full p-2 outline-none" />
                                    </td>
                                    <td className="border p-0 text-center">
                                        <input type="checkbox" checked={row.hiracNeeded} onChange={e => updateActionRow(row.id, 'hiracNeeded', e.target.checked, setCorrectiveActions, correctiveActions)} />
                                    </td>
                                    <td className="border p-0">
                                        <input type="text" value={row.accountability} onChange={e => updateActionRow(row.id, 'accountability', e.target.value, setCorrectiveActions, correctiveActions)} className="w-full h-full p-2 outline-none text-center" />
                                    </td>
                                    <td className="border p-0">
                                        <input type="date" value={row.completionDate} onChange={e => updateActionRow(row.id, 'completionDate', e.target.value, setCorrectiveActions, correctiveActions)} className="w-full h-full p-2 outline-none" />
                                    </td>
                                    <td className="border p-1 text-center">
                                        <button onClick={() => removeActionRow(row.id, setCorrectiveActions, correctiveActions)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={() => addActionRow(setCorrectiveActions, correctiveActions)} className="text-xs font-bold text-primary flex items-center gap-1 mb-4"><Plus size={14} /> ADD ROW</button>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <div className="font-bold mb-2">Recommended by (auditee & team):</div>
                            <input type="text" value={correctiveActionRecommendedBy} onChange={e => setCorrectiveActionRecommendedBy(e.target.value)} placeholder="Print Name" className="w-full border-b border-gray-300 p-1 mb-1" />
                        </div>
                        <div>
                            <div className="font-bold mb-2">Approved by (immediate superior of auditee):</div>
                            <input type="text" value={correctiveActionApprovedBy} onChange={e => setCorrectiveActionApprovedBy(e.target.value)} placeholder="Print Name" className="w-full border-b border-gray-300 p-1 mb-1" />
                        </div>
                    </div>
                </div>

                {/* Section 5 */}
                <div className="p-6">
                    <div className="bg-green-500 text-white font-bold p-1 px-2 mb-4">5. FOLLOW-UP RESULTS</div>

                    {/* 5.a */}
                    <div className="bg-orange-200 p-1 px-2 font-bold text-orange-900 mb-2">5.a Implementation Status</div>
                    <div className="flex items-center gap-4 mb-4 ml-4">
                        <span className="font-bold">Requested extension?</span>
                        <label className="flex items-center gap-1"><input type="radio" checked={extensionRequested === true} onChange={() => setExtensionRequested(true)} /> Yes</label>
                        <label className="flex items-center gap-1"><input type="radio" checked={extensionRequested === false} onChange={() => setExtensionRequested(false)} /> No</label>

                        {extensionRequested && (
                            <div className="flex items-center gap-2 ml-4">
                                <span>If Yes, indicate new commitment date:</span>
                                <input type="date" value={newCommitmentDate} onChange={e => setNewCommitmentDate(e.target.value)} className="border-b border-gray-400 bg-transparent outline-none" />
                            </div>
                        )}
                    </div>

                    <table className="w-full border border-gray-300 mb-2">
                        <thead>
                            <tr className="bg-gray-50 text-xs uppercase">
                                <th className="border p-2 w-32">Date</th>
                                <th className="border p-2">Evidence of Implementation</th>
                                <th className="border p-2 w-32">Status (Closed/Open)</th>
                                <th className="border p-2 w-48">Remarks</th>
                                <th className="border p-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {implementationRows.map((row) => (
                                <tr key={row.id}>
                                    <td className="border p-0"><input type="date" value={row.date} onChange={e => updateEffectivenessRow(row.id, 'date', e.target.value, setImplementationRows, implementationRows)} className="w-full h-full p-2 outline-none" /></td>
                                    <td className="border p-0"><textarea value={row.evidence} onChange={e => updateEffectivenessRow(row.id, 'evidence', e.target.value, setImplementationRows, implementationRows)} className="w-full h-full p-2 outline-none min-h-[50px] resize-none" /></td>
                                    <td className="border p-0">
                                        <select value={row.status} onChange={e => updateEffectivenessRow(row.id, 'status', e.target.value as any, setImplementationRows, implementationRows)} className="w-full h-full p-2 outline-none bg-transparent">
                                            <option value="Open">Open</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </td>
                                    <td className="border p-0"><textarea value={row.remarks} onChange={e => updateEffectivenessRow(row.id, 'remarks', e.target.value, setImplementationRows, implementationRows)} className="w-full h-full p-2 outline-none min-h-[50px] resize-none" /></td>
                                    <td className="border p-1 text-center"><button onClick={() => removeEffectivenessRow(row.id, setImplementationRows, implementationRows)} className="text-gray-400 hover:text-red-500"><X size={14} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={() => addEffectivenessRow(setImplementationRows, implementationRows)} className="text-xs font-bold text-primary flex items-center gap-1 mb-4"><Plus size={14} /> ADD ROW</button>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <div className="font-bold mb-2">Followed-up by (auditor):</div>
                            <input type="text" value={implementationFollowedUpBy} onChange={e => setImplementationFollowedUpBy(e.target.value)} placeholder="Print Name" className="w-full border-b border-gray-300 p-1 mb-1" />
                        </div>
                        <div>
                            <div className="font-bold mb-2">Noted by (immediate superior of auditee):</div>
                            <input type="text" value={implementationNotedBy} onChange={e => setImplementationNotedBy(e.target.value)} placeholder="Print Name" className="w-full border-b border-gray-300 p-1 mb-1" />
                        </div>
                    </div>

                    {/* 5.b */}
                    <div className="bg-orange-200 p-1 px-2 font-bold text-orange-900 mb-2">5.b Effectiveness</div>
                    <div className="flex items-center gap-4 mb-4 ml-4">
                        <span className="font-bold">Effective?</span>
                        <label className="flex items-center gap-1"><input type="radio" checked={effectivenessEffective === true} onChange={() => setEffectivenessEffective(true)} /> Yes</label>
                        <label className="flex items-center gap-1"><input type="radio" checked={effectivenessEffective === false} onChange={() => setEffectivenessEffective(false)} /> No</label>

                        {effectivenessEffective === false && (
                            <div className="flex items-center gap-2 ml-4 flex-1">
                                <span>If No, describe disposition taken:</span>
                                <input type="text" value={dispositionTaken} onChange={e => setDispositionTaken(e.target.value)} className="border-b border-gray-400 bg-transparent outline-none flex-1" />
                            </div>
                        )}
                    </div>

                    <table className="w-full border border-gray-300 mb-2">
                        <thead>
                            <tr className="bg-gray-50 text-xs uppercase">
                                <th className="border p-2 w-32">Date</th>
                                <th className="border p-2">Evidence of Effectiveness</th>
                                <th className="border p-2 w-32">Status (Closed/Open)</th>
                                <th className="border p-2 w-48">Remarks</th>
                                <th className="border p-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {effectivenessRows.map((row) => (
                                <tr key={row.id}>
                                    <td className="border p-0"><input type="date" value={row.date} onChange={e => updateEffectivenessRow(row.id, 'date', e.target.value, setEffectivenessRows, effectivenessRows)} className="w-full h-full p-2 outline-none" /></td>
                                    <td className="border p-0"><textarea value={row.evidence} onChange={e => updateEffectivenessRow(row.id, 'evidence', e.target.value, setEffectivenessRows, effectivenessRows)} className="w-full h-full p-2 outline-none min-h-[50px] resize-none" /></td>
                                    <td className="border p-0">
                                        <select value={row.status} onChange={e => updateEffectivenessRow(row.id, 'status', e.target.value as any, setEffectivenessRows, effectivenessRows)} className="w-full h-full p-2 outline-none bg-transparent">
                                            <option value="Open">Open</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </td>
                                    <td className="border p-0"><textarea value={row.remarks} onChange={e => updateEffectivenessRow(row.id, 'remarks', e.target.value, setEffectivenessRows, effectivenessRows)} className="w-full h-full p-2 outline-none min-h-[50px] resize-none" /></td>
                                    <td className="border p-1 text-center"><button onClick={() => removeEffectivenessRow(row.id, setEffectivenessRows, effectivenessRows)} className="text-gray-400 hover:text-red-500"><X size={14} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={() => addEffectivenessRow(setEffectivenessRows, effectivenessRows)} className="text-xs font-bold text-primary flex items-center gap-1 mb-4"><Plus size={14} /> ADD ROW</button>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <div className="font-bold mb-2">Followed-up by (auditor):</div>
                            <input type="text" value={effectivenessFollowedUpBy} onChange={e => setEffectivenessFollowedUpBy(e.target.value)} placeholder="Print Name" className="w-full border-b border-gray-300 p-1 mb-1" />
                        </div>
                        <div>
                            <div className="font-bold mb-2">Noted by (immediate superior of auditee):</div>
                            <input type="text" value={effectivenessNotedBy} onChange={e => setEffectivenessNotedBy(e.target.value)} placeholder="Print Name" className="w-full border-b border-gray-300 p-1 mb-1" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

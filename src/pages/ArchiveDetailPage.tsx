import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventById, getReportsByEventId, getOAFsByEventId, getSIRsByEventId, isDocumentEditable } from '../lib/auditEventService';
import type { AuditEvent, AuditReport, ObservationForm, SIRForm } from '../lib/types';
import {
    Archive,
    FileText,
    ClipboardList,
    AlertCircle,
    ChevronLeft,
    Calendar,
    Search,
    Lock,
    Edit,
    Eye,
    BarChart3
} from 'lucide-react';

type TabType = 'reports' | 'oafs' | 'sirs' | 'summary';

export const ArchiveDetailPage: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<AuditEvent | null>(null);
    const [reports, setReports] = useState<AuditReport[]>([]);
    const [oafs, setOAFs] = useState<ObservationForm[]>([]);
    const [sirs, setSIRs] = useState<SIRForm[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('reports');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (eventId) {
            loadEventData(eventId);
        }
    }, [eventId]);

    const loadEventData = async (id: string) => {
        setLoading(true);
        try {
            const [eventData, reportsData, oafsData, sirsData] = await Promise.all([
                getEventById(id),
                getReportsByEventId(id),
                getOAFsByEventId(id),
                getSIRsByEventId(id)
            ]);
            setEvent(eventData);
            setReports(reportsData);
            setOAFs(oafsData);
            setSIRs(sirsData);
        } catch (err) {
            console.error('Error loading archive:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string, isEditable: boolean) => {
        const baseClasses = "px-2 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1";

        if (status === 'Closed') {
            return <span className={`${baseClasses} bg-gray-100 text-gray-600`}><Lock size={12} /> Closed</span>;
        }
        if (status === 'Approved') {
            return <span className={`${baseClasses} bg-green-100 text-green-700`}><Lock size={12} /> Approved</span>;
        }
        if (isEditable) {
            return <span className={`${baseClasses} bg-amber-100 text-amber-700`}><Edit size={12} /> {status}</span>;
        }
        return <span className={`${baseClasses} bg-blue-100 text-blue-700`}>{status}</span>;
    };

    const filteredReports = reports.filter(r =>
        r.area_process.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredOAFs = oafs.filter(o =>
        o.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.auditeeName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredSIRs = sirs.filter(s =>
        s.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.sirNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openOAFsCount = oafs.filter(o => o.status !== 'Closed').length;
    const openSIRsCount = sirs.filter(s => s.status !== 'Closed').length;

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="text-center py-20">
                <Archive size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Archive not found</p>
                <button
                    onClick={() => navigate('/events')}
                    className="mt-4 text-indigo-600 hover:underline"
                >
                    Back to Event Management
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Back Button */}
            <button
                onClick={() => navigate('/events')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
                <ChevronLeft size={20} /> Back to Event Management
            </button>

            {/* Header */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-600 rounded-3xl p-8 text-white shadow-premium relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Archive size={120} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
                        <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">Archived</span>
                    </div>
                    {event.description && (
                        <p className="text-slate-300 mb-4">{event.description}</p>
                    )}
                    <div className="flex items-center gap-6 text-sm text-slate-300">
                        <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            Archived: {event.archivedAt?.toDate().toLocaleDateString()}
                        </span>
                        {(openOAFsCount > 0 || openSIRsCount > 0) && (
                            <span className="flex items-center gap-1 bg-amber-500/20 text-amber-200 px-3 py-1 rounded-full">
                                <AlertCircle size={14} />
                                {openOAFsCount + openSIRsCount} document(s) still editable
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                            <FileText size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900">{reports.length}</div>
                            <div className="text-sm text-gray-500">Audit Reports</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
                            <ClipboardList size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900">
                                {oafs.length}
                                {openOAFsCount > 0 && <span className="text-sm text-amber-600 ml-1">({openOAFsCount} open)</span>}
                            </div>
                            <div className="text-sm text-gray-500">OAFs</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900">
                                {sirs.length}
                                {openSIRsCount > 0 && <span className="text-sm text-amber-600 ml-1">({openSIRsCount} open)</span>}
                            </div>
                            <div className="text-sm text-gray-500">SIRs</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900">{event.stats?.totalFindings || 0}</div>
                            <div className="text-sm text-gray-500">Findings</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                {[
                    { id: 'reports', label: 'Audit Reports', count: reports.length },
                    { id: 'oafs', label: 'OAFs', count: oafs.length },
                    { id: 'sirs', label: 'SIRs', count: sirs.length },
                    { id: 'summary', label: 'Summary' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search */}
            {activeTab !== 'summary' && (
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white rounded-xl py-3 pl-12 pr-4 shadow-soft border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            )}

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
                {/* Audit Reports Tab */}
                {activeTab === 'reports' && (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Area/Process</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredReports.map(report => (
                                <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{report.area_process}</td>
                                    <td className="px-6 py-4 text-gray-600">{report.department}</td>
                                    <td className="px-6 py-4 text-gray-600">{report.audit_date?.toDate().toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(report.status, false)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => {
                                                if (report.pdf_url) {
                                                    window.open(report.pdf_url, '_blank');
                                                } else {
                                                    navigate(`/audit/${report.id}`);
                                                }
                                            }}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
                                        >
                                            <Eye size={14} /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredReports.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No audit reports found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* OAFs Tab */}
                {activeTab === 'oafs' && (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">ID</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Auditee</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredOAFs.map(oaf => {
                                const editable = isDocumentEditable(oaf, event.status);
                                return (
                                    <tr key={oaf.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm text-gray-600">#{oaf.id?.slice(0, 8)}</td>
                                        <td className="px-6 py-4 text-gray-900">{oaf.department}</td>
                                        <td className="px-6 py-4 text-gray-600">{oaf.auditeeName}</td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(oaf.status, editable)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => navigate(`/observation-form/${oaf.id}`)}
                                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${editable
                                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                                    }`}
                                            >
                                                {editable ? <><Edit size={14} /> Edit</> : <><Eye size={14} /> View</>}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredOAFs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No OAFs found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* SIRs Tab */}
                {activeTab === 'sirs' && (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">SIR No</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Classification</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredSIRs.map(sir => {
                                const editable = isDocumentEditable(sir, event.status);
                                return (
                                    <tr key={sir.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{sir.sirNo}</td>
                                        <td className="px-6 py-4 text-gray-600">{sir.department}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${sir.classification === 'Major'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {sir.classification}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(sir.status, editable)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => navigate(`/sir-form/${sir.id}`)}
                                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${editable
                                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                                    }`}
                                            >
                                                {editable ? <><Edit size={14} /> Edit</> : <><Eye size={14} /> View</>}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredSIRs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No SIRs found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* Summary Tab */}
                {activeTab === 'summary' && (
                    <div className="p-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Event Summary</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Overview */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-700">Overview</h4>
                                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Event Name</span>
                                        <span className="font-medium">{event.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Created</span>
                                        <span className="font-medium">{event.createdAt?.toDate().toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Archived</span>
                                        <span className="font-medium">{event.archivedAt?.toDate().toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Documents</span>
                                        <span className="font-medium">{reports.length + oafs.length + sirs.length}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Departments Covered */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-700">Departments Covered</h4>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex flex-wrap gap-2">
                                        {event.stats?.departmentsCovered?.map(dept => (
                                            <span key={dept} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                                                {dept}
                                            </span>
                                        )) || <span className="text-gray-500">No departments recorded</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Document Status */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-700">Document Status</h4>
                                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Audit Reports</span>
                                        <span className="font-medium text-green-600">{reports.length} (All read-only)</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">OAFs</span>
                                        <span className="font-medium">
                                            {oafs.filter(o => o.status === 'Closed').length} closed, {openOAFsCount} open
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">SIRs</span>
                                        <span className="font-medium">
                                            {sirs.filter(s => s.status === 'Closed').length} closed, {openSIRsCount} open
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Findings Summary */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-700">Findings Summary</h4>
                                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Findings</span>
                                        <span className="font-medium">{event.stats?.totalFindings || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Major NCs (SIRs)</span>
                                        <span className="font-medium text-red-600">
                                            {sirs.filter(s => s.classification === 'Major').length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Minor NCs (SIRs)</span>
                                        <span className="font-medium text-yellow-600">
                                            {sirs.filter(s => s.classification === 'Minor').length}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

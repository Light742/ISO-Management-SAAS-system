import { useEffect, useState } from 'react';
import { getAllAuditReports, deleteAuditReport, getAllObservationForms, deleteObservationForm, getAllSIRs, deleteSIR } from '../lib/auditService';
import type { AuditReport, ObservationForm, SIRForm } from '../lib/types';
import {
    Folder,
    FileText,
    Search,
    Trash2,
    ShieldAlert,
    Lightbulb,
    ListFilter,
    ClipboardList,
    Edit
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type TabType = 'reports' | 'ofi' | 'nc' | 'oaf' | 'sir';

export const DirectoryPage: React.FC = () => {
    const { userData } = useAuth();
    const [reports, setReports] = useState<AuditReport[]>([]);
    const [allForms, setAllForms] = useState<ObservationForm[]>([]);
    const [allSIRs, setAllSIRs] = useState<SIRForm[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('reports');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, [userData]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [reportData, oafData, sirData] = await Promise.all([
                getAllAuditReports(),
                getAllObservationForms(),
                getAllSIRs()
            ]);

            // Sort by created date descending (newest first)
            const sortedReports = reportData.sort((a, b) =>
                (b.created_at?.toMillis() || 0) - (a.created_at?.toMillis() || 0)
            );

            const sortedOAFs = oafData.sort((a, b) =>
                (b.created_at?.toMillis() || 0) - (a.created_at?.toMillis() || 0)
            );

            const sortedSIRs = sirData.sort((a, b) =>
                (b.created_at?.toMillis() || 0) - (a.created_at?.toMillis() || 0)
            );

            if (userData?.role === 'Auditee' && userData.department) {
                setReports(sortedReports.filter(r => r.department === userData.department));
                setAllForms(sortedOAFs.filter(o => o.department === userData.department));
                setAllSIRs(sortedSIRs.filter(s => s.department === userData.department));
            } else {
                setReports(sortedReports);
                setAllForms(sortedOAFs);
                setAllSIRs(sortedSIRs);
            }
        } catch (error) {
            console.error('Error loading directory data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, report: AuditReport) => {
        e.stopPropagation();
        if (!report.id) return;

        if (window.confirm('Are you sure you want to delete this audit report? This action cannot be undone.')) {
            try {
                await deleteAuditReport(report.id, report.pdf_url);
                setReports(prev => prev.filter(r => r.id !== report.id));
                alert('Report deleted successfully');
            } catch (error) {
                console.error('Error deleting report:', error);
                alert('Failed to delete report');
            }
        }
    };

    const handleDeleteOAF = async (e: React.MouseEvent, formId: string) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this OAF? This action cannot be undone.')) return;

        try {
            await deleteObservationForm(formId);
            setAllForms(prev => prev.filter(f => f.id !== formId));
            alert('OAF deleted successfully');
        } catch (error) {
            console.error('Error deleting OAF:', error);
            alert('Failed to delete OAF');
        }
    };

    const handleDeleteSIR = async (e: React.MouseEvent, sirId: string) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this SIR? This action cannot be undone.')) return;

        try {
            await deleteSIR(sirId);
            setAllSIRs(prev => prev.filter(s => s.id !== sirId));
            alert('SIR deleted successfully');
        } catch (error) {
            console.error('Error deleting SIR:', error);
            alert('Failed to delete SIR');
        }
    };

    // Flattening data for OFI, NC, and SIR tabs
    const allOFI = reports.flatMap(report =>
        (report.observations_ofi || []).map(ofi => ({
            ...ofi,
            reportId: report.id,
            department: report.department,
            auditor: report.auditor_name || 'N/A',
            auditee: report.auditee_name || 'N/A',
            date: report.audit_date,
            pdf_url: report.pdf_url,
            status: ofi.status || 'Open'
        }))
    );

    const allNC = reports.flatMap(report =>
        (report.findings_nc || []).map(nc => ({
            ...nc,
            reportId: report.id,
            department: report.department,
            auditor: report.auditor_name || 'N/A',
            auditee: report.auditee_name || 'N/A',
            date: report.audit_date,
            pdf_url: report.pdf_url,
            // Ensure status is present or defaulted
            status: nc.status || 'Open'
        }))
    );


    // Filtering logic
    const filteredReports = reports.filter(report => {
        const searchLower = searchTerm.toLowerCase();
        // Search by ID, Title (Area/Process), or Department
        return (
            (report.id?.toLowerCase().includes(searchLower) || false) ||
            (report.area_process.toLowerCase().includes(searchLower)) ||
            (report.department.toLowerCase().includes(searchLower))
        ) && (
                !deptFilter || report.department.toLowerCase().includes(deptFilter.toLowerCase())
            );
    });

    const filteredOFI = allOFI.filter(item =>
        (item.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (item.department.toLowerCase().includes(deptFilter.toLowerCase()))
    );

    const filteredNC = allNC.filter(item =>
        (item.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (item.department.toLowerCase().includes(deptFilter.toLowerCase()))
    );

    const filteredSIR = allSIRs.filter(item =>
        (item.department.toLowerCase().includes(deptFilter.toLowerCase())) &&
        (item.findings.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sirNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.auditorName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredOAFs = allForms.filter(form =>
        (form.department.toLowerCase().includes(deptFilter.toLowerCase())) &&
        (form.auditorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            form.id?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const tabs = [
        { id: 'reports', name: 'Audit Reports', icon: Folder },
        { id: 'oaf', name: 'Observation Action Forms', icon: ClipboardList },
        { id: 'sir', name: 'System Improvement Request', icon: Folder },
        { id: 'ofi', name: 'OFI List', icon: Lightbulb },
        { id: 'nc', name: 'NC List', icon: ShieldAlert },
    ] as const;

    const getApprover = (report: AuditReport) => {
        if (report.status === 'Pending') return 'Lead Auditor';
        if (report.status === 'For Auditee Approval') return report.auditee_name || 'Auditee';
        if (report.status === 'For Auditor Approval') return report.auditor_name || 'Auditor';
        return 'N/A';
    };

    const getApproverOAF = (form: ObservationForm) => {
        if (form.status === 'Pending Approval') return form.auditorName || 'Lead Auditor';
        if (form.status === 'Issued') return form.auditeeName || 'Auditee';
        if (form.status === 'Pending Response') return form.auditeeName || 'Auditee';
        if (form.status === 'Pending Evaluation') return form.auditorName || 'Auditor';
        if (form.status === 'For Auditee Approval') return form.auditeeName || 'Auditee';
        if (form.status === 'For Auditor Approval') return form.auditorName || 'Auditor';
        return 'N/A';
    };

    const getApproverSIR = (form: SIRForm) => {
        if (form.status === 'Issued') return form.department || 'Auditee';
        if (form.status === 'Pending Response') return form.department || 'Auditee';
        if (form.status === 'Pending Evaluation') return form.auditorName || 'Auditor';
        return 'N/A';
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Audit Directory</h1>
                    <p className="text-muted text-sm">
                        Archive of all submitted audit reports, OAFs, and extracted findings.
                    </p>
                </div>
                {/* Global Actions - Create Buttons */}
                <div className="flex gap-2">
                    {activeTab === 'reports' && (
                        <button
                            onClick={() => navigate('/audit-form')}
                            className="btn-primary flex items-center gap-2 px-4 py-2"
                        >
                            <Folder size={18} />
                            Create Audit Report
                        </button>
                    )}
                    {activeTab === 'oaf' && (
                        <button
                            onClick={() => navigate('/observation-form')}
                            className="btn-primary flex items-center gap-2 px-4 py-2"
                        >
                            <ClipboardList size={18} />
                            Create OAF
                        </button>
                    )}
                    {activeTab === 'sir' && (
                        <button
                            onClick={() => navigate('/sir-form')}
                            className="btn-primary flex items-center gap-2 px-4 py-2"
                        >
                            <Folder size={18} />
                            Create SIR
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id as TabType);
                            setSearchTerm('');
                            setDeptFilter('');
                        }}
                        className={cn(
                            "flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap",
                            activeTab === tab.id
                                ? "border-accent text-accent"
                                : "border-transparent text-gray-500 hover:text-accent hover:bg-gray-50"
                        )}
                    >
                        <tab.icon size={18} />
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
                    <input
                        type="text"
                        placeholder={activeTab === 'reports' ? "Search ID, Area/Process..." : "Search description or reference..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white rounded-2xl py-3 pl-12 pr-4 shadow-soft focus:ring-2 focus:ring-accent/10 outline-none border-none transition-all"
                    />
                </div>
                <div className="relative md:w-64">
                    <ListFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
                    <input
                        type="text"
                        placeholder="Filter by Dept..."
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                        className="w-full bg-white rounded-2xl py-3 pl-12 pr-4 shadow-soft focus:ring-2 focus:ring-accent/10 outline-none border-none transition-all"
                    />
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'reports' && (
                        <div className="bg-white rounded-3xl shadow-premium overflow-hidden border border-gray-100">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Request ID</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Request Title</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Request Type</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Created Date</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Approver</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Remarks</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredReports.map((report) => (
                                            <tr key={report.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-xs text-gray-500">
                                                        #{report.id?.slice(0, 8)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-gray-900 line-clamp-1">
                                                        {report.area_process}
                                                    </p>
                                                    <p className="text-xs text-muted">{report.department}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                                        Audit Report
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {report.created_at?.toDate().toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded-full text-xs font-bold border",
                                                        report.status === 'Draft' ? "bg-gray-100 text-gray-600 border-gray-200" :
                                                            report.status === 'Pending' ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                                report.status === 'For Auditee Approval' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                                    report.status === 'For Auditor Approval' ? "bg-purple-50 text-purple-700 border-purple-200" :
                                                                        report.status === 'Closed' ? "bg-green-50 text-green-700 border-green-200" :
                                                                            report.status === 'Rejected' ? "bg-red-50 text-red-700 border-red-200" :
                                                                                "bg-gray-100"
                                                    )}>
                                                        {report.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {getApprover(report)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className={`text-xs truncate max-w-[200px] ${report.status === 'Rejected' ? 'text-red-600 font-medium' : 'text-gray-500'}`} title={report.status === 'Rejected' ? report.rejection_reason : report.conclusion_text}>
                                                        {report.status === 'Rejected' ? report.rejection_reason : (report.conclusion_text || '-')}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {report.status === 'Rejected' && (
                                                            <button
                                                                onClick={() => navigate(`/audit-form/${report.id}`)}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Edit Report"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => navigate(`/audit/${report.id}`)}
                                                            className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors"
                                                            title="View Report"
                                                        >
                                                            <FileText size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(e, report)}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredReports.length === 0 && (
                                <div className="py-20 text-center text-muted">
                                    <Folder size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>No audit reports found.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'oaf' && (
                        <div className="bg-white rounded-3xl shadow-premium overflow-hidden border border-gray-100">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Request ID</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Request Title</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Request Type</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Created Date</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Approver</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Remarks</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredOAFs.map((form) => (
                                            <tr key={form.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-xs text-gray-500">
                                                        #{form.id?.slice(0, 8)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-gray-900">{form.department}</p>
                                                    <p className="text-xs text-muted">{form.auditeeName}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded-md">
                                                        OAF
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {form.created_at?.toDate().toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded-full text-xs font-bold border",
                                                        form.status === 'Draft' ? "bg-gray-100 text-gray-600 border-gray-200" :
                                                            form.status === 'Issued' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                                form.status === 'Pending Evaluation' ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                                    form.status === 'Closed' ? "bg-green-50 text-green-700 border-green-200" :
                                                                        form.status === 'Rejected' ? "bg-red-50 text-red-700 border-red-200" :
                                                                            "bg-gray-100"
                                                    )}>
                                                        {form.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {getApproverOAF(form)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className={`text-xs truncate max-w-[200px] ${form.status === 'Rejected' ? 'text-red-600 font-medium' : 'text-gray-500'}`} title={form.status === 'Rejected' ? form.rejection_reason : `${form.rows?.length || 0} Observations`}>
                                                        {form.status === 'Rejected' ? form.rejection_reason : `${form.rows?.length || 0} Observations`}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {form.status === 'Rejected' && (
                                                            <button
                                                                onClick={() => navigate(`/observation-form/${form.id}`)}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Edit OAF"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => navigate(`/observation-form/${form.id}`)}
                                                            className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors"
                                                            title="View OAF"
                                                        >
                                                            <ClipboardList size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteOAF(e, form.id!)}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredOAFs.length === 0 && (
                                <div className="py-20 text-center text-muted">
                                    <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>No OAFs found.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'sir' && (
                        <div className="bg-white rounded-3xl shadow-premium overflow-hidden border border-gray-100">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Request ID</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Request Title</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Request Type</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Created Date</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Approver</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Remarks</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredSIR.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-xs text-gray-500">
                                                        #{item.id?.slice(0, 8)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-gray-900 line-clamp-1">
                                                        {item.sirNo || 'No Ref'}
                                                    </p>
                                                    <p className="text-xs text-muted line-clamp-1">{item.department}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded-md">
                                                        SIR
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {item.created_at?.toDate().toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded-full text-xs font-bold border",
                                                        item.status === 'Draft' ? "bg-gray-100 text-gray-600 border-gray-200" :
                                                            item.status === 'Issued' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                                item.status === 'Pending Evaluation' ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                                    item.status === 'Closed' ? "bg-green-50 text-green-700 border-green-200" :
                                                                        item.status === 'Rejected' ? "bg-red-50 text-red-700 border-red-200" :
                                                                            "bg-gray-100"
                                                    )}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {getApproverSIR(item)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className={`text-xs truncate max-w-[200px] ${item.status === 'Rejected' ? 'text-red-600 font-medium' : 'text-gray-500'}`} title={item.status === 'Rejected' ? item.rejection_reason : item.findings}>
                                                        {item.status === 'Rejected' ? item.rejection_reason : (item.findings || '-')}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {item.status === 'Rejected' && (
                                                            <button
                                                                onClick={() => navigate(`/sir-form/${item.id}`)}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Edit SIR"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => navigate(`/sir-form/${item.id}`)}
                                                            className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors"
                                                            title="View SIR"
                                                        >
                                                            <Folder size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteSIR(e, item.id!)}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredSIR.length === 0 && (
                                <div className="py-20 text-center text-muted">
                                    <Folder size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>No SIRs found.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {(activeTab === 'ofi' || activeTab === 'nc') && (
                        <div className="bg-white rounded-3xl shadow-premium overflow-hidden border border-gray-100">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                            {activeTab !== 'ofi' && <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Clause Ref</th>}
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Auditor</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {(activeTab === 'ofi' ? filteredOFI : filteredNC).map((item, idx) => (
                                            <tr key={`${item.reportId}-${idx}`} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-medium text-gray-900 line-clamp-2 max-w-md">
                                                        {item.description}
                                                    </p>
                                                </td>
                                                {activeTab !== 'ofi' && (
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 rounded-lg text-xs font-bold border capitalize bg-red-50 text-red-700 border-red-100">
                                                            {(item as any).clause_ref}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">
                                                        {item.department}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{item.auditor}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {item.date?.toDate().toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded-full text-xs font-bold border",
                                                        (item as any).status === 'Closed' ? "bg-green-50 text-green-700 border-green-200" :
                                                            "bg-yellow-50 text-yellow-700 border-yellow-200"
                                                    )}>
                                                        {(item as any).status || 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            if (item.pdf_url) {
                                                                window.open(item.pdf_url, '_blank');
                                                            } else {
                                                                navigate(`/audit/${item.reportId}`);
                                                            }
                                                        }}
                                                        className="p-2 text-accent hover:bg-accent/10 rounded-xl transition-colors"
                                                        title="View Report"
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {(activeTab === 'ofi' ? filteredOFI : filteredNC).length === 0 && (
                                <div className="py-20 text-center text-muted">
                                    {activeTab === 'ofi' ? <Lightbulb size={48} className="mx-auto mb-4 opacity-20" /> :
                                        <ShieldAlert size={48} className="mx-auto mb-4 opacity-20" />}
                                    <p>No entries found matching your filters</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

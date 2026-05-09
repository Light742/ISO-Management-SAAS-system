import React, { useEffect, useState } from 'react';
import { getPendingAuditReports, updateAuditReportStatus, updateAuditReport, getPendingOAFsForLeadAuditor, updateObservationForm, getAuditorPendingActions } from '../lib/auditService';
import type { AuditReport, ObservationForm } from '../lib/types';
import { FileText, CheckCircle, XCircle, Search, Calendar, Eye, ClipboardList, PenTool } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ApprovalsPage: React.FC = () => {
    const { user, userData } = useAuth();
    const [reports, setReports] = useState<AuditReport[]>([]);
    const [oafs, setOafs] = useState<ObservationForm[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReport, setSelectedReport] = useState<AuditReport | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [activeTab, setActiveTab] = useState<'reports' | 'oafs'>('reports');

    const navigate = useNavigate();

    const isLeadAuditor = userData?.role === 'LeadAuditor' || userData?.role === 'QMSAdmin';
    const isAuditor = userData?.role === 'Auditor' || userData?.role === 'LeadAuditor' || userData?.role === 'QMSAdmin';

    useEffect(() => {
        if (user) {
            loadReports();
        }
    }, [user, userData]); // Reload when user data is ready

    const loadReports = async () => {
        setLoading(true);
        try {
            let leadReports: AuditReport[] = [];
            let leadOAFs: ObservationForm[] = [];
            let auditorReports: AuditReport[] = [];
            let auditorOAFs: ObservationForm[] = [];

            const promises = [];

            if (isLeadAuditor) {
                promises.push(getPendingAuditReports().then(res => leadReports = res));
                promises.push(getPendingOAFsForLeadAuditor().then(res => leadOAFs = res));
            }

            if (isAuditor && user?.uid) {
                promises.push(getAuditorPendingActions(user.uid).then(res => {
                    auditorReports = res.reports;
                    auditorOAFs = res.oafs;
                }));
            }

            await Promise.all(promises);

            // Deduplicate
            const uniqueReports = [...leadReports, ...auditorReports].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
            const uniqueOAFs = [...leadOAFs, ...auditorOAFs].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);

            setReports(uniqueReports);
            setOafs(uniqueOAFs);
        } catch (error) {
            console.error('Error loading pending reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (report: AuditReport) => {
        if (!report.id) return;

        let nextStatus = '';
        let confirmMsg = '';

        if (report.status === 'Pending') {
            nextStatus = 'For Auditee Approval';
            confirmMsg = `Are you sure you want to APPROVE the audit report for ${report.department}? It will be sent to the Auditee.`;
        } else if (report.status === 'For Auditor Approval') {
            nextStatus = 'Closed'; // Final approval
            confirmMsg = `Are you sure you want to FINALIZE and CLOSE this audit report for ${report.department}?`;
        } else {
            alert('Unknown status transition.');
            return;
        }

        if (!window.confirm(confirmMsg)) return;

        try {
            await updateAuditReportStatus(report.id, nextStatus);
            setReports(prev => prev.filter(r => r.id !== report.id));
            setShowPreview(false);
        } catch (error) {
            console.error('Error approving report:', error);
            alert('Failed to approve report');
        }
    };

    const handleReject = async (report: AuditReport) => {
        if (!report.id) return;

        const reason = window.prompt("Please enter the reason for rejection:");
        if (reason === null) return; // Cancelled
        if (!reason.trim()) {
            alert("Rejection reason is required.");
            return;
        }

        if (!window.confirm(`Are you sure you want to REJECT the audit report for ${report.department}? It will be returned to the auditor.`)) return;

        try {
            await updateAuditReport(report.id, {
                status: 'Rejected',
                rejection_reason: reason
            });
            setReports(prev => prev.filter(r => r.id !== report.id));
            setShowPreview(false);
        } catch (error) {
            console.error('Error rejecting report:', error);
            alert('Failed to reject report');
        }
    };

    const handleApproveOAF = async (oaf: ObservationForm) => {
        if (!oaf.id) return;

        let nextStatus = '';
        let confirmMsg = '';

        if (oaf.status === 'Pending Approval') {
            nextStatus = 'For Auditee Approval';
            confirmMsg = `Are you sure you want to APPROVE the OAF for ${oaf.department}? It will be sent to the Auditee for acceptance.`;
        } else if (oaf.status === 'For Auditor Approval') {
            nextStatus = 'Issued';
            confirmMsg = `Are you sure you want to ISSUE the OAF to ${oaf.department}? This will require them to submit an action plan.`;
        } else {
            // Pending Evaluation should not trigger this function ideally, but if it does:
            return;
        }

        if (!window.confirm(confirmMsg)) return;

        try {
            await updateObservationForm(oaf.id, { status: nextStatus as any });
            setOafs(prev => prev.filter(o => o.id !== oaf.id));
        } catch (error) {
            console.error('Error approving OAF:', error);
            alert('Failed to approve OAF');
        }
    };

    const handleRejectOAF = async (oaf: ObservationForm) => {
        if (!oaf.id) return;

        const reason = window.prompt("Please enter the reason for rejection:");
        if (reason === null) return; // Cancelled
        if (!reason.trim()) {
            alert("Rejection reason is required.");
            return;
        }

        if (!window.confirm(`Are you sure you want to REJECT the OAF for ${oaf.department}?`)) return;

        try {
            await updateObservationForm(oaf.id, {
                status: 'Rejected',
                rejection_reason: reason
            });
            setOafs(prev => prev.filter(o => o.id !== oaf.id));
        } catch (error) {
            console.error('Error rejecting OAF:', error);
            alert('Failed to reject OAF');
        }
    };

    const openPreview = (report: AuditReport) => {
        setSelectedReport(report);
        setShowPreview(true);
    };

    const filteredReports = reports.filter(report =>
    (report.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.area_process.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredOAFs = oafs.filter(oaf =>
        oaf.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        oaf.auditorName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Helpers to determine badge color and text
    const getReportBadge = (status: string) => {
        switch (status) {
            case 'Pending': return { color: 'bg-yellow-100 text-yellow-700', text: 'Pending Lead Approval' };
            case 'For Auditor Approval': return { color: 'bg-purple-100 text-purple-700', text: 'Pending Finalization' };
            default: return { color: 'bg-gray-100 text-gray-700', text: status };
        }
    };

    const getOAFBadge = (status: string) => {
        switch (status) {
            case 'Pending Approval': return { color: 'bg-yellow-100 text-yellow-700', text: 'Pending Lead Approval' };
            case 'For Auditor Approval': return { color: 'bg-blue-100 text-blue-700', text: 'Pending Issuance' };
            case 'Pending Evaluation': return { color: 'bg-orange-100 text-orange-700', text: 'Pending Evaluation' };
            default: return { color: 'bg-gray-100 text-gray-700', text: status };
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Approvals & Actions</h1>
                    <p className="text-muted text-sm">
                        Review pending approvals and tasks assigned to you.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'reports' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Audit Reports ({reports.length})
                    {activeTab === 'reports' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('oafs')}
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'oafs' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Observation Forms ({oafs.length})
                    {activeTab === 'oafs' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Search */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
                        <input
                            type="text"
                            placeholder="Search pending items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white rounded-2xl py-3 pl-12 pr-4 shadow-soft focus:ring-2 focus:ring-accent/10 outline-none border-none transition-all"
                        />
                    </div>

                    {activeTab === 'reports' ? (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredReports.map((report) => {
                                const badge = getReportBadge(report.status);
                                return (
                                    <div key={report.id} className="bg-white p-4 rounded-xl shadow-soft border border-gray-100 hover:shadow-premium transition-all">
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                                                    <FileText size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg">{report.department} - {report.area_process}</h3>
                                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={14} />
                                                            {report.audit_date?.toDate().toLocaleDateString()}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${badge.color}`}>
                                                            {badge.text}
                                                        </span>
                                                        <span>Auditor: {report.auditor_name}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                                                <button
                                                    onClick={() => openPreview(report)}
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                                                >
                                                    <Eye size={18} />
                                                    Review
                                                </button>
                                                {/* Only show reject for Pending (Lead Auditor) */}
                                                {report.status === 'Pending' && (
                                                    <button
                                                        onClick={() => handleReject(report)}
                                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors"
                                                    >
                                                        <XCircle size={18} />
                                                        Reject
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleApprove(report)}
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg font-medium transition-colors"
                                                >
                                                    <CheckCircle size={18} />
                                                    {report.status === 'Pending' ? 'Approve' : 'Finalize'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredReports.length === 0 && (
                                <div className="py-20 text-center text-muted">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle size={32} className="opacity-20" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                                    <p>No pending reports found.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredOAFs.map((oaf) => {
                                const badge = getOAFBadge(oaf.status);
                                return (
                                    <div key={oaf.id} className="bg-white p-4 rounded-xl shadow-soft border border-gray-100 hover:shadow-premium transition-all">
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                                    <ClipboardList size={24} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-lg">{oaf.department}</h3>
                                                        <span className="text-xs text-gray-500 font-mono">#{oaf.id?.slice(0, 8)}</span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={14} />
                                                            {typeof oaf.auditDate === 'string' ? oaf.auditDate : (oaf.auditDate as any)?.toDate().toLocaleDateString()}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${badge.color}`}>
                                                            {badge.text}
                                                        </span>
                                                        <span>Auditor: {oaf.auditorName}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                                                <button
                                                    onClick={() => navigate(`/observation-form/${oaf.id}`)}
                                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                                                >
                                                    {oaf.status === 'Pending Evaluation' ? <PenTool size={18} /> : <Eye size={18} />}
                                                    {oaf.status === 'Pending Evaluation' ? 'Evaluate' : 'Review'}
                                                </button>

                                                {/* Reject Button for Lead Auditor */}
                                                {oaf.status === 'Pending Approval' && (
                                                    <button
                                                        onClick={() => handleRejectOAF(oaf)}
                                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors"
                                                    >
                                                        <XCircle size={18} />
                                                        Reject
                                                    </button>
                                                )}

                                                {/* Only show Approve button if NOT Pending Evaluation */}
                                                {oaf.status !== 'Pending Evaluation' && (
                                                    <button
                                                        onClick={() => handleApproveOAF(oaf)}
                                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium transition-colors"
                                                    >
                                                        <CheckCircle size={18} />
                                                        {oaf.status === 'Pending Approval' ? 'Approve' : 'Issue'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredOAFs.length === 0 && (
                                <div className="py-20 text-center text-muted">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle size={32} className="opacity-20" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                                    <p>No pending OAFs found.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* PDF Preview Modal */}
            {showPreview && selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold">Review Audit Report</h2>
                                <p className="text-sm text-gray-500">
                                    {selectedReport.department} - {selectedReport.area_process}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <XCircle size={24} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 bg-gray-100 overflow-hidden relative">
                            {selectedReport.pdf_url ? (
                                <iframe
                                    src={selectedReport.pdf_url}
                                    className="w-full h-full border-none"
                                    title="Audit Report PDF"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted">
                                    <FileText size={64} className="mb-4 opacity-20" />
                                    <p>PDF not available for preview.</p>
                                    <button
                                        onClick={() => navigate(`/audit/${selectedReport.id}`)}
                                        className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
                                    >
                                        View Web Version
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t flex items-center justify-end gap-3 bg-white">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            {selectedReport.status === 'Pending' && (
                                <button
                                    onClick={() => handleReject(selectedReport)}
                                    className="px-4 py-2 bg-red-50 text-red-600 font-bold hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <XCircle size={18} />
                                    Reject
                                </button>
                            )}
                            <button
                                onClick={() => handleApprove(selectedReport)}
                                className="px-4 py-2 bg-green-600 text-white font-bold hover:bg-green-700 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                            >
                                <CheckCircle size={18} />
                                {selectedReport.status === 'Pending' ? 'Approve Report' : 'Finalize & Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

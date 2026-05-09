import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApprovedReportsByDepartment, getOAFsByDepartment } from '../lib/auditService';
import type { AuditReport, ObservationForm } from '../lib/types';
import { FileText, Calendar, ChevronRight, Search, Building2, AlertCircle, CheckCircle, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { OTPTable } from '../components/otp/OTPTable';
export const DepartmentPage: React.FC = () => {
    const { departmentName } = useParams<{ departmentName: string }>();
    const [reports, setReports] = useState<AuditReport[]>([]);
    const [pendingOAFs, setPendingOAFs] = useState<ObservationForm[]>([]);
    const [pendingApprovals, setPendingApprovals] = useState<(AuditReport | ObservationForm)[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const navigate = useNavigate();
    const { userData } = useAuth();
    
    const canEditOTP = userData?.role === 'QMSAdmin' || (userData?.role === 'Auditee' && userData?.department === departmentName);

    useEffect(() => {
        if (departmentName) {
            loadReports(departmentName);
        }
    }, [departmentName]);

    const loadReports = async (dept: string) => {
        setLoading(true);
        try {
            const [reportsData, oafsData] = await Promise.all([
                getApprovedReportsByDepartment(dept),
                getOAFsByDepartment(dept)
            ]);

            const auditReportsToApprove = reportsData.filter(r => r.status === 'For Auditee Approval');
            const oafsToApprove = oafsData.filter(o => o.status === 'For Auditee Approval');

            // Pending OAFs (Action Required - Issued)
            setPendingOAFs(oafsData.filter(oaf => oaf.status === 'Issued'));

            // Pending Approvals (Audit Reports & OAFs - For Auditee Approval)
            setPendingApprovals([...auditReportsToApprove, ...oafsToApprove]);

            // Approved/Closed Reports
            setReports(reportsData.filter(r => r.status === 'Approved' || r.status === 'Closed'));
        } catch (error) {
            console.error('Error loading department reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredReports = reports.filter(report =>
        report.area_process.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!departmentName) return <div>Invalid Department</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-premium relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Building2 size={120} />
                </div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">{departmentName} Department</h1>
                    <p className="text-slate-300 max-w-2xl">
                        Access all approved audit reports and compliance documents for the {departmentName} department.
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
                <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white rounded-2xl py-3 pl-12 pr-4 shadow-soft focus:ring-2 focus:ring-accent/10 outline-none border-none transition-all"
                />
            </div>

            {/* Approvals Section */}
            {pendingApprovals.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
                    <div className="flex items-center gap-2 text-indigo-700 mb-4">
                        <CheckCircle size={24} />
                        <h2 className="text-xl font-bold">Needs Your Approval ({pendingApprovals.length})</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingApprovals.map(item => {
                            const isOAF = 'rows' in item;
                            return (
                                <div
                                    key={isOAF ? `oaf-${item.id}` : `report-${item.id}`}
                                    onClick={() => navigate(isOAF ? `/observation-form/${item.id}` : `/audit/${item.id}`)}
                                    className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-indigo-100 flex justify-between items-center"
                                >
                                    <div>
                                        <h3 className="font-bold text-gray-800">
                                            {isOAF ? `OAF #${item.id?.slice(0, 8)}` : `Audit Report - ${item.area_process}`}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {isOAF ? `Auditor: ${item.auditorName}` : `Date: ${item.audit_date?.toDate().toLocaleDateString()}`}
                                        </p>
                                        <p className="text-xs text-indigo-600 font-medium mt-1">Pending Approval</p>
                                    </div>
                                    <ChevronRight className="text-gray-400" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Action Required Section */}
            {pendingOAFs.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
                    <div className="flex items-center gap-2 text-orange-700 mb-4">
                        <AlertCircle size={24} />
                        <h2 className="text-xl font-bold">Action Required ({pendingOAFs.length})</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingOAFs.map(oaf => (
                            <div
                                key={oaf.id}
                                onClick={() => navigate(`/observation-form/${oaf.id}`)}
                                className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-orange-100 flex justify-between items-center"
                            >
                                <div>
                                    <h3 className="font-bold text-gray-800">OAF #{oaf.id?.slice(0, 8)}</h3>
                                    <p className="text-sm text-gray-500">Auditor: {oaf.auditorName}</p>
                                    <p className="text-xs text-orange-600 font-medium mt-1">Pending Response</p>
                                </div>
                                <ChevronRight className="text-gray-400" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* OTP KPI Section */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-soft">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3 text-indigo-900">
                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                            <Target size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Department KPIs (OTP)</h2>
                            <p className="text-sm text-gray-500">Objectives, Targets, and Programs monitoring</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-600">Year:</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-medium"
                        >
                            {[...Array(5)].map((_, i) => {
                                const year = new Date().getFullYear() - 2 + i;
                                return <option key={year} value={year}>{year}</option>;
                            })}
                        </select>
                    </div>
                </div>
                
                <OTPTable 
                    department={departmentName} 
                    year={selectedYear} 
                    canEdit={canEditOTP} 
                />
            </div>

            {/* Approved Reports Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredReports.map((report) => (
                        <div
                            key={report.id}
                            onClick={() => {
                                if (report.pdf_url) {
                                    window.open(report.pdf_url, '_blank');
                                } else {
                                    navigate(`/audit/${report.id}`);
                                }
                            }}
                            className="bg-white p-5 rounded-2xl shadow-soft hover:shadow-premium transition-all cursor-pointer group border border-transparent hover:border-gray-100"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-100 transition-colors">
                                    <FileText size={24} />
                                </div>
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg">
                                    {report.status}
                                </span>
                            </div>

                            <h3 className="font-bold text-lg mb-2 text-gray-900 line-clamp-2">
                                {report.area_process}
                            </h3>

                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                <Calendar size={14} />
                                <span>{report.audit_date?.toDate().toLocaleDateString()}</span>
                            </div>

                            <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-50">
                                <span className="text-gray-500">Auditor: {report.auditor_name?.split(' ')[0]}</span>
                                <div className="flex items-center text-accent font-medium group-hover:translate-x-1 transition-transform">
                                    View Report <ChevronRight size={16} />
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredReports.length === 0 && (
                        <div className="col-span-full py-20 text-center text-muted">
                            <FileText size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No approved reports found for {departmentName} matching "{searchTerm}"</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

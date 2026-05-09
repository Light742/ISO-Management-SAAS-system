import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Activity, AlertCircle, CheckCircle, ChevronRight, BarChart3, AlertTriangle } from 'lucide-react';
import { getOTPComplianceSummary, type DepartmentCompliance } from '../lib/otpService';
import { getDepartments } from '../lib/settingsService';

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const OTPMonitoringPage: React.FC = () => {
    const navigate = useNavigate();
    const [year, setYear] = useState(new Date().getFullYear());
    const [complianceData, setComplianceData] = useState<DepartmentCompliance[]>([]);
    const [loading, setLoading] = useState(true);
    const [allDepartmentsCount, setAllDepartmentsCount] = useState(0);

    const loadData = async () => {
        setLoading(true);
        try {
            const [data, depts] = await Promise.all([
                getOTPComplianceSummary(year),
                getDepartments()
            ]);
            setComplianceData(data);
            setAllDepartmentsCount(depts.length);
        } catch (error) {
            console.error('Failed to load OTP compliance data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [year]);

    const totalKPIs = complianceData.reduce((sum, d) => sum + d.totalKPIs, 0);
    const onTrackCount = complianceData.filter(d => d.status === 'On Track').length;
    const overdueCount = complianceData.filter(d => d.status === 'Overdue').length;
    
    // Departments with no KPIs yet
    const departmentsWithKPIs = complianceData.length;
    const departmentsWithoutKPIs = allDepartmentsCount - departmentsWithKPIs;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-3xl p-8 text-white shadow-premium relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Activity size={120} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">OTP Monitoring Dashboard</h1>
                        <p className="text-slate-300 max-w-2xl">
                            Global overview of departmental Objectives, Targets, and Programs compliance.
                        </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 border border-white/20">
                        <select
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="bg-transparent border-none text-white text-lg font-bold focus:ring-0 cursor-pointer outline-none w-32"
                        >
                            {[...Array(5)].map((_, i) => {
                                const y = new Date().getFullYear() - 2 + i;
                                return <option key={y} value={y} className="text-slate-900">{y}</option>;
                            })}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100 flex items-center gap-4 hover:shadow-premium transition-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                        <Target size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Active KPIs</p>
                        <h3 className="text-3xl font-black text-slate-800">{loading ? '-' : totalKPIs}</h3>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100 flex items-center gap-4 hover:shadow-premium transition-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                        <CheckCircle size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">On Track</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-black text-slate-800">{loading ? '-' : onTrackCount}</h3>
                            <span className="text-sm text-gray-500 font-medium">Depts</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100 flex items-center gap-4 hover:shadow-premium transition-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                        <AlertCircle size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Overdue</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-black text-slate-800">{loading ? '-' : overdueCount}</h3>
                            <span className="text-sm text-gray-500 font-medium">Depts</span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100 flex items-center gap-4 hover:shadow-premium transition-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                        <AlertTriangle size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Missing KPIs</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-black text-slate-800">{loading ? '-' : Math.max(0, departmentsWithoutKPIs)}</h3>
                            <span className="text-sm text-gray-500 font-medium">Depts</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Department List */}
            <div className="bg-white rounded-3xl shadow-soft border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-xl text-slate-600">
                            <BarChart3 size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Department Compliance Details</h2>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">Department</th>
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center">Total KPIs</th>
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 text-center">Last Updated</th>
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">Status</th>
                                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                        <p className="mt-4 text-slate-500 font-medium">Loading compliance data...</p>
                                    </td>
                                </tr>
                            ) : complianceData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                                        No OTP KPIs found for the year {year}.
                                    </td>
                                </tr>
                            ) : (
                                complianceData.map((dept, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => navigate(`/department/${encodeURIComponent(dept.department)}/otp`)}>
                                        <td className="px-6 py-4 font-bold text-slate-800">
                                            {dept.department}
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-slate-600">
                                            {dept.totalKPIs}
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-slate-600">
                                            {dept.lastUpdatedMonth > 0 ? monthNames[dept.lastUpdatedMonth - 1] : <span className="text-gray-400 italic">No updates</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                                dept.status === 'On Track' ? 'bg-green-100 text-green-700' :
                                                dept.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {dept.status === 'On Track' && <span className="w-1.5 h-1.5 rounded-full bg-green-600 mr-2"></span>}
                                                {dept.status === 'Overdue' && <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-2 animate-pulse"></span>}
                                                {dept.status === 'Pending Evaluation' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 mr-2"></span>}
                                                {dept.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 group-hover:text-indigo-800 transition-colors"
                                            >
                                                View OTP
                                                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

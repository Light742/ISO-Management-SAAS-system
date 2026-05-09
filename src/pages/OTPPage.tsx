import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { OTPTable } from '../components/otp/OTPTable';
import { OTPMonthlyReport } from '../components/otp/OTPMonthlyReport';
import { FileText, CalendarRange } from 'lucide-react';

type ViewMode = 'annual' | 'monthly';

export const OTPPage: React.FC = () => {
    const { departmentName } = useParams<{ departmentName: string }>();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState<ViewMode>('annual');
    const { userData } = useAuth();
    
    // Fallback if not parameterized (e.g. from general nav link)
    const effectiveDepartment = departmentName || userData?.department || 'General';
    const canEditOTP = userData?.role === 'QMSAdmin' || (userData?.role === 'Auditee' && userData?.department === effectiveDepartment);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-premium relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Target size={120} />
                </div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Objectives, Targets, and Programs</h1>
                    <p className="text-slate-300 max-w-2xl">
                        Monitor and manage OTP KPIs for the {effectiveDepartment} department.
                    </p>
                </div>
            </div>

            {/* OTP KPI Section */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-soft">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 print:hidden">
                    <div className="flex items-center gap-3 text-indigo-900">
                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                            <Target size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Department KPIs (OTP)</h2>
                            <p className="text-sm text-gray-500">Track progress against targets</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setViewMode('annual')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    viewMode === 'annual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <CalendarRange size={16} />
                                Annual View
                            </button>
                            <button
                                onClick={() => setViewMode('monthly')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    viewMode === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <FileText size={16} />
                                Monthly Report
                            </button>
                        </div>

                        <div className="w-px h-8 bg-gray-200 hidden md:block"></div>

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
                </div>
                
                {viewMode === 'annual' ? (
                    <OTPTable 
                        department={effectiveDepartment} 
                        year={selectedYear} 
                        canEdit={canEditOTP} 
                    />
                ) : (
                    <OTPMonthlyReport
                        department={effectiveDepartment}
                        year={selectedYear}
                    />
                )}
            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import { getOTPKPIsByDepartment } from '../../lib/otpService';
import type { OTPKPI } from '../../lib/types';

interface OTPMonthlyReportProps {
    department: string;
    year: number;
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const OTPMonthlyReport: React.FC<OTPMonthlyReportProps> = ({ department, year }) => {
    const [kpis, setKpis] = useState<OTPKPI[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getOTPKPIsByDepartment(department, year);
            setKpis(data);
        } catch (error) {
            console.error("Failed to load OTP KPIs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [department, year]);

    const handlePrint = () => {
        window.print();
    };

    const deptTitle = department.replace(/Department/gi, '').trim();

    if (loading) {
        return <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Select Month:</label>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-accent focus:border-accent block p-2 font-medium min-w-[150px]"
                    >
                        {monthNames.map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-colors text-sm font-medium shadow-sm"
                >
                    <Printer size={16} />
                    Print Report
                </button>
            </div>

            {/* Printable Area Container */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0">
                <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
                    <h2 className="text-2xl font-bold uppercase tracking-wider text-slate-800 mb-1">{department}</h2>
                    <h3 className="text-xl font-semibold text-slate-600">Objectives, Targets, and Programs (OTP) Report</h3>
                    <p className="text-lg text-slate-500 mt-2 font-medium">For the Month of {monthNames[selectedMonth - 1]} {year}</p>
                </div>

                <table className="w-full text-sm text-left border-collapse mb-16">
                    <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-xs">
                        <tr>
                            <th className="border border-slate-300 p-3 w-[20%]">Objectives</th>
                            <th className="border border-slate-300 p-3 w-[20%]">Annual Target</th>
                            <th className="border border-slate-300 p-3 w-[15%]">Programs / Actions</th>
                            <th className="border border-slate-300 p-3 w-[10%] text-center">Monthly Target</th>
                            <th className="border border-slate-300 p-3 w-[10%] text-center">Actual Result</th>
                            <th className="border border-slate-300 p-3 w-[10%] text-center">Evaluation</th>
                            <th className="border border-slate-300 p-3 w-[15%]">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {kpis.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="border border-slate-300 p-6 text-center text-gray-500 italic">
                                    No records found for this year.
                                </td>
                            </tr>
                        ) : (
                            kpis.map((kpi, idx) => {
                                const monthlyData = kpi.monthlyUpdates?.find(m => m.month === selectedMonth);
                                return (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="border border-slate-300 p-3 font-medium align-top">{kpi.objective}</td>
                                        <td className="border border-slate-300 p-3 align-top">{kpi.target}</td>
                                        <td className="border border-slate-300 p-3 align-top text-xs">{kpi.programsActions}</td>
                                        <td className="border border-slate-300 p-3 align-top text-center font-medium bg-slate-50">{monthlyData?.target || '-'}</td>
                                        <td className="border border-slate-300 p-3 align-top text-center font-bold">{monthlyData?.actual || '-'}</td>
                                        <td className="border border-slate-300 p-3 align-top text-center font-bold">
                                            {monthlyData?.evaluation === 'PASSED' && <span className="text-green-600">PASSED</span>}
                                            {monthlyData?.evaluation === 'FAILED' && <span className="text-red-600">FAILED</span>}
                                            {(!monthlyData?.evaluation || monthlyData?.evaluation === 'PENDING') && <span className="text-gray-400">PENDING</span>}
                                            {monthlyData?.evaluation === 'N/A' && <span className="text-gray-500">N/A</span>}
                                        </td>
                                        <td className="border border-slate-300 p-3 align-top text-xs">{monthlyData?.remarks || '-'}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-8 mt-20 pt-8 border-t border-slate-200 break-inside-avoid">
                    <div className="text-center">
                        <div className="border-b border-black w-full h-12 mb-2"></div>
                        <p className="font-bold text-sm text-slate-800 uppercase">{deptTitle} Supervisor</p>
                        <p className="text-xs text-slate-500">Reviewed By</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-black w-full h-12 mb-2"></div>
                        <p className="font-bold text-sm text-slate-800 uppercase">{deptTitle} Superintendent</p>
                        <p className="text-xs text-slate-500">Reviewed By</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-black w-full h-12 mb-2"></div>
                        <p className="font-bold text-sm text-slate-800 uppercase">{deptTitle} Manager</p>
                        <p className="text-xs text-slate-500">Approved By</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

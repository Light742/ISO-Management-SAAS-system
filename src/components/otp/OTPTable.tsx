import React, { useState, useEffect } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import { getOTPKPIsByDepartment } from '../../lib/otpService';
import type { OTPKPI } from '../../lib/types';
import { OTPCreationModal } from './OTPCreationModal';
import { OTPMonthlyUpdateModal } from './OTPMonthlyUpdateModal';

interface OTPTableProps {
    department: string;
    year: number;
    canEdit: boolean;
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const OTPTable: React.FC<OTPTableProps> = ({ department, year, canEdit }) => {
    const [kpis, setKpis] = useState<OTPKPI[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [updateModalData, setUpdateModalData] = useState<{ kpi: OTPKPI, monthIndex: number } | null>(null);

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

    if (loading) {
        return <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Objectives, Targets, and Programs ({year})</h3>
                {canEdit && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-xl transition-colors text-sm font-medium shadow-sm"
                    >
                        <Plus size={16} />
                        Add KPI
                    </button>
                )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap min-w-max">
                        <thead className="text-xs text-white uppercase bg-slate-800">
                            <tr>
                                <th scope="col" className="px-4 py-3 sticky left-0 bg-slate-800 z-10 border-r border-slate-700">Objectives</th>
                                <th scope="col" className="px-4 py-3 border-r border-slate-700">Targets</th>
                                <th scope="col" className="px-4 py-3 border-r border-slate-700">Programs/Actions</th>
                                <th scope="col" className="px-4 py-3 border-r border-slate-700">Responsible Person</th>
                                <th scope="col" className="px-4 py-3 border-r border-slate-700">Resources Needed</th>
                                <th scope="col" className="px-4 py-3 border-r border-slate-700">Timeline</th>
                                {monthNames.map((m) => (
                                    <th key={m} scope="col" className="px-4 py-3 text-center border-r border-slate-700" colSpan={4}>
                                        {m}-{year.toString().slice(-2)}
                                    </th>
                                ))}
                            </tr>
                            <tr className="bg-slate-700">
                                <th colSpan={6} className="sticky left-0 bg-slate-700 z-10 border-r border-slate-600"></th>
                                {monthNames.map((m) => (
                                    <React.Fragment key={`${m}-sub`}>
                                        <th className="px-2 py-2 text-center text-[10px] border-r border-slate-600 font-medium">Target</th>
                                        <th className="px-2 py-2 text-center text-[10px] border-r border-slate-600 font-medium">Actual</th>
                                        <th className="px-2 py-2 text-center text-[10px] border-r border-slate-600 font-medium">Eval</th>
                                        <th className="px-2 py-2 text-center text-[10px] border-r border-slate-600 font-medium">Remarks</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {kpis.length === 0 ? (
                                <tr>
                                    <td colSpan={6 + (12 * 4)} className="px-6 py-8 text-center text-gray-500 bg-gray-50">
                                        No KPIs found for {year}.
                                    </td>
                                </tr>
                            ) : kpis.map((kpi, idx) => (
                                <tr key={kpi.id || idx} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white z-10 border-r group-hover:bg-gray-50 max-w-[200px] whitespace-normal">
                                        {kpi.objective}
                                    </td>
                                    <td className="px-4 py-3 border-r max-w-[200px] whitespace-normal">{kpi.target}</td>
                                    <td className="px-4 py-3 border-r max-w-[250px] whitespace-normal text-xs">{kpi.programsActions}</td>
                                    <td className="px-4 py-3 border-r">{kpi.responsiblePerson}</td>
                                    <td className="px-4 py-3 border-r max-w-[150px] whitespace-normal text-xs">{kpi.resourcesNeeded}</td>
                                    <td className="px-4 py-3 border-r">{kpi.timeline}</td>
                                    
                                    {/* Month cells */}
                                    {Array.from({ length: 12 }).map((_, mIdx) => {
                                        const monthNum = mIdx + 1;
                                        const update = kpi.monthlyUpdates?.find(m => m.month === monthNum);
                                        const isPassed = update?.evaluation === 'PASSED';
                                        const isFailed = update?.evaluation === 'FAILED';

                                        return (
                                            <React.Fragment key={`month-${monthNum}`}>
                                                <td className="px-2 py-2 text-center border-r border-gray-100 text-xs">
                                                    {update?.target || '-'}
                                                </td>
                                                <td className="px-2 py-2 text-center border-r border-gray-100 font-medium text-xs">
                                                    {update?.actual || '-'}
                                                </td>
                                                <td className={`px-2 py-2 text-center border-r border-gray-100 text-xs font-bold
                                                    ${isPassed ? 'text-green-600 bg-green-50' : 
                                                      isFailed ? 'text-red-600 bg-red-50' : 'text-gray-400'}
                                                `}>
                                                    {update?.evaluation || '-'}
                                                </td>
                                                <td className="px-2 py-2 text-center border-r border-gray-200 relative group cursor-pointer hover:bg-indigo-50 transition-colors"
                                                    onClick={() => canEdit && setUpdateModalData({ kpi, monthIndex: monthNum })}
                                                >
                                                    <span className="text-xs text-gray-500 truncate max-w-[80px] inline-block">{update?.remarks || '-'}</span>
                                                    {canEdit && (
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-indigo-100/80 transition-opacity">
                                                            <Edit2 size={14} className="text-indigo-600" />
                                                        </div>
                                                    )}
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isCreateModalOpen && (
                <OTPCreationModal 
                    department={department}
                    year={year}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreated={loadData}
                />
            )}

            {updateModalData && (
                <OTPMonthlyUpdateModal
                    kpi={updateModalData.kpi}
                    monthIndex={updateModalData.monthIndex}
                    existingData={updateModalData.kpi.monthlyUpdates?.find(m => m.month === updateModalData.monthIndex)}
                    onClose={() => setUpdateModalData(null)}
                    onUpdated={loadData}
                />
            )}
        </div>
    );
};

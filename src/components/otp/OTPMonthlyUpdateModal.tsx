import React, { useState } from 'react';
import { X } from 'lucide-react';
import { updateOTPKPIMonthlyData } from '../../lib/otpService';
import type { OTPKPI, OTPMonthlyUpdate } from '../../lib/types';

interface OTPMonthlyUpdateModalProps {
    kpi: OTPKPI;
    monthIndex: number;
    existingData?: OTPMonthlyUpdate;
    onClose: () => void;
    onUpdated: () => void;
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const OTPMonthlyUpdateModal: React.FC<OTPMonthlyUpdateModalProps> = ({ kpi, monthIndex, existingData, onClose, onUpdated }) => {
    const [target, setTarget] = useState(existingData?.target || kpi.target);
    const [actual, setActual] = useState(existingData?.actual || '');
    const [evaluation, setEvaluation] = useState<'PASSED' | 'FAILED' | 'PENDING' | 'N/A'>(existingData?.evaluation || 'PENDING');
    const [remarks, setRemarks] = useState(existingData?.remarks || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!kpi.id) return;
        
        setLoading(true);
        setError(null);
        try {
            await updateOTPKPIMonthlyData(kpi.id, monthIndex, {
                target,
                actual,
                evaluation,
                remarks
            });
            onUpdated();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update monthly data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Update {monthNames[monthIndex - 1]} {kpi.year}</h2>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{kpi.objective}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target for Month</label>
                        <input
                            type="text"
                            required
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Actual Result</label>
                        <input
                            type="text"
                            required
                            value={actual}
                            onChange={(e) => setActual(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                            placeholder="e.g., 95% or 140/146"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Evaluation</label>
                        <select
                            value={evaluation}
                            onChange={(e) => setEvaluation(e.target.value as any)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                        >
                            <option value="PENDING">PENDING</option>
                            <option value="PASSED">PASSED</option>
                            <option value="FAILED">FAILED</option>
                            <option value="N/A">N/A</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                            placeholder="Optional notes..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-xl transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Update'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

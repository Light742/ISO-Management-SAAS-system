import React, { useState } from 'react';
import { X } from 'lucide-react';
import { createOTPKPI, updateOTPKPI } from '../../lib/otpService';
import type { OTPKPI } from '../../lib/types';

interface OTPCreationModalProps {
    department: string;
    year: number;
    onClose: () => void;
    onCreated: () => void;
    existingKpi?: OTPKPI;
}

export const OTPCreationModal: React.FC<OTPCreationModalProps> = ({ department, year, onClose, onCreated, existingKpi }) => {
    const [objective, setObjective] = useState(existingKpi?.objective || '');
    const [target, setTarget] = useState(existingKpi?.target || '');
    const [programsActions, setProgramsActions] = useState(existingKpi?.programsActions || '');
    const [responsiblePerson, setResponsiblePerson] = useState(existingKpi?.responsiblePerson || '');
    const [resourcesNeeded, setResourcesNeeded] = useState(existingKpi?.resourcesNeeded || '');
    const [timeline, setTimeline] = useState(existingKpi?.timeline || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (existingKpi?.id) {
                await updateOTPKPI(existingKpi.id, {
                    objective,
                    target,
                    programsActions,
                    responsiblePerson,
                    resourcesNeeded,
                    timeline
                });
            } else {
                await createOTPKPI({
                    department,
                    year,
                    objective,
                    target,
                    programsActions,
                    responsiblePerson,
                    resourcesNeeded,
                    timeline,
                    monthlyUpdates: []
                });
            }
            onCreated();
            onClose();
        } catch (err: any) {
            setError(err.message || `Failed to ${existingKpi ? 'update' : 'create'} OTP KPI`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900">{existingKpi ? 'Edit' : 'Add New'} Objective ({year})</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Objective</label>
                            <input
                                type="text"
                                required
                                value={objective}
                                onChange={(e) => setObjective(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                                placeholder="e.g., Plant Outage Efficiency"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                            <input
                                type="text"
                                required
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                                placeholder="e.g., At least 90% availability..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Programs / Actions</label>
                            <textarea
                                required
                                value={programsActions}
                                onChange={(e) => setProgramsActions(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                                placeholder="Describe the actions..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Responsible Person</label>
                                <input
                                    type="text"
                                    required
                                    value={responsiblePerson}
                                    onChange={(e) => setResponsiblePerson(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                                    placeholder="e.g., TSD Outage Planners"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                                <input
                                    type="text"
                                    required
                                    value={timeline}
                                    onChange={(e) => setTimeline(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                                    placeholder="e.g., Quarterly Assessment"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Resources Needed</label>
                            <input
                                type="text"
                                required
                                value={resourcesNeeded}
                                onChange={(e) => setResourcesNeeded(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                                placeholder="e.g., Maximo availability, Skilled Planners..."
                            />
                        </div>
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
                            {loading ? 'Saving...' : (existingKpi ? 'Save Changes' : 'Save Objective')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

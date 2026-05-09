import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getOAFsByDepartment, deleteObservationForm } from '../lib/auditService';
import type { ObservationForm } from '../lib/types';
import { Search, FolderOpen, ArrowRight, Trash2 } from 'lucide-react';

export const OAFDirectoryPage: React.FC = () => {
    const { userData } = useAuth();
    const [forms, setForms] = useState<ObservationForm[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (userData?.department) {
            loadForms(userData.department);
        }
    }, [userData?.department]);

    const loadForms = async (dept: string) => {
        setLoading(true);
        try {
            const data = await getOAFsByDepartment(dept);
            setForms(data);
        } catch (error) {
            console.error('Error loading OAFs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, formId: string) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this OAF? This action cannot be undone.')) return;

        try {
            await deleteObservationForm(formId);
            setForms(prev => prev.filter(f => f.id !== formId));
            alert('OAF deleted successfully');
        } catch (error) {
            console.error('Error deleting OAF:', error);
            alert('Failed to delete OAF');
        }
    };

    const filteredForms = forms.filter(form =>
        form.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.auditorName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!userData?.department) return <div>Invalid Department Config</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 to-slate-800 rounded-3xl p-8 text-white shadow-premium relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <FolderOpen size={120} />
                </div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">OAF Directory</h1>
                    <p className="text-slate-300 max-w-2xl">
                        Access and manage Observation Action Forms for {userData.department}.
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
                <input
                    type="text"
                    placeholder="Search by ID or Auditor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white rounded-2xl py-3 pl-12 pr-4 shadow-soft focus:ring-2 focus:ring-accent/10 outline-none border-none transition-all"
                />
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredForms.map((form) => (
                        <div
                            key={form.id}
                            onClick={() => navigate(`/observation-form/${form.id}`)}
                            className="bg-white p-5 rounded-2xl shadow-soft hover:shadow-premium transition-all cursor-pointer group border border-transparent hover:border-gray-100 relative overflow-hidden"
                        >
                            {/* Status Stripe */}
                            <div className={`absolute top-0 left-0 w-1 h-full ${form.status === 'Issued' ? 'bg-blue-500' :
                                form.status === 'Pending Evaluation' ? 'bg-yellow-500' :
                                    form.status === 'Closed' ? 'bg-green-500' : 'bg-gray-300'
                                }`} />

                            <div className="flex items-start justify-between mb-4 pl-3">
                                <div className={`p-2 rounded-xl text-xs font-bold ${form.status === 'Issued' ? 'bg-blue-50 text-blue-700' :
                                    form.status === 'Pending Evaluation' ? 'bg-yellow-50 text-yellow-700' :
                                        form.status === 'Closed' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {form.status}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => handleDelete(e, form.id!)}
                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <span className="text-xs text-gray-400 font-mono">#{form.id?.slice(0, 8)}</span>
                                </div>
                            </div>

                            <h3 className="font-bold text-lg mb-1 pl-3 text-gray-900 line-clamp-1">
                                Audit Date: {typeof form.auditDate === 'string' ? form.auditDate : (form.auditDate as any)?.toDate().toLocaleDateString()}
                            </h3>
                            <p className="text-sm text-gray-500 pl-3 mb-4">Auditor: {form.auditorName}</p>

                            <div className="pl-3 flex items-center justify-between text-sm pt-4 border-t border-gray-50">
                                <span className="text-gray-400 text-xs">Updated: {form.updated_at?.toDate().toLocaleDateString()}</span>
                                <div className="flex items-center text-accent font-medium group-hover:translate-x-1 transition-transform">
                                    View <ArrowRight size={16} className="ml-1" />
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredForms.length === 0 && (
                        <div className="col-span-full py-20 text-center text-muted">
                            <FolderOpen size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No Observation Forms found for {userData.department}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

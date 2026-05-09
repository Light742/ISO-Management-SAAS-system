import React, { useState, useEffect } from 'react';
import {
    getDepartments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    seedInitialDepartments,
    getCompanySettings,
    updateCompanySettings,
    uploadCompanyLogo
} from '../lib/settingsService';
import type { Department } from '../lib/types';
import {
    Plus,
    Trash2,
    Edit2,
    X,
    Building2,
    Database,
    Loader2,
    Check,
    Upload,
    Image as ImageIcon
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [newDeptName, setNewDeptName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);

    useEffect(() => {
        loadDepartments();
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const settings = await getCompanySettings();
            if (settings) {
                setLogoUrl(settings.logoUrl || null);
                setCompanyName(settings.companyName || '');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const loadDepartments = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            console.log('Loading departments...');
            let data = await getDepartments();
            console.log('Fetched departments:', data);
            if (data.length === 0) {
                console.log('No departments found, seeding...');
                await seedInitialDepartments();
                data = await getDepartments();
                console.log('After seeding:', data);
            }
            setDepartments(data);
        } catch (error: any) {
            console.error('Error loading departments:', error);
            setErrorMsg(error?.message || 'Failed to load departments. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDeptName.trim()) return;

        setActionLoading(true);
        try {
            await addDepartment(newDeptName.trim());
            setNewDeptName('');
            await loadDepartments();
        } catch (error) {
            console.error('Error adding department:', error);
            alert('Failed to add department');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editingName.trim()) return;

        setActionLoading(true);
        try {
            await updateDepartment(id, editingName.trim());
            setEditingId(null);
            await loadDepartments();
        } catch (error) {
            console.error('Error updating department:', error);
            alert('Failed to update department');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this department?')) return;

        setActionLoading(true);
        try {
            await deleteDepartment(id);
            await loadDepartments();
        } catch (error) {
            console.error('Error deleting department:', error);
            alert('Failed to delete department');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSeed = async () => {
        setActionLoading(true);
        try {
            await seedInitialDepartments();
            await loadDepartments();
        } catch (error) {
            console.error('Error seeding departments:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingLogo(true);
        try {
            const url = await uploadCompanyLogo(file);
            await updateCompanySettings({ logoUrl: url });
            setLogoUrl(url);
            alert('Logo updated successfully');
        } catch (error: any) {
            console.error('Error uploading logo:', error);
            alert(`Failed to upload logo: ${error.message || 'Unknown error'}`);
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleUpdateCompanyName = async () => {
        setActionLoading(true);
        try {
            await updateCompanySettings({ companyName });
            alert('Company name updated');
        } catch (error) {
            console.error('Error updating company name:', error);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold tracking-tight mb-2">System Settings</h1>
                <p className="text-muted text-lg">Manage organizational structure and application data.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Department Management */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card-modern">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                                    <Building2 size={24} />
                                </div>
                                <h2 className="text-xl font-bold">Plant Departments</h2>
                            </div>
                            <button
                                onClick={handleSeed}
                                disabled={actionLoading || departments.length > 0}
                                className="text-xs font-bold text-accent bg-accent/5 hover:bg-accent/10 px-4 py-2 rounded-lg transition-all disabled:opacity-30 flex items-center gap-2"
                            >
                                <Database size={14} />
                                <span>Seed Initial Data</span>
                            </button>
                        </div>

                        {/* Add New Form */}
                        <form onSubmit={handleAdd} className="flex gap-3 mb-8">
                            <input
                                type="text"
                                value={newDeptName}
                                onChange={(e) => setNewDeptName(e.target.value)}
                                placeholder="Enter new department name..."
                                className="input-modern flex-1"
                                disabled={actionLoading}
                            />
                            <button
                                type="submit"
                                disabled={actionLoading || !newDeptName.trim()}
                                className="btn-primary flex items-center gap-2 px-8"
                            >
                                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                <span>Add</span>
                            </button>
                        </form>

                        {/* List - Scrollable Container */}
                        <div className="max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="space-y-3">
                                {errorMsg && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
                                        <strong>Error:</strong> {errorMsg}
                                    </div>
                                )}
                                {loading ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 size={32} className="animate-spin text-accent opacity-20" />
                                    </div>
                                ) : departments.length === 0 && !errorMsg ? (
                                    <div className="text-center py-12 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                                        <p className="text-muted">No departments found. Use the seed button or add one manually.</p>
                                    </div>
                                ) : (
                                    departments.map((dept) => (
                                        <div
                                            key={dept.id}
                                            className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-premium transition-all duration-300"
                                        >
                                            <div className="flex-1">
                                                {editingId === dept.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-accent/20 outline-none"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <p className="font-bold text-primary px-4">{dept.name}</p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 pr-2">
                                                {editingId === dept.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleUpdate(dept.id)}
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(dept.id);
                                                                setEditingName(dept.name);
                                                            }}
                                                            className="p-2 text-muted hover:text-accent hover:bg-accent/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(dept.id)}
                                                            className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Sidebar & Brand Management */}
                <div className="space-y-6">
                    {/* Brand Setting Card */}
                    <div className="card-modern">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                                <ImageIcon size={22} />
                            </div>
                            <h2 className="text-xl font-bold">Brand Assets</h2>
                        </div>

                        <div className="space-y-6">
                            {/* Logo Upload */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted uppercase tracking-wider">Company Logo</label>
                                <div className="relative group">
                                    <div className="aspect-square w-full rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-accent/40">
                                        {logoUrl ? (
                                            <img src={logoUrl} alt="Company Logo" className="w-full h-full object-contain p-4" />
                                        ) : (
                                            <>
                                                <Upload size={32} className="text-gray-300 mb-2" />
                                                <p className="text-xs text-muted font-medium text-center px-4">Click below to upload company logo</p>
                                            </>
                                        )}
                                        {uploadingLogo && (
                                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                                <Loader2 size={24} className="animate-spin text-accent" />
                                            </div>
                                        )}
                                    </div>
                                    <label className="mt-3 block">
                                        <span className="btn-primary w-full flex items-center justify-center gap-2 cursor-pointer text-sm py-2.5">
                                            <Upload size={16} />
                                            {logoUrl ? 'Change Logo' : 'Upload Logo'}
                                        </span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                    </label>
                                </div>
                            </div>

                            {/* Company Name */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted uppercase tracking-wider">Report Header Name</label>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="Enter company name..."
                                        className="input-modern w-full"
                                    />
                                    <button
                                        onClick={handleUpdateCompanyName}
                                        disabled={actionLoading}
                                        className="text-xs font-bold text-accent bg-accent/5 hover:bg-accent/10 px-4 py-2 rounded-lg transition-all w-full"
                                    >
                                        Save Brand Name
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card-modern bg-accent/5 border-accent/10">
                        <h3 className="text-lg font-bold text-accent mb-4">Organizational Context</h3>
                        <p className="text-sm text-primary/70 leading-relaxed">
                            These areas represent the core departments within the plant. They are used to categorize audit reports and assign responsibilities across the IMS system.
                        </p>
                        <div className="mt-6 p-4 bg-white/50 rounded-2xl text-xs font-semibold text-muted">
                            <p>Total Departments: {departments.length}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

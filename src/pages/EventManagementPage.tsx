import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    getAllEvents,
    createEvent,
    activateEvent,
    archiveEvent,
    deleteEvent,
    createLegacyEvent,
    migrateDocumentsToEvent
} from '../lib/auditEventService';
import type { AuditEvent } from '../lib/types';
import {
    Calendar,
    Plus,
    Play,
    Archive,
    Trash2,
    Clock,
    CheckCircle,
    AlertTriangle,
    ChevronRight,
    X,
    RefreshCw,
    Database
} from 'lucide-react';

export const EventManagementPage: React.FC = () => {
    const { userData } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showMigrationModal, setShowMigrationModal] = useState(false);

    // Form state
    const [newEventName, setNewEventName] = useState('');
    const [newEventDescription, setNewEventDescription] = useState('');

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const allEvents = await getAllEvents();
            setEvents(allEvents);
        } catch (err) {
            console.error('Error loading events:', err);
            setError(`Failed to load events: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async () => {
        if (!newEventName.trim()) {
            setError('Event name is required');
            return;
        }

        setActionLoading(true);
        setError(null);
        try {
            await createEvent({
                name: newEventName.trim(),
                description: newEventDescription.trim(),
                createdBy: userData?.uid || '',
                status: 'Draft'
            });
            setSuccess('Event created successfully!');
            setNewEventName('');
            setNewEventDescription('');
            setShowCreateModal(false);
            await loadEvents();
        } catch (err) {
            console.error('Error creating event:', err);
            setError(`Failed to create event: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleActivateEvent = async (event: AuditEvent) => {
        setActionLoading(true);
        setError(null);
        try {
            const result = await activateEvent(event.id!);
            if (result.success) {
                setSuccess(`Event "${event.name}" is now active!`);
                await loadEvents();
            } else {
                setError(result.error || 'Failed to activate event');
            }
        } catch (err) {
            console.error('Error activating event:', err);
            setError('Failed to activate event');
        } finally {
            setActionLoading(false);
        }
    };

    const handleArchiveEvent = async () => {
        if (!selectedEvent) return;

        setActionLoading(true);
        setError(null);
        try {
            const result = await archiveEvent(selectedEvent.id!, userData?.uid || '');
            if (result.success) {
                let message = `Event "${selectedEvent.name}" has been archived.`;
                if (result.openDocuments && (result.openDocuments.oafs > 0 || result.openDocuments.sirs > 0)) {
                    message += ` Note: ${result.openDocuments.oafs} OAF(s) and ${result.openDocuments.sirs} SIR(s) remain open for corrective actions.`;
                }
                setSuccess(message);
                setShowArchiveModal(false);
                setSelectedEvent(null);
                await loadEvents();
            } else {
                setError(result.error || 'Failed to archive event');
            }
        } catch (err) {
            console.error('Error archiving event:', err);
            setError('Failed to archive event');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteEvent = async (event: AuditEvent) => {
        if (!confirm(`Are you sure you want to delete "${event.name}"? This cannot be undone.`)) {
            return;
        }

        setActionLoading(true);
        setError(null);
        try {
            const result = await deleteEvent(event.id!);
            if (result.success) {
                setSuccess('Event deleted successfully');
                await loadEvents();
            } else {
                setError(result.error || 'Failed to delete event');
            }
        } catch (err) {
            console.error('Error deleting event:', err);
            setError('Failed to delete event');
        } finally {
            setActionLoading(false);
        }
    };

    const handleMigrateLegacy = async () => {
        setActionLoading(true);
        setError(null);
        try {
            const legacyEventId = await createLegacyEvent(userData?.uid || '');
            const result = await migrateDocumentsToEvent(legacyEventId, 'Legacy - Pre-Event System');
            setSuccess(`Migration complete! ${result.reports} reports, ${result.oafs} OAFs, and ${result.sirs} SIRs migrated.`);
            await loadEvents();
        } catch (err) {
            console.error('Error migrating documents:', err);
            setError('Failed to migrate documents');
        } finally {
            setActionLoading(false);
            setShowMigrationModal(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Active':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        <CheckCircle size={14} /> Active
                    </span>
                );
            case 'Archived':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                        <Archive size={14} /> Archived
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                        <Clock size={14} /> Draft
                    </span>
                );
        }
    };

    const activeEvent = events.find(e => e.status === 'Active');
    const draftEvents = events.filter(e => e.status === 'Draft');
    const archivedEvents = events.filter(e => e.status === 'Archived');

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-purple-800 rounded-3xl p-8 text-white shadow-premium relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Calendar size={120} />
                </div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Audit Event Management</h1>
                    <p className="text-indigo-200 max-w-2xl">
                        Create, manage, and archive audit events. Each event contains all related audit reports, OAFs, and SIRs.
                    </p>
                </div>
            </div>

            {/* Notifications */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertTriangle size={20} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto"><X size={18} /></button>
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
                    <CheckCircle size={20} />
                    {success}
                    <button onClick={() => setSuccess(null)} className="ml-auto"><X size={18} /></button>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 flex-wrap">
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
                >
                    <Plus size={20} /> Create New Event
                </button>
                {!events.some(e => e.name === 'Legacy - Pre-Event System') && (
                    <button
                        onClick={() => setShowMigrationModal(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold transition-colors"
                    >
                        <Database size={20} /> Migrate Existing Documents
                    </button>
                )}
                <button
                    onClick={loadEvents}
                    className="flex items-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                >
                    <RefreshCw size={20} /> Refresh
                </button>
            </div>

            {/* Active Event Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={24} /> Active Event
                </h2>
                {activeEvent ? (
                    <div className="bg-white rounded-2xl shadow-premium p-6 border-2 border-green-200">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-2xl font-bold text-gray-900">{activeEvent.name}</h3>
                                    {getStatusBadge('Active')}
                                </div>
                                {activeEvent.description && (
                                    <p className="text-gray-600 mb-4">{activeEvent.description}</p>
                                )}
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={14} />
                                        Activated: {activeEvent.activatedAt?.toDate().toLocaleDateString()}
                                    </span>
                                </div>
                                {activeEvent.stats && (
                                    <div className="flex gap-6 mt-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-indigo-600">{activeEvent.stats.totalReports}</div>
                                            <div className="text-xs text-gray-500">Reports</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-orange-600">{activeEvent.stats.totalOAFs}</div>
                                            <div className="text-xs text-gray-500">OAFs</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-purple-600">{activeEvent.stats.totalSIRs}</div>
                                            <div className="text-xs text-gray-500">SIRs</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedEvent(activeEvent);
                                    setShowArchiveModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                            >
                                <Archive size={18} /> Archive Event
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                        <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No Active Audit Event</h3>
                        <p className="text-gray-600 mb-4">
                            Create and activate an event to start managing audit documents.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
                        >
                            <Plus size={18} /> Create Event
                        </button>
                    </div>
                )}
            </div>

            {/* Draft Events */}
            {draftEvents.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Clock className="text-amber-600" size={24} /> Draft Events
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {draftEvents.map(event => (
                            <div key={event.id} className="bg-white rounded-2xl shadow-soft p-5 border border-gray-100">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{event.name}</h3>
                                        {event.description && (
                                            <p className="text-sm text-gray-500">{event.description}</p>
                                        )}
                                    </div>
                                    {getStatusBadge('Draft')}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                    <Calendar size={12} />
                                    Created: {event.createdAt?.toDate().toLocaleDateString()}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleActivateEvent(event)}
                                        disabled={actionLoading || !!activeEvent}
                                        className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Play size={14} /> Activate
                                    </button>
                                    <button
                                        onClick={() => handleDeleteEvent(event)}
                                        disabled={actionLoading}
                                        className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Archived Events */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Archive className="text-gray-600" size={24} /> Archived Events ({archivedEvents.length})
                </h2>
                {archivedEvents.length > 0 ? (
                    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Event Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Archived Date</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Reports</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">OAFs</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">SIRs</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {archivedEvents.map(event => (
                                    <tr key={event.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{event.name}</div>
                                            {event.description && (
                                                <div className="text-sm text-gray-500">{event.description}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {event.archivedAt?.toDate().toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-bold text-indigo-600">{event.stats?.totalReports || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-bold text-orange-600">{event.stats?.totalOAFs || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-bold text-purple-600">{event.stats?.totalSIRs || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => navigate(`/archives/${event.id}`)}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                View <ChevronRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500">
                        <Archive size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No archived events yet.</p>
                    </div>
                )}
            </div>

            {/* Create Event Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Create New Audit Event</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
                                <input
                                    type="text"
                                    value={newEventName}
                                    onChange={(e) => setNewEventName(e.target.value)}
                                    placeholder="e.g., Q1 2026 Internal Audit"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                                <textarea
                                    value={newEventDescription}
                                    onChange={(e) => setNewEventDescription(e.target.value)}
                                    placeholder="Brief description of this audit event..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateEvent}
                                disabled={actionLoading || !newEventName.trim()}
                                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors"
                            >
                                {actionLoading ? 'Creating...' : 'Create Event'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Archive Confirmation Modal */}
            {showArchiveModal && selectedEvent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900">Archive Event</h3>
                            <button onClick={() => setShowArchiveModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="text-sm text-amber-800 font-medium mb-1">
                                        Are you sure you want to archive "{selectedEvent.name}"?
                                    </p>
                                    <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                                        <li>Audit reports will become read-only</li>
                                        <li>Open OAFs/SIRs will remain editable until closed</li>
                                        <li>No new documents can be added to this event</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowArchiveModal(false)}
                                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleArchiveEvent}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition-colors"
                            >
                                {actionLoading ? 'Archiving...' : 'Confirm Archive'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Migration Modal */}
            {showMigrationModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900">Migrate Existing Documents</h3>
                            <button onClick={() => setShowMigrationModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                            <p className="text-sm text-blue-800">
                                This will create a "Legacy - Pre-Event System" archive and move all existing documents
                                (without an event) to it. This is a one-time migration.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowMigrationModal(false)}
                                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMigrateLegacy}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition-colors"
                            >
                                {actionLoading ? 'Migrating...' : 'Start Migration'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

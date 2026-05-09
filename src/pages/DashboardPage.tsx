import { useEffect, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import {
    AlertTriangle,
    CheckCircle2,
    Lightbulb,
    FileText,
    Bell,
    Check,
    Clock,
    ClipboardList,
    Calendar,
    AlertCircle
} from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { useAuth } from '../contexts/AuthContext';
import { getAllAuditReports, getAllObservationForms } from '../lib/auditService';
import { getActiveEvent, getReportsByEventId, getOAFsByEventId, getOpenCorrectiveActions } from '../lib/auditEventService';
import type { AuditReport, ObservationForm, AuditEvent } from '../lib/types';

export const DashboardPage = () => {
    const { userData } = useAuth();
    const [reports, setReports] = useState<AuditReport[]>([]);
    const [oafs, setOafs] = useState<ObservationForm[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeEvent, setActiveEvent] = useState<AuditEvent | null>(null);
    const [openCorrectiveActions, setOpenCorrectiveActions] = useState<{ oafs: number; sirs: number }>({ oafs: 0, sirs: 0 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Get active event
            const event = await getActiveEvent();
            setActiveEvent(event);

            // Get open corrective actions (across all events)
            const openActions = await getOpenCorrectiveActions();
            setOpenCorrectiveActions({
                oafs: openActions.oafs.length,
                sirs: openActions.sirs.length
            });

            // If there's an active event, filter by it; otherwise show all
            if (event && event.id) {
                const [eventReports, eventOafs] = await Promise.all([
                    getReportsByEventId(event.id),
                    getOAFsByEventId(event.id)
                ]);
                setReports(eventReports);
                setOafs(eventOafs);
            } else {
                // No active event - show all documents
                const [allReports, allOafs] = await Promise.all([
                    getAllAuditReports(),
                    getAllObservationForms()
                ]);
                setReports(allReports);
                setOafs(allOafs);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Derived Statistics
    const totalGoodPoints = reports.reduce((acc, r) => acc + (r.good_points?.length || 0), 0);
    const totalOFI = reports.reduce((acc, r) => acc + (r.observations_ofi?.length || 0), 0);
    const totalNC = reports.reduce((acc, r) => acc + (r.findings_nc?.length || 0), 0);
    const totalOAFs = oafs.length;

    // Process Department Data for Chart
    const deptStats: Record<string, { name: string; OFI: number; NC: number; reports: number }> = {};

    // Default departments if no data exists yet to keep the chart from being empty
    const DEFAULT_DEPTS = ['Engineering', 'HR', 'Finance', 'Production', 'Logistics', 'Quality', 'Sales'];
    DEFAULT_DEPTS.forEach(dept => {
        deptStats[dept] = { name: dept, OFI: 0, NC: 0, reports: 0 };
    });

    reports.forEach(r => {
        const dept = r.department || 'Other';
        if (!deptStats[dept]) {
            deptStats[dept] = { name: dept, OFI: 0, NC: 0, reports: 0 };
        }
        deptStats[dept].OFI += (r.observations_ofi?.length || 0);
        deptStats[dept].NC += (r.findings_nc?.length || 0);
        deptStats[dept].reports += 1;
    });

    const chartData = Object.values(deptStats).sort((a, b) => (b.OFI + b.NC) - (a.OFI + a.NC));

    // Calculate Progress (Assuming a goal of 1 report per dept)
    const totalDeptsCount = Object.keys(deptStats).length;
    const deptsWithReports = Object.values(deptStats).filter(d => d.reports > 0).length;
    const progressPercentage = totalDeptsCount > 0 ? Math.round((deptsWithReports / totalDeptsCount) * 100) : 0;

    // Recent Activity - combine reports and oafs, sort by created_at
    const activities = [
        ...reports.map(r => ({
            id: r.id,
            type: 'report',
            message: `New Audit Report for ${r.department} - ${r.area_process}`,
            time: r.created_at,
            user: r.auditor_name,
            status: r.status
        })),
        ...oafs.map(o => ({
            id: o.id,
            type: 'oaf',
            message: `Observation Form issued to ${o.department}`,
            time: o.created_at,
            user: o.auditorName,
            status: o.status
        }))
    ].sort((a, b) => (b.time?.toMillis() || 0) - (a.time?.toMillis() || 0)).slice(0, 10);

    const formatTime = (timestamp: any) => {
        if (!timestamp) return 'No date';
        const date = timestamp.toDate();
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins} mins ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        return `${diffDays} days ago`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 fill-mode-both p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Hi, {userData?.displayName || 'Auditor'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Live overview of system performance and audit activities.
                    </p>
                </div>
            </div>

            {/* Active Event Context Banner */}
            {activeEvent ? (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 text-white flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                        <Calendar size={24} />
                        <div>
                            <p className="text-sm font-medium opacity-90">Active Audit Event</p>
                            <p className="text-lg font-bold">{activeEvent.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs opacity-75">Documents in this event</p>
                            <p className="text-lg font-bold">{reports.length + oafs.length}</p>
                        </div>
                        {(openCorrectiveActions.oafs > 0 || openCorrectiveActions.sirs > 0) && (
                            <div className="bg-amber-500/20 rounded-xl px-3 py-2 text-center">
                                <p className="text-xs">Open Actions</p>
                                <p className="text-lg font-bold">{openCorrectiveActions.oafs + openCorrectiveActions.sirs}</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                    <AlertCircle className="text-amber-500" size={24} />
                    <div>
                        <p className="font-semibold text-amber-800">No Active Audit Event</p>
                        <p className="text-sm text-amber-600">Dashboard is showing all historical data. Create and activate an event to start a new audit cycle.</p>
                    </div>
                </div>
            )}

            {/* Data Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Good Points"
                    value={totalGoodPoints.toString()}
                    icon={<CheckCircle2 size={24} className="text-green-500" />}
                    trend="Strengths identified"
                    trendColor="text-green-500"
                />
                <StatCard
                    title="OFI"
                    value={totalOFI.toString()}
                    icon={<Lightbulb size={24} className="text-amber-500" />}
                    trend="Improvements needed"
                    trendColor="text-amber-500"
                />
                <StatCard
                    title="NC"
                    value={totalNC.toString()}
                    icon={<AlertTriangle size={24} className="text-red-500" />}
                    trend="Critical issues"
                    trendColor="text-red-500"
                />
                <StatCard
                    title="OAFs Issued"
                    value={totalOAFs.toString()}
                    icon={<ClipboardList size={24} className="text-blue-500" />}
                    trend="Action items"
                    trendColor="text-blue-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Stacked Bar Graph */}
                    <div className="bg-card rounded-xl border shadow-sm p-6 bg-white">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <FileText className="text-primary" size={20} />
                                Findings by Department
                            </h2>
                        </div>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#F1F5F9' }}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="OFI" stackId="a" fill="#F59E0B" name="OFI" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="NC" stackId="a" fill="#EF4444" name="Non-Conformity" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Progress Bar Section */}
                    <div className="bg-card rounded-xl border shadow-sm p-6 bg-white">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Audit Coverage</h2>
                            <span className="text-sm font-medium text-muted-foreground">
                                {deptsWithReports} / {totalDeptsCount} Targeted Departments
                            </span>
                        </div>
                        <div className="relative h-4 w-full bg-secondary rounded-full overflow-hidden bg-gray-100">
                            <div
                                className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        <div className="mt-2 text-right">
                            <span className="text-sm font-bold text-primary">{progressPercentage}% Coverage</span>
                        </div>
                    </div>
                </div>

                {/* Notifications Sidebar */}
                <div className="space-y-6">
                    <div className="bg-card rounded-xl border shadow-sm h-full flex flex-col bg-white">
                        <div className="p-6 border-b">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Bell className="text-primary" size={20} />
                                Recent Activity
                            </h2>
                        </div>
                        <div className="p-6 flex-1 overflow-auto max-h-[600px] space-y-6">
                            {activities.length > 0 ? activities.map((activity, idx) => (
                                <div key={`${activity.id}-${idx}`} className="flex gap-4 items-start group">
                                    <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                                        ${activity.type === 'report' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {activity.type === 'report' ? <Check size={16} /> : <ClipboardList size={16} />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900 leading-snug">
                                            {activity.message}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-xs text-muted-foreground">{formatTime(activity.time)}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${activity.status === 'Closed' || activity.status === 'Issued' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                                                }`}>
                                                {activity.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-muted-foreground">
                                    <Clock size={32} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No recent activity detected.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

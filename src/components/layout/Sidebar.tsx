import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    Folder,
    Settings,
    LogOut,
    CheckCircle,
    Building2,
    ClipboardList,
    FilePlus,
    Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getPendingOAFsCount, getPendingReviewOAFsCount } from '../../lib/auditService';

const SidebarItem: React.FC<{
    to: string;
    icon: React.ReactNode;
    label: string;
    badge?: number;
}> = ({ to, icon, label, badge }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => `
        flex items-center gap-4 px-6 py-4 transition-all duration-300 group
        ${isActive ? 'sidebar-item-active text-primary' : 'text-gray-400 hover:text-white'}
      `}
        >
            <span className="relative z-10 transition-transform duration-300 group-hover:scale-110">
                {icon}
            </span>
            <span className="font-medium relative z-10 flex-1">{label}</span>
            {badge && badge > 0 ? (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full relative z-10 animate-pulse">
                    {badge}
                </span>
            ) : null}
        </NavLink>
    );
};

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { user, userData, logout } = useAuth();
    const [pendingOAFCount, setPendingOAFCount] = React.useState(0);
    const [reviewOAFCount, setReviewOAFCount] = React.useState(0);

    React.useEffect(() => {
        const fetchCounts = async () => {
            if (userData?.role === 'Auditee' && userData.department) {
                const count = await getPendingOAFsCount(userData.department);
                setPendingOAFCount(count);
            } else if ((userData?.role === 'Auditor' || userData?.role === 'LeadAuditor')) {
                const count = await getPendingReviewOAFsCount(userData.uid);
                setReviewOAFCount(count);
            }
        };
        fetchCounts();
        // Refresh every minute
        const interval = setInterval(fetchCounts, 60000);
        return () => clearInterval(interval);
    }, [userData]);

    const SidebarContent = (
        <>
            {/* Branding */}
            <div className="p-8 mb-4 flex items-center justify-between">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary font-bold text-2xl shadow-lg">
                    A
                </div>
                {/* Mobile Close Button */}
                <button
                    onClick={onClose}
                    className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
                >
                    <LogOut size={24} className="rotate-180" />
                </button>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 space-y-2 ml-4 overflow-y-auto pb-4 custom-scrollbar">
                {(userData?.role === 'Auditor' || userData?.role === 'LeadAuditor' || userData?.role === 'QMSAdmin') && (
                    <SidebarItem
                        to="/dashboard"
                        icon={<LayoutDashboard size={22} />}
                        label="Dashboard"
                    />
                )}
                {(userData?.role === 'Auditor' || userData?.role === 'LeadAuditor' || userData?.role === 'QMSAdmin') && (
                    <SidebarItem
                        to="/audit-form"
                        icon={<FileText size={22} />}
                        label="New Audit"
                    />
                )}
                {(userData?.role === 'Auditor' || userData?.role === 'LeadAuditor' || userData?.role === 'QMSAdmin') && (
                    <SidebarItem
                        to="/observation-form"
                        icon={<ClipboardList size={22} />}
                        label="New OAF"
                    />
                )}
                {(userData?.role === 'Auditor' || userData?.role === 'LeadAuditor' || userData?.role === 'QMSAdmin') && (
                    <SidebarItem
                        to="/sir-form"
                        icon={<FilePlus size={22} />}
                        label="New SIR"
                    />
                )}
                {(userData) && (
                    <SidebarItem
                        to="/directory"
                        icon={<Folder size={22} />}
                        label="Directory"
                        badge={reviewOAFCount}
                    />
                )}
                {(userData?.role === 'LeadAuditor' || userData?.role === 'QMSAdmin') && (
                    <SidebarItem
                        to="/approvals"
                        icon={<CheckCircle size={22} />}
                        label="Approvals"
                    />
                )}
                {(userData?.role === 'Auditee') && (
                    <SidebarItem
                        to={`/department/${userData?.department || 'General'}`}
                        icon={<Building2 size={22} />}
                        label="My Department"
                        badge={pendingOAFCount}
                    />
                )}
                {(userData?.role === 'Auditee') && (
                    <SidebarItem
                        to="/oaf-directory"
                        icon={<ClipboardList size={22} />}
                        label="OAF Directory"
                        badge={pendingOAFCount}
                    />
                )}
                {(userData?.role === 'LeadAuditor' || userData?.role === 'QMSAdmin') && (
                    <SidebarItem
                        to="/events"
                        icon={<Calendar size={22} />}
                        label="Event Management"
                    />
                )}
                {(userData?.role === 'LeadAuditor' || userData?.role === 'QMSAdmin') && (
                    <SidebarItem
                        to="/settings"
                        icon={<Settings size={22} />}
                        label="Settings"
                    />
                )}
            </nav>

            {/* Bottom Profile/Actions */}
            <div className="p-6 mt-auto">
                <div className="bg-white/5 rounded-3xl p-4 mb-4 backdrop-blur-sm border border-white/10">
                    <p className="text-xs text-gray-400 mb-1">Signed in as</p>
                    <p className="font-semibold truncate">{userData?.displayName || user?.email}</p>
                    <button
                        onClick={logout}
                        className="mt-3 flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors w-full"
                    >
                        <LogOut size={16} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`
                    fixed md:static inset-y-0 left-0 z-50
                    w-72 bg-primary h-screen flex flex-col text-white 
                    transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    shadow-2xl md:shadow-none
                `}
            >
                {SidebarContent}
            </aside>
        </>
    );
};

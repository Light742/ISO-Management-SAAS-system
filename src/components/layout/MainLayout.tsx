import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Search, Bell, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, userData } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex bg-background min-h-screen">
            <div className="print:hidden">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            </div>

            <main className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
                {/* Header */}
                <header className="px-4 md:px-10 py-4 md:py-6 flex items-center justify-between bg-transparent flex-shrink-0 z-30 print:hidden">
                    <div className="flex items-center gap-4 flex-1 max-w-xl">
                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 -ml-2 text-primary hover:bg-gray-100 rounded-xl md:hidden transition-colors"
                        >
                            <Menu size={24} />
                        </button>

                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
                            <input
                                type="text"
                                placeholder="Search anything..."
                                className="w-full bg-white rounded-2xl py-3 pl-12 pr-4 shadow-soft focus:ring-2 focus:ring-accent/10 outline-none border-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6 ml-4">
                        <button className="p-2 text-muted hover:text-primary transition-colors hover:bg-white rounded-xl shadow-soft hidden sm:block">
                            <Bell size={20} />
                        </button>
                        <div className="flex items-center gap-3 pl-0 md:pl-6 md:border-l border-gray-200">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold">{userData?.displayName || 'User'}</p>
                                <p className="text-xs text-muted font-bold uppercase tracking-wider text-accent truncate max-w-[150px]">{user?.email}</p>
                            </div>
                            <div className="w-10 h-10 bg-accent/10 rounded-xl overflow-hidden shadow-soft flex items-center justify-center text-accent font-bold shrunk-0">
                                {userData?.displayName?.[0] || 'U'}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto px-4 md:px-10 pb-20 md:pb-10 w-full print:p-0 print:overflow-visible">
                    <div className="max-w-7xl mx-auto h-full print:max-w-none">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

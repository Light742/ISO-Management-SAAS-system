import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDepartments } from '../lib/settingsService';
import type { Department } from '../lib/types';

export const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [department, setDepartment] = useState('');
    const [departments, setDepartments] = useState<Department[]>([]);
    const [showDeptDropdown, setShowDeptDropdown] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { loginMock } = useAuth();

    useEffect(() => {
        const loadDepartments = async () => {
            try {
                const depts = await getDepartments();
                setDepartments(depts);
            } catch (err) {
                console.error("Failed to load departments", err);
            }
        };
        loadDepartments();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Check for mock login triggers
            const mockUsernames = ['auditor', 'lead_auditor', 'admin', 'auditee'];
            if (mockUsernames.includes(username)) {
                if (password !== '123456') {
                    throw new Error('Invalid password for mock user. Use 123456.');
                }

                if (username === 'auditee' && !department) {
                    setError('Please select a department.');
                    setLoading(false);
                    return;
                }

                await loginMock(username, department);
                navigate('/');
                return;
            }

            // Fallback to regular Firebase Auth
            await signInWithEmailAndPassword(auth, username, password); // username acts as email here
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Incorrect username or password.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>

            <div className="max-w-md w-full animate-in slide-in-from-bottom-8 duration-700">
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl rotate-3">
                        A
                    </div>
                </div>

                <div className="card-modern border-none shadow-premium p-10">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold tracking-tight mb-2">
                            Welcome Back
                        </h2>
                        <p className="text-muted">
                            Login to manage your ISO audits.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl mb-6 text-sm flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1">
                                Username or Email
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                                <input
                                    type="text"
                                    required
                                    placeholder="username or email"
                                    className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        {username === 'auditee' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-sm font-semibold text-gray-700 ml-1">
                                    Department
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                                    <div
                                        onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                                        className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-10 focus:ring-2 focus:ring-accent/20 outline-none transition-all cursor-pointer flex items-center justify-between"
                                    >
                                        <span className={department ? 'text-gray-900' : 'text-gray-400'}>
                                            {department || "Select Department"}
                                        </span>
                                        <ChevronDown size={18} className={`text-muted transition-transform ${showDeptDropdown ? 'rotate-180' : ''}`} />
                                    </div>

                                    {showDeptDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-premium border border-gray-100 z-50 overflow-hidden max-h-48 overflow-y-auto">
                                            {departments.map((dept) => (
                                                <div
                                                    key={dept.id}
                                                    onClick={() => {
                                                        setDepartment(dept.name);
                                                        setShowDeptDropdown(false);
                                                    }}
                                                    className="px-5 py-3 hover:bg-gray-50 cursor-pointer text-sm font-medium border-b border-gray-50 last:border-none"
                                                >
                                                    {dept.name}
                                                </div>
                                            ))}
                                            {departments.length === 0 && (
                                                <div className="px-5 py-3 text-sm text-muted italic">No departments found</div>
                                            )}
                                        </div>
                                    )}

                                    {showDeptDropdown && (
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setShowDeptDropdown(false)}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-4 text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
                        >
                            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                            {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center text-muted text-sm px-4 leading-relaxed">
                    Test Accounts: auditor, lead_auditor, admin, auditee (pw: 123456)
                </div>
            </div>
        </div>
    );
};

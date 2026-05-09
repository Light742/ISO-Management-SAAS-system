import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import type { UserProfile, UserRole } from '../lib/types';

interface AuthContextType {
    user: User | null;
    userData: UserProfile | null;
    loading: boolean;
    logout: () => Promise<void>;
    loginMock: (username: string, department?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for mock session in localStorage first
        const storedUser = localStorage.getItem('mockUser');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser({ uid: parsedUser.uid, email: parsedUser.email } as User);
            setUserData(parsedUser);
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Fetch role/department from Firestore
                try {
                    const userRef = doc(db, 'users', currentUser.uid);
                    const userDoc = await getDoc(userRef);

                    if (userDoc.exists()) {
                        setUserData(userDoc.data() as UserProfile);
                    } else {
                        // Create default profile if it doesn't exist
                        const newProfile: UserProfile = {
                            uid: currentUser.uid,
                            email: currentUser.email || '',
                            displayName: currentUser.displayName || 'User',
                            role: 'Auditor',
                            department: 'General',
                            createdAt: Timestamp.now()
                        };
                        setUserData(newProfile);
                    }
                } catch (error) {
                    console.error("Error fetching/creating user data:", error);
                    setUserData(null);
                }
            } else {
                setUserData(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const loginMock = async (username: string, department?: string) => {
        let role: UserRole = 'Auditor';
        let dept = 'General';

        switch (username) {
            case 'auditor':
                role = 'Auditor';
                break;
            case 'lead_auditor':
                role = 'LeadAuditor';
                break;
            case 'admin':
                role = 'QMSAdmin';
                break;
            case 'auditee':
                role = 'Auditee';
                dept = department || 'General';
                break;
            default:
                throw new Error('Invalid username');
        }

        const mockProfile: UserProfile = {
            uid: `mock-${username}`,
            email: `${username}@example.com`,
            displayName: username.toUpperCase(),
            role,
            department: dept,
            createdAt: Timestamp.now()
        };

        localStorage.setItem('mockUser', JSON.stringify(mockProfile));
        setUser({ uid: mockProfile.uid, email: mockProfile.email } as User);
        setUserData(mockProfile);
    };

    const logout = async () => {
        localStorage.removeItem('mockUser');
        await signOut(auth);
        setUser(null);
        setUserData(null);
    };

    const value = {
        user,
        userData,
        loading,
        logout,
        loginMock
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};


import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserAccount } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  role: UserAccount['role'];
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (p: UserProfile) => void;
  // Master features
  resetLocalUserPassword: (email: string) => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- SECURE MASTER CREDENTIALS ---
// Ideally, these come from process.env in a real build.
// For this demo, we use a specific set that YOU (the developer) know.
const MASTER_CREDENTIALS = {
  name: 'System Overlord',
  email: (import.meta as any).env?.VITE_MASTER_EMAIL || 'admin@master.com',
  password: (import.meta as any).env?.VITE_MASTER_PASSWORD || 'master123'
};

// Mock Users Database for Prototype
const MOCK_USERS: UserAccount[] = [
  { id: 'u1', name: 'Alex Manager', email: 'alex.manager@8me.com', role: 'Admin', status: 'Active', lastActive: 'Now' },
  { id: 'u2', name: 'Sarah Smith', email: 'sarah@8me.com', role: 'Manager', status: 'Active', lastActive: '2h ago' }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserAccount['role']>('Viewer');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('proptrust_auth_token');
    if (token) {
      try {
        const savedProfile = JSON.parse(localStorage.getItem('proptrust_user_profile') || '{}');
        const savedRole = localStorage.getItem('proptrust_user_role') as UserAccount['role'];
        
        if (savedProfile.email) {
          setUser(savedProfile);
          setRole(savedRole || 'Viewer');
          setIsAuthenticated(true);
        }
      } catch (e) {
        localStorage.removeItem('proptrust_auth_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate Server Request
    await new Promise(r => setTimeout(r, 800));

    // 1. Check MASTER CREDENTIALS (Developer Access)
    // This is hardcoded/env based and separate from the local DB.
    if (email.toLowerCase() === MASTER_CREDENTIALS.email.toLowerCase()) {
        if (password === MASTER_CREDENTIALS.password) {
            const profile: UserProfile = {
                name: MASTER_CREDENTIALS.name,
                email: MASTER_CREDENTIALS.email,
                title: 'System Administrator',
                phone: ''
            };
            setUser(profile);
            setRole('Master'); // This role unlocks the Master Console
            setIsAuthenticated(true);
            saveSession(profile, 'Master');
            return { success: true };
        } else {
            return { success: false, error: 'Invalid Master Password' };
        }
    }

    // 2. Check LOCAL AGENCY USERS
    // These are stored in the client's browser/database.
    const account = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!account) {
       // Allow the demo user even if not in list for first run experience
       if (email === 'alex.manager@8me.com') {
          // Pass through for demo simplicity
       } else {
          return { success: false, error: 'Account not found.' };
       }
    }

    if (account && account.status !== 'Active') {
      return { success: false, error: 'Account suspended. Contact administrator.' };
    }

    // Success (Standard User)
    const profile: UserProfile = {
      name: account?.name || 'Alex Manager',
      email: email,
      title: account?.role === 'Admin' ? 'Director' : 'Property Manager',
      phone: ''
    };

    // Standard users CANNOT be Master
    const userRole = account?.role === 'Master' ? 'Admin' : (account?.role || 'Admin');

    setUser(profile);
    setRole(userRole);
    setIsAuthenticated(true);
    saveSession(profile, userRole);

    return { success: true };
  };

  const saveSession = (profile: UserProfile, role: string) => {
    localStorage.setItem('proptrust_auth_token', 'secure_mock_jwt_token_xyz');
    localStorage.setItem('proptrust_user_profile', JSON.stringify(profile));
    localStorage.setItem('proptrust_user_role', role);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('proptrust_auth_token');
    localStorage.removeItem('proptrust_user_profile');
    localStorage.removeItem('proptrust_user_role');
  };

  const updateProfile = (p: UserProfile) => {
    setUser(p);
    localStorage.setItem('proptrust_user_profile', JSON.stringify(p));
  };

  // --- MASTER OVERRIDE FEATURES ---
  const resetLocalUserPassword = async (email: string) => {
      // In a real app, this would update the DB. 
      // Here we just simulate the admin action.
      console.log(`[Master Override] Password reset triggered for ${email}`);
      // We could clear their specific session or update a local storage mock DB here
      return Promise.resolve();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, role, isLoading, login, logout, updateProfile, resetLocalUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

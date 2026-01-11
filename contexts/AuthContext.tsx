
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock Users Database for Prototype Auth
const MOCK_USERS: UserAccount[] = [
  { id: 'u1', name: 'Alex Manager', email: 'alex.manager@8me.com', role: 'Admin', status: 'Active', lastActive: 'Now' },
  { id: 'u2', name: 'Sarah Smith', email: 'sarah@8me.com', role: 'Manager', status: 'Active', lastActive: '2h ago' },
  { id: 'u3', name: 'System Overlord', email: 'admin@master.com', role: 'Master', status: 'Active', lastActive: 'Now' }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserAccount['role']>('Viewer');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session token
    const token = localStorage.getItem('proptrust_auth_token');
    if (token) {
      try {
        // In production, validate token with server
        const savedProfile = JSON.parse(localStorage.getItem('proptrust_user_profile') || '{}');
        const savedRole = localStorage.getItem('proptrust_user_role') as UserAccount['role'];
        
        if (savedProfile.email) {
          setUser(savedProfile);
          setRole(savedRole || 'Viewer');
          setIsAuthenticated(true);
        }
      } catch (e) {
        // Invalid session
        localStorage.removeItem('proptrust_auth_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate Server Request
    await new Promise(r => setTimeout(r, 800));

    // Basic Validation Logic
    const account = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!account) {
       // Allow the demo user even if not in list for first run experience
       if (email === 'alex.manager@8me.com') {
          // Pass through
       } else {
          return { success: false, error: 'Account not found.' };
       }
    }

    if (account && account.status !== 'Active') {
      return { success: false, error: 'Account suspended. Contact administrator.' };
    }

    // Success
    const profile: UserProfile = {
      name: account?.name || 'Alex Manager',
      email: email,
      title: account?.role === 'Admin' ? 'Director' : 'Property Manager',
      phone: ''
    };

    const userRole = account?.role || 'Admin';

    setUser(profile);
    setRole(userRole);
    setIsAuthenticated(true);
    
    // Secure Session Storage
    localStorage.setItem('proptrust_auth_token', 'secure_mock_jwt_token_xyz');
    localStorage.setItem('proptrust_user_profile', JSON.stringify(profile));
    localStorage.setItem('proptrust_user_role', userRole);

    return { success: true };
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

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, role, isLoading, login, logout, updateProfile }}>
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

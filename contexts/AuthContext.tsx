
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserAccount } from '../types';
import { db } from '../services/db';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  role: UserAccount['role'];
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (p: UserProfile) => void;
  registerLocalUser: (name: string, email: string, passwordPlain: string) => Promise<void>;
  resetLocalUserPassword: (email: string) => Promise<void>;
  verifyPassword: (password: string) => Promise<boolean>;
  localUserCount: number; // Used to trigger Setup Mode if 0
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- SECURE MASTER CREDENTIALS ---
// These are strictly for the Developer/SuperAdmin and are NOT stored in the local DB.
const MASTER_CREDENTIALS = {
  name: 'System Overlord',
  email: (import.meta as any).env?.VITE_MASTER_EMAIL || 'admin@master.com',
  password: (import.meta as any).env?.VITE_MASTER_PASSWORD || 'master123'
};

// --- CRYPTO UTILS (Local Security) ---
async function hashPassword(password: string): Promise<string> {
  // Check for Secure Context (Required for SubtleCrypto)
  // Also check if we are in a non-secure environment (http IP) which blocks crypto.subtle
  if (!window.crypto || !window.crypto.subtle) {
    console.warn("[Security] Secure context missing (HTTPS/Localhost required for WebCrypto). Using fallback hash.");
    // Simple fallback for dev/demo environments on non-secure IPs
    return btoa(`fallback_hash_${password}`).split('').reverse().join('');
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.error("Crypto Error:", e);
    // Fallback if digest fails
    return btoa(`fallback_hash_${password}`).split('').reverse().join('');
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserAccount['role']>('Viewer');
  const [isLoading, setIsLoading] = useState(true);
  const [localUserCount, setLocalUserCount] = useState(0);

  useEffect(() => {
    // 1. Check Session
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

    // 2. Check Local DB User Count (to determine if Setup is needed)
    checkLocalUsers();
    setIsLoading(false);
  }, []);

  const checkLocalUsers = async () => {
      const users = await db.users.list();
      setLocalUserCount(users.length);
  };

  const registerLocalUser = async (name: string, email: string, passwordPlain: string) => {
      const hash = await hashPassword(passwordPlain);
      
      const newUser: UserAccount = {
          id: `u-${Date.now()}`,
          name,
          email,
          role: 'Admin', // First user is always Admin
          status: 'Active',
          lastActive: 'Now'
      };

      // Store User Profile
      await db.users.add(newUser);
      
      // Store Auth Credential (simulated separate table in local storage)
      const credentials = JSON.parse(localStorage.getItem('proptrust_local_auth') || '{}');
      credentials[email.toLowerCase()] = hash;
      localStorage.setItem('proptrust_local_auth', JSON.stringify(credentials));

      setLocalUserCount(prev => prev + 1);
      
      // Auto Login - New Local Users are ALWAYS 'Trial' (Demo Mode)
      // They must be upgraded via Master Console to become Clients.
      finishLogin({ name, email, title: 'Agency Admin', phone: '', plan: 'Trial' }, 'Admin');
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    if (!user || !user.email) return false;
    const email = user.email;

    // 1. Master Override
    if (email.toLowerCase() === MASTER_CREDENTIALS.email.toLowerCase()) {
        return password === MASTER_CREDENTIALS.password;
    }

    // 2. Central Registry
    const centralAgency = await db.centralRegistry.getAgencyByEmail(email);
    if (centralAgency && centralAgency.passwordHash) {
         const inputHash = await hashPassword(password);
         return inputHash === centralAgency.passwordHash;
    }

    // 3. Local Auth
    const credentials = JSON.parse(localStorage.getItem('proptrust_local_auth') || '{}');
    const storedHash = credentials[email.toLowerCase()];
    if (storedHash) {
        const inputHash = await hashPassword(password);
        return inputHash === storedHash;
    }

    return false;
  };

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    await new Promise(r => setTimeout(r, 800)); // Simulate delay

    // --- LEVEL 1: MASTER OVERRIDE (Hardcoded / Env) ---
    // This bypasses local storage entirely.
    if (email.toLowerCase() === MASTER_CREDENTIALS.email.toLowerCase()) {
        if (password === MASTER_CREDENTIALS.password) {
            finishLogin({
                name: MASTER_CREDENTIALS.name,
                email: MASTER_CREDENTIALS.email,
                title: 'System Administrator',
                phone: '',
                plan: 'Enterprise'
            }, 'Master');
            return { success: true };
        } else {
            return { success: false, error: 'Invalid Master Password' };
        }
    }

    // --- LEVEL 2: CLIENT LOGIN (Central Registry Check) ---
    // Accounts created in Master Console (Paid Clients).
    // Access Level: FOLLOWS SUBSCRIPTION (Starter/Growth/Enterprise).
    const centralAgency = await db.centralRegistry.getAgencyByEmail(email);

    if (centralAgency) {
        // Enforce Status
        if (centralAgency.status === 'Suspended') {
            return { success: false, error: 'Account Suspended. Contact Support.' };
        }
        if (centralAgency.status === 'Paused') {
            return { success: false, error: 'Account Temporarily Paused. Contact Admin.' };
        }
        
        // Verify password against central registry
        // This ensures the user is using the specific Client credentials issued by 8ME
        if (centralAgency.passwordHash) {
             const inputHash = await hashPassword(password || '');
             if (inputHash === centralAgency.passwordHash) {
                 // Login success - Full Access based on Plan
                 finishLogin({
                    name: centralAgency.name,
                    email: centralAgency.contactEmail,
                    title: 'Agency Principal',
                    phone: '',
                    plan: centralAgency.subscriptionPlan // Respects 'Growth'/'Enterprise'
                 }, 'Admin');
                 return { success: true };
             }
        }
    }

    // --- LEVEL 3: DEMO ACCESS (Local Device Account) ---
    // Accounts created via "Book Demo" / Local Setup.
    // Access Level: STRICTLY TRIAL.
    if (!password) return { success: false, error: 'Password required' };

    const credentials = JSON.parse(localStorage.getItem('proptrust_local_auth') || '{}');
    const storedHash = credentials[email.toLowerCase()];

    if (storedHash) {
        const inputHash = await hashPassword(password);
        if (inputHash === storedHash) {
            // Fetch profile details
            const users = await db.users.list();
            const localUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            
            if (localUser) {
                if (localUser.status !== 'Active') return { success: false, error: 'Account Suspended' };
                
                // FORCE TRIAL FOR LOCAL LOGINS
                // Even if they had a different plan cached, local authentication implies Demo/Trial.
                // To access full features, they must use Client Credentials (Level 2).
                finishLogin({
                    name: localUser.name,
                    email: localUser.email,
                    title: 'Agency Admin',
                    phone: '',
                    plan: 'Trial' 
                }, localUser.role);
                return { success: true };
            }
        }
    }

    // FALLBACK DEMO ACCOUNT
    if (email === 'alex.manager@8me.com') {
         const demoProfile = { name: 'Alex Manager', email, title: 'Demo User', phone: '', plan: 'Trial' as const };
         finishLogin(demoProfile, 'Admin');
         return { success: true };
    }

    return { success: false, error: 'Invalid credentials. If you are a client, please check your issued password.' };
  };

  const finishLogin = (profile: UserProfile, role: string) => {
    setUser(profile);
    setRole(role as any);
    setIsAuthenticated(true);
    localStorage.setItem('proptrust_auth_token', 'secure_mock_token');
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

  // --- MASTER FEATURES ---
  const resetLocalUserPassword = async (email: string) => {
      try {
          console.log(`[Master Override] Resetting password for ${email}`);
          const credentials = JSON.parse(localStorage.getItem('proptrust_local_auth') || '{}');
          
          // Force reset with fallback hash logic
          const tempHash = await hashPassword('reset123');
          
          // CRITICAL FIX: Ensure entry exists even if it was missing
          credentials[email.toLowerCase()] = tempHash;
          localStorage.setItem('proptrust_local_auth', JSON.stringify(credentials));
          
          console.log("Reset successful for:", email);
      } catch (err) {
          console.error("Reset Password Failed:", err);
          throw new Error("Failed to write to local storage");
      }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, role, isLoading, login, logout, updateProfile, registerLocalUser, resetLocalUserPassword, verifyPassword, localUserCount }}>
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

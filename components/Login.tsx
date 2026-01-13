
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from './BrandLogo';

interface LoginProps {
  onBack?: () => void;
}

const Login: React.FC<LoginProps> = ({ onBack }) => {
  const { login, registerLocalUser, localUserCount } = useAuth();
  
  // View State
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Agency Config State
  const [agencyUrl, setAgencyUrl] = useState('');
  const [customBg, setCustomBg] = useState('');

  // Support Contact Info
  const ADMIN_EMAIL = '8milesestate@gmail.com';

  // Auto-switch to Setup Mode if no users exist
  useEffect(() => {
      if (localUserCount === 0) {
          setMode('setup');
      }
  }, [localUserCount]);

  useEffect(() => {
    // Check if agency URL is configured in settings
    const savedSettings = localStorage.getItem('proptrust_agency_settings');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            if (parsed.websiteUrl) setAgencyUrl(parsed.websiteUrl);
            if (parsed.loginBackgroundImage) setCustomBg(parsed.loginBackgroundImage);
        } catch (e) {
            // Ignore error
        }
    }
  }, []);

  const handleForgotPassword = () => {
    // 1. Construct the email body
    const subject = encodeURIComponent("Password Reset Request - 8ME");
    const body = encodeURIComponent(
      `To 8 Miles Estate Support,\n\n` +
      `I am requesting a password reset for my account.\n\n` +
      `Email: ${email || '[Insert Email Here]'}\n` +
      `Date: ${new Date().toLocaleDateString()}\n\n` +
      `Please provide instructions on how to recover my access.`
    );
    
    // 2. Trigger Mail Client
    window.location.href = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
  };

  const notifyAdminOfSignup = (userName: string, userEmail: string) => {
    // 1. Construct the notification email
    const subject = encodeURIComponent(`New Agency Registration: ${userName}`);
    const body = encodeURIComponent(
      `System Notification: New User Sign-Up\n\n` +
      `User Name: ${userName}\n` +
      `Email: ${userEmail}\n` +
      `Time: ${new Date().toLocaleString()}\n\n` +
      `Please verify this account in the Master Console.`
    );

    // 2. Attempt to open mail client (User interaction context is preserved in handleSubmit usually, 
    // but async might block window.open. using location.href is safer for mailto)
    // We wrap in a slight timeout to ensure the UI updates first
    setTimeout(() => {
       window.location.href = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'setup') {
          if (password.length < 6) {
              setError("Password must be at least 6 characters");
              setLoading(false);
              return;
          }
          await registerLocalUser(name, email, password);
          
          // NOTIFICATION: Notify Admin of new signup
          notifyAdminOfSignup(name, email);
          
          // Register automatically logs in, so no need to redirect manually
      } else {
          const result = await login(email, password);
          if (!result.success) {
            setError(result.error || 'Login failed');
          }
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold text-slate-900 transition-all placeholder:text-slate-300 text-sm";

  return (
    <div className="min-h-screen flex bg-white relative">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden">
        <img 
          src={customBg || "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"} 
          alt="Agency Branding" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        
        <div className="relative z-10 p-16 flex flex-col justify-between h-full text-white">
          <div className="flex justify-between items-start">
            
            {/* Clickable Brand Logo - Returns to Landing Page */}
            <div 
                onClick={onBack} 
                className={`flex items-center ${onBack ? 'cursor-pointer hover:opacity-80' : ''} transition-opacity`}
                title="Return to Home"
            >
              <BrandLogo variant="header" />
            </div>
          </div>

          <div>
            <blockquote className="text-2xl font-light leading-relaxed mb-6">
              "The most advanced property management suite we've ever used. The AI integration alone saves us 20 hours a week."
            </blockquote>
            <div className="flex items-center space-x-4">
              <img src="https://randomuser.me/api/portraits/women/44.jpg" className="w-12 h-12 rounded-full border-2 border-indigo-500" alt="User" />
              <div>
                <p className="font-bold">Sarah Jenkins</p>
                <p className="text-sm text-slate-400">Director, Apex Real Estate</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 bg-white animate-in slide-in-from-right duration-700 relative">
        
        {/* Back Button - Visible on Mobile and Desktop Form Side */}
        {onBack && (
            <button 
                onClick={onBack}
                className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors group"
            >
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Back to Home</span>
            </button>
        )}

        <div className="w-full max-w-md space-y-8">
          <div>
            {mode === 'setup' ? (
                <>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Setup Agency Access</h2>
                    <p className="mt-2 text-slate-500">Create your local administrator account to begin.</p>
                </>
            ) : (
                <>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back</h2>
                    <p className="mt-2 text-slate-500">Please sign in to your local workspace.</p>
                </>
            )}
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center text-rose-600 text-sm font-bold animate-in fade-in slide-in-from-top-2">
              <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {mode === 'setup' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Agency Principal"
                    />
                  </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="name@agency.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder={mode === 'setup' ? "Create a secure password" : "••••••••"}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                <span className="font-bold text-slate-500">Remember me</span>
              </label>
              {mode === 'login' && (
                  <button 
                    type="button" 
                    onClick={handleForgotPassword} 
                    className="font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Forgot password?
                  </button>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                mode === 'setup' ? 'Create Agency Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Toggle for Demo Users who skipped setup but want to create new later, or Reset */}
          {localUserCount > 0 && mode === 'login' && (
              <div className="pt-6 text-center">
                  <button 
                    onClick={() => setMode('setup')} 
                    className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                      Register New User on this Device
                  </button>
              </div>
          )}
          {mode === 'setup' && localUserCount > 0 && (
              <div className="pt-6 text-center">
                  <button 
                    onClick={() => setMode('login')} 
                    className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                      Back to Login
                  </button>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;

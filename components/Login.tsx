
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Agency Config State
  const [agencyUrl, setAgencyUrl] = useState('');
  const [customBg, setCustomBg] = useState('');

  // Contact Modal State
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', agency: '', phone: '' });
  const [contactSent, setContactSent] = useState(false);

  // Forgot Password State
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call to CRM
    setTimeout(() => {
      setContactSent(true);
      setTimeout(() => {
        setContactSent(false);
        setShowContactModal(false);
        setContactForm({ name: '', email: '', agency: '', phone: '' });
      }, 3000);
    }, 1000);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
        setLoading(false);
        setResetSent(true);
        setTimeout(() => {
            setResetSent(false);
            setShowForgotPasswordModal(false);
            setForgotPasswordEmail('');
        }, 3000);
    }, 1500);
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
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2.5 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h1 className="text-xl font-bold tracking-tight">8<span className="text-indigo-400">ME</span></h1>
            </div>
            
            {agencyUrl && (
                <a href={agencyUrl} className="flex items-center text-white/70 hover:text-white transition-colors text-sm font-bold bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Agency Site
                </a>
            )}
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 bg-white animate-in slide-in-from-right duration-700">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back</h2>
            <p className="mt-2 text-slate-500">Please sign in to access your portfolio.</p>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center text-rose-600 text-sm font-bold animate-in fade-in slide-in-from-top-2">
              <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {error}
            </div>
          )}

          {/* Demo Hint */}
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-800">
             <p className="font-bold uppercase text-xs tracking-widest mb-1 text-indigo-500">Demo Access</p>
             <p><strong>Email:</strong> alex.manager@8me.com</p>
             <p><strong>Password:</strong> (any)</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="alex.manager@8me.com"
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
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                <span className="font-bold text-slate-500">Remember me</span>
              </label>
              <button type="button" onClick={() => setShowForgotPasswordModal(true)} className="font-bold text-indigo-600 hover:text-indigo-800">Forgot password?</button>
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
                'Sign In'
              )}
            </button>
          </form>

          <div className="pt-6 text-center text-sm font-bold text-slate-400">
            Don't have an account? <button onClick={() => setShowContactModal(true)} className="text-indigo-600 hover:text-indigo-800 hover:underline">Contact Sales</button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm animate-in fade-in" onClick={() => setShowForgotPasswordModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8">
            <div className="flex justify-between items-center mb-6">
               <div>
                  <h3 className="text-2xl font-bold text-slate-900">Reset Password</h3>
                  <p className="text-slate-500 text-sm mt-1">We'll send you a secure link to reset it.</p>
               </div>
               <button onClick={() => setShowForgotPasswordModal(false)} className="text-slate-400 hover:text-slate-600">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            {resetSent ? (
              <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4">
                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 00-2 2z" /></svg>
                </div>
                <h4 className="text-xl font-bold text-slate-900">Check your inbox!</h4>
                <p className="text-slate-500 mt-2 max-w-xs">We've sent a password reset link to <span className="font-bold text-indigo-600">{forgotPasswordEmail}</span>.</p>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-6">
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Email</label>
                    <input 
                      required 
                      type="email" 
                      placeholder="name@company.com"
                      className={inputClass}
                      value={forgotPasswordEmail}
                      onChange={e => setForgotPasswordEmail(e.target.value)}
                    />
                 </div>
                 
                 <div className="pt-2">
                   <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all active:scale-95 flex items-center justify-center"
                   >
                     {loading ? 'Sending...' : 'Send Reset Link'}
                   </button>
                 </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Sales Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm animate-in fade-in" onClick={() => setShowContactModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8">
            <div className="flex justify-between items-center mb-6">
               <div>
                  <h3 className="text-2xl font-bold text-slate-900">Request Access</h3>
                  <p className="text-slate-500 text-sm mt-1">Our team will reach out to schedule a demo.</p>
               </div>
               <button onClick={() => setShowContactModal(false)} className="text-slate-400 hover:text-slate-600">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            {contactSent ? (
              <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h4 className="text-xl font-bold text-slate-900">Request Sent!</h4>
                <p className="text-slate-500 mt-2 max-w-xs">Thanks {contactForm.name}. A sales representative will contact {contactForm.email} shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. John Doe"
                      className={inputClass}
                      value={contactForm.name}
                      onChange={e => setContactForm({...contactForm, name: e.target.value})}
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Work Email</label>
                      <input 
                        required 
                        type="email" 
                        placeholder="john@agency.com"
                        className={inputClass}
                        value={contactForm.email}
                        onChange={e => setContactForm({...contactForm, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone</label>
                      <input 
                        required 
                        type="tel" 
                        placeholder="+61 400..."
                        className={inputClass}
                        value={contactForm.phone}
                        onChange={e => setContactForm({...contactForm, phone: e.target.value})}
                      />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Agency Name</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. Apex Real Estate"
                      className={inputClass}
                      value={contactForm.agency}
                      onChange={e => setContactForm({...contactForm, agency: e.target.value})}
                    />
                 </div>
                 
                 <div className="pt-2">
                   <button 
                    type="submit"
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all active:scale-95"
                   >
                     Submit Inquiry
                   </button>
                 </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

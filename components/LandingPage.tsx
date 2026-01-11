
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Property, Inquiry } from '../types';
import { BrandLogo } from './BrandLogo';

interface LandingPageProps {
  onLoginClick: () => void;
  onRequestDemo: () => void;
  properties?: Property[];
  onSendInquiry?: (inquiry: Inquiry) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onRequestDemo }) => {
  const [email, setEmail] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const TERMS_TEXT = `
MASTER SUBSCRIPTION AGREEMENT (SAAS)

This Master Subscription Agreement ("Agreement") is entered into by and between 8ME Pty Ltd ("Provider") and the entity or individual agreeing to these terms ("Customer").

1. DEFINITIONS
"Service" means the 8ME property management software platform.
"Customer Data" means electronic data and information submitted by or for Customer to the Service.

2. USE OF SERVICES
2.1 Subscriptions. Provider grants Customer a non-exclusive, non-transferable right to use the Service solely for Customer's internal business operations (property management), subject to the terms of this Agreement.
2.2 Usage Limits. Services are subject to usage limits specified in the Order Form (e.g., number of properties or users).

3. FEES AND PAYMENT
3.1 Fees. Customer shall pay all fees specified in Order Forms. Fees are based on Service subscriptions purchased and not actual usage.
3.2 Invoicing. Fees will be invoiced in advance and otherwise in accordance with the relevant Order Form.
3.3 Overdue Charges. If any invoiced amount is not received by Provider by the due date, then without limiting Provider’s rights or remedies, those charges may accrue late interest at the rate of 1.5% of the outstanding balance per month.

4. PROPRIETARY RIGHTS AND LICENSES
4.1 Reservation of Rights. Subject to the limited rights expressly granted hereunder, Provider reserves all of its right, title and interest in and to the Services, including all of its related intellectual property rights. No rights are granted to Customer hereunder other than as expressly set forth herein.
4.2 Customer Data. Customer retains all right, title and interest in and to Customer Data. Customer grants Provider a worldwide, limited-term license to host, copy, transmit and display Customer Data as necessary for Provider to provide the Services in accordance with this Agreement.

5. CONFIDENTIALITY
5.1 Definition of Confidential Information. "Confidential Information" means all information disclosed by a party ("Disclosing Party") to the other party ("Receiving Party"), whether orally or in writing, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure.
5.2 Protection of Confidential Information. The Receiving Party will use the same degree of care that it uses to protect the confidentiality of its own confidential information of like kind (but not less than reasonable care).

6. DISCLAIMERS
EXCEPT AS EXPRESSLY PROVIDED HEREIN, NEITHER PARTY MAKES ANY WARRANTY OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY OR OTHERWISE, AND EACH PARTY SPECIFICALLY DISCLAIMS ALL IMPLIED WARRANTIES, INCLUDING ANY IMPLIED WARRANTY OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE OR NON-INFRINGEMENT, TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW.

7. LIMITATION OF LIABILITY
IN NO EVENT SHALL PROVIDER'S AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT EXCEED THE TOTAL AMOUNT PAID BY CUSTOMER HEREUNDER FOR THE SERVICES GIVING RISE TO THE LIABILITY IN THE TWELVE MONTHS PRECEDING THE FIRST INCIDENT OUT OF WHICH THE LIABILITY AROSE.

8. GOVERNING LAW
This Agreement shall be governed by the laws of the State of Victoria, Australia, without regard to its conflict of laws principles.

9. GENERAL PROVISIONS
9.1 Entire Agreement. This Agreement constitutes the entire agreement between the parties and supersedes all prior and contemporaneous agreements, proposals or representations, written or oral, concerning its subject matter.
  `;

  const PRIVACY_TEXT = `
PRIVACY POLICY & COPYRIGHT NOTICE
Last Updated: ${new Date().toLocaleDateString()}

1. COPYRIGHT NOTICE
© 2024 8ME Pty Ltd. All rights reserved.
The source code, design, interface, and proprietary algorithms (including the TrustSoft Bridge and AI Integration layers) of the 8ME platform are the exclusive property of 8ME Pty Ltd. Unauthorized reproduction, reverse engineering, or distribution of this software is strictly prohibited.

2. PRIVACY POLICY OVERVIEW
8ME Pty Ltd ("we", "us", "our") respects your privacy. This policy explains how we handle data within the 8ME platform.

3. DATA SOVEREIGNTY (BYOD)
Unlike traditional SaaS platforms, 8ME operates on a "Data Sovereignty" model.
3.1 Local Storage. By default, your tenancy data, trust ledgers, and owner details are stored locally within your browser's secure storage (IndexedDB) or on your own device.
3.2 External Database. If you opt to connect an external database (e.g., Supabase, AWS), you retain full legal ownership and control of that data. We do not have access to your external database credentials unless explicitly shared for support purposes.

4. AI DATA PROCESSING
4.1 Gemini Integration. 8ME uses Google's Gemini API to provide generative text features (e.g., listing descriptions, email drafts).
4.2 Data Minimization. When you use an AI feature, only the specific text or data required for that prompt (e.g., property address, tenant name) is sent to the API.
4.3 No Training. We do not use your proprietary rent roll data to train our global AI models.

5. THIRD-PARTY INTEGRATIONS
5.1 Utility Connections. If you use the revenue generation features (e.g., Movinghub, Direct Connect), tenant contact details are only shared with these providers when you explicitly click "Connect" or "Refer".
5.2 Analytics. We use anonymous aggregated analytics (Google Analytics) to improve application performance. This does not include personally identifiable information (PII) of your landlords or tenants.

6. SECURITY
We employ industry-standard encryption (TLS/SSL) for all data in transit. However, as the Data Controller under the BYOD model, you are responsible for securing your own device and database credentials.

7. CONTACT
For privacy inquiries, please contact: privacy@8me.com
  `;

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-white scroll-smooth selection:bg-indigo-500 selection:text-white">
      <Helmet>
        <title>8ME | The Operating System for Modern Agencies</title>
        <meta name="description" content="AI-powered property management software for high-performance real estate agencies." />
      </Helmet>

      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <BrandLogo variant="landing-nav" />
            </div>
            
            <div className="hidden md:flex space-x-8 text-sm font-bold text-slate-300">
              <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Platform</button>
              <button onClick={() => scrollToSection('ai')} className="hover:text-white transition-colors">AI Features</button>
              <button onClick={() => scrollToSection('trust')} className="hover:text-white transition-colors">Trust Accounting</button>
              <button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Pricing</button>
            </div>

            <div className="flex space-x-4">
              <button onClick={onLoginClick} className="text-sm font-bold text-slate-300 hover:text-white transition-colors cursor-pointer">Client Login</button>
              <button onClick={onRequestDemo} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer">
                Book Demo
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
          {/* Background Glows */}
          <div className="absolute top-0 right-0 p-64 bg-indigo-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 p-48 bg-emerald-600/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center space-x-2 bg-slate-800/50 border border-slate-700 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">New: Gemini 3 Integration Live</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.1] mb-8">
              The OS for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Modern Agencies.</span>
            </h1>
            
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Replace PropertyMe, Console, and InspectRealEstate with one unified platform. 
              Automated trust accounting, AI-drafted maintenance, and a native app experience for your team.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <button onClick={onRequestDemo} className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-indigo-50 transition-all shadow-xl active:scale-95 cursor-pointer z-20">
                 Start Free Trial
               </button>
               <button onClick={() => scrollToSection('pricing')} className="w-full sm:w-auto px-8 py-4 bg-slate-800/50 border border-slate-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all active:scale-95 cursor-pointer z-20 flex items-center justify-center">
                 View Pricing
               </button>
            </div>

            {/* Dashboard Preview - CSS MOCK (No external copyright images) */}
            <div className="mt-20 relative mx-auto max-w-5xl group">
               <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-20 pointer-events-none"></div>
               
               <div className="rounded-[2rem] border-8 border-slate-800 bg-slate-100 shadow-2xl overflow-hidden relative z-10 group-hover:scale-[1.02] transition-transform duration-700 aspect-video flex">
                  {/* Mock Sidebar */}
                  <div className="w-20 bg-slate-900 flex flex-col items-center py-6 space-y-6 shrink-0">
                     <div className="w-10 h-10 bg-indigo-600 rounded-xl"></div>
                     <div className="w-8 h-8 bg-slate-700 rounded-lg opacity-50"></div>
                     <div className="w-8 h-8 bg-slate-700 rounded-lg opacity-50"></div>
                     <div className="w-8 h-8 bg-slate-700 rounded-lg opacity-50"></div>
                  </div>
                  
                  {/* Mock Content */}
                  <div className="flex-1 bg-slate-50 p-6 overflow-hidden">
                     {/* Mock Header */}
                     <div className="flex justify-between items-center mb-8">
                        <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
                        <div className="flex space-x-3">
                           <div className="h-10 w-10 bg-white rounded-full shadow-sm"></div>
                           <div className="h-10 w-32 bg-indigo-600 rounded-xl shadow-sm"></div>
                        </div>
                     </div>
                     
                     {/* Mock Stats */}
                     <div className="grid grid-cols-4 gap-4 mb-8">
                        <div className="h-32 bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                           <div className="h-4 w-20 bg-slate-100 rounded mb-2"></div>
                           <div className="h-8 w-32 bg-slate-800 rounded"></div>
                        </div>
                        <div className="h-32 bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                           <div className="h-4 w-20 bg-slate-100 rounded mb-2"></div>
                           <div className="h-8 w-16 bg-emerald-500 rounded"></div>
                        </div>
                        <div className="h-32 bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                           <div className="h-4 w-20 bg-slate-100 rounded mb-2"></div>
                           <div className="h-8 w-24 bg-slate-800 rounded"></div>
                        </div>
                        <div className="h-32 bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                           <div className="h-4 w-20 bg-slate-100 rounded mb-2"></div>
                           <div className="h-8 w-28 bg-slate-800 rounded"></div>
                        </div>
                     </div>

                     {/* Mock Table */}
                     <div className="bg-white rounded-3xl shadow-sm border border-slate-200 h-full p-6">
                        <div className="flex justify-between mb-6">
                           <div className="h-6 w-32 bg-slate-200 rounded"></div>
                           <div className="h-6 w-20 bg-slate-100 rounded"></div>
                        </div>
                        <div className="space-y-4">
                           <div className="h-12 w-full bg-slate-50 rounded-xl"></div>
                           <div className="h-12 w-full bg-slate-50 rounded-xl"></div>
                           <div className="h-12 w-full bg-slate-50 rounded-xl"></div>
                           <div className="h-12 w-full bg-slate-50 rounded-xl"></div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Floating UI Elements */}
               <div className="absolute -right-8 top-20 z-30 bg-white p-4 rounded-2xl shadow-xl hidden lg:block animate-in slide-in-from-right duration-1000">
                  <div className="flex items-center space-x-3">
                     <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Trust Balance</p>
                        <p className="text-lg font-black text-slate-900">$1,240,500.00</p>
                     </div>
                  </div>
               </div>
               <div className="absolute -left-8 bottom-40 z-30 bg-white p-4 rounded-2xl shadow-xl hidden lg:block animate-in slide-in-from-left duration-1000 delay-200">
                  <div className="flex items-center space-x-3">
                     <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">AI Tasks</p>
                        <p className="text-lg font-black text-slate-900">14 Automated</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* Clients / Social Proof */}
        <section className="py-10 border-y border-slate-800 bg-slate-900/50">
           <div className="max-w-7xl mx-auto px-4 text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8">Designed for Australia's Best</p>
              <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                 <h3 className="text-xl md:text-2xl font-black text-white">Residential.</h3>
                 <h3 className="text-xl md:text-2xl font-black text-white">Commercial.</h3>
                 <h3 className="text-xl md:text-2xl font-black text-white">Project Sales.</h3>
                 <h3 className="text-xl md:text-2xl font-black text-white">Build-to-Rent.</h3>
                 <h3 className="text-xl md:text-2xl font-black text-white">Strata.</h3>
              </div>
           </div>
        </section>

        {/* Sponsor/Ads Section (Monetization Area) */}
        <section className="py-12 bg-slate-950 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center space-x-3 mb-8 opacity-90">
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-800 px-2 py-0.5 rounded">Pre-Built Integrations</span>
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Turn your agency into a profit center</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {/* Ad Slot 1 */}
               <a href="#" onClick={(e) => { e.preventDefault(); alert("SafeGuard Integration: Please contact support to enable insurance referrals."); }} className="group relative block bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-900/20 transition-all cursor-pointer">
                  <div className="absolute top-4 right-4 text-slate-600 group-hover:text-indigo-400">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </div>
                  <div className="flex items-center space-x-4 mb-4">
                     <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 font-black text-lg">
                        🛡️
                     </div>
                     <div>
                        <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors">SafeGuard</h4>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Insurance Partner</p>
                     </div>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">Protect your landlords with integrated cover. You receive a <strong className="text-indigo-400">referral fee for every policy</strong> bound through 8ME.</p>
                  <span className="text-xs font-bold text-indigo-500 group-hover:underline">Enable Integration &rarr;</span>
               </a>

               {/* Ad Slot 2 */}
               <a href="#" onClick={(e) => { e.preventDefault(); alert("ConnectNow Integration: Initiating setup wizard..."); }} className="group relative block bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-900/20 transition-all cursor-pointer">
                  <div className="absolute top-4 right-4 text-slate-600 group-hover:text-emerald-400">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </div>
                  <div className="flex items-center space-x-4 mb-4">
                     <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 font-black text-lg">
                        ⚡
                     </div>
                     <div>
                        <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors">ConnectNow</h4>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Utility Partner</p>
                     </div>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">Automate utility connections for new tenants. We pay your agency <strong className="text-emerald-400">$50 per successful connection</strong>.</p>
                  <span className="text-xs font-bold text-emerald-500 group-hover:underline">Activate Revenue Stream &rarr;</span>
               </a>

               {/* Ad Slot 3 */}
               <a href="#" onClick={(e) => { e.preventDefault(); alert("BMT Tax Integration: Linking to depreciation schedule order form."); }} className="group relative block bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-rose-500/50 hover:shadow-lg hover:shadow-rose-900/20 transition-all cursor-pointer">
                  <div className="absolute top-4 right-4 text-slate-600 group-hover:text-rose-400">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </div>
                  <div className="flex items-center space-x-4 mb-4">
                     <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 font-black text-lg">
                        📉
                     </div>
                     <div>
                        <h4 className="font-bold text-white group-hover:text-rose-400 transition-colors">BMT Tax</h4>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Depreciation Partner</p>
                     </div>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">Order tax schedules with one click. Your agency receives a <strong className="text-rose-400">10% rebate</strong> on all referred schedules.</p>
                  <span className="text-xs font-bold text-rose-500 group-hover:underline">Start Referring &rarr;</span>
               </a>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-slate-900 relative">
          <div className="max-w-7xl mx-auto px-4">
             <div className="text-center max-w-3xl mx-auto mb-20">
                <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Software that feels like <br /> it's installed on your brain.</h2>
                <p className="text-lg text-slate-400">Forget clunky server rooms. 8ME is an installable PWA that runs locally on your Mac or PC, synced instantly to the cloud.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Feature 1 - Trust */}
                <div id="trust" className="bg-slate-800/50 border border-slate-700 p-8 rounded-[2.5rem] hover:bg-slate-800 transition-colors scroll-mt-32">
                   <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 text-emerald-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <h3 className="text-2xl font-bold text-white mb-4">Trust Accounting</h3>
                   <p className="text-slate-400 leading-relaxed">
                      Fully compliant End-of-Month in minutes, not days. Automated bank reconciliation, bulk disbursement, and auditor-ready reports.
                   </p>
                </div>

                {/* Feature 2 - AI */}
                <div id="ai" className="bg-slate-800/50 border border-slate-700 p-8 rounded-[2.5rem] hover:bg-slate-800 transition-colors scroll-mt-32">
                   <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 text-indigo-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                   </div>
                   <h3 className="text-2xl font-bold text-white mb-4">Maintenance AI</h3>
                   <p className="text-slate-400 leading-relaxed">
                      Gemini 3 analyzes tenant requests, triages urgency, and drafts work orders for your tradespeople automatically.
                   </p>
                </div>

                {/* Feature 3 - Mobile */}
                <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-[2.5rem] hover:bg-slate-800 transition-colors">
                   <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 text-rose-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                   </div>
                   <h3 className="text-2xl font-bold text-white mb-4">Mobile Inspector</h3>
                   <p className="text-slate-400 leading-relaxed">
                      A dedicated inspection mode for iPad and Mobile. Takes photos, dictates notes, and syncs back to the office instantly.
                   </p>
                </div>
             </div>
          </div>
        </section>

        {/* Pricing CTA */}
        <section id="pricing" className="py-24 bg-white text-slate-900 scroll-mt-20">
           <div className="max-w-4xl mx-auto px-4 text-center">
              <h2 className="text-4xl font-black mb-4">Fair pricing for growing agencies.</h2>
              <div className="flex justify-center mb-8">
                 <div className="bg-slate-100 p-1 rounded-xl flex space-x-1">
                    <button 
                      onClick={() => setShowComparison(false)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${!showComparison ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                    >
                      Standard Pricing
                    </button>
                    <button 
                      onClick={() => setShowComparison(true)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${showComparison ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}
                    >
                      Competitor Comparison
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                 {/* Starter */}
                 <div className="p-8 rounded-3xl border border-slate-200 transition-all">
                    <h3 className="text-xl font-bold text-slate-900">Starter</h3>
                    <p className="text-3xl font-black mt-4">$54.99<span className="text-sm font-bold text-slate-400">/mo</span></p>
                    <p className="text-sm text-slate-500 mt-2 mb-6">Up to 50 Properties</p>
                    
                    {showComparison && (
                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-4 animate-in fade-in">
                         <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Market Avg</p>
                         <p className="text-lg font-black text-rose-500 strike-through line-through opacity-50">$110/mo</p>
                         <div className="mt-2 bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">
                            Save $660/yr
                         </div>
                      </div>
                    )}
                 </div>

                 {/* Growth */}
                 <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl scale-110 relative z-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Most Popular</div>
                    <h3 className="text-xl font-bold">Growth</h3>
                    <p className="text-4xl font-black mt-4">$199.99<span className="text-sm font-bold text-slate-400">/mo</span></p>
                    <p className="text-sm text-slate-400 mt-2 mb-6">Up to 200 Properties</p>
                    
                    {showComparison && (
                      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 animate-in fade-in">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Market Avg</p>
                         <p className="text-lg font-black text-slate-500 strike-through line-through decoration-slate-500">$330/mo</p>
                         <div className="mt-2 bg-emerald-500 text-white px-2 py-1 rounded text-xs font-bold">
                            Save $1,560/yr
                         </div>
                      </div>
                    )}

                    <button onClick={onRequestDemo} className="w-full mt-4 py-4 bg-white text-slate-900 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-50 transition-colors cursor-pointer">Start Trial</button>
                 </div>

                 {/* Enterprise */}
                 <div className="p-8 rounded-3xl border border-slate-200 transition-all">
                    <h3 className="text-xl font-bold text-slate-900">Enterprise</h3>
                    <p className="text-3xl font-black mt-4">$1,688<span className="text-sm font-bold text-slate-400">/mo</span></p>
                    <p className="text-sm text-slate-500 mt-2 mb-6">Unlimited Assets</p>

                    {showComparison && (
                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-4 animate-in fade-in">
                         <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Market Avg</p>
                         <p className="text-lg font-black text-rose-500 strike-through line-through opacity-50">$2,500+</p>
                         <div className="mt-2 bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">
                            Save $9k+/yr
                         </div>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-slate-900 border-t border-slate-800">
           <div className="max-w-4xl mx-auto px-4 text-center">
              <h2 className="text-4xl font-black text-white mb-6">Ready to upgrade your workflow?</h2>
              <p className="text-slate-400 mb-10 text-lg">Join 500+ agencies using 8ME to manage over $2B in property assets.</p>
              
              <div className="flex flex-col items-center max-w-sm mx-auto space-y-4">
                 <input 
                   type="email" 
                   placeholder="Enter your work email..." 
                   value={email}
                   onChange={e => setEmail(e.target.value)}
                   className="w-full px-6 py-4 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-indigo-500 font-bold placeholder:text-slate-600"
                 />
                 
                 <div className="flex items-center space-x-3 w-full px-2">
                    <input 
                        type="checkbox" 
                        id="terms" 
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />
                    <label htmlFor="terms" className="text-xs font-bold text-slate-400 cursor-pointer select-none">
                        I agree to the <button onClick={() => setShowTermsModal(true)} className="text-indigo-400 underline hover:text-indigo-300">Master Service Agreement</button>
                    </label>
                 </div>

                 <button 
                    onClick={onRequestDemo} 
                    disabled={!agreedToTerms}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-sm hover:bg-indigo-500 shadow-xl shadow-indigo-900/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                 >
                    Create Agency Account
                 </button>
                 <p className="text-xs text-slate-600 font-bold">No credit card required for 14-day trial.</p>
              </div>
           </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 border-t border-slate-900">
         <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-2 mb-4 md:mb-0">
                <div className="flex items-center space-x-2">
                    <BrandLogo variant="footer" />
                    <span className="text-slate-600 text-sm px-2 hidden md:inline">|</span>
                    <span className="text-slate-600 text-xs uppercase tracking-widest font-bold">Agent Operating System</span>
                </div>
                <span className="text-slate-700 text-xs font-bold md:ml-4">© {new Date().getFullYear()} 8ME Pty Ltd. All rights reserved.</span>
            </div>
            <div className="flex space-x-8 text-xs font-bold text-slate-500 uppercase tracking-widest">
               <button onClick={() => setShowSupportModal(true)} className="hover:text-white transition-colors">Support</button>
               <button onClick={() => setShowStatusModal(true)} className="hover:text-white transition-colors">Status</button>
               <button onClick={() => setShowPrivacyModal(true)} className="hover:text-white transition-colors">Legal & Privacy</button>
            </div>
         </div>
      </footer>

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm animate-in fade-in" onClick={() => setShowSupportModal(false)} />
          <div className="relative w-full max-w-lg bg-white text-slate-900 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-2xl font-black text-slate-900 tracking-tight">Contact Support</h3>
               <button onClick={() => setShowSupportModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>
             <div className="space-y-6">
                <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start space-x-4">
                   <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 00-2 2z" /></svg>
                   </div>
                   <div>
                      <h4 className="font-bold text-indigo-900">Email Us</h4>
                      <p className="text-sm text-indigo-700/80 mb-2">Our team typically responds within 2 hours during business hours.</p>
                      <a href="mailto:help@8me.com" className="text-sm font-bold text-indigo-600 underline">help@8me.com</a>
                   </div>
                </div>
                
                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start space-x-4">
                   <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                   </div>
                   <div>
                      <h4 className="font-bold text-emerald-900">Priority Phone Support</h4>
                      <p className="text-sm text-emerald-700/80 mb-2">Available Mon-Fri, 9am - 5pm AEST for Enterprise customers.</p>
                      <span className="text-sm font-bold text-emerald-600">1300 000 000</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm animate-in fade-in" onClick={() => setShowStatusModal(false)} />
          <div className="relative w-full max-w-lg bg-white text-slate-900 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 p-8">
             <div className="flex justify-between items-center mb-6">
               <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">System Status</h3>
               </div>
               <button onClick={() => setShowStatusModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>
             
             <div className="space-y-4">
                {['API Services', 'Database Clusters', 'Payments Gateway', 'CDN & Assets'].map((service) => (
                   <div key={service} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl bg-slate-50">
                      <span className="font-bold text-slate-700">{service}</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-widest">Operational</span>
                   </div>
                ))}
                
                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center text-sm">
                   <span className="text-slate-500 font-bold">Uptime (Last 30 Days)</span>
                   <span className="text-emerald-600 font-black">99.99%</span>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Full Screen Legal Modal (Terms) */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm animate-in fade-in" onClick={() => setShowTermsModal(false)} />
          <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
             <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Master Service Agreement</h3>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Effective Date: {new Date().toLocaleDateString()}</p>
               </div>
               <button onClick={() => setShowTermsModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                 <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-10 bg-white">
                <div className="prose prose-slate max-w-none text-sm font-medium leading-relaxed">
                   <pre className="whitespace-pre-wrap font-sans text-slate-600">{TERMS_TEXT}</pre>
                </div>
                <div className="mt-10 p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                   <p className="text-xs text-slate-500 italic text-center">
                      Disclaimer: This is a standard template generated by 8ME for the purpose of the platform demonstration. 
                      Real estate agencies should consult with their own legal counsel before signing binding agreements.
                   </p>
                </div>
             </div>

             <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
               <button 
                 onClick={() => { setShowTermsModal(false); setAgreedToTerms(true); }}
                 className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl"
               >
                 I Have Read & Agree
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Full Screen Privacy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm animate-in fade-in" onClick={() => setShowPrivacyModal(false)} />
          <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
             <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Legal & Privacy</h3>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Public Policy</p>
               </div>
               <button onClick={() => setShowPrivacyModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                 <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-10 bg-white">
                <div className="prose prose-slate max-w-none text-sm font-medium leading-relaxed">
                   <pre className="whitespace-pre-wrap font-sans text-slate-600">{PRIVACY_TEXT}</pre>
                </div>
             </div>

             <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
               <button 
                 onClick={() => setShowPrivacyModal(false)}
                 className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl"
               >
                 Close
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;

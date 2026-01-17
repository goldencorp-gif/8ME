
import React, { useState, useEffect, useRef } from 'react';
import { generatePropertyDescription, analyzeArrearsMessage, parseInvoiceRequest, generateQuoteRequestEmail, generateBackgroundCheck, generateOfficialDocument, generateProspectingMessage, generateConsentForm } from '../services/geminiService';
import { Property, Transaction, PropertyDocument } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface AIToolsProps {
  properties?: Property[];
  onAddTransaction?: (tx: Transaction | Transaction[]) => void;
  onUpdateProperty?: (property: Property) => void;
}

const FORM_CATEGORIES: Record<string, string[]> = {
  "Leasing & Onboarding": [
    "Management Authority", "Owner Details & Payment Authority", "Property Condition Report (Entry)",
    "Residential Tenancy Agreement", "Bond Lodgement Form", "Tenant Application Form",
    "Privacy Consent / ID Verification", "Key Register"
  ],
  "Routine Management": [
    "Inspection Report (Routine)", "Maintenance Request", "Work Order / Contractor Instruction", "Invoice Approval",
    "Rent Arrears Notice", "Tenant Communication Log", "Vehicle Logbook"
  ],
  "Trust Accounting": [
    "Receipt Record", "Disbursement Record", "Bank Reconciliation", "End-of-Month Statement",
    "Ledger Report", "Audit Trail Note"
  ],
  "Compliance & Risk": [
    "Smoke Alarm Compliance", "Safety Compliance Checklist", "Insurance Details (Landlord)",
    "Privacy Data Consent", "Incident Report"
  ],
  "End of Tenancy": [
    "Notice to Vacate", "Final Inspection Report", "Bond Claim / Disposal Form",
    "Exit Condition Report", "Refund Statement"
  ],
  "Business & Admin": [
    "Agency Agreement", "Fee Schedule", "Authority to Act (VCAT)"
  ]
};

const AITools: React.FC<AIToolsProps> = ({ properties = [], onAddTransaction, onUpdateProperty }) => {
  const { user } = useAuth();
  const [hasApiKey, setHasApiKey] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);
  
  // Navigation State
  const [viewMode, setViewMode] = useState<'quick' | 'docs'>('docs');
  const [selectedCategory, setSelectedCategory] = useState<string>("Leasing & Onboarding");
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

  // AI & Generation State
  const [loading, setLoading] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  
  // Screening Tool State
  const [applicantName, setApplicantName] = useState('');
  const [applicantId, setApplicantId] = useState('');
  const [applicantAddr, setApplicantAddr] = useState('');
  const [result, setResult] = useState('');

  // Consent Generator State
  const [consentName, setConsentName] = useState('');
  const [consentLicence, setConsentLicence] = useState('');
  const [consentState, setConsentState] = useState('');
  const [consentHtml, setConsentHtml] = useState<string | null>(null);
  
  // Check for API Key on mount
  useEffect(() => {
    const checkKey = () => {
        try {
            const settings = localStorage.getItem('proptrust_agency_settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                if (parsed.aiApiKey && parsed.aiApiKey.length > 5) {
                    setHasApiKey(true);
                    return;
                }
            }
            if (process.env.API_KEY && process.env.API_KEY.length > 5) {
                setHasApiKey(true);
                return;
            }
        } catch (e) {}
        setHasApiKey(false);
    };
    checkKey();
  }, []);

  // Access Control
  if (user?.plan === 'Trial') {
      return (
          <div className="max-w-4xl mx-auto py-24 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-400">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4">Feature Locked</h2>
              <p className="text-slate-500 max-w-lg mx-auto mb-8">
                  Smart Documents and AI generators are premium features available to subscribed clients only. <br/><br/>
                  Demo accounts are limited to Dashboard, Properties, Schedule, and Tenants views.
              </p>
          </div>
      );
  }

  const handleError = (e: any) => {
      console.error(e);
      alert(`AI Generation Failed:\n\n${e.message || 'Unknown Error'}\n\nPlease check your API Key in Settings.`);
  };

  const handleReportContent = () => {
      const reason = prompt("Report Inappropriate Content\n\nPlease describe why this AI-generated content is inappropriate or offensive:");
      if (reason) {
          console.log("[Moderation] Content flagged:", reason);
          alert("Thank you. This content has been flagged for moderation review.");
      }
  };

  const handleScreenApplicant = async () => {
    if (!applicantName || !applicantId) {
        alert("Please provide at least a Name and ID Number.");
        return;
    }
    setResult('');
    setLoading(true);
    try {
        const data = await generateBackgroundCheck(applicantName, applicantId, applicantAddr);
        
        let output = `## TENANT SCREENING REPORT\n`;
        output += `**Date:** ${new Date().toLocaleDateString()}\n`;
        output += `**Applicant:** ${applicantName}\n`;
        output += `**ID / DL:** ${applicantId}\n\n`;
        
        output += `### ASSESSMENT\n`;
        output += `**Risk Level:** ${data.riskLevel || 'Unknown'}\n`;
        output += `**Credit Score Est:** ${data.score || 'N/A'}\n\n`;
        
        output += `### SUMMARY\n${data.summary}\n\n`;
        
        output += `### RISK FACTORS\n`;
        if (data.flags && data.flags.length > 0) {
            data.flags.forEach((f: string) => output += `- ${f}\n`);
        } else {
            output += `- No significant negative flags detected.\n`;
        }
        
        output += `\n*Disclaimer: This is an AI-generated estimation based on provided data points. It does not constitute a formal credit check from Equifax or Experian.*`;

        setResult(output);
    } catch (e) { 
        handleError(e); 
    }
    setLoading(false);
  };

  const handleGenerateConsent = async () => {
      if (!consentName || !consentLicence || !consentState) {
          alert("Please fill in all fields.");
          return;
      }
      setLoading(true);
      setConsentHtml(null);
      try {
          const html = await generateConsentForm(consentName, consentLicence, consentState);
          setConsentHtml(html);
      } catch (e) {
          handleError(e);
      } finally {
          setLoading(false);
      }
  };

  const handlePrintConsent = () => {
      if (!consentHtml) return;
      const win = window.open('', '_blank');
      if (win) {
          win.document.write(consentHtml);
          win.document.close();
          // Small delay to ensure images/css load if any
          setTimeout(() => {
              win.print();
          }, 500);
      }
  };

  const handleGenerateForm = async () => {
      if (!selectedForm) return;
      if (!selectedPropertyId) {
          alert("Please select a property context for this form.");
          return;
      }
      
      const prop = properties.find(p => p.id === selectedPropertyId);
      if (!prop) return;

      setLoading(true);
      setGeneratedDoc(null);

      // Build context for AI
      const context = {
          property: prop,
          agency: { name: '8 Miles Estate', email: user?.email },
          date: new Date().toLocaleDateString(),
          user: user
      };

      try {
          const htmlContent = await generateOfficialDocument(selectedForm, context);
          setGeneratedDoc(htmlContent);
      } catch (e) {
          handleError(e);
      } finally {
          setLoading(false);
      }
  };

  const handleSaveDocument = () => {
      if (!generatedDoc || !selectedPropertyId || !selectedForm || !onUpdateProperty) return;
      const prop = properties.find(p => p.id === selectedPropertyId);
      if (!prop) return;

      const category = Object.keys(FORM_CATEGORIES).find(cat => FORM_CATEGORIES[cat].includes(selectedForm)) || 'Admin';
      
      const safeCategory: any = category.includes('Leasing') ? 'Legal' : category.includes('Trust') ? 'Legal' : 'Communication';

      const newDoc: PropertyDocument = {
          id: `DOC-${Date.now()}`,
          name: `${selectedForm} - ${new Date().toLocaleDateString()}.pdf`, // Naming convention
          category: safeCategory, 
          type: 'PDF', // We treat the HTML as a PDF source
          dateAdded: new Date().toISOString().split('T')[0],
          size: '120 KB',
          content: { customHtml: generatedDoc } // Store the HTML
      };

      onUpdateProperty({
          ...prop,
          documents: [...(prop.documents || []), newDoc]
      });

      alert("Document Saved to Property Vault!");
      setGeneratedDoc(null);
      setSelectedForm(null);
  };

  const inputClass = "w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900 bg-white placeholder:text-slate-400";

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* API Key Warning */}
      {!hasApiKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                    <h4 className="font-bold text-amber-900 text-sm">Gemini API Key Missing</h4>
                    <p className="text-xs text-amber-700">AI tools will not function without a valid API Key. Please add it in Settings.</p>
                </div>
            </div>
            <div className="text-xs font-bold text-amber-600">Go to Settings &rarr;</div>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-200 pb-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Smart Document Center</h2>
            <p className="text-slate-500 mt-2 max-w-xl">Generate compliant real estate forms, legal agreements, and manage applicant screening.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('docs')} 
                className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'docs' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Document Library
              </button>
              <button 
                onClick={() => setViewMode('quick')} 
                className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'quick' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Quick Tools
              </button>
          </div>
      </div>

      {/* VIEW: DOCUMENT LIBRARY */}
      {viewMode === 'docs' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[75vh]">
              {/* Sidebar Categories */}
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-y-auto">
                  <div className="p-6 bg-slate-50 border-b border-slate-100">
                      <h3 className="font-bold text-slate-900 text-sm">Categories</h3>
                  </div>
                  <div className="p-4 space-y-2">
                      {Object.keys(FORM_CATEGORIES).map(cat => (
                          <button
                              key={cat}
                              onClick={() => setSelectedCategory(cat)}
                              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-colors ${selectedCategory === cat ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                          >
                              {cat}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Form Selection & Context */}
              <div className="lg:col-span-3 flex flex-col gap-6 h-full overflow-hidden">
                  
                  {/* Selection Bar */}
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm shrink-0">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-1">
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Document Type</label>
                              <select 
                                  value={selectedForm || ''} 
                                  onChange={(e) => setSelectedForm(e.target.value)} 
                                  className={inputClass}
                              >
                                  <option value="">-- Choose Form --</option>
                                  {FORM_CATEGORIES[selectedCategory].map(form => (
                                      <option key={form} value={form}>{form}</option>
                                  ))}
                              </select>
                          </div>
                          <div className="md:col-span-1">
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Property Context</label>
                              <select 
                                  value={selectedPropertyId} 
                                  onChange={(e) => setSelectedPropertyId(e.target.value)} 
                                  className={inputClass}
                              >
                                  <option value="">-- Select Asset --</option>
                                  {properties.map(p => (
                                      <option key={p.id} value={p.id}>{p.address}</option>
                                  ))}
                              </select>
                          </div>
                          <div className="flex items-end">
                              <button 
                                  onClick={handleGenerateForm}
                                  disabled={loading || !selectedForm || !selectedPropertyId || !hasApiKey}
                                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              >
                                  {loading ? 'Drafting...' : 'Generate Document'}
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* Preview Area */}
                  <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
                      {generatedDoc ? (
                          <>
                              <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
                                  <div className="flex items-center gap-3">
                                      <div className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold uppercase tracking-widest">Preview Mode</div>
                                      <span className="font-bold text-sm truncate">{selectedForm}</span>
                                  </div>
                                  <div className="flex gap-3">
                                      <button onClick={handleReportContent} className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest">Report Issue</button>
                                      <button 
                                          onClick={handleSaveDocument}
                                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shadow-lg"
                                      >
                                          Save to Vault
                                      </button>
                                  </div>
                              </div>
                              <div className="flex-1 overflow-y-auto bg-slate-100 p-8 flex justify-center">
                                  <div className="bg-white shadow-2xl min-h-[800px] w-full max-w-[800px] origin-top">
                                      <iframe 
                                          srcDoc={generatedDoc}
                                          className="w-full h-[1130px] border-0"
                                          title="Document Preview"
                                      />
                                  </div>
                              </div>
                          </>
                      ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                              <svg className="w-24 h-24 mb-6 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              <h3 className="text-xl font-bold text-slate-900 mb-2">No Document Generated</h3>
                              <p className="text-sm text-slate-500 max-w-sm text-center">Select a category, document type, and property context above to have AI draft a legal document for you.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* VIEW: QUICK TOOLS (Screening, Consent, etc) */}
      {viewMode === 'quick' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Screening Input Card */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex items-center space-x-3 mb-6">
                      <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <h3 className="font-bold text-slate-900">Rental Applicant Check</h3>
                  </div>
                  <div className="space-y-4 flex-1">
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Applicant Full Name</label>
                          <input 
                            type="text" 
                            value={applicantName} 
                            onChange={(e) => setApplicantName(e.target.value)} 
                            placeholder="e.g. John Doe" 
                            className={inputClass} 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Driver's License / ID</label>
                          <input 
                            type="text" 
                            value={applicantId} 
                            onChange={(e) => setApplicantId(e.target.value)} 
                            placeholder="e.g. 12345678" 
                            className={inputClass} 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Address / History</label>
                          <textarea 
                            value={applicantAddr} 
                            onChange={(e) => setApplicantAddr(e.target.value)} 
                            placeholder="Previous address history..." 
                            className={`${inputClass} h-24 resize-none`} 
                          />
                      </div>
                  </div>
                  <button 
                    onClick={handleScreenApplicant} 
                    disabled={loading || !hasApiKey || !applicantName || !applicantId} 
                    className="w-full mt-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 disabled:bg-slate-300 transition-colors shadow-lg"
                  >
                      {loading ? 'Analyzing...' : 'Run Credit Check'}
                  </button>
              </div>

              {/* Consent Generator Card */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex items-center space-x-3 mb-6">
                      <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <h3 className="font-bold text-slate-900">Background Check Consent</h3>
                  </div>
                  <div className="space-y-4 flex-1">
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Applicant Full Name</label>
                          <input 
                            type="text" 
                            value={consentName} 
                            onChange={(e) => setConsentName(e.target.value)} 
                            placeholder="e.g. Jane Smith" 
                            className={inputClass} 
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Licence No.</label>
                              <input 
                                type="text" 
                                value={consentLicence} 
                                onChange={(e) => setConsentLicence(e.target.value)} 
                                placeholder="e.g. 87654321" 
                                className={inputClass} 
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">State</label>
                              <select 
                                value={consentState}
                                onChange={(e) => setConsentState(e.target.value)}
                                className={inputClass}
                              >
                                <option value="">Select...</option>
                                <option value="NSW">NSW</option>
                                <option value="VIC">VIC</option>
                                <option value="QLD">QLD</option>
                                <option value="WA">WA</option>
                                <option value="SA">SA</option>
                                <option value="TAS">TAS</option>
                                <option value="ACT">ACT</option>
                                <option value="NT">NT</option>
                              </select>
                          </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-500 leading-relaxed italic">
                              Generates a compliant consent form for checking TICA, NTD, and credit history databases using the ID provided.
                          </p>
                      </div>
                  </div>
                  <button 
                    onClick={handleGenerateConsent} 
                    disabled={loading || !hasApiKey || !consentName || !consentLicence || !consentState} 
                    className="w-full mt-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 disabled:bg-slate-300 transition-colors shadow-lg"
                  >
                      {loading ? 'Drafting...' : 'Draft Consent Form'}
                  </button>
              </div>

              {/* Result: Screening Report */}
              {result && (
                  <div className="bg-white p-8 rounded-[2rem] border border-indigo-200 shadow-xl shadow-indigo-500/10 animate-in zoom-in-95 duration-300 flex flex-col">
                      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                          <h4 className="text-lg font-black text-slate-900 tracking-tight">Screening Result</h4>
                          <div className="flex space-x-3">
                              <button 
                                  onClick={handleReportContent}
                                  className="px-3 py-1 bg-white border border-slate-200 text-slate-500 rounded-md text-xs font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                              >
                                  Report
                              </button>
                              <button 
                                  onClick={() => { navigator.clipboard.writeText(result); alert('Report Copied!'); }}
                                  className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-200"
                              >
                                  Copy Report
                              </button>
                          </div>
                      </div>
                      <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed font-medium bg-slate-50 p-6 rounded-2xl border border-slate-100 overflow-y-auto max-h-[500px]">
                          {result}
                      </div>
                  </div>
              )}

              {/* Result: Consent Form */}
              {consentHtml && (
                  <div className="bg-white p-8 rounded-[2rem] border border-emerald-200 shadow-xl shadow-emerald-500/10 animate-in zoom-in-95 duration-300 flex flex-col min-h-[500px]">
                      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                          <h4 className="text-lg font-black text-slate-900 tracking-tight">Consent Form Ready</h4>
                          <div className="flex space-x-3">
                              <button 
                                  onClick={handleReportContent}
                                  className="px-3 py-1 bg-white border border-slate-200 text-slate-500 rounded-md text-xs font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                              >
                                  Report
                              </button>
                              <button 
                                  onClick={handlePrintConsent}
                                  className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold hover:bg-emerald-200"
                              >
                                  Print / PDF
                              </button>
                          </div>
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden relative">
                          <iframe 
                              srcDoc={consentHtml} 
                              className="w-full h-full absolute inset-0 border-0"
                              title="Consent Preview"
                          />
                      </div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

export default AITools;

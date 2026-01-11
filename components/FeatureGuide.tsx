
import React from 'react';

interface FeatureGuideProps {
  onClose: () => void;
}

const FeatureGuide: React.FC<FeatureGuideProps> = ({ onClose }) => {
  const guides = [
    {
      title: "Portfolio Dashboard",
      desc: "Your command center. View high-level trust balances, occupancy rates, and urgent maintenance at a glance.",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Trust Accounting",
      desc: "Powered by TrustSoft integration. Automated bank feeds, rent receipting, and effortless end-of-month disbursements.",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      title: "AI Property Assistant",
      desc: "Use Gemini 3 to draft high-end listing descriptions or professional arrears notices in seconds.",
      icon: "M13 10V3L4 14h7v7l9-11h-7z",
      color: "text-indigo-600",
      bg: "bg-indigo-50"
    },
    {
      title: "Maintenance Hub",
      desc: "Track repairs from initial request to completion. Assign tradespeople and manage quotes seamlessly.",
      icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
      color: "text-amber-600",
      bg: "bg-amber-50"
    }
  ];

  return (
    <div className="bg-white border border-indigo-100 rounded-3xl p-6 shadow-xl shadow-indigo-100/50 mb-8 relative overflow-hidden animate-in slide-in-from-top duration-500">
      <div className="absolute top-0 right-0 p-4">
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
          title="Dismiss guide"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="flex items-center space-x-4 mb-6">
        <div className="bg-indigo-600 p-2 rounded-xl text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Welcome to 8ME</h2>
          <p className="text-slate-500 text-sm">Combining world-class property management with intelligent trust accounting.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {guides.map((guide, idx) => (
          <div key={idx} className="group hover:bg-slate-50 p-4 rounded-2xl transition-colors cursor-default border border-transparent hover:border-slate-100">
            <div className={`w-10 h-10 ${guide.bg} ${guide.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={guide.icon} />
              </svg>
            </div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">{guide.title}</h4>
            <p className="text-slate-500 text-xs leading-relaxed">{guide.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureGuide;

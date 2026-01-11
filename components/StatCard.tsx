
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, trend, trendUp }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              <svg className={`w-4 h-4 mr-1 ${trendUp ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className="bg-slate-50 p-3 rounded-xl text-indigo-600">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;

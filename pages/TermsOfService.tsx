
import React from 'react';
import { BrandLogo } from '../components/BrandLogo';

interface TermsOfServiceProps {
  onBack?: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-6 px-4 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <BrandLogo variant="header" />
          {onBack && (
            <button 
              onClick={onBack}
              className="text-sm font-bold text-slate-300 hover:text-white transition-colors"
            >
              Back to Home
            </button>
          )}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">Terms of Service & License</h1>
          <p className="text-slate-500 font-medium mb-8">Effective Date: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600">
            
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 not-prose">
              <h3 className="font-bold text-slate-900 mb-2">Developer & Copyright Information</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li><strong>Developed By:</strong> 8 Miles Estate Pty Ltd</li>
                <li><strong>Copyright:</strong> © {new Date().getFullYear()} 8 Miles Estate Pty Ltd. All rights reserved.</li>
                <li><strong>Trademarks:</strong> "8ME", "8 Miles Estate", and the 8ME Logo are trademarks of 8 Miles Estate Pty Ltd.</li>
                <li><strong>Contact:</strong> support@8me.com</li>
              </ul>
            </div>

            <h3>1. Acceptance of Terms</h3>
            <p>
              By downloading, installing, or using the 8ME application ("Application"), you agree to be bound by this Master Subscription Agreement ("Agreement"). If you do not agree to these terms, do not use the Application.
            </p>

            <h3>2. Grant of License</h3>
            <p>
              8 Miles Estate grants you a revocable, non-exclusive, non-transferable, limited license to download, install, and use the Application strictly in accordance with the terms of this Agreement.
            </p>

            <h3>3. Usage Restrictions</h3>
            <p>
              You agree not to, and you will not permit others to:
            </p>
            <ul>
              <li>License, sell, rent, lease, assign, distribute, transmit, host, outsource, disclose, or otherwise commercially exploit the Application.</li>
              <li>Modify, make derivative works of, disassemble, decrypt, reverse compile, or reverse engineer any part of the Application.</li>
              <li>Remove, alter, or obscure any proprietary notice (including any copyright or trademark notice) of 8 Miles Estate or its affiliates.</li>
            </ul>

            <h3>4. Intellectual Property</h3>
            <p>
              The Application, including without limitation all copyrights, patents, trademarks, trade secrets, and other intellectual property rights are, and shall remain, the sole and exclusive property of 8 Miles Estate Pty Ltd.
            </p>

            <h3>5. Data Sovereignty & AI Usage</h3>
            <p>
              The Application utilizes a "Bring Your Own Device" (BYOD) architecture. You retain ownership of your tenancy and ledger data stored locally on your device. Features utilizing Google Gemini AI transmit data transiently for processing; this data is not used to train our models.
            </p>

            <h3>6. Disclaimer of Warranty</h3>
            <p>
              The Application is provided to you "AS IS" and "AS AVAILABLE" and with all faults and defects without warranty of any kind. To the maximum extent permitted under applicable law, 8 Miles Estate explicitly disclaims all warranties, whether express, implied, statutory, or otherwise.
            </p>

            <h3>7. Limitation of Liability</h3>
            <p>
              Notwithstanding any damages that you might incur, the entire liability of 8 Miles Estate and any of its suppliers under any provision of this Agreement and your exclusive remedy for all of the foregoing shall be limited to the amount actually paid by you for the Application or subscription services in the last 12 months.
            </p>

            <h3>8. Governing Law</h3>
            <p>
              This Agreement shall be governed by and construed in accordance with the laws of Australia, excluding its conflicts of law rules.
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-500 py-8 text-center text-xs font-bold uppercase tracking-widest">
        &copy; {new Date().getFullYear()} 8 Miles Estate Pty Ltd.
      </footer>
    </div>
  );
};

export default TermsOfService;

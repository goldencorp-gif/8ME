
import React, { useState, useEffect } from 'react';
import { Property } from '../types';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (property: Property) => void;
  editProperty?: Property | null;
}

const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ isOpen, onClose, onAdd, editProperty }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    address: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    primaryTenant: '',
    coTenant: '',
    tenantPhone: '',
    tenantEmail: '',
    rentAmount: '',
    rentFrequency: 'Weekly' as Property['rentFrequency'],
    includesGst: false,
    status: 'Leased' as Property['status'],
    propertyType: 'Residential' as Property['propertyType'],
    bsb: '',
    accountNumber: '',
    bondAmount: '',
    leaseStart: '',
    leaseEnd: '',
    nextInspection: '',
    mgtFee: '7',
  });

  useEffect(() => {
    if (editProperty && isOpen) {
      // Split existing tenant name if it contains " & "
      const [t1, t2] = (editProperty.tenantName || '').split(' & ');

      setFormData({
        address: editProperty.address,
        ownerName: editProperty.ownerName,
        ownerPhone: editProperty.ownerPhone || '',
        ownerEmail: editProperty.ownerEmail || '',
        primaryTenant: t1 || '',
        coTenant: t2 || '',
        tenantPhone: editProperty.tenantPhone || '',
        tenantEmail: editProperty.tenantEmail || '',
        rentAmount: editProperty.rentAmount.toString(),
        rentFrequency: editProperty.rentFrequency,
        includesGst: editProperty.includesGst,
        status: editProperty.status,
        propertyType: editProperty.propertyType,
        bsb: editProperty.bankDetails?.bsb || '',
        accountNumber: editProperty.bankDetails?.accountNumber || '',
        bondAmount: editProperty.bondAmount?.toString() || '',
        leaseStart: editProperty.leaseStart || '',
        leaseEnd: editProperty.leaseEnd || '',
        nextInspection: editProperty.nextInspectionDate || '',
        mgtFee: editProperty.managementFeePercent.toString(),
      });
    } else if (!editProperty && isOpen) {
      setFormData({
        address: '', ownerName: '', ownerPhone: '', ownerEmail: '', 
        primaryTenant: '', coTenant: '', tenantPhone: '', tenantEmail: '',
        rentAmount: '', rentFrequency: 'Weekly',
        includesGst: false, status: 'Leased', propertyType: 'Residential',
        bsb: '', accountNumber: '', bondAmount: '', leaseStart: '', leaseEnd: '', nextInspection: '', mgtFee: '7'
      });
    }
  }, [editProperty, isOpen]);

  if (!isOpen) return null;

  const validateStep = () => {
    if (step === 1) return formData.address.length > 5 && formData.ownerName.length > 2;
    if (step === 2) return formData.rentAmount !== '';
    if (step === 3) return formData.bsb.length >= 6 && formData.accountNumber.length >= 6;
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    } else {
      alert("Please complete the required fields for this step.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    // Combine tenant names
    const fullTenantName = [formData.primaryTenant, formData.coTenant].filter(Boolean).join(' & ');

    const newProperty: Property = {
      id: editProperty ? editProperty.id : `PROP-${Date.now()}`,
      address: formData.address,
      ownerName: formData.ownerName,
      ownerPhone: formData.ownerPhone,
      ownerEmail: formData.ownerEmail,
      tenantName: fullTenantName || undefined,
      tenantPhone: formData.tenantPhone,
      tenantEmail: formData.tenantEmail,
      rentAmount: parseFloat(formData.rentAmount) || 0,
      rentFrequency: formData.rentFrequency,
      includesGst: formData.includesGst,
      status: formData.status,
      propertyType: formData.propertyType,
      managementFeePercent: parseFloat(formData.mgtFee) || 0,
      bankDetails: {
        accountName: formData.ownerName,
        bsb: formData.bsb,
        accountNumber: formData.accountNumber,
      },
      bondAmount: parseFloat(formData.bondAmount) || 0,
      leaseStart: formData.leaseStart,
      leaseEnd: formData.leaseEnd,
      nextInspectionDate: formData.nextInspection,
      imageUrl: editProperty?.imageUrl || `https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80`
    };
    
    onAdd(newProperty);
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  const inputClasses = "w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 font-bold placeholder:text-slate-400 text-sm";
  const labelClasses = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={handleClose} />
      
      <div className="relative bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{editProperty ? 'Edit Management' : 'Add New Management'}</h3>
            <div className="flex items-center space-x-4 mt-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === s ? 'bg-indigo-600 text-white' : 
                    step > s ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {step > s ? '✓' : s}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${step === s ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {s === 1 ? 'Asset' : s === 2 ? 'Lease' : 'Trust'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {/* Form Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <form id="onboarding-form" onSubmit={handleSubmit} className="space-y-8">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200/50 rounded-2xl">
                  <button type="button" onClick={() => setFormData({...formData, propertyType: 'Residential'})} className={`py-2.5 text-sm font-bold rounded-xl transition-all ${formData.propertyType === 'Residential' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}>Residential Asset</button>
                  <button type="button" onClick={() => setFormData({...formData, propertyType: 'Commercial'})} className={`py-2.5 text-sm font-bold rounded-xl transition-all ${formData.propertyType === 'Commercial' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}>Commercial Asset</button>
                </div>

                <div>
                  <label className={labelClasses}>Property Address *</label>
                  <input 
                    required 
                    autoFocus
                    placeholder="Search or enter full address..." 
                    className={inputClasses} 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                  />
                </div>

                <div>
                  <label className={labelClasses}>Owner Full Name *</label>
                  <input 
                    required 
                    placeholder="As per Title Deed" 
                    className={inputClasses} 
                    value={formData.ownerName} 
                    onChange={e => setFormData({...formData, ownerName: e.target.value})} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClasses}>Owner Phone</label>
                    <input 
                      placeholder="+61 400 000 000" 
                      className={inputClasses} 
                      value={formData.ownerPhone} 
                      onChange={e => setFormData({...formData, ownerPhone: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Owner Email</label>
                    <input 
                      type="email"
                      placeholder="owner@example.com" 
                      className={inputClasses} 
                      value={formData.ownerEmail} 
                      onChange={e => setFormData({...formData, ownerEmail: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-1">
                    <label className={labelClasses}>Rent Amount ($) *</label>
                    <input 
                      required 
                      type="number" 
                      placeholder="0.00" 
                      className={inputClasses} 
                      value={formData.rentAmount} 
                      onChange={e => setFormData({...formData, rentAmount: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Rent Frequency</label>
                    <select 
                      className={inputClasses} 
                      value={formData.rentFrequency} 
                      onChange={e => setFormData({...formData, rentFrequency: e.target.value as any})}
                    >
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Annually">Annually</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>Primary Tenant</label>
                      <input 
                        placeholder="Full Name" 
                        className={inputClasses} 
                        value={formData.primaryTenant} 
                        onChange={e => setFormData({...formData, primaryTenant: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Co-Tenant (Optional)</label>
                      <input 
                        placeholder="Full Name" 
                        className={inputClasses} 
                        value={formData.coTenant} 
                        onChange={e => setFormData({...formData, coTenant: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>Tenant Phone</label>
                      <input 
                        placeholder="+61 411 111 111" 
                        className={inputClasses} 
                        value={formData.tenantPhone} 
                        onChange={e => setFormData({...formData, tenantPhone: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Tenant Email</label>
                      <input 
                        type="email"
                        placeholder="tenant@example.com" 
                        className={inputClasses} 
                        value={formData.tenantEmail} 
                        onChange={e => setFormData({...formData, tenantEmail: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className={labelClasses}>Next Inspection Date</label>
                    <input 
                      type="date" 
                      className={inputClasses} 
                      value={formData.nextInspection} 
                      onChange={e => setFormData({...formData, nextInspection: e.target.value})} 
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-bold">
                      Recommended: {formData.propertyType === 'Commercial' ? 'Annually' : 'Bi-Annually (6mo)'}
                    </p>
                  </div>
                  <div>
                    <label className={labelClasses}>Lease Expiry</label>
                    <input 
                      type="date" 
                      className={inputClasses} 
                      value={formData.leaseEnd} 
                      onChange={e => setFormData({...formData, leaseEnd: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-start space-x-3">
                  <div className="p-1.5 bg-indigo-600 rounded-lg text-white mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-indigo-900">Trust Accounting Security</h5>
                    <p className="text-xs text-indigo-700 leading-relaxed mt-0.5">Enter the landlord's Trust Account details for automated disbursements via TrustSoft.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClasses}>Bank BSB *</label>
                    <input 
                      required 
                      placeholder="000-000" 
                      maxLength={7}
                      className={inputClasses} 
                      value={formData.bsb} 
                      onChange={e => setFormData({...formData, bsb: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Account Number *</label>
                    <input 
                      required 
                      placeholder="Min 6 digits" 
                      className={inputClasses} 
                      value={formData.accountNumber} 
                      onChange={e => setFormData({...formData, accountNumber: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClasses}>Security Bond Held ($)</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      className={inputClasses} 
                      value={formData.bondAmount} 
                      onChange={e => setFormData({...formData, bondAmount: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Management Fee (%)</label>
                    <input 
                      required 
                      type="number" 
                      step="0.1"
                      placeholder="7.5" 
                      className={inputClasses} 
                      value={formData.mgtFee} 
                      onChange={e => setFormData({...formData, mgtFee: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <input 
                    id="gst-toggle"
                    type="checkbox" 
                    checked={formData.includesGst} 
                    onChange={e => setFormData({...formData, includesGst: e.target.checked})} 
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                  />
                  <label htmlFor="gst-toggle" className="text-sm font-semibold text-slate-700 cursor-pointer">Asset is GST Registered</label>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex space-x-3 w-full">
            {step > 1 ? (
              <button 
                type="button" 
                onClick={() => setStep(step - 1)} 
                className="px-6 py-3.5 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Go Back
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleClose}
                className="px-6 py-3.5 text-slate-400 font-bold hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
            )}
            
            {step < 3 ? (
              <button 
                type="button" 
                onClick={handleNext} 
                className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95"
              >
                Next Step
              </button>
            ) : (
              <button 
                type="submit" 
                form="onboarding-form"
                className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
              >
                {editProperty ? 'Save Changes' : 'Finalize Onboarding'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPropertyModal;

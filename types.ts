
export interface PropertyDocument {
  id: string;
  name: string;
  category: 'Legal' | 'Inspection' | 'Communication' | 'Media' | 'Invoices' | 'Applications';
  subCategory?: 'Owner' | 'Tenant'; // Specific for Invoice stream
  type: 'PDF' | 'Image' | 'Text' | 'Email' | 'SMS';
  dateAdded: string;
  size?: string;
  url?: string;
  previewUrl?: string;
  content?: any; 
}

export interface InspectionFollowUp {
  id: string;
  description: string;
  status: 'Pending' | 'Completed';
  category: 'Cleaning' | 'Damage' | 'Garden' | 'Other';
}

export interface UserProfile {
  name: string;
  title: string;
  email: string;
  phone: string;
  officeAddress?: string; // For Logbook calculations
  plan?: 'Trial' | 'Starter' | 'Growth' | 'Enterprise'; // Added for feature gating
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'Master' | 'Admin' | 'Manager' | 'Viewer';
  status: 'Active' | 'Suspended' | 'Paused';
  lastActive: string;
}

export interface Agency {
  id: string;
  name: string;
  contactEmail: string;
  status: 'Active' | 'Trial' | 'Suspended' | 'Paused'; // Added Paused
  subscriptionPlan: 'Starter' | 'Growth' | 'Enterprise';
  usersCount: number; 
  licenseLimit: number; 
  propertiesCount: number;
  propertyLimit?: number; // Cap on listings based on plan (e.g., 50, 200, or -1 for unlimited)
  joinedDate: string;
  termsAcceptedAt?: string; // ISO Date string of when MSA was accepted/signed
  mrr: number;
  websiteUrl?: string; 
  passwordHash?: string; // Stored securely in central registry
}

export interface Property {
  id: string;
  address: string;
  ownerName: string;
  ownerPhone?: string;
  ownerEmail?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  rentAmount: number;
  rentFrequency: 'Weekly' | 'Monthly' | 'Annually';
  includesGst: boolean;
  status: 'Leased' | 'Vacant' | 'Arrears' | 'Maintenance';
  propertyType: 'Residential' | 'Commercial';
  imageUrl: string;
  description?: string;
  beds?: number;
  baths?: number;
  parking?: number;
  bankDetails?: {
    accountName: string;
    bsb: string;
    accountNumber: string;
  };
  leaseStart?: string;
  leaseEnd?: string;
  bondAmount?: number;
  managementFeePercent: number;
  documents?: PropertyDocument[];
  nextInspectionDate?: string;
  inspectionFollowUps?: InspectionFollowUp[];
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'Credit' | 'Debit';
  amount: number;
  gst?: number;
  reference: string; // Receipt # or Cheque #
  account: 'Trust' | 'General';
  payerPayee?: string; // "Received From" or "Paid To"
  method?: 'EFT' | 'BPAY' | 'Cheque' | 'D-Debit';
  propertyId?: string; // Link to specific ledger
}

export interface MaintenanceTask {
  id: string;
  propertyId: string;
  propertyAddress: string;
  issue: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'New' | 'Quote' | 'In Progress' | 'Completed';
  requestDate: string;
}

export interface Inquiry {
  id: string;
  propertyId?: string;
  propertyName?: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  message: string;
  date: string;
  status: 'New' | 'Replied' | 'Archived';
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; 
  time?: string;
  type: 'Inspection' | 'Maintenance' | 'Lease' | 'Legal' | 'Viewing' | 'Call' | 'Email' | 'Other';
  propertyAddress?: string;
  description?: string;
  checkedOut?: boolean; // Verifies attendance for Logbook
  contact?: string; // For Calls/Emails
  reminderSet?: boolean; // For notifications
}

export interface LogbookEntry {
  id: string;
  date: string;
  vehicle: string;
  startOdo: number;
  endOdo: number;
  distance: number;
  purpose: string; // e.g., "Inspection - 123 Smith St"
  category: 'Business' | 'Private';
  driver: string;
}

export interface HistoryRecord {
  id: string;
  date: string; // ISO String
  type: 'Communication' | 'Event' | 'Note' | 'Maintenance' | 'System';
  description: string;
  propertyAddress?: string;
  relatedId?: string; 
  metadata?: any;
}

export type LandingView = 'home' | 'listings' | 'listing-detail' | 'blog' | 'saas';

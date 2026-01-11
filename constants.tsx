
import { Property, Transaction, MaintenanceTask } from './types';

const getRelativeDate = (daysOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    address: '123 Ocean View Drive, Sydney NSW 2000',
    ownerName: 'Alice Johnson',
    ownerPhone: '+61 400 123 456',
    ownerEmail: 'alice.j@example.com',
    tenantName: 'Mark Smith',
    rentAmount: 1250,
    rentFrequency: 'Weekly',
    includesGst: true,
    status: 'Leased',
    propertyType: 'Residential',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    beds: 4,
    baths: 3,
    parking: 2,
    managementFeePercent: 7,
    nextInspectionDate: getRelativeDate(3), 
    description: "A stunning coastal residence offering panoramic ocean views and luxury finishes throughout.",
    inspectionFollowUps: [
      { id: 'if-1', description: 'Clean oven racks', status: 'Pending', category: 'Cleaning' },
      { id: 'if-2', description: 'Weed garden beds', status: 'Pending', category: 'Garden' }
    ]
  },
  {
    id: '2',
    address: '45 Blue Gum Road, Melbourne VIC 3000',
    ownerName: 'Robert White',
    rentAmount: 2200,
    rentFrequency: 'Monthly',
    includesGst: false,
    status: 'Vacant',
    propertyType: 'Residential',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    beds: 3,
    baths: 2,
    parking: 1,
    managementFeePercent: 7.5,
    description: "Nestled in a quiet cul-de-sac, this charming family home features a large backyard and modern kitchen."
  },
  {
    id: '3',
    address: '12/88 High Street, Brisbane QLD 4000',
    ownerName: 'James Dean',
    rentAmount: 550,
    rentFrequency: 'Weekly',
    includesGst: true,
    status: 'Vacant',
    propertyType: 'Commercial',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    managementFeePercent: 8,
    description: "Prime boutique office space in the heart of the CBD. Flexible layout suitable for professional services."
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', date: getRelativeDate(-1), description: 'Rent Receipt: 123 Ocean View', type: 'Credit', amount: 1250.00, gst: 0, reference: 'REC-1001', account: 'Trust', payerPayee: 'Mark Smith', method: 'EFT', propertyId: '1' },
  { id: 't2', date: getRelativeDate(-2), description: 'Plumbing Repair: Tap Leak', type: 'Debit', amount: 150.00, gst: 13.64, reference: 'EFT-8890', account: 'Trust', payerPayee: 'Bob The Plumber', method: 'EFT', propertyId: '2' },
  { id: 't3', date: getRelativeDate(-5), description: 'Management Fee: Jan', type: 'Debit', amount: 87.50, gst: 7.95, reference: 'FEE-99', account: 'General', payerPayee: '8ME Agency', method: 'D-Debit', propertyId: '1' },
];

export const MOCK_MAINTENANCE: MaintenanceTask[] = [
  { id: 'm1', propertyId: '2', propertyAddress: '45 Blue Gum Road', issue: 'Leaking tap in master bathroom', priority: 'Medium', status: 'In Progress', requestDate: getRelativeDate(-3) },
];

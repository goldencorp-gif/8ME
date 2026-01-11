
import { Property, Transaction, MaintenanceTask, CalendarEvent, LogbookEntry } from '../types';
import { MOCK_PROPERTIES, MOCK_TRANSACTIONS, MOCK_MAINTENANCE } from '../constants';

// --- DATA LAYER (BYOD Support) ---
// This file acts as the bridge between the Frontend and the Database.
// It checks the configuration to decide whether to read/write to LocalStorage or an external Cloud Provider.

const LATENCY = 400; // ms to simulate server roundtrip

// Check Cloud Config
const getStoragePrefix = () => {
    try {
        const config = localStorage.getItem('proptrust_cloud_config');
        if (config) {
            const parsed = JSON.parse(config);
            // If cloud is enabled, use a different storage key prefix to simulate a distinct DB
            // In a real implementation, this would trigger an API call to parsed.endpoint
            if (parsed.enabled && parsed.endpoint) {
                console.log(`[DB] Connected to External Cloud: ${parsed.provider} at ${parsed.endpoint}`);
                return `cloud_${parsed.provider.toLowerCase()}_`;
            }
        }
    } catch(e) {
        // ignore
    }
    return 'proptrust_db_'; // Default Local
};

// Helper to simulate DB read
const dbRead = <T>(table: string, defaults: T): Promise<T> => {
  const prefix = getStoragePrefix();
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const data = localStorage.getItem(`${prefix}${table}`);
        // If connected to cloud but empty, return empty array instead of mock data (to show clean slate)
        if (prefix.startsWith('cloud_') && !data) {
            resolve((Array.isArray(defaults) ? [] : {}) as any);
        } else {
            resolve(data ? JSON.parse(data) : defaults);
        }
      } catch (e) {
        resolve(defaults);
      }
    }, LATENCY);
  });
};

// Helper to simulate DB write
const dbWrite = (table: string, data: any): Promise<void> => {
  const prefix = getStoragePrefix();
  return new Promise((resolve) => {
    setTimeout(() => {
      localStorage.setItem(`${prefix}${table}`, JSON.stringify(data));
      resolve();
    }, LATENCY);
  });
};

// Export identifying info about current connection for UI
export const getDbConnectionInfo = () => {
    const prefix = getStoragePrefix();
    if (prefix.startsWith('cloud_')) {
        return { type: 'Cloud', label: 'External DB Connected' };
    }
    return { type: 'Local', label: 'Local Browser Storage' };
};

export const db = {
  properties: {
    list: () => dbRead<Property[]>('properties', MOCK_PROPERTIES),
    save: async (property: Property) => {
      const list = await dbRead<Property[]>('properties', MOCK_PROPERTIES);
      const index = list.findIndex(p => p.id === property.id);
      const updated = index >= 0 
        ? list.map(p => p.id === property.id ? property : p)
        : [property, ...list];
      await dbWrite('properties', updated);
      return property;
    },
    delete: async (id: string) => {
      const list = await dbRead<Property[]>('properties', MOCK_PROPERTIES);
      await dbWrite('properties', list.filter(p => p.id !== id));
    }
  },

  transactions: {
    list: () => dbRead<Transaction[]>('transactions', MOCK_TRANSACTIONS),
    create: async (txOrList: Transaction | Transaction[]) => {
      const list = await dbRead<Transaction[]>('transactions', MOCK_TRANSACTIONS);
      const newItems = Array.isArray(txOrList) ? txOrList : [txOrList];
      await dbWrite('transactions', [...newItems, ...list]);
    },
    // IMMUTABILITY ENFORCEMENT:
    // We intentionally make this a no-op or partial archive. 
    // Trust transactions should NEVER be deleted, only reversed.
    // Even if a property is deleted, the ledger history must remain for audit purposes.
    deleteLinkedTo: async (identifier: string) => {
      console.log(`[Audit Compliance] Preserving ledger history for ${identifier}. Transactions are immutable.`);
      // No deletion occurs.
      return; 
    }
  },

  maintenance: {
    list: () => dbRead<MaintenanceTask[]>('maintenance', MOCK_MAINTENANCE),
    save: async (task: MaintenanceTask) => {
      const list = await dbRead<MaintenanceTask[]>('maintenance', MOCK_MAINTENANCE);
      const exists = list.find(t => t.id === task.id);
      const updated = exists 
        ? list.map(t => t.id === task.id ? task : t)
        : [task, ...list];
      await dbWrite('maintenance', updated);
    },
    deleteForProperty: async (propId: string) => {
      const list = await dbRead<MaintenanceTask[]>('maintenance', MOCK_MAINTENANCE);
      await dbWrite('maintenance', list.filter(t => t.propertyId !== propId));
    }
  },

  calendar: {
    list: () => dbRead<CalendarEvent[]>('calendar', []),
    add: async (event: CalendarEvent) => {
      const list = await dbRead<CalendarEvent[]>('calendar', []);
      await dbWrite('calendar', [...list, event]);
    },
    deleteForProperty: async (address: string) => {
      const list = await dbRead<CalendarEvent[]>('calendar', []);
      await dbWrite('calendar', list.filter(e => e.propertyAddress !== address));
    }
  },

  logbook: {
    list: () => dbRead<LogbookEntry[]>('logbook', [
        // Default Mock Log
        { id: 'log-1', date: new Date().toISOString().split('T')[0], vehicle: 'Audi Q5 (ABC-123)', startOdo: 45000, endOdo: 45012, distance: 12, purpose: 'Inspection: 123 Ocean View', category: 'Business', driver: 'Current User' }
    ]),
    add: async (entry: LogbookEntry) => {
        const list = await dbRead<LogbookEntry[]>('logbook', []);
        await dbWrite('logbook', [entry, ...list]);
    }
  }
};

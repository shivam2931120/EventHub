import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
  var mockEventStore: any[];
  var mockTicketStore: any[];
  var mockGroupStore: any[];
  var mockCertificateStore: any[];
  var mockQuestionStore: any[];
  var mockPhotoStore: any[];
  var mockReviewStore: any[];
}

// In-memory stores for mock database
globalThis.mockEventStore = globalThis.mockEventStore || [];
globalThis.mockTicketStore = globalThis.mockTicketStore || [];
globalThis.mockGroupStore = globalThis.mockGroupStore || [];
globalThis.mockCertificateStore = globalThis.mockCertificateStore || [];
globalThis.mockQuestionStore = globalThis.mockQuestionStore || [];
globalThis.mockPhotoStore = globalThis.mockPhotoStore || [];
globalThis.mockReviewStore = globalThis.mockReviewStore || [];

// Create a mock prisma client that actually stores data in memory
const createMockPrismaClient = (): any => {
  const createMockModel = (store: any[], modelName: string) => ({
    findMany: async (args?: any) => {
      let results = [...store];
      if (args?.where) {
        results = results.filter((item: any) => {
          return Object.entries(args.where).every(([key, value]: [string, any]) => {
            if (value === undefined) return true;
            return item[key] === value;
          });
        });
      }
      if (args?.orderBy) {
        const [field, order] = Object.entries(args.orderBy)[0] as [string, string];
        results.sort((a, b) => {
          if (order === 'asc') return a[field] > b[field] ? 1 : -1;
          return a[field] < b[field] ? 1 : -1;
        });
      }
      if (args?.include) {
        // Handle basic includes
        results = results.map(item => ({ ...item }));
      }
      return results;
    },
    findUnique: async (args: any) => {
      const found = store.find((item: any) => item.id === args.where.id);
      return found || null;
    },
    findFirst: async (args?: any) => {
      if (!args?.where) return store[0] || null;
      const found = store.find((item: any) => {
        return Object.entries(args.where).every(([key, value]: [string, any]) => {
          if (value === undefined) return true;
          return item[key] === value;
        });
      });
      return found || null;
    },
    create: async (args: any) => {
      const newItem = {
        id: args.data.id || `${modelName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...args.data,
        createdAt: args.data.createdAt || new Date(),
        updatedAt: new Date(),
      };
      store.push(newItem);
      return newItem;
    },
    update: async (args: any) => {
      const index = store.findIndex((item: any) => item.id === args.where.id);
      if (index >= 0) {
        store[index] = { ...store[index], ...args.data, updatedAt: new Date() };
        return store[index];
      }
      return null;
    },
    updateMany: async (args: any) => {
      let count = 0;
      store.forEach((item: any, index: number) => {
        const matches = Object.entries(args.where).every(([key, value]: [string, any]) => {
          if (value === undefined) return true;
          return item[key] === value;
        });
        if (matches) {
          store[index] = { ...store[index], ...args.data, updatedAt: new Date() };
          count++;
        }
      });
      return { count };
    },
    delete: async (args: any) => {
      const index = store.findIndex((item: any) => item.id === args.where.id);
      if (index >= 0) {
        const deleted = store.splice(index, 1)[0];
        return deleted;
      }
      return null;
    },
    deleteMany: async (args?: any) => {
      if (!args?.where) {
        const count = store.length;
        store.length = 0;
        return { count };
      }
      let count = 0;
      const toKeep = store.filter((item: any) => {
        const matches = Object.entries(args.where).every(([key, value]: [string, any]) => {
          if (value === undefined) return true;
          return item[key] === value;
        });
        if (matches) {
          count++;
          return false;
        }
        return true;
      });
      store.length = 0;
      store.push(...toKeep);
      return { count };
    },
    upsert: async (args: any) => {
      const existing = store.find((item: any) => item.id === args.where.id);
      if (existing) {
        const index = store.indexOf(existing);
        store[index] = { ...existing, ...args.update, updatedAt: new Date() };
        return store[index];
      } else {
        const newItem = {
          id: args.where.id || `${modelName}-${Date.now()}`,
          ...args.create,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.push(newItem);
        return newItem;
      }
    },
    count: async (args?: any) => {
      if (!args?.where) return store.length;
      return store.filter((item: any) => {
        return Object.entries(args.where).every(([key, value]: [string, any]) => {
          if (value === undefined) return true;
          return item[key] === value;
        });
      }).length;
    },
  });

  return {
    event: createMockModel(globalThis.mockEventStore, 'event'),
    ticket: createMockModel(globalThis.mockTicketStore, 'ticket'),
    group: createMockModel(globalThis.mockGroupStore, 'group'),
    certificate: createMockModel(globalThis.mockCertificateStore, 'certificate'),
    question: createMockModel(globalThis.mockQuestionStore, 'question'),
    photo: createMockModel(globalThis.mockPhotoStore, 'photo'),
    review: createMockModel(globalThis.mockReviewStore, 'review'),
    $connect: async () => { console.log('Mock database connected'); },
    $disconnect: async () => { console.log('Mock database disconnected'); },
    $transaction: async (operations: any[]) => {
      // Simple transaction mock - just execute all operations
      const results = [];
      for (const op of operations) {
        if (typeof op === 'function') {
          results.push(await op());
        } else {
          results.push(await op);
        }
      }
      return results;
    },
  };
};

// Try to create real PrismaClient, fall back to mock if DB not available
let prismaInstance: PrismaClient | ReturnType<typeof createMockPrismaClient>;

try {
  if (!process.env.POSTGRES_PRISMA_URL) {
    console.warn('⚠️ POSTGRES_PRISMA_URL not set, using in-memory mock database');
    console.warn('   Data will persist only during this session.');
    console.warn('   Set POSTGRES_PRISMA_URL in .env for persistent storage.');
    prismaInstance = createMockPrismaClient();
  } else {
    prismaInstance = globalThis.prisma ?? new PrismaClient();
    if (process.env.NODE_ENV !== 'production') {
      globalThis.prisma = prismaInstance as PrismaClient;
    }
  }
} catch (error) {
  console.warn('Failed to initialize Prisma, using mock database:', error);
  prismaInstance = createMockPrismaClient();
}

export const prisma = prismaInstance;

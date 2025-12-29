import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Create a mock prisma client for when database is not connected
const createMockPrismaClient = (): any => {
  const mockEvent = {
    findMany: async () => [],
    findUnique: async () => null,
    create: async () => null,
    update: async () => null,
    upsert: async () => null,
  };

  const mockTicket = {
    findMany: async () => [],
    findUnique: async () => null,
    create: async (args: any) => ({
      id: `ticket-${Date.now()}`,
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: async (args: any) => args.data,
  };

  return {
    event: mockEvent,
    ticket: mockTicket,
    $connect: async () => { },
    $disconnect: async () => { },
  };
};

// Try to create real PrismaClient, fall back to mock if DB not available
let prismaInstance: PrismaClient | ReturnType<typeof createMockPrismaClient>;

try {
  if (!process.env.POSTGRES_PRISMA_URL) {
    console.warn('POSTGRES_PRISMA_URL not set, using mock database');
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

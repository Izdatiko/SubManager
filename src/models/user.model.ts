// User model type based on Prisma schema
export interface User {
  id: number;
  telegramId: bigint;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

-- Add a narrowly scoped security-desk account type.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SECURITY';

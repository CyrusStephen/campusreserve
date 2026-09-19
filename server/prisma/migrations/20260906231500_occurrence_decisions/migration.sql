-- Add an explicit per-occurrence rejection state for partially approved recurring requests.
ALTER TYPE "OccurrenceStatus" ADD VALUE IF NOT EXISTS 'REJECTED' AFTER 'APPROVED';

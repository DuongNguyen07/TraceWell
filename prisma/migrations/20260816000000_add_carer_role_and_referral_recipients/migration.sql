-- Add CARER to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CARER';

-- Add multi-recipient and referral type fields to ReferralNote
ALTER TABLE "ReferralNote" ADD COLUMN IF NOT EXISTS "toRecipients" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "ReferralNote" ADD COLUMN IF NOT EXISTS "referralType" TEXT NOT NULL DEFAULT 'internal';

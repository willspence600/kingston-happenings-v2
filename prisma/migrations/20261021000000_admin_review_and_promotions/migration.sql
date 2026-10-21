-- AlterTable: separate promotion tiers for events and food & drink specials
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "eventPromotionTier" TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "specialPromotionTier" TEXT NOT NULL DEFAULT 'standard';
UPDATE "Venue" SET "eventPromotionTier" = "promotionTier", "specialPromotionTier" = "promotionTier"
  WHERE "promotionTier" IN ('promoted', 'featured');

-- AlterTable: admin rejection notes and per-listing promotion opt-out
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "hiddenFromPromotion" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "EventSeries" ADD COLUMN IF NOT EXISTS "hiddenFromPromotion" BOOLEAN NOT NULL DEFAULT false;

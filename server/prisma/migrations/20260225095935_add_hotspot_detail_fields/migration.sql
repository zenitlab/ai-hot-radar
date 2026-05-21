-- AlterTable
ALTER TABLE "Hotspot" ADD COLUMN "authorAvatar" TEXT;
ALTER TABLE "Hotspot" ADD COLUMN "authorFollowers" INTEGER;
ALTER TABLE "Hotspot" ADD COLUMN "authorName" TEXT;
ALTER TABLE "Hotspot" ADD COLUMN "authorUsername" TEXT;
ALTER TABLE "Hotspot" ADD COLUMN "authorVerified" BOOLEAN;
ALTER TABLE "Hotspot" ADD COLUMN "commentCount" INTEGER;
ALTER TABLE "Hotspot" ADD COLUMN "danmakuCount" INTEGER;
ALTER TABLE "Hotspot" ADD COLUMN "quoteCount" INTEGER;
ALTER TABLE "Hotspot" ADD COLUMN "relevanceReason" TEXT;
ALTER TABLE "Hotspot" ADD COLUMN "replyCount" INTEGER;

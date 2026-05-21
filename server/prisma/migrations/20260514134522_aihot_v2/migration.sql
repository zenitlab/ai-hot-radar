-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyDigest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Hotspot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "isReal" BOOLEAN NOT NULL DEFAULT true,
    "relevance" INTEGER NOT NULL DEFAULT 0,
    "relevanceReason" TEXT,
    "keywordMentioned" BOOLEAN,
    "importance" TEXT NOT NULL DEFAULT 'low',
    "summary" TEXT,
    "viewCount" INTEGER,
    "likeCount" INTEGER,
    "retweetCount" INTEGER,
    "replyCount" INTEGER,
    "commentCount" INTEGER,
    "quoteCount" INTEGER,
    "danmakuCount" INTEGER,
    "authorName" TEXT,
    "authorUsername" TEXT,
    "authorAvatar" TEXT,
    "authorFollowers" INTEGER,
    "authorVerified" BOOLEAN,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keywordId" TEXT,
    "category" TEXT,
    "region" TEXT,
    "sourceTier" TEXT,
    "qualityScore" REAL,
    "isCurated" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    "clusterKey" TEXT,
    "isClusterMain" BOOLEAN NOT NULL DEFAULT true,
    "biliCategory" TEXT,
    "biliTags" TEXT,
    "favoritesCount" INTEGER,
    CONSTRAINT "Hotspot_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Hotspot" ("authorAvatar", "authorFollowers", "authorName", "authorUsername", "authorVerified", "commentCount", "content", "createdAt", "danmakuCount", "id", "importance", "isReal", "keywordId", "keywordMentioned", "likeCount", "publishedAt", "quoteCount", "relevance", "relevanceReason", "replyCount", "retweetCount", "source", "sourceId", "summary", "title", "url", "viewCount") SELECT "authorAvatar", "authorFollowers", "authorName", "authorUsername", "authorVerified", "commentCount", "content", "createdAt", "danmakuCount", "id", "importance", "isReal", "keywordId", "keywordMentioned", "likeCount", "publishedAt", "quoteCount", "relevance", "relevanceReason", "replyCount", "retweetCount", "source", "sourceId", "summary", "title", "url", "viewCount" FROM "Hotspot";
DROP TABLE "Hotspot";
ALTER TABLE "new_Hotspot" RENAME TO "Hotspot";
CREATE UNIQUE INDEX "Hotspot_url_source_key" ON "Hotspot"("url", "source");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DailyDigest_date_key" ON "DailyDigest"("date");

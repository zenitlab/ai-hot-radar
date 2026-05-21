-- CreateTable
CREATE TABLE "EntityCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keywordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "summary" TEXT,
    "relatedData" TEXT,
    "lastRefresh" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EntityCard_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EntityRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromName" TEXT NOT NULL,
    "toName" TEXT NOT NULL,
    "relation" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "EntityCard_keywordId_key" ON "EntityCard"("keywordId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityRelation_fromName_toName_key" ON "EntityRelation"("fromName", "toName");

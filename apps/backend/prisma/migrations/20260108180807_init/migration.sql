-- CreateTable
CREATE TABLE "Subtitle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "originalFilePath" TEXT NOT NULL,
    "translatedFilePath" TEXT,
    "sourceLanguage" TEXT,
    "targetLanguage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

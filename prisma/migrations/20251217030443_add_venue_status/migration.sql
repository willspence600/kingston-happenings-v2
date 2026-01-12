-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Venue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "neighborhood" TEXT,
    "website" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Venue" ("address", "createdAt", "id", "imageUrl", "name", "neighborhood", "updatedAt", "website") SELECT "address", "createdAt", "id", "imageUrl", "name", "neighborhood", "updatedAt", "website" FROM "Venue";
DROP TABLE "Venue";
ALTER TABLE "new_Venue" RENAME TO "Venue";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

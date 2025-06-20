/*
  Warnings:

  - Added the required column `switchInput` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "switchInput" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("accessToken", "createdAt", "id", "location", "updatedAt", "userId") SELECT "accessToken", "createdAt", "id", "location", "updatedAt", "userId" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_userId_key" ON "users"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

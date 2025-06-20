-- CreateTable
CREATE TABLE "users"
(
    "id"          TEXT     NOT NULL PRIMARY KEY,
    "location"    TEXT     NOT NULL,
    "accessToken" TEXT     NOT NULL,
    "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   DATETIME NOT NULL
);

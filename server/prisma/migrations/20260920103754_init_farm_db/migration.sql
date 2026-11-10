/*
  Warnings:

  - You are about to drop the `Gestation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Taureau` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Vache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Veau` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Gestation";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Taureau";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Vache";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Veau";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "user" (
    "user_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "farm_id" INTEGER,
    CONSTRAINT "user_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farm" ("farm_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "farm" (
    "farm_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "cow" (
    "cow_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "farm_id" INTEGER NOT NULL,
    "tag" TEXT NOT NULL,
    "birth_date" DATETIME NOT NULL,
    "sex" TEXT NOT NULL,
    "mother_id" INTEGER,
    "father_id" INTEGER,
    CONSTRAINT "cow_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farm" ("farm_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cow_mother_id_fkey" FOREIGN KEY ("mother_id") REFERENCES "cow" ("cow_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "cow_father_id_fkey" FOREIGN KEY ("father_id") REFERENCES "cow" ("cow_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calving" (
    "calving_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cow_id" INTEGER NOT NULL,
    "bull_id" INTEGER,
    "calf_id" INTEGER,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "state" TEXT NOT NULL,
    CONSTRAINT "calving_cow_id_fkey" FOREIGN KEY ("cow_id") REFERENCES "cow" ("cow_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "calving_bull_id_fkey" FOREIGN KEY ("bull_id") REFERENCES "cow" ("cow_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "calving_calf_id_fkey" FOREIGN KEY ("calf_id") REFERENCES "cow" ("cow_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "cow_tag_key" ON "cow"("tag");

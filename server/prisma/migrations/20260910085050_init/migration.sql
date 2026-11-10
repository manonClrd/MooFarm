-- CreateTable
CREATE TABLE "Vache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numBoucle" TEXT NOT NULL,
    "nom" TEXT,
    "dateNaissance" DATETIME NOT NULL,
    "photo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Taureau" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numBoucle" TEXT NOT NULL,
    "nom" TEXT,
    "dateNaissance" DATETIME NOT NULL,
    "photo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Veau" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numBoucle" TEXT NOT NULL,
    "nom" TEXT,
    "sexe" TEXT NOT NULL,
    "dateNaissance" DATETIME NOT NULL,
    "photo" TEXT,
    "mereId" INTEGER,
    "pereId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Veau_mereId_fkey" FOREIGN KEY ("mereId") REFERENCES "Vache" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Veau_pereId_fkey" FOREIGN KEY ("pereId") REFERENCES "Taureau" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Gestation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vacheId" INTEGER NOT NULL,
    "taureauId" INTEGER,
    "dateDebut" DATETIME NOT NULL,
    "datePrevueVelage" DATETIME NOT NULL,
    "dateReelleVelage" DATETIME,
    "statut" TEXT NOT NULL DEFAULT 'EN_COURS',
    "commentaire" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Gestation_vacheId_fkey" FOREIGN KEY ("vacheId") REFERENCES "Vache" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Gestation_taureauId_fkey" FOREIGN KEY ("taureauId") REFERENCES "Taureau" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Vache_numBoucle_key" ON "Vache"("numBoucle");

-- CreateIndex
CREATE UNIQUE INDEX "Taureau_numBoucle_key" ON "Taureau"("numBoucle");

-- CreateIndex
CREATE UNIQUE INDEX "Veau_numBoucle_key" ON "Veau"("numBoucle");

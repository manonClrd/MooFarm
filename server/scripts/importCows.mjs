// server/scripts/importCows.mjs
//
// Usage :
//   1. Place ce fichier dans server/scripts/importCows.mjs
//   2. Ajuste FARM_ID ci-dessous si besoin
//   3. Lance : node scripts/importCows.mjs
//
// Ce script :
//   - crée les taureaux (père) manquants avec une date de naissance placeholder
//   - crée les mères manquantes (référencées par tag mais absentes du tableau) en placeholder
//   - crée toutes les vaches du tableau avec leurs vraies infos + liens mère/père
//   - est idempotent : relancer le script ne crée pas de doublons (upsert sur le tag)

import prisma from "../prismaClient.js";

const FARM_ID = 2; 
const PLACEHOLDER_DATE = new Date("2000-01-01");

// --- Données brutes du tableau (tag, date de naissance, père, mère) ---
const rows = [
  ["1893", "12/9/2016", "Bruno", "6070"],
  ["3525", "2/10/2019", "Tx Noir", "8017"],
  ["0080", "1/27/2021", "Tx Bleu", "7942"],
  ["0084", "2/16/2021", "Tx Bleu", "4289"],
  ["0083", "2/16/2021", "Tx Bleu", "3843"],
  ["0085", "2/18/2021", "Tx Bleu", "1888"],
  ["0087", "2/25/2021", "Tx Bleu", "9686"],
  ["0092", "4/25/2021", "Varzy", "1886"],
  ["0098", "6/20/2021", "Alphonse", "7955"],
  ["0101", "7/3/2021", "Alphonse", "3516"],
  ["7970", "7/14/2021", "Varzy", "1897"], // chouchoute
  ["7973", "9/14/2021", "Alphonse", "3515"],
  ["7977", "11/23/2021", "Tx Bleu", "1894"],
  ["7978", "12/12/2021", "Varzy", "7935"], // bichette
  ["7979", "1/24/2022", "Varzy", "1893"],
  ["7986", "2/24/2022", "Alphonse", "3529"],
  ["7988", "3/28/2022", "Varzy", "3848"],
  ["7989", "5/10/2022", "Varzy", "3513"],
  ["7996", "6/10/2022", "Varzy", "7953"],
  ["7997", "7/3/2022", "Varzy", "3534"],
  ["7998", "7/21/2022", "Varzy", "3525"],
  ["8000", "8/11/2022", "Varzy", "7931"],
  ["3739", "12/9/2022", "Alphonse", "6193"],
  ["3744", "1/3/2023", "Varzy", "1897"],
  ["3746", "1/15/2023", "Varzy", "3530"],
  ["3749", "2/5/2023", "Varzy", "3522"],
  ["3753", "3/8/2023", "Alphonse", "6218"],
  ["3755", "3/8/2023", "Varzy", "3529"],
  ["3758", "5/16/2023", "Varzy", "1886"],
  ["3760", "7/1/2023", "Alphonse", "3525"],
  ["6812", "9/28/2023", "Alphonse", "7938"],
  ["6813", "9/29/2023", "Alphonse", "7959"],
  ["6816", "10/20/2023", "Alphonse", "0085"],
  ["6817", "10/21/2023", "Varzy", "3516"],
  ["6819", "11/29/2023", "Alphonse", "3515"],
  ["6820", "12/13/2023", "Varzy", "7931"],
  ["6822", "1/24/2024", "Varzy", "3527"],
  ["6824", "2/22/2024", "Varzy", "6206"],
  ["6832", "4/25/2024", "Rookie", "0083"],
  ["6833", "4/28/2024", "Rookie", "0084"],
  ["6837", "5/5/2024", "Rookie", "0101"],
  ["6839", "5/21/2024", "Varzy", "1886"],
  ["1245", "10/10/2024", "Rookie", "7977"],
  ["1247", "10/21/2024", "Alphonse", "7938"],
  ["1250", "10/30/2024", "Alphonse", "0080"],
  ["1258", "3/13/2025", "Alphonse", "6210"],
  ["1259", "4/21/2025", "Alphonse", "6206"],
  ["1261", "5/8/2025", "Rookie", "7970"],
  ["1265", "6/19/2025", "Alphonse", "6199"],
  ["1266", "6/20/2025", "Rookie", "7988"],
  ["1268", "6/26/2025", "Rookie", "7992"],
  ["7501", "9/10/2025", "Alphonse", "0083"],
  ["7502", "9/13/2025", "Rookie", "0101"],
  ["7503", "9/16/2025", "Alphonse", "0092"],
  ["7506", "10/17/2025", "Rookie", "7973"],
  ["7511", "11/25/2025", "Alphonse", "0080"],
  ["7509", "12/3/2025", "Alphonse", "7977"],
  ["7513", "3/12/2026", "Rookie", "7986"],
  ["7515", "5/8/2026", "Rookie", "7970"],
  ["7517", "6/12/2026", "Rookie", "7997"],
  ["7518", "6/21/2026", "Rookie", "3752"],
  ["7522", "6/27/2026", "Rookie", "3755"],
  ["7523", "7/1/2026", "Rookie", "3749"],
  ["7524", "7/1/2026", "Rookie", "3739"],
  ["7526", "9/15/2026", "Rookie", "7989"],
];

function parseUSDate(str) {
  const [month, day, year] = str.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// Récupère le cow_id d'une vache par son tag, la crée en placeholder si absente
async function getOrCreatePlaceholder(tag, sex, cache) {
  if (cache.has(tag)) return cache.get(tag);

  const cow = await prisma.cow.upsert({
    where: { tag },
    update: {},
    create: {
      tag,
      farm_id: FARM_ID,
      birth_date: PLACEHOLDER_DATE,
      sex,
    },
  });
  cache.set(tag, cow.cow_id);
  return cow.cow_id;
}

async function main() {
  const idCache = new Map();

  // 1. Créer/récupérer tous les taureaux (pères) en placeholder
  const bullNames = [...new Set(rows.map((r) => r[2]))];
  for (const name of bullNames) {
    await getOrCreatePlaceholder(name, "M", idCache);
  }
  console.log(`Taureaux prêts : ${bullNames.join(", ")}`);

  // 2. Créer/mettre à jour chaque vache du tableau, avec ses vraies infos
  for (const [tag, dateStr, fatherName, motherTag] of rows) {
    const father_id = idCache.get(fatherName); // déjà en cache (étape 1)
    const mother_id = await getOrCreatePlaceholder(motherTag, "F", idCache);

    const cow = await prisma.cow.upsert({
      where: { tag },
      update: {
        birth_date: parseUSDate(dateStr),
        sex: "F",
        farm_id: FARM_ID,
        father_id,
        mother_id,
      },
      create: {
        tag,
        birth_date: parseUSDate(dateStr),
        sex: "F",
        farm_id: FARM_ID,
        father_id,
        mother_id,
      },
    });

    idCache.set(tag, cow.cow_id);
    console.log(`✔ ${tag} (${dateStr}) — père: ${fatherName}, mère: ${motherTag}`);
  }

  console.log("\nImport terminé !");
}

main()
  .catch((err) => {
    console.error("Erreur pendant l'import :", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

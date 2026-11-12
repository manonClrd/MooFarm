// Script à lancer UNE FOIS : remplace les mots de passe en clair de la table user par des hashs bcrypt.
// Usage (depuis la racine du projet) : node scripts/hash-passwords.js
// Sans danger si relancé : les mots de passe déjà hashés sont ignorés.
import bcrypt from "bcrypt";
import prisma from "../prismaClient.js";

const isBcryptHash = (value) => /^\$2[aby]\$\d{2}\$/.test(value);

const users = await prisma.user.findMany();
let converted = 0;

for (const user of users) {
  if (isBcryptHash(user.password)) continue;

  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { password: await bcrypt.hash(user.password, 10) },
  });
  converted++;
}

console.log(`${converted} password(s) hashed, ${users.length - converted} already hashed.`);
await prisma.$disconnect();
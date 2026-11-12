// Change le rôle d'un utilisateur existant (par défaut : admin).
// Usage (depuis la racine du projet) :
//   node scripts/make-admin.js <username>            -> passe l'utilisateur en admin
//   node scripts/make-admin.js <username> user       -> passe l'utilisateur en user
import prisma from "../prismaClient.js";

const ROLES = ["admin", "user", "visitor"];
const [username, role = "admin"] = process.argv.slice(2);

if (!username || !ROLES.includes(role)) {
  console.error(`Usage: node scripts/make-admin.js <username> [${ROLES.join("|")}]`);
  process.exit(1);
}

try {
  const user = await prisma.user.update({
    where: { username },
    data: { role },
  });
  console.log(`${user.username} (id ${user.user_id}) is now "${user.role}".`);
  console.log("Log out and log in again to get a new token with this role.");
} catch (err) {
  if (err.code === "P2025") {
    console.error(`No user named "${username}" (usernames are case-sensitive).`);
  } else {
    console.error(err);
  }
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
import express from "express";
import bcrypt from "bcrypt";
import prisma from "../prismaClient.js";
import { authenticate, signToken, TOKEN_TTL } from "../middleware/auth.js";

const router = express.Router();

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

// Hash factice : on compare toujours un mot de passe, même si le username n'existe pas,
// pour que le temps de réponse ne révèle pas quels usernames existent.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", SALT_ROUNDS);

const sanitize = ({ password, ...rest }) => rest;

const include = {
  farm: { select: { farm_id: true, name: true, location: true } },
};

const authResponse = (user) => ({
  token: signToken(user),
  token_type: "Bearer",
  expires_in: TOKEN_TTL,
  user: sanitize(user),
});

// POST /auth/register - inscription publique
// Le rôle est TOUJOURS "visitor" : un admin crée les autres rôles via POST /user.
router.post("/register", async (req, res) => {
  try {
    const { firstname, lastname, username, password } = req.body;

    if (!firstname || !lastname || !username || !password) {
      return res
        .status(400)
        .json({ error: "Missing required fields: firstname, lastname, username, password" });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const user = await prisma.user.create({
      data: {
        firstname,
        lastname,
        username,
        password: await bcrypt.hash(password, SALT_ROUNDS),
        role: "visitor",
      },
      include,
    });
    res.status(201).json(authResponse(user));
  } catch (err) {
    console.error(err);
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: "Failed to register" });
  }
});

// POST /auth/login - renvoie un token JWT
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing required fields: username, password" });
    }

    const user = await prisma.user.findUnique({ where: { username }, include });
    const passwordOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    // Même message dans les deux cas : on ne révèle pas si le username existe
    if (!user || !passwordOk) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    res.json(authResponse(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to log in" });
  }
});

// GET /auth/me - l'utilisateur correspondant au token
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      include,
    });
    // Utilisateur supprimé depuis l'émission du token
    if (!user) return res.status(401).json({ error: "User no longer exists" });
    res.json(sanitize(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch current user" });
  }
});

// POST /auth/change-password - changer son propre mot de passe
router.post("/change-password", authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: "Missing required fields: current_password, new_password" });
    }
    if (new_password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const user = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
    if (!user) return res.status(401).json({ error: "User no longer exists" });

    if (!(await bcrypt.compare(current_password, user.password))) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { password: await bcrypt.hash(new_password, SALT_ROUNDS) },
    });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

export default router;
import express from "express";
import prisma from "../prismaClient.js";

const router = express.Router();

const ROLES = ["admin", "user", "visitor"];

// Retire le mot de passe avant d'envoyer un utilisateur au client
const sanitize = ({ password, ...rest }) => rest;

// Ce qu'on renvoie avec chaque utilisateur : sa ferme
const include = {
  farm: { select: { farm_id: true, name: true, location: true } },
};

// Gestion commune des erreurs Prisma
const handleError = (err, res, action) => {
  console.error(err);
  if (err.code === "P2025") {
    return res.status(404).json({ error: "User not found" });
  }
  if (err.code === "P2002") {
    return res.status(409).json({ error: "Username already exists" });
  }
  // P2003 = clé étrangère invalide (farm_id inexistant)
  if (err.code === "P2003") {
    return res.status(400).json({ error: "farm_id does not exist" });
  }
  res.status(500).json({ error: `Failed to ${action} user` });
};

// GET /user - liste des utilisateurs avec leur ferme
// Filtres : /user?farm_id=1  ou  /user?farm_name=Germeaux  ou  /user?role=admin
router.get("/", async (req, res) => {
  try {
    const { farm_id, farm_name, role } = req.query;

    const where = {};
    if (role) where.role = role;

    // farm_id et farm_name peuvent être combinés
    if (farm_id) where.farm_id = Number(farm_id);
    if (farm_name) where.farm = { name: { contains: farm_name.trim() } };

    const users = await prisma.user.findMany({ where, include });
    res.json(users.map(sanitize));
  } catch (err) {
    handleError(err, res, "fetch");
  }
});

// GET /user/:id - un utilisateur avec sa ferme
router.get("/:id", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: Number(req.params.id) },
      include,
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(sanitize(user));
  } catch (err) {
    handleError(err, res, "fetch");
  }
});

// GET /user/:id/farm - uniquement la ferme d'un utilisateur
router.get("/:id/farm", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: Number(req.params.id) },
      select: { farm: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.farm); // null si l'utilisateur n'a pas de ferme
  } catch (err) {
    handleError(err, res, "fetch");
  }
});

// POST /user - créer un utilisateur
router.post("/", async (req, res) => {
  try {
    const { firstname, lastname, username, password, role, farm_id } = req.body;

    if (!firstname || !lastname || !username || !password || !role) {
      return res
        .status(400)
        .json({ error: "Missing required fields: firstname, lastname, username, password, role" });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${ROLES.join(", ")}` });
    }

    const user = await prisma.user.create({
      data: { firstname, lastname, username, password, role, farm_id },
      include,
    });
    res.status(201).json(sanitize(user));
  } catch (err) {
    handleError(err, res, "create");
  }
});

// PUT /user/:id - remplacement COMPLET
// Obligatoires : firstname, lastname, username, password, role
// farm_id absent => remis à null (l'utilisateur n'appartient plus à aucune ferme)
router.put("/:id", async (req, res) => {
  try {
    const { firstname, lastname, username, password, role, farm_id } = req.body;

    if (!firstname || !lastname || !username || !password || !role) {
      return res.status(400).json({
        error:
          "PUT requires firstname, lastname, username, password and role (use PATCH for partial updates)",
      });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${ROLES.join(", ")}` });
    }

    const user = await prisma.user.update({
      where: { user_id: Number(req.params.id) },
      data: {
        firstname,
        lastname,
        username,
        password,
        role,
        farm_id: farm_id ?? null,
      },
      include,
    });
    res.json(sanitize(user));
  } catch (err) {
    handleError(err, res, "update");
  }
});

// PATCH /user/:id - modification PARTIELLE
// Un champ absent garde sa valeur. null efface farm_id.
router.patch("/:id", async (req, res) => {
  try {
    const { firstname, lastname, username, password, role, farm_id } = req.body;

    // Champs obligatoires en base : pas de null, pas de chaîne vide
    const required = { firstname, lastname, username, password, role };
    for (const [key, value] of Object.entries(required)) {
      if (value === null || value === "") {
        return res.status(400).json({ error: `${key} cannot be null or empty` });
      }
    }
    if (role !== undefined && !ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${ROLES.join(", ")}` });
    }

    const user = await prisma.user.update({
      where: { user_id: Number(req.params.id) },
      data: { firstname, lastname, username, password, role, farm_id },
      include,
    });
    res.json(sanitize(user));
  } catch (err) {
    handleError(err, res, "update");
  }
});

// DELETE /user/:id - supprimer un utilisateur
router.delete("/:id", async (req, res) => {
  try {
    await prisma.user.delete({
      where: { user_id: Number(req.params.id) },
    });
    res.status(204).send();
  } catch (err) {
    handleError(err, res, "delete");
  }
});

export default router;
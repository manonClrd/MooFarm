import express from "express";
import prisma from "../prismaClient.js";

const router = express.Router();

// Gestion commune des erreurs Prisma
const handleError = (err, res, action) => {
  console.error(err);
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Farm not found" });
  }
  // P2003 à la suppression = la ferme a encore des vaches ou des utilisateurs
  if (err.code === "P2003" && action === "delete") {
    return res
      .status(409)
      .json({ error: "Farm still has cows or users, remove or move them first" });
  }
  res.status(500).json({ error: `Failed to ${action} farm` });
};

// GET /farm - liste toutes les fermes
router.get("/", async (req, res) => {
  try {
    const farms = await prisma.farm.findMany();
    res.json(farms);
  } catch (err) {
    handleError(err, res, "fetch");
  }
});

// GET /farm/:id - une ferme avec ses vaches ET ses utilisateurs
router.get("/:id", async (req, res) => {
  try {
    const farm = await prisma.farm.findUnique({
      where: { farm_id: Number(req.params.id) },
      include: {
        cows: true,
        users: {
          select: { user_id: true, firstname: true, lastname: true, username: true, role: true },
        },
      },
    });
    if (!farm) return res.status(404).json({ error: "Farm not found" });
    res.json(farm);
  } catch (err) {
    handleError(err, res, "fetch");
  }
});

// GET /farm/:farm_id/cow/:cow_id/calving - vêlages d'une vache d'une ferme
router.get(
  ["/:farm_id/cow/:cow_id/calving", "/:farm_id/cow/:cow_id/calvings"],
  async (req, res) => {
    try {
      const farm_id = Number(req.params.farm_id);
      const cow_id = Number(req.params.cow_id);

      if (!Number.isInteger(farm_id) || !Number.isInteger(cow_id)) {
        return res.status(400).json({ error: "farm_id and cow_id must be integers" });
      }

      const farm = await prisma.farm.findUnique({ where: { farm_id } });
      if (!farm) return res.status(404).json({ error: "Farm not found" });

      // La vache doit exister ET appartenir à cette ferme
      const cow = await prisma.cow.findFirst({
        where: { cow_id, farm_id },
        select: { cow_id: true, tag: true, farm_id: true },
      });
      if (!cow) return res.status(404).json({ error: "Cow not found in this farm" });

      const calvings = await prisma.calving.findMany({
        where: { cow_id },
        include: {
          bull: { select: { cow_id: true, tag: true } },
          calf: { select: { cow_id: true, tag: true, sex: true, birth_date: true } },
        },
        orderBy: { start_date: "desc" },
      });

      res.json(calvings); // [] si la vache n'a aucun vêlage
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch calvings" });
    }
  }
);

// POST /farm - créer une ferme
router.post("/", async (req, res) => {
  try {
    const { name, location } = req.body;

    if (!name || !location) {
      return res.status(400).json({ error: "Missing required fields: name, location" });
    }

    const farm = await prisma.farm.create({
      data: { name, location },
    });
    res.status(201).json(farm);
  } catch (err) {
    handleError(err, res, "create");
  }
});

// PUT /farm/:id - remplacement COMPLET
// Obligatoires : name, location (la ferme n'a aucun champ optionnel)
router.put("/:id", async (req, res) => {
  try {
    const { name, location } = req.body;

    if (!name || !location) {
      return res
        .status(400)
        .json({ error: "PUT requires name and location (use PATCH for partial updates)" });
    }

    const farm = await prisma.farm.update({
      where: { farm_id: Number(req.params.id) },
      data: { name, location },
    });
    res.json(farm);
  } catch (err) {
    handleError(err, res, "update");
  }
});

// PATCH /farm/:id - modification PARTIELLE
// Un champ absent garde sa valeur.
router.patch("/:id", async (req, res) => {
  try {
    const { name, location } = req.body;

    // name et location sont obligatoires en base : pas de null, pas de chaîne vide
    if (name === null || name === "" || location === null || location === "") {
      return res.status(400).json({ error: "name and location cannot be null or empty" });
    }

    const farm = await prisma.farm.update({
      where: { farm_id: Number(req.params.id) },
      data: { name, location },
    });
    res.json(farm);
  } catch (err) {
    handleError(err, res, "update");
  }
});

// DELETE /farm/:id - supprimer une ferme
router.delete("/:id", async (req, res) => {
  try {
    await prisma.farm.delete({
      where: { farm_id: Number(req.params.id) },
    });
    res.status(204).send();
  } catch (err) {
    handleError(err, res, "delete");
  }
});

export default router;
import express from "express";
import prisma from "../prismaClient.js";

const router = express.Router();

const cowInclude = {
  farm: { select: { farm_id: true, name: true, location: true } },
  mother: { select: { cow_id: true, tag: true } },
  father: { select: { cow_id: true, tag: true } },
};

const toDate = (value) => {
  if (value === undefined || value === null) return value;
  return new Date(value);
};

const isInvalidDate = (d) => d instanceof Date && isNaN(d.getTime());

const handleError = (err, res, action) => {
  console.error(err);
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Cow not found" });
  }
  if (err.code === "P2002") {
    return res.status(409).json({ error: "Tag already exists" });
  }
  // P2003 = clé étrangère invalide (farm_id, mother_id ou father_id inexistant)
  if (err.code === "P2003") {
    return res.status(400).json({ error: "farm_id, mother_id or father_id does not exist" });
  }
  res.status(500).json({ error: `Failed to ${action} cow` });
};




// GET /cow - liste toutes les vaches, avec leur ferme
// Filtres : /cow?farm_id=1  ou  /cow?farm_name=Germeau
router.get("/", async (req, res) => {
  try {
    const { farm_id, farm_name } = req.query;
    console.log("query reçue :", req.query); // log temporaire

    const where = {};
    if (farm_id) where.farm_id = Number(farm_id);
    if (farm_name) where.farm = { name: { contains: farm_name.trim() } };

    const cows = await prisma.cow.findMany({
      where,
      include: {
        farm: { select: { farm_id: true, name: true, location: true } },
      },
    });
    res.json(cows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch cows" });
  }
});
// POST /cow - ajouter une vache
router.post("/", async (req, res) => {
  try {
    const { farm_id, tag, birth_date, sex, mother_id, father_id } = req.body;

    if (!farm_id || !tag || !birth_date || !sex) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const cow = await prisma.cow.create({
      data: {
        farm_id,
        tag,
        birth_date: new Date(birth_date),
        sex,
        mother_id,
        father_id,
      },
    });
    res.status(201).json(cow);
  } catch (err) {
    console.error(err);
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Tag already exists" });
    }
    res.status(500).json({ error: "Failed to create cow" });
  }
});

// POST /cow/bulk - ajouter plusieurs vaches d'un coup
router.post("/bulk", async (req, res) => {
  try {
    const cows = req.body; // tableau d'objets vache

    if (!Array.isArray(cows) || cows.length === 0) {
      return res.status(400).json({ error: "Expected a non-empty array of cows" });
    }

    const created = await prisma.cow.createMany({
      data: cows.map((c) => ({
        farm_id: c.farm_id,
        tag: c.tag,
        birth_date: new Date(c.birth_date),
        sex: c.sex,
        mother_id: c.mother_id,
        father_id: c.father_id,
      })),
    });

    res.status(201).json({ count: created.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create cows" });
  }
});

// PUT /cow/:id - remplacement COMPLET
// Obligatoires : tag, birth_date, sex, farm_id
// mother_id et father_id absents => remis à null
router.put("/:id", async (req, res) => {
  try {
    const { tag, birth_date, sex, mother_id, father_id, farm_id } = req.body;

    if (!tag || !birth_date || !sex || !farm_id) {
      return res
        .status(400)
        .json({ error: "PUT requires tag, birth_date, sex and farm_id (use PATCH for partial updates)" });
    }
    if (!["F", "M"].includes(sex)) {
      return res.status(400).json({ error: 'sex must be "F" or "M"' });
    }

    const birth = toDate(birth_date);
    if (isInvalidDate(birth)) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const cow = await prisma.cow.update({
      where: { cow_id: Number(req.params.id) },
      data: {
        tag,
        birth_date: birth,
        sex,
        farm_id,
        mother_id: mother_id ?? null,
        father_id: father_id ?? null,
      },
      include: cowInclude,
    });
    res.json(cow);
  } catch (err) {
    handleError(err, res, "update");
  }
});

// PATCH /cow/:id - modification PARTIELLE
// Un champ absent garde sa valeur. null efface mother_id / father_id.
router.patch("/:id", async (req, res) => {
  try {
    const { tag, birth_date, sex, mother_id, father_id, farm_id } = req.body;

    if (tag === null || birth_date === null || sex === null || farm_id === null) {
      return res.status(400).json({ error: "tag, birth_date, sex and farm_id cannot be null" });
    }
    if (sex !== undefined && !["F", "M"].includes(sex)) {
      return res.status(400).json({ error: 'sex must be "F" or "M"' });
    }

    const birth = toDate(birth_date);
    if (isInvalidDate(birth)) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const cow = await prisma.cow.update({
      where: { cow_id: Number(req.params.id) },
      data: {
        tag,
        birth_date: birth,
        sex,
        mother_id,
        father_id,
        farm_id,
      },
      include: cowInclude,
    });
    res.json(cow);
  } catch (err) {
    handleError(err, res, "update");
  }
});


// DELETE /cow/:id - supprimer une vache
router.delete("/:id", async (req, res) => {
  try {
    await prisma.cow.delete({
      where: { cow_id: Number(req.params.id) },
    });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Cow not found" });
    }
    res.status(500).json({ error: "Failed to delete cow" });
  }
});

export default router;
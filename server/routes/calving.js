import express from "express";
import prisma from "../prismaClient.js";

const router = express.Router();

// Ce qu'on renvoie avec chaque vêlage : la mère (avec sa ferme), le taureau et le veau
const include = {
  cow: {
    select: {
      cow_id: true,
      tag: true,
      farm: { select: { farm_id: true, name: true } },
    },
  },
  bull: { select: { cow_id: true, tag: true } },
  calf: { select: { cow_id: true, tag: true, sex: true, birth_date: true } },
};

// Convertit une valeur en Date. undefined reste undefined, null reste null.
const toDate = (value) => {
  if (value === undefined || value === null) return value;
  return new Date(value);
};

const isInvalidDate = (d) => d instanceof Date && isNaN(d.getTime());

// Gestion commune des erreurs Prisma
const handleError = (err, res, action) => {
  console.error(err);
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Calving not found" });
  }
  // P2003 = clé étrangère invalide (cow_id, bull_id ou calf_id inexistant)
  if (err.code === "P2003") {
    return res.status(400).json({ error: "cow_id, bull_id or calf_id does not exist" });
  }
  res.status(500).json({ error: `Failed to ${action} calving` });
};

// GET /calving - liste des vêlages
// Filtres : ?cow_id=5  ?bull_id=3  ?state=...  ?farm_id=2  ?farm_name=Germeaux
router.get("/", async (req, res) => {
  try {
    const { cow_id, bull_id, state, farm_id, farm_name } = req.query;

    const where = {};
    if (cow_id) where.cow_id = Number(cow_id);
    if (bull_id) where.bull_id = Number(bull_id);
    if (state) where.state = state;

    // farm_id et farm_name peuvent être combinés
    const cowFilter = {};
    if (farm_id) cowFilter.farm_id = Number(farm_id);
    if (farm_name) cowFilter.farm = { name: { contains: farm_name.trim() } };
    if (Object.keys(cowFilter).length > 0) where.cow = cowFilter;

    const calvings = await prisma.calving.findMany({
      where,
      include,
      orderBy: { start_date: "desc" },
    });
    res.json(calvings);
  } catch (err) {
    handleError(err, res, "fetch");
  }
});

// GET /calving/:id - un vêlage précis
router.get("/:id", async (req, res) => {
  try {
    const calving = await prisma.calving.findUnique({
      where: { calving_id: Number(req.params.id) },
      include,
    });
    if (!calving) return res.status(404).json({ error: "Calving not found" });
    res.json(calving);
  } catch (err) {
    handleError(err, res, "fetch");
  }
});

// POST /calving - créer un vêlage
router.post("/", async (req, res) => {
  try {
    const { cow_id, bull_id, calf_id, start_date, end_date, state } = req.body;

    if (!cow_id || !start_date || !state) {
      return res.status(400).json({ error: "Missing required fields: cow_id, start_date, state" });
    }

    const start = toDate(start_date);
    const end = toDate(end_date);
    if (isInvalidDate(start) || isInvalidDate(end)) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const calving = await prisma.calving.create({
      data: {
        cow_id,
        bull_id,
        calf_id,
        start_date: start,
        end_date: end,
        state,
      },
      include,
    });
    res.status(201).json(calving);
  } catch (err) {
    handleError(err, res, "create");
  }
});

// POST /calving/bulk - créer plusieurs vêlages d'un coup (tout ou rien)
router.post("/bulk", async (req, res) => {
  try {
    const items = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Expected a non-empty array of calvings" });
    }

    // Validation de chaque élément avant d'écrire quoi que ce soit
    const data = [];
    for (let i = 0; i < items.length; i++) {
      const { cow_id, bull_id, calf_id, start_date, end_date, state } = items[i];

      if (!cow_id || !start_date || !state) {
        return res
          .status(400)
          .json({ error: `Item ${i}: missing required fields (cow_id, start_date, state)` });
      }

      const start = toDate(start_date);
      const end = toDate(end_date);
      if (isInvalidDate(start) || isInvalidDate(end)) {
        return res.status(400).json({ error: `Item ${i}: invalid date format` });
      }

      data.push({ cow_id, bull_id, calf_id, start_date: start, end_date: end, state });
    }

    // Transaction : si un seul vêlage échoue, aucun n'est créé
    const created = await prisma.$transaction(
      data.map((d) => prisma.calving.create({ data: d }))
    );

    res.status(201).json({ count: created.length });
  } catch (err) {
    handleError(err, res, "create");
  }
});

// PUT /calving/:id - remplacement COMPLET
// Champs obligatoires : cow_id, start_date, state
// Champs optionnels absents (bull_id, calf_id, end_date) => remis à null
router.put("/:id", async (req, res) => {
  try {
    const { cow_id, bull_id, calf_id, start_date, end_date, state } = req.body;

    if (!cow_id || !start_date || !state) {
      return res
        .status(400)
        .json({ error: "PUT requires cow_id, start_date and state (use PATCH for partial updates)" });
    }

    const start = toDate(start_date);
    const end = toDate(end_date);
    if (isInvalidDate(start) || isInvalidDate(end)) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const calving = await prisma.calving.update({
      where: { calving_id: Number(req.params.id) },
      data: {
        cow_id,
        start_date: start,
        state,
        bull_id: bull_id ?? null,
        calf_id: calf_id ?? null,
        end_date: end ?? null,
      },
      include,
    });
    res.json(calving);
  } catch (err) {
    handleError(err, res, "update");
  }
});

// PATCH /calving/:id - modification PARTIELLE
// Seuls les champs envoyés changent. Un champ absent garde sa valeur.
// Envoyer explicitement null efface bull_id, calf_id ou end_date.
router.patch("/:id", async (req, res) => {
  try {
    const { cow_id, bull_id, calf_id, start_date, end_date, state } = req.body;

    // Les champs obligatoires ne peuvent pas être mis à null
    if (cow_id === null || start_date === null || state === null) {
      return res.status(400).json({ error: "cow_id, start_date and state cannot be null" });
    }

    const start = toDate(start_date);
    const end = toDate(end_date);
    if (isInvalidDate(start) || isInvalidDate(end)) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const calving = await prisma.calving.update({
      where: { calving_id: Number(req.params.id) },
      data: {
        cow_id,
        bull_id,
        calf_id,
        start_date: start,
        end_date: end,
        state,
      },
      include,
    });
    res.json(calving);
  } catch (err) {
    handleError(err, res, "update");
  }
});

// DELETE /calving/:id - supprimer un vêlage
router.delete("/:id", async (req, res) => {
  try {
    await prisma.calving.delete({
      where: { calving_id: Number(req.params.id) },
    });
    res.status(204).send();
  } catch (err) {
    handleError(err, res, "delete");
  }
});

export default router;
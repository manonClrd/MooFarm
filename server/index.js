import express from "express";
import cors from "cors";
import farmRoutes from "./routes/farm.js";
import userRoutes from "./routes/user.js";
import cowRoutes from "./routes/cow.js";
import calvingRoutes from "./routes/calving.js";
import authRoutes from "./routes/auth.js";
import { authenticate, authorize, readOnlyForVisitors } from "./middleware/auth.js";
import path from "path";
import { fileURLToPath } from "url";
const app = express();
app.use(cors());
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use("/admin", express.static(path.join(__dirname, "public")));



app.use("/auth", authRoutes); // public : register & login

app.use("/farm", authenticate, readOnlyForVisitors, farmRoutes);
app.use("/cow", authenticate, readOnlyForVisitors, cowRoutes);
app.use("/calving", authenticate, readOnlyForVisitors, calvingRoutes);
app.use("/user", authenticate, authorize("admin"), userRoutes);




app.get("/", (req, res) => {
  res.send("Backend OK");
});

// 404 en JSON pour toute route inconnue
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Erreurs non gérées (JSON invalide dans le body, bug inattendu...) en JSON
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  res.status(status).json({
    error: status < 500 ? err.message : "Internal server error",
  });
});

app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});
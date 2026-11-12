import "dotenv/config";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET is missing or too short in .env (use at least 32 random characters)");
}

export const TOKEN_TTL = process.env.JWT_EXPIRES_IN || "1h";

// Crée un token signé. Le payload contient le rôle et la ferme pour éviter une requête SQL à chaque appel.
export const signToken = (user) =>
  jwt.sign({ role: user.role, farm_id: user.farm_id ?? null }, JWT_SECRET, {
    subject: String(user.user_id),
    expiresIn: TOKEN_TTL,
    algorithm: "HS256",
  });

// Vérifie le header "Authorization: Bearer <token>" et remplit req.user
export const authenticate = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return res
      .status(401)
      .json({ error: "Missing or malformed Authorization header (expected: Bearer <token>)" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    req.user = {
      user_id: Number(payload.sub),
      role: payload.role,
      farm_id: payload.farm_id,
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired, please log in again" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Autorise uniquement certains rôles : authorize("admin") ou authorize("admin", "user")
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to do this" });
    }
    next();
  };

// Les visiteurs peuvent lire (GET) mais pas créer, modifier ni supprimer
export const readOnlyForVisitors = (req, res, next) => {
  const isRead = ["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (req.user?.role === "visitor" && !isRead) {
    return res.status(403).json({ error: "Visitors have read-only access" });
  }
  next();
};
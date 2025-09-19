
const express = require("express");
const db = require("./database/database");
const bcrypt = require("bcrypt");     
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
// Helpers
// Extrae token Bearer del header Authorization
function getBearerToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}
// Devuelve segundos restantes antes de expirar (0 si ya expiró)
function secondsLeft(expEpochSec) {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, expEpochSec - now);
}



app.get("/health", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW()");
    res.json({ ok: true, db_time: result.rows[0].now });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "DB connection failed" });
  }
});

//POST 
// Crear usuario
app.post("/auth/register", async (req, res) => {
  try {
    let { email, password } = req.body || {};

    // Validaciones simples
    if (!email || !password) {
      return res.status(400).json({ error: "Correo y contraseña son requeridos" });
    }
    email = String(email).trim().toLowerCase();
    if (password.length < 8) {
      return res.status(400).json({ error: "La contraseña debe tener un mínimo de 8 caracteres" });
    }

    // ¿ya existe?
    const exists = await db.query("SELECT 1 FROM users WHERE LOWER(email)=LOWER($1)", [email]);
    if (exists.rowCount > 0) {
      return res.status(409).json({ error: "email ya está en uso" });
    }

    // hash y guardar
    const hash = await bcrypt.hash(password, 12);
    const q = `
      INSERT INTO users (email, password)
      VALUES ($1, $2)
      RETURNING id, email, created_at
    `;
    const { rows } = await db.query(q, [email, hash]);
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "error al registrar" });
  }
});

// Login:
// - Si ya traes un token válido en Authorization: Bearer <token>, te aviso que sigue activo.
// - Si no, valido credenciales y emito un token NUEVO por 5 minutos.
app.post("/auth/login", async (req, res) => {
  try {
    // 1) ¿Ya trae un token vigente?
    const existing = getBearerToken(req);
    if (existing) {
      try {
        const payload = jwt.verify(existing, process.env.JWT_SECRET);
        return res.json({
          message: "Ya iniciaste sesión. Tu token sigue siendo válido.",
          userId: payload.sub,
          expiresInSeconds: secondsLeft(payload.exp)
        });
      } catch {
        // token inválido o expirado => seguimos con login normal
      }
    }

    // 2) Login normal (sin token o token vencido)
    let { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "credenciales requeridas" });
    }
    email = String(email).trim().toLowerCase();

    const { rows } = await db.query(
      "SELECT id, email, password FROM users WHERE LOWER(email)=LOWER($1)",
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "credenciales inválidas" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "credenciales inválidas" });

    // Token por 5 minutos
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "5m" });
    res.json({
      message: "Inicio de sesión exitoso.",
      token,
      userId: user.id,
      expiresInSeconds: 5 * 60
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "error al iniciar sesión" });
  }
});



//GET 
// Obtiene el perfil del usuario autenticado
// Mi perfil
app.get("/users/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, email, created_at FROM users WHERE id=$1",
      [req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

  



    
//Middleware para verificar el token JWT
function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // payload.sub debe ser el UUID del usuario
    req.userId = payload.sub;
    next();
  } catch (e) {
    // expirada, firma inválida, etc.
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}




const PORT = 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

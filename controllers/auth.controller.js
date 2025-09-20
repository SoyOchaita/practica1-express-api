
/**
 * Controlador de autenticación para registro e inicio de sesión de usuarios.
 * Utiliza bcrypt para hashear contraseñas y JWT para emitir tokens.
 */

// Importa la conexión a la base de datos
// Importa bcrypt para hashear y comparar contraseñas
// Importa jsonwebtoken para crear y verificar tokens JWT

/**
 * Extrae el token Bearer del encabezado Authorization de la petición.
 * @param {Request} req
 * @returns {string|null} Token JWT si existe, null si no.
 */
function getBearerToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

/**
 * Calcula los segundos restantes antes de que expire el token.
 * @param {number} expEpochSec - Fecha de expiración en segundos (epoch)
 * @returns {number} Segundos restantes
 */
function secondsLeft(expEpochSec) {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, expEpochSec - now);
}

/**
 * Registra un nuevo usuario en la base de datos.
 * Valida email, password y username antes de crear el usuario.
 * @param {Request} req
 * @param {Response} res
 */
async function register(req, res) {
  try {
    let { email, password, username } = req.body || {};
    // Verifica que los campos requeridos estén presentes
    if (!email || !password || !username) {
      return res.status(400).json({ error: "email, password y username requeridos" });
    }
    // Normaliza email y username
    email = String(email).trim().toLowerCase();
    username = String(username).trim().toLowerCase();

    // Valida el formato del username
    if (!/^[a-z0-9]{3,30}$/.test(username)) {
      return res.status(400).json({ error: "username inválido (solo letras y números, 3..30)" });
    }
    // Valida la longitud mínima del password
    if (password.length < 8) {
      return res.status(400).json({ error: "password mínimo 8 caracteres" });
    }

    // Verifica si el email ya está en uso
    const ex1 = await db.query("SELECT 1 FROM users WHERE LOWER(email)=LOWER($1)", [email]);
    if (ex1.rowCount) return res.status(409).json({ error: "email ya en uso" });

    // Verifica si el username ya está en uso
    const ex2 = await db.query("SELECT 1 FROM users WHERE LOWER(username)=LOWER($1)", [username]);
    if (ex2.rowCount) return res.status(409).json({ error: "username ya en uso" });

    // Hashea la contraseña antes de guardarla
    const hash = await bcrypt.hash(password, 12);
    // Inserta el usuario en la base de datos y retorna los datos principales
    const { rows } = await db.query(
      `INSERT INTO users (email, password, username)
       VALUES ($1,$2,$3)
       RETURNING id, email, username, created_at`,
      [email, hash, username]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "error al registrar" });
  }
}

/**
 * Inicia sesión de usuario.
 * Verifica credenciales y emite un token JWT si son válidas.
 * Si ya tiene un token vigente, lo informa y no emite uno nuevo.
 * @param {Request} req
 * @param {Response} res
 */
async function login(req, res) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;

    // Si ya trae token vigente, avisa y no emite otro
    const existing = getBearerToken(req);
    if (existing) {
      try {
        const payload = jwt.verify(existing, JWT_SECRET);
        return res.json({
          message: "Ya iniciaste sesión. Tu token sigue siendo válido.",
          userId: payload.sub,
          expiresInSeconds: secondsLeft(payload.exp)
        });
      } catch {}
    }

    let { email, password } = req.body || {};
    // Verifica que las credenciales estén presentes
    if (!email || !password) return res.status(400).json({ error: "credenciales requeridas" });
    email = String(email).trim().toLowerCase();

    // Busca el usuario por email
    const { rows } = await db.query(
      "SELECT id, email, password, username FROM users WHERE LOWER(email)=LOWER($1)",
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "credenciales inválidas" });

    // Compara la contraseña ingresada con la almacenada
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "credenciales inválidas" });

    // Genera el token JWT válido por 5 minutos
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "5m" });
    // Verifica si el usuario necesita crear un username válido
    const needsUsername = !user.username || !/^[a-z0-9]{3,30}$/.test(user.username);

    return res.json({
      message: needsUsername
        ? "Inicio de sesión exitoso. Debes crear tu username con PATCH /users/me/username."
        : "Inicio de sesión exitoso.",
      token,
      userId: user.id,
      expiresInSeconds: 300,
      needsUsername
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "error al iniciar sesión" });
  }
}

// Exporta las funciones de registro e inicio de sesión
module.exports = { register, login };
const db = require("../database/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

function getBearerToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}
function secondsLeft(expEpochSec) {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, expEpochSec - now);
}

async function register(req, res) {
  try {
    let { email, password, username } = req.body || {};
    if (!email || !password || !username) {
      return res.status(400).json({ error: "email, password y username requeridos" });
    }
    email = String(email).trim().toLowerCase();
    username = String(username).trim().toLowerCase();

    if (!/^[a-z0-9]{3,30}$/.test(username)) {
      return res.status(400).json({ error: "username inválido (solo letras y números, 3..30)" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "password mínimo 8 caracteres" });
    }

    const ex1 = await db.query("SELECT 1 FROM users WHERE LOWER(email)=LOWER($1)", [email]);
    if (ex1.rowCount) return res.status(409).json({ error: "email ya en uso" });

    const ex2 = await db.query("SELECT 1 FROM users WHERE LOWER(username)=LOWER($1)", [username]);
    if (ex2.rowCount) return res.status(409).json({ error: "username ya en uso" });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO users (email, password, username)
       VALUES ($1,$2,$3)
       RETURNING id, email, username, created_at`,
      [email, hash, username]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "error al registrar" });
  }
}

async function login(req, res) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;

    // si ya trae token vigente, avisa y no emitas otro
    const existing = getBearerToken(req);
    if (existing) {
      try {
        const payload = jwt.verify(existing, JWT_SECRET);
        return res.json({
          message: "Ya iniciaste sesión. Tu token sigue siendo válido.",
          userId: payload.sub,
          expiresInSeconds: secondsLeft(payload.exp)
        });
      } catch {}
    }

    let { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "credenciales requeridas" });
    email = String(email).trim().toLowerCase();

    const { rows } = await db.query(
      "SELECT id, email, password, username FROM users WHERE LOWER(email)=LOWER($1)",
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "credenciales inválidas" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "credenciales inválidas" });

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "5m" });
    const needsUsername = !user.username || !/^[a-z0-9]{3,30}$/.test(user.username);

    return res.json({
      message: needsUsername
        ? "Inicio de sesión exitoso. Debes crear tu username con PATCH /users/me/username."
        : "Inicio de sesión exitoso.",
      token,
      userId: user.id,
      expiresInSeconds: 300,
      needsUsername
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "error al iniciar sesión" });
  }
}

module.exports = { register, login };

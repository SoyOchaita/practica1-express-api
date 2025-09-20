


const db = require("../database/database");

async function createPost(req, res) {
  try {
    const { content } = req.body || {};
    if (!content || content.length < 1 || content.length > 280) {
      return res.status(400).json({ error: "content 1..280 requerido" });
    }

    const { rows } = await db.query(
      `INSERT INTO posts (author_id, content)
       VALUES ($1,$2)
       RETURNING id, author_id, content, created_at`,
      [req.userId, content]
    );

    const p = rows[0];
    const u = await db.query("SELECT username FROM users WHERE id=$1", [p.author_id]);

    return res.status(201).json({
      id: p.id,
      author_id: p.author_id,
      author_username: u.rows[0]?.username || null,
      content: p.content,
      created_at: p.created_at
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al crear post" });
  }
}

async function listPosts(req, res) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "10", 10) || 10, 1), 100);
    const authorId = req.query.authorId ? String(req.query.authorId) : null;
    const q = req.query.q ? String(req.query.q) : null;

    const where = [];
    const params = [];
    let i = 1;

    if (authorId) { where.push(`p.author_id = $${i++}`); params.push(authorId); }
    if (q) { where.push(`p.content ILIKE $${i++}`); params.push(`%${q}%`); }

    const sql = `
      SELECT p.id, p.author_id, u.username AS author_username, p.content, p.created_at
      FROM posts p
      JOIN users u ON u.id = p.author_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY p.created_at DESC
      LIMIT ${limit}
    `;
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar posts" });
  }
}

async function followingFeed(req, res) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "10", 10) || 10, 1), 100);
    const { rows } = await db.query(
      `SELECT p.id, p.author_id, u.username AS author_username, p.content, p.created_at
       FROM posts p
       JOIN users u ON u.id = p.author_id
       JOIN follows f ON f.following_id = p.author_id
       WHERE f.follower_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2`,
      [req.userId, limit]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener feed" });
  }
}

module.exports = { createPost, listPosts, followingFeed };

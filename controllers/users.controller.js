const db = require("../database/database");

/** GET /users/me */
async function me(req, res) {
  try {
    const { rows } = await db.query(
      "SELECT id, email, username, created_at FROM users WHERE id=$1",
      [req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
}

/** PATCH /users/me/username */
async function changeUsername(req, res) {
  try {
    let { username } = req.body || {};
    if (!username) return res.status(400).json({ error: "username requerido" });
    username = String(username).trim().toLowerCase();

    if (!/^[a-z0-9]{3,30}$/.test(username)) {
      return res.status(400).json({ error: "username inválido (solo letras y números, 3..30)" });
    }

    const { rows: cur } = await db.query(
      "SELECT id, email, username, created_at FROM users WHERE id=$1",
      [req.userId]
    );
    if (!cur[0]) return res.status(404).json({ error: "Usuario no encontrado" });
    if (cur[0].username === username) return res.json(cur[0]);

    const { rows } = await db.query(
      `UPDATE users SET username=LOWER($1)
       WHERE id=$2
       RETURNING id, email, username, created_at`,
      [username, req.userId]
    );
    res.json(rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "username ya en uso" });
    if (e.code === "23514") return res.status(400).json({ error: "username no cumple formato" });
    console.error(e);
    res.status(500).json({ error: "Error al cambiar username" });
  }
}

/** Helpers follow state */
async function getTargetById(id) {
  const r = await db.query("SELECT id, username FROM users WHERE id=$1", [id]);
  return r.rows[0] || null;
}
async function getTargetByUsername(handle) {
  const r = await db.query(
    "SELECT id, username FROM users WHERE LOWER(username)=LOWER($1)",
    [handle.toLowerCase()]
  );
  return r.rows[0] || null;
}
async function isFollowing(followerId, followingId) {
  const r = await db.query(
    "SELECT 1 FROM follows WHERE follower_id=$1 AND following_id=$2",
    [followerId, followingId]
  );
  return r.rowCount > 0;
}

/** POST /users/:id/follow — seguir por ID (con mensajes y validación) */
async function followById(req, res) {
  try {
    const followingId = req.params.id;
    if (followingId === req.userId) {
      return res.status(400).json({ ok:false, code:"FOLLOW_SELF", message:"No puedes seguirte a ti mismo" });
    }
    const target = await getTargetById(followingId);
    if (!target) {
      return res.status(404).json({ ok:false, code:"TARGET_NOT_FOUND", message:"Usuario a seguir no existe" });
    }
    if (await isFollowing(req.userId, followingId)) {
      return res.status(409).json({
        ok: false, code: "ALREADY_FOLLOWING",
        message: `Ya sigues a ${target.username} (${target.id}).`,
        data: { followingId: target.id, username: target.username }
      });
    }
    const ins = await db.query(
      `INSERT INTO follows (follower_id, following_id)
       VALUES ($1,$2)
       RETURNING created_at`,
      [req.userId, followingId]
    );
    return res.status(201).json({
      ok: true, code: "FOLLOW_CREATED",
      message: `Has seguido a ${target.username} (${target.id}).`,
      data: { followingId: target.id, username: target.username, createdAt: ins.rows[0].created_at }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, code:"FOLLOW_ERROR", message:"Error al seguir" });
  }
}

/** DELETE /users/:id/follow — dejar de seguir por ID (valida estado) */
async function unfollowById(req, res) {
  try {
    const followingId = req.params.id;
    const target = await getTargetById(followingId);
    if (!target) {
      return res.status(409).json({ ok:false, code:"TARGET_NOT_FOUND", message:"No se puede dejar de seguir: el usuario destino no existe." });
    }
    if (!(await isFollowing(req.userId, followingId))) {
      return res.status(409).json({
        ok: false, code: "NOT_FOLLOWING",
        message: `No puedes dejar de seguir: no sigues a ${target.username} (${target.id}).`,
        data: { followingId: target.id, username: target.username }
      });
    }
    await db.query("DELETE FROM follows WHERE follower_id=$1 AND following_id=$2", [req.userId, followingId]);
    return res.status(200).json({
      ok: true, code: "FOLLOW_DELETED",
      message: `Has dejado de seguir a ${target.username} (${target.id}).`,
      data: { followingId: target.id, username: target.username, deleted: true }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, code:"UNFOLLOW_ERROR", message:"Error al dejar de seguir" });
  }
}

/** POST /users/handle/:username/follow — seguir por username */
async function followByUsername(req, res) {
  try {
    const handle = String(req.params.username).toLowerCase();
    const target = await getTargetByUsername(handle);
    if (!target) return res.status(404).json({ ok:false, code:"TARGET_NOT_FOUND", message:"Usuario a seguir no existe" });
    if (target.id === req.userId) return res.status(400).json({ ok:false, code:"FOLLOW_SELF", message:"No puedes seguirte a ti mismo" });
    if (await isFollowing(req.userId, target.id)) {
      return res.status(409).json({
        ok: false, code: "ALREADY_FOLLOWING",
        message: `Ya sigues a ${target.username} (${target.id}).`,
        data: { followingId: target.id, username: target.username }
      });
    }
    const ins = await db.query(
      `INSERT INTO follows (follower_id, following_id)
       VALUES ($1,$2)
       RETURNING created_at`,
      [req.userId, target.id]
    );
    return res.status(201).json({
      ok: true, code: "FOLLOW_CREATED",
      message: `Has seguido a ${target.username} (${target.id}).`,
      data: { followingId: target.id, username: target.username, createdAt: ins.rows[0].created_at }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, code:"FOLLOW_ERROR", message:"Error al seguir" });
  }
}

/** DELETE /users/handle/:username/follow — dejar de seguir por username */
async function unfollowByUsername(req, res) {
  try {
    const handle = String(req.params.username).toLowerCase();
    const target = await getTargetByUsername(handle);
    if (!target) {
      return res.status(409).json({ ok:false, code:"TARGET_NOT_FOUND", message:"No se puede dejar de seguir: el usuario destino no existe." });
    }
    if (!(await isFollowing(req.userId, target.id))) {
      return res.status(409).json({
        ok: false, code: "NOT_FOLLOWING",
        message: `No puedes dejar de seguir: no sigues a ${target.username} (${target.id}).`,
        data: { followingId: target.id, username: target.username }
      });
    }
    await db.query("DELETE FROM follows WHERE follower_id=$1 AND following_id=$2", [req.userId, target.id]);
    return res.status(200).json({
      ok: true, code: "FOLLOW_DELETED",
      message: `Has dejado de seguir a ${target.username} (${target.id}).`,
      data: { followingId: target.id, username: target.username, deleted: true }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, code:"UNFOLLOW_ERROR", message:"Error al dejar de seguir" });
  }
}

/** DELETE /users/me — borrar usuario y sus datos (simple, sin transacción) */
async function deleteMe(req, res) {
  try {
    // 1) follows (donde sigo y donde me siguen)
    await db.query("DELETE FROM follows WHERE follower_id=$1 OR following_id=$1", [req.userId]);
    // 2) posts
    await db.query("DELETE FROM posts WHERE author_id=$1", [req.userId]);
    // 3) usuario
    const delUser = await db.query("DELETE FROM users WHERE id=$1 RETURNING id, email, username", [req.userId]);

    if (delUser.rowCount === 0) {
      return res.status(404).json({ ok:false, code:"USER_NOT_FOUND", message:"Usuario no encontrado" });
    }

    return res.status(200).json({
      ok: true,
      code: "USER_DELETED",
      message: "Usuario y datos asociados eliminados",
      data: delUser.rows[0]
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, code:"DELETE_ERROR", message:"Error al borrar usuario" });
  }
}

module.exports = {
  me,
  changeUsername,
  followById,
  unfollowById,
  followByUsername,
  unfollowByUsername,
  deleteMe
};

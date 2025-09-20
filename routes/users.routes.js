const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const {
  me,
  changeUsername,
  followById,
  unfollowById,
  followByUsername,
  unfollowByUsername,
  deleteMe
} = require("../controllers/users.controller");

// Perfil propio y username
router.get("/me", requireAuth, me);
router.patch("/me/username", requireAuth, changeUsername);

// Seguir / dejar de seguir por ID
router.post("/:id/follow", requireAuth, followById);
router.delete("/:id/follow", requireAuth, unfollowById);

// Seguir / dejar de seguir por username (si vas a usarlas)
router.post("/handle/:username/follow", requireAuth, followByUsername);
router.delete("/handle/:username/follow", requireAuth, unfollowByUsername);

// Borrar mi usuario
router.delete("/me", requireAuth, deleteMe);

module.exports = router;

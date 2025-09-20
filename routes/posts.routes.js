const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { createPost, listPosts, followingFeed } = require("../controllers/posts.controller");

router.get("/", listPosts);
router.get("/following", requireAuth, followingFeed);
router.post("/", requireAuth, createPost);

module.exports = router;

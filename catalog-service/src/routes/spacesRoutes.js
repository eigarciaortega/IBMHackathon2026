const express = require("express");

const {
  createSpace,
  deleteSpace,
  getSpaceById,
  listSpaces,
  updateSpace
} = require("../controllers/spacesController");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticateToken, listSpaces);
router.get("/:id", authenticateToken, getSpaceById);
router.post("/", authenticateToken, requireAdmin, createSpace);
router.put("/:id", authenticateToken, requireAdmin, updateSpace);
router.delete("/:id", authenticateToken, requireAdmin, deleteSpace);

module.exports = router;

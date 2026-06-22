const express = require("express");

const {
  cancelBooking,
  createBooking,
  getAvailability,
  getMyBookings
} = require("../controllers/bookingsController");
const { searchAssistantSpaces } = require("../controllers/assistantController");
const { getAnalyticsDashboard, getTodayDashboard } = require("../controllers/dashboardController");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/availability", authenticateToken, getAvailability);
router.post("/bookings", authenticateToken, createBooking);
router.get("/bookings/my", authenticateToken, getMyBookings);
router.delete("/bookings/:id", authenticateToken, cancelBooking);
router.get("/dashboard/today", authenticateToken, requireAdmin, getTodayDashboard);
router.get("/dashboard/analytics", authenticateToken, requireAdmin, getAnalyticsDashboard);
router.post("/assistant/search", authenticateToken, searchAssistantSpaces);

module.exports = router;

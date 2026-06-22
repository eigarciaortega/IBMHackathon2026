const dashboardService = require('../services/dashboard.service');

const getTodayOccupancy = async (req, res) => {
  try {
    const data = await dashboardService.getTodayOccupancy();
    return res.status(200).json(data);
  } catch (err) {
    console.error('[Dashboard] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getTodayOccupancy };

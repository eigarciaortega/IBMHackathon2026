const validateCreateBooking = (req, res, next) => {
  const { space_id, start_time, end_time, attendees } = req.body;
  const errors = [];

  if (!space_id) errors.push('space_id is required');
  if (!start_time) errors.push('start_time is required');
  if (!end_time) errors.push('end_time is required');
  if (!attendees) errors.push('attendees is required');

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const start = new Date(start_time);
  const end = new Date(end_time);
  const now = new Date();

  if (isNaN(start.getTime())) {
    return res.status(400).json({ error: 'start_time is not a valid date' });
  }

  if (isNaN(end.getTime())) {
    return res.status(400).json({ error: 'end_time is not a valid date' });
  }

  // Rule 1: end must be after start
  if (end <= start) {
    return res.status(400).json({ error: 'end_time must be after start_time' });
  }

  // Rule 2: booking must be in the future
  if (start <= now) {
    return res.status(400).json({ error: 'start_time must be in the future' });
  }

  // Rule 3: attendees must be a positive integer
  if (!Number.isInteger(Number(attendees)) || Number(attendees) < 1) {
    return res.status(400).json({ error: 'attendees must be a positive integer' });
  }

  next();
};

module.exports = { validateCreateBooking };

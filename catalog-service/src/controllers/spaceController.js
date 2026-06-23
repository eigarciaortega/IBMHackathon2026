/**
 * Controlador del catálogo de espacios.
 * Lectura abierta a usuarios autenticados; escritura solo ADMINISTRADOR.
 */
const { validationResult } = require('express-validator')
const { query } = require('../config/db')

function parseBool(v) {
  if (v === undefined) return undefined
  return v === true || v === 'true' || v === '1'
}

async function listSpaces(req, res, next) {
  try {
    const { type, minCapacity, projector, ac, videoconference, all } = req.query
    const conditions = []
    const params = []

    // Por defecto solo espacios activos; ?all=true incluye inactivos (admin).
    if (!parseBool(all)) conditions.push('active = true')

    if (type) {
      params.push(type)
      conditions.push(`type = $${params.length}`)
    }
    if (minCapacity) {
      params.push(Number(minCapacity))
      conditions.push(`capacity >= $${params.length}`)
    }
    if (parseBool(projector)) conditions.push('has_projector = true')
    if (parseBool(ac)) conditions.push('has_ac = true')
    if (parseBool(videoconference)) conditions.push('has_videoconference = true')

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await query(
      `SELECT * FROM spaces ${where} ORDER BY type, capacity DESC, name`,
      params,
    )
    return res.json(rows)
  } catch (err) {
    return next(err)
  }
}

async function getSpace(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM spaces WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Espacio no encontrado' })
    return res.json(rows[0])
  } catch (err) {
    return next(err)
  }
}

async function createSpace(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: errors.array() })
  }
  try {
    const {
      name, type, capacity, floor, location,
      has_projector = false, has_ac = false, has_videoconference = false,
    } = req.body
    const { rows } = await query(
      `INSERT INTO spaces (name, type, capacity, floor, location, has_projector, has_ac, has_videoconference)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, type, capacity, floor, location || null, !!has_projector, !!has_ac, !!has_videoconference],
    )
    return res.status(201).json(rows[0])
  } catch (err) {
    return next(err)
  }
}

async function updateSpace(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: errors.array() })
  }
  try {
    const id = req.params.id
    const existing = await query('SELECT * FROM spaces WHERE id = $1', [id])
    if (!existing.rows[0]) return res.status(404).json({ error: 'Espacio no encontrado' })

    const cur = existing.rows[0]
    const b = req.body
    const merged = {
      name: b.name ?? cur.name,
      type: b.type ?? cur.type,
      capacity: b.capacity ?? cur.capacity,
      floor: b.floor ?? cur.floor,
      location: b.location ?? cur.location,
      has_projector: b.has_projector ?? cur.has_projector,
      has_ac: b.has_ac ?? cur.has_ac,
      has_videoconference: b.has_videoconference ?? cur.has_videoconference,
      active: b.active ?? cur.active,
    }
    const { rows } = await query(
      `UPDATE spaces SET name=$1, type=$2, capacity=$3, floor=$4, location=$5,
        has_projector=$6, has_ac=$7, has_videoconference=$8, active=$9
       WHERE id=$10 RETURNING *`,
      [merged.name, merged.type, merged.capacity, merged.floor, merged.location,
       merged.has_projector, merged.has_ac, merged.has_videoconference, merged.active, id],
    )
    return res.json(rows[0])
  } catch (err) {
    return next(err)
  }
}

async function deleteSpace(req, res, next) {
  try {
    const { rows } = await query('DELETE FROM spaces WHERE id = $1 RETURNING id', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Espacio no encontrado' })
    return res.json({ message: 'Espacio eliminado', id: rows[0].id })
  } catch (err) {
    return next(err)
  }
}

module.exports = { listSpaces, getSpace, createSpace, updateSpace, deleteSpace }

const pool = require('../config/db');

const normalizeBaseUrl = (url = '') => {
  if (!url) return '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const ensureLeadingSlash = (value = '') => {
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value}`;
};

const assetBaseUrl = normalizeBaseUrl(process.env.SERVER_URL || process.env.BACKEND_URL || '');
const buildAssetUrl = (segment = '') => {
  const normalizedSegment = ensureLeadingSlash(segment);
  if (!assetBaseUrl) {
    return normalizedSegment;
  }
  return `${assetBaseUrl}${normalizedSegment}`;
};

/**
 * Controlador para enviar una solicitud de amistad
 */
const enviarSolicitudAmistad = async (req, res) => {
  const { from, to } = req.body;

  if (!from || !to) {
    console.error('Error: Los campos "from" y "to" son obligatorios');
    return res.status(400).json({ error: 'Los campos "from" y "to" son obligatorios' });
  }

  try {
    console.log(`Solicitud de amistad: from=${from}, to=${to}`);

    // Obtener los IDs de los usuarios
    const [fromUser] = await pool.query('SELECT id FROM usuarios WHERE nombre_usuario = ?', [from]);
    const [toUser] = await pool.query('SELECT id FROM usuarios WHERE nombre_usuario = ?', [to]);

    if (fromUser.length === 0 || toUser.length === 0) {
      console.error('Error: Uno o ambos usuarios no existen');
      return res.status(404).json({ error: 'Uno o ambos usuarios no existen' });
    }

    const fromId = fromUser[0].id;
    const toId = toUser[0].id;

    // Verificar si ya existe una relación de amistad
    const [existing] = await pool.query(
      'SELECT * FROM amigos WHERE (usuario_id = ? AND amigo_id = ?) OR (usuario_id = ? AND amigo_id = ?)',
      [fromId, toId, toId, fromId]
    );

    if (existing.length > 0) {
      console.error('Error: Ya existe una relación de amistad o solicitud pendiente');
      return res.status(400).json({ error: 'Ya existe una relación de amistad o solicitud pendiente' });
    }

    // Crear la solicitud de amistad
    await pool.query('INSERT INTO amigos (usuario_id, amigo_id, estado) VALUES (?, ?, ?)', [fromId, toId, 'pendiente']);
    console.log('Solicitud de amistad creada exitosamente');
    res.status(201).json({ message: 'Solicitud de amistad enviada' });
  } catch (err) {
    console.error('Error al enviar solicitud de amistad:', err.message);
    res.status(500).json({ error: 'Error al enviar solicitud de amistad' });
  }
};

/**
 * Controlador para obtener la lista de amigos
 */
const obtenerAmigos = async (req, res) => {
  const { nombre_usuario } = req.query;

  if (!nombre_usuario) {
    return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        u.id AS usuario_id, 
        u.nombre_usuario, 
        IFNULL(
          CONCAT('${buildAssetUrl('/usuarios/')}', u.nombre_usuario, '/foto-perfil'), 
          '${buildAssetUrl('/foto_anonima.jpg')}'
        ) AS foto_perfil
      FROM amigos a
      JOIN usuarios u ON (a.usuario_id = u.id OR a.amigo_id = u.id)
      WHERE (a.usuario_id = (SELECT id FROM usuarios WHERE nombre_usuario = ?) 
      OR a.amigo_id = (SELECT id FROM usuarios WHERE nombre_usuario = ?))
      AND a.estado = 'aceptado'
      AND u.nombre_usuario != ?
      `,
      [nombre_usuario, nombre_usuario, nombre_usuario]
    );

    if (rows.length === 0) {
      return res.json({ message: 'No se encontraron amigos', amigos: [] });
    }

    res.json({ amigos: rows });
  } catch (err) {
    console.error('Error al obtener amigos:', err.message);
    res.status(500).json({ error: 'Error al obtener amigos' });
  }
};

/**
 * Controlador para obtener solicitudes de amistad pendientes
 */
const obtenerSolicitudesPendientes = async (req, res) => {
  const { to } = req.query;

  if (!to) {
    return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
  }

  try {
    // Obtener el ID del usuario logueado
    const [toUser] = await pool.query('SELECT id FROM usuarios WHERE nombre_usuario = ?', [to]);

    if (toUser.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const toId = toUser[0].id;

    // Obtener solicitudes de amistad pendientes con foto de perfil
    const [rows] = await pool.query(
      `
      SELECT 
        a.id, 
        u.nombre_usuario AS from_user,
        IFNULL(
          CONCAT('${buildAssetUrl('/usuarios/')}', u.nombre_usuario, '/foto-perfil'), 
          '${buildAssetUrl('/foto_anonima.jpg')}'
        ) AS foto_perfil
      FROM amigos a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.amigo_id = ? AND a.estado = 'pendiente'
      `,
      [toId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error al obtener solicitudes de amistad:', err.message);
    res.status(500).json({ error: 'Error al obtener solicitudes de amistad' });
  }
};

/**
 * Controlador para aceptar una solicitud de amistad
 */
const aceptarSolicitud = async (req, res) => {
  const { id } = req.params;

  try {
    // Cambiar el estado de la solicitud a "aceptado"
    await pool.query('UPDATE amigos SET estado = ? WHERE id = ?', ['aceptado', id]);
    res.json({ message: 'Solicitud de amistad aceptada' });
  } catch (err) {
    console.error('Error al aceptar solicitud de amistad:', err.message);
    res.status(500).json({ error: 'Error al aceptar solicitud de amistad' });
  }
};

/**
 * Controlador para rechazar una solicitud de amistad
 */
const rechazarSolicitud = async (req, res) => {
  const { id } = req.params;

  try {
    // Cambiar el estado de la solicitud a "rechazado"
    await pool.query('DELETE FROM amigos WHERE id = ?', [id]);
    res.json({ message: 'Solicitud de amistad rechazada' });
  } catch (err) {
    console.error('Error al rechazar solicitud de amistad:', err.message);
    res.status(500).json({ error: 'Error al rechazar solicitud de amistad' });
  }
};

module.exports = {
  enviarSolicitudAmistad,
  obtenerAmigos,
  obtenerSolicitudesPendientes,
  aceptarSolicitud,
  rechazarSolicitud
};

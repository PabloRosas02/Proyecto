const db = require('../modelos/db');
const { abrirSalonTCP } = require('../tcpManager');

exports.login = async (req, res) => {
	const {correo, contrasena} = req.body;
	try{
		const [usuarios] = await db.execute(`
		SELECT id, nombre, rol, contrasena FROM usuarios WHERE correo = ?`
		,[correo]);

		if (usuarios.length === 0 || usuarios[0].contrasena !== contrasena) {
			return res.status(401).json({ error: 'Credenciales inválidas' });
		}
		const usuario = usuarios[0];

		//Respuesta
		res.json({
			id: usuario.id,
			nombre: usuario.nombre,
			rol: usuario.rol
		});
	}
	catch(error) {
		console.error(error);
		res.status(500).json({
			mensaje: 'Error en el servidor'
		});
	}
};

exports.crearUsuario = async (req, res) => {
  const { admin_id, nombre, correo, contrasena, rfid, rol } = req.body;

  try {
    if (!contrasena || contrasena.trim() === '') {
      return res.status(400).json({ error: 'La contraseña no puede estar vacía' });
    }

    const [admin] = await db.execute(
      `SELECT * FROM usuarios WHERE id = ? AND rol = 'admin'`,
      [admin_id]
    );
    if (admin.length === 0) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Verificar si el RFID ya está en uso
    const [rfidExistente] = await db.execute(`SELECT * FROM usuarios WHERE rfid = ?`, [rfid]);
    if (rfidExistente.length > 0) {
      return res.status(400).json({ error: 'El RFID ya está en uso' });
    }

    await db.execute(
      `INSERT INTO usuarios (nombre, correo, contrasena, rfid, rol) VALUES (?, ?, ?, ?, ?)`,
      [nombre, correo, contrasena, rfid, rol]
    );

    res.json({ mensaje: 'Usuario creado correctamente' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

exports.modificarUsuario = async (req, res) => {
  const id = req.params.id;
  const { admin_id, nombre, correo, contrasena, rfid, rol } = req.body;

  try {
    const [admin] = await db.execute(
      `SELECT * FROM usuarios WHERE id = ? AND rol = 'admin'`,
      [admin_id]
    );
    if (admin.length === 0) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Verificar si el nuevo RFID está en uso por otro usuario
    const [rfidDuplicado] = await db.execute(
      `SELECT * FROM usuarios WHERE rfid = ? AND id != ?`,
      [rfid, id]
    );
    if (rfidDuplicado.length > 0) {
      return res.status(400).json({ error: 'El RFID ya está en uso por otro usuario' });
    }

    await db.execute(
      `UPDATE usuarios SET nombre = ?, correo = ?, contrasena = ?, rfid = ?, rol = ? WHERE id = ?`,
      [nombre, correo, contrasena, rfid, rol, id]
    );

    res.json({ mensaje: 'Usuario actualizado correctamente' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al modificar usuario' });
  }
};

exports.eliminarUsuario = async (req, res) => {
  const id = req.params.id;
  const { admin_id } = req.body;

  try {
    const [admin] = await db.execute(
      `SELECT * FROM usuarios WHERE id = ? AND rol = 'admin'`,
      [admin_id]
    );

    if (admin.length === 0) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    await db.execute(
      `DELETE FROM usuarios WHERE id = ?`,
      [id]
    );

    res.json({ mensaje: 'Usuario eliminado correctamente' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

exports.listarUsuarios = async (req, res) => {
  try {
    const [rows] = await db.execute(`SELECT id, nombre, correo, rfid, rol FROM usuarios`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

exports.crearHorario = async (req, res) => {
  const { admin_id, id_profesor, id_salon, dia_semana, hora_inicio, hora_fin } = req.body;
  console.log("Datos recibidos en crearHorario:", req.body);

  try {
    const [admin] = await db.execute(
      `SELECT * FROM usuarios WHERE id = ? AND rol = 'admin'`,
      [admin_id]
    );

    if (admin.length === 0) {
      console.log("Admin no autorizado");
      return res.status(403).json({ error: 'No autorizado' });
    }

    await db.execute(
      `INSERT INTO horarios (id_profesor, id_salon, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?, ?)`,
      [id_profesor, id_salon, dia_semana, hora_inicio, hora_fin]
    );

    console.log("Horario insertado correctamente");
    res.json({ mensaje: 'Horario creado correctamente' });

  } catch (err) {
    console.error("Error en crearHorario:", err);
    res.status(500).json({ error: 'Error al crear horario' });
  }
};


exports.modificarHorario = async (req, res) => {
  const id = req.params.id;
  const { admin_id, id_profesor, id_salon, dia_semana, hora_inicio, hora_fin } = req.body;

  console.log('Modificar horario - ID:', id, 'Body recibido:', req.body);

  if (!admin_id || !id_profesor || !id_salon || !dia_semana || !hora_inicio || !hora_fin) {
    return res.status(400).json({ error: 'Faltan datos obligatorios', body: req.body });
  }

  try {
    const [admin] = await db.execute(
      `SELECT * FROM usuarios WHERE id = ? AND rol = 'admin'`,
      [admin_id]
    );

    if (admin.length === 0) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const [resultado] = await db.execute(
      `UPDATE horarios SET id_profesor = ?, id_salon = ?, dia_semana = ?, hora_inicio = ?, hora_fin = ? WHERE id = ?`,
      [id_profesor, id_salon, dia_semana, hora_inicio, hora_fin, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    res.json({ mensaje: 'Horario actualizado correctamente' });

  } catch (err) {
    console.error('Error al modificar horario:', err);
    res.status(500).json({ error: 'Error al modificar horario', detalles: err.message });
  }
};


exports.eliminarHorario = async (req, res) => {
  const id = req.params.id;
  const { admin_id } = req.body;

  try {
    const [admin] = await db.execute(
      `SELECT * FROM usuarios WHERE id = ? AND rol = 'admin'`,
      [admin_id]
    );

    if (admin.length === 0) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    await db.execute(
      `DELETE FROM horarios WHERE id = ?`,
      [id]
    );

    res.json({ mensaje: 'Horario eliminado correctamente' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar horario' });
  }
};

exports.obtenerTodosHorarios = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT h.id, h.id_profesor, u.nombre AS profesor, h.id_salon, s.nombre AS salon,
             h.dia_semana, h.hora_inicio, h.hora_fin
      FROM horarios h
      JOIN usuarios u ON h.id_profesor = u.id
      JOIN salones s ON h.id_salon = s.id
      ORDER BY FIELD(h.dia_semana, 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'), h.hora_inicio
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener todos los horarios:', err);
    res.status(500).json({ error: 'Error al obtener los horarios' });
  }
};

exports.abrirSalon = async (req, res) => {
  const idSalon = parseInt(req.params.id_salon);
  const { admin_id } = req.body;

  try {
    // Verifica si quien hace la solicitud es un administrador válido
    const [admin] = await db.execute(
      `SELECT * FROM usuarios WHERE id = ? AND rol = 'admin'`,
      [admin_id]
    );

    if (admin.length === 0) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }

    // Intenta enviar la orden por TCP
    const exito = await abrirSalonTCP(idSalon, admin_id);
    if (!exito) {
      return res.status(500).json({ error: 'No se pudo enviar la orden al ESP32' });
    }

    // Insertar la apertura remota SIEMPRE (sin condición)
    await db.execute(
      `INSERT INTO aperturas_registradas (id_salon, id_usuario, tipo, hora_apertura)
       VALUES (?, ?, 'remota', NOW())`,
      [idSalon, admin_id]
    );

    res.json({ salon_id: idSalon, orden_enviada: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};


exports.verificarAperturaPendiente = async (req, res) => {
  const idSalon = req.params.id_salon;

  try {
    const [result] = await db.execute(`
      SELECT * FROM aperturas_pendientes 
      WHERE id_salon = ? AND procesado = 0 
      ORDER BY fecha ASC LIMIT 1
    `, [idSalon]);

    if (result.length === 0) {
      return res.json({ abrir: false });
    }

    res.json({
      abrir: true,
      orden_id: result[0].id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

exports.procesarOrden = async (req, res) => {
	const ordenId = req.params.orden_id;
	try{
		await db.execute(`UPDATE aperturas_pendientes SET procesado = 1 WHERE id = ?`, [ordenId]);
		res.json({mensaje: 'Orden procesada correctamente'});
	}
	catch(error) {
		console.error(error);
		res.status(500).json({
			mensaje: 'Error interno del servidor'
		});
	}
};

exports.obtenerHorariosProfesor = async (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({ error: 'ID de profesor no proporcionado' });
  }

  try {
    const [rows] = await db.execute(`
      SELECT h.dia_semana, h.hora_inicio, h.hora_fin, s.nombre AS salon
      FROM horarios h
      JOIN salones s ON h.id_salon = s.id
      WHERE h.id_profesor = ?
      ORDER BY FIELD(h.dia_semana, 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'), h.hora_inicio
    `, [id]);

    res.json(rows);
  } catch (err) {
    console.error('Error al obtener horarios:', err);
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
};

exports.estadoSalones = async (req, res) => {
  try {
    const now = new Date();
    const horaActual = now.toTimeString().slice(0, 8);
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const diaActual = dias[now.getDay()];

    const [salones] = await db.execute(`SELECT id, nombre FROM salones`);

    // Obtener solo la apertura más reciente por salón
    const [ultimasAperturas] = await db.execute(`
      SELECT ar.*
      FROM aperturas_registradas ar
      INNER JOIN (
        SELECT id_salon, MAX(hora_apertura) as max_apertura
        FROM aperturas_registradas
        GROUP BY id_salon
      ) ultimas ON ar.id_salon = ultimas.id_salon AND ar.hora_apertura = ultimas.max_apertura
    `);

    // Obtener profesores
    const [usuarios] = await db.execute(`SELECT id, nombre FROM usuarios`);
    const mapUsuarios = Object.fromEntries(usuarios.map(u => [u.id, u.nombre]));

    // Obtener horarios del día
    const [horariosHoy] = await db.execute(`
      SELECT id_salon, hora_inicio, hora_fin
      FROM horarios
      WHERE dia_semana = ?
      ORDER BY hora_inicio
    `, [diaActual]);

    const estadoSalones = salones.map(salon => {
      const apertura = ultimasAperturas.find(a => a.id_salon === salon.id);
      let estado = 'Disponible';
      let profesor = '-';
      let desde = '-';
      let hasta = '-';

      if (apertura) {
        const hora_apertura = apertura.hora_apertura.toTimeString().slice(0, 8);
        const hora_cerrar = apertura.hora_cerrar?.toTimeString().slice(0, 8) || null;
        const tipo = apertura.tipo;
        const nombre = mapUsuarios[apertura.id_usuario] || 'undefined';

        // RFID: verificar si aún está vigente
        if (tipo === 'rfid' && hora_cerrar && horaActual >= hora_apertura && horaActual < hora_cerrar) {
          estado = 'Ocupado';
          profesor = nombre;
          desde = hora_apertura;
          hasta = hora_cerrar;
        }

        // Remota: no tiene hora_cerrar, usar próximo horario como límite
        if (tipo === 'remota' && horaActual >= hora_apertura) {
          const siguiente = horariosHoy.find(h =>
            h.id_salon === salon.id && h.hora_inicio > hora_apertura
          );
          const siguienteHora = siguiente?.hora_inicio?.toString().slice(0, 8);

          if (!siguiente || horaActual < siguienteHora) {
            estado = 'Ocupado';
            profesor = nombre;
            desde = hora_apertura;
            hasta = siguienteHora || '-';
          }
        }
      }

      return {
        salon: salon.nombre,
        profesor,
        hora_inicio: desde,
        hora_fin: hasta,
        estado
      };
    });

    res.json(estadoSalones);
  } catch (err) {
    console.error('Error al obtener estado de salones:', err);
    res.status(500).json({ error: 'Error al obtener estado de salones' });
  }
};


exports.obtenerSalones = async (req, res) => {
  try {
    const [rows] = await db.execute(`SELECT id, nombre FROM salones ORDER BY id`);
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener salones:', err);
    res.status(500).json({ error: 'Error al obtener salones' });
  }
};

exports.obtenerHistorial = async (req, res) => {
  try {
    const filtroNombre = req.query.nombre || ''; 
    const [registros] = await db.execute(`
      SELECT 
        ar.id, 
        s.nombre AS salon, 
        u.nombre AS usuario, 
        ar.tipo, 
        ar.hora_apertura, 
        ar.hora_cerrar
      FROM aperturas_registradas ar
      JOIN usuarios u ON ar.id_usuario = u.id
      JOIN salones s ON ar.id_salon = s.id
      WHERE u.nombre LIKE ?
      ORDER BY ar.hora_apertura DESC
    `, [`%${filtroNombre}%`]);

    const formatearFecha = (fecha) => {
      if (!fecha) return '-';
      const f = new Date(fecha);
      return f.toLocaleString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    };

    const historial = registros.map(r => ({
      id: r.id,
      salon: r.salon,
      usuario: r.usuario,
      tipo: r.tipo,
      hora_apertura: formatearFecha(r.hora_apertura),
      hora_cerrar: formatearFecha(r.hora_cerrar)
    }));

    res.json(historial);
  } catch (err) {
    console.error('Error al obtener historial:', err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};
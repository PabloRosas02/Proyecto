const net = require('net');
const mysql = require('mysql2/promise');
require('dotenv').config();

const TCP_PORT = 4000;
const socketsPorSalon = {};

async function abrirSalonTCP(idSalon, adminId) {
  const socket = socketsPorSalon[idSalon];
  if (socket) {
    try {
      socket.write("ABRIR\n");

      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      await connection.execute(
        `INSERT INTO accesos (id_usuario, id_salon, autorizado) VALUES (?, ?, 1)`,
        [adminId, idSalon]
      );

      await connection.end();
      console.log(`Orden enviada al salón ${idSalon}`);
      return true;
    } catch (err) {
      console.error(`Error al abrir salón ${idSalon}:`, err);
      return false;
    }
  } else {
    console.warn(`No hay ESP32 conectado para el salón ${idSalon}`);
    return false;
  }
}

const tcpServer = net.createServer((socket) => {
  console.log('Cliente conectado por TCP');
  let idSalonAsociado = null;

  socket.on('data', async (data) => {
    const mensaje = data.toString().trim();
    let connection;

    try {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      if (mensaje.startsWith('LISTO:')) {
        const id = parseInt(mensaje.slice(6));
        if (!isNaN(id)) {
          idSalonAsociado = id;

          if (socketsPorSalon[idSalonAsociado] && socketsPorSalon[idSalonAsociado] !== socket) {
            socketsPorSalon[idSalonAsociado].destroy();
          }

          socketsPorSalon[idSalonAsociado] = socket;
          console.log(`ESP32 registrado en salón ${idSalonAsociado}`);
          socket.write("OK\n");
        } else {
          socket.write("INVALID\n");
        }
        return;
      }

      if (mensaje === "ABRIR") {
        if (idSalonAsociado) {
          const [admin] = await connection.execute(`
            SELECT id_usuario FROM accesos 
            WHERE id_salon = ? AND autorizado = 1 
            ORDER BY id DESC LIMIT 1
          `, [idSalonAsociado]);

          if (admin.length > 0) {
            await connection.execute(`
              INSERT INTO aperturas_registradas (id_salon, id_usuario, tipo, hora_apertura) 
              VALUES (?, ?, 'remota', NOW())
            `, [idSalonAsociado, admin[0].id_usuario]);
          }
        }
        return;
      }

      if (mensaje.startsWith('RFID:')) {
        const partes = mensaje.split(':');
        const rfid = partes[1];
        const salonSolicitado = parseInt(partes[2]);

        const [usuarios] = await connection.execute(`SELECT * FROM usuarios WHERE rfid = ?`, [rfid]);

        if (usuarios.length === 0 || usuarios[0].rol !== 'profesor') {
          socket.write("DENIED\n");
          await connection.execute(
            `INSERT INTO accesos (id_usuario, id_salon, autorizado) VALUES (?, NULL, 0)`,
            [usuarios[0]?.id || null]
          );
          return;
        }

        const usuario = usuarios[0];
        const now = new Date();
        const dia = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'][now.getDay()];
        const hora = now.toTimeString().slice(0, 8);

        const [horarios] = await connection.execute(
          `SELECT * FROM horarios WHERE id_profesor = ? AND dia_semana = ? AND ? BETWEEN hora_inicio AND hora_fin`,
          [usuario.id, dia, hora]
        );

        let autorizado = false;
        let idSalon = null;
        let horaFin = null;

        if (horarios.length > 0) {
          idSalon = horarios[0].id_salon;
          horaFin = horarios[0].hora_fin;
          autorizado = (idSalon === salonSolicitado);
        }

        await connection.execute(
          `INSERT INTO accesos (id_usuario, id_salon, autorizado) VALUES (?, ?, ?)`,
          [usuario.id, idSalon, autorizado]
        );

        if (autorizado) {
          const fechaHoy = new Date().toISOString().slice(0, 10);
          const horaCerrarCompleta = `${fechaHoy} ${horaFin}`;

          await connection.execute(
            `INSERT INTO aperturas_registradas (id_salon, id_usuario, tipo, hora_apertura, hora_cerrar)
             VALUES (?, ?, 'rfid', NOW(), ?)`,
            [idSalon, usuario.id, horaCerrarCompleta]
          );

          socket.write(`OK:${idSalon}\n`);
        } else {
          socket.write("DENIED\n");
        }

        return;
      }

      socket.write("INVALID\n");
    } catch (err) {
      console.error("Error TCP:", err);
      socket.write("ERROR\n");
    } finally {
      if (connection) await connection.end();
    }
  });

  socket.on('end', () => {
    if (idSalonAsociado && socketsPorSalon[idSalonAsociado] === socket) {
      delete socketsPorSalon[idSalonAsociado];
      console.log(`ESP32 desconectado del salón ${idSalonAsociado}`);
    }
  });

  socket.on('error', (err) => {
    console.error('Error en socket TCP:', err);
    socket.destroy();
  });
});

tcpServer.listen(TCP_PORT, () => {
  console.log(`Servidor TCP escuchando en puerto ${TCP_PORT}`);
});

module.exports = {
  abrirSalonTCP,
  socketsPorSalon
};
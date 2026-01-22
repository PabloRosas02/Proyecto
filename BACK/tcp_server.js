require('dotenv').config(); // Asegúrate de tenerlo al inicio
console.log("HOST:", process.env.DB_HOST);
console.log("USER:", process.env.DB_USER);
console.log("PASS:", process.env.DB_PASSWORD);
console.log("NAME:", process.env.DB_NAME);

const net = require('net');
const db = require('./modelos/db'); // Ruta a tu módulo db.js

const PORT = 4000;

const server = net.createServer((socket) => {
  console.log('Cliente conectado');

  socket.on('data', async (data) => {
    const rfid = data.toString().trim();
    console.log('RFID recibido:', rfid);

    try {
      // Buscar al usuario
      const [usuarios] = await db.execute(
        'SELECT * FROM usuarios WHERE rfid = ?',
        [rfid]
      );

      if (usuarios.length === 0) {
        socket.write("DENIED\n");
        return;
      }

      const usuario = usuarios[0];

      // Verificar si es profesor
      if (usuario.rol !== 'profesor') {
        socket.write("DENIED\n");
        return;
      }

      // Obtener fecha y hora actual
      const now = new Date();
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
      const diaSemana = dias[now.getDay()];
      const horaActual = now.toTimeString().slice(0, 8); // HH:MM:SS

      const [horarios] = await db.execute(
        `SELECT * FROM horarios WHERE id_profesor = ? AND dia_semana = ? AND ? BETWEEN hora_inicio AND hora_fin`,
        [usuario.id, diaSemana, horaActual]
      );

      const accesoPermitido = horarios.length > 0;
      const idSalon = accesoPermitido ? horarios[0].id_salon : null;

      await db.execute(
        `INSERT INTO accesos (id_usuario, id_salon, autorizado) VALUES (?, ?, ?)`,
        [usuario.id, idSalon, accesoPermitido]
      );

      if (accesoPermitido) {
        socket.write(`OK:${idSalon}\n`);
      } else {
        socket.write("DENIED\n");
      }

    } catch (err) {
      console.error("Error al verificar:", err);
      socket.write("ERROR\n");
    }
  });

  socket.on('end', () => {
    console.log('Cliente desconectado');
  });

  socket.on('error', (err) => {
    console.error('Error en socket:', err.message);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor TCP escuchando en puerto ${PORT}`);
});

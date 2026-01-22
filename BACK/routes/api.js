const express = require('express');
const router = express.Router();
const accesoControl = require('../controladores/accesoControlador');

// Usuarios
router.get('/usuarios', accesoControl.listarUsuarios);
router.post('/usuarios', accesoControl.crearUsuario);
router.put('/usuarios/:id', accesoControl.modificarUsuario);
router.delete('/usuarios/:id', accesoControl.eliminarUsuario);

// Horarios
router.get('/horarios', accesoControl.obtenerTodosHorarios);
router.post('/horarios', accesoControl.crearHorario);
router.put('/horarios/:id', accesoControl.modificarHorario);
router.delete('/horarios/:id', accesoControl.eliminarHorario);
router.get('/horarios/:id', accesoControl.obtenerHorariosProfesor);

// Autenticación
router.post('/login', accesoControl.login);

// Apertura remota
router.post('/abrir/:id_salon', accesoControl.abrirSalon);
router.get('/pendientes/:id_salon', accesoControl.verificarAperturaPendiente);
router.post('/pendientes/procesar/:orden_id', accesoControl.procesarOrden);

// Estado de salones
router.get('/estadoSalones', accesoControl.estadoSalones);

// Salones
router.get('/salones', accesoControl.obtenerSalones);
router.get('/historial', accesoControl.obtenerHistorial);

module.exports = router;
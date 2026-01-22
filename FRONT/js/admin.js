const API_URL = '/api';
const usuario = JSON.parse(localStorage.getItem('usuario'));
if (!usuario || usuario.rol !== 'admin') {
  alert('Acceso no autorizado');
  window.location.href = '/login.html';
}
const adminId = usuario.id;

function cerrarSesion() {
  localStorage.removeItem('usuario');
  window.location.href = '/login.html';
}

let filtroDiaSeleccionado = '';

window.addEventListener('DOMContentLoaded', () => {
  obtenerUsuarios();
  obtenerProfesoresYSalones();
  obtenerHorarios();
  obtenerSalonesParaApertura();
  obtenerEstadoSalones();
  obtenerHistorial();
  inicializarTabsDias();

  document.getElementById('filtroProfesor').addEventListener('change', obtenerHorarios);
});

function inicializarTabsDias() {
  const tabs = document.querySelectorAll('#filtroDiasNav .nav-link');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filtroDiaSeleccionado = tab.textContent === 'Todos' ? '' : tab.textContent;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      obtenerHorarios();
    });
  });
}

async function obtenerUsuarios() {
  const tabla = document.getElementById('tablaUsuarios');
  tabla.innerHTML = '';
  try {
    const res = await fetch(`${API_URL}/usuarios`);
    const usuarios = await res.json();

    usuarios.forEach(usuario => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${usuario.id}</td>
        <td>${usuario.nombre}</td>
        <td>${usuario.correo}</td>
        <td>${usuario.rfid}</td>
        <td>${usuario.rol}</td>
        <td>
          <button class="btn btn-warning btn-sm me-1 btn-editar-usuario"
                  data-id="${usuario.id}"
                  data-nombre="${usuario.nombre}"
                  data-correo="${usuario.correo}"
                  data-rfid="${usuario.rfid}"
                  data-rol="${usuario.rol}">
            Editar
          </button>
          <button class="btn btn-danger btn-sm" onclick="eliminarUsuario(${usuario.id})">Eliminar</button>
        </td>`;
      tabla.appendChild(fila);
    });

    const filtro = document.getElementById('filtroProfesor');
    if (filtro) {
      filtro.innerHTML = '<option value="">Todos</option>';
      usuarios.filter(u => u.rol === 'profesor').forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.nombre;
        filtro.appendChild(opt);
      });
    }

    // Agregar manejador para todos los botones de editar
    document.querySelectorAll('.btn-editar-usuario').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('editarUsuarioId').value = btn.dataset.id;
        document.getElementById('editarNombre').value = btn.dataset.nombre;
        document.getElementById('editarCorreo').value = btn.dataset.correo;
        document.getElementById('editarRFID').value = btn.dataset.rfid;
        document.getElementById('editarRol').value = btn.dataset.rol;
        document.getElementById('editarContrasena').value = '';
        new bootstrap.Modal(document.getElementById('editarUsuarioModal')).show();
      });
    });

  } catch (err) {
    console.error(err);
    alert('Error al cargar usuarios');
  }
}


document.getElementById('formCrearUsuario').addEventListener('submit', async function (e) {
  e.preventDefault();
  const nombre = document.getElementById('nuevoNombre').value;
  const correo = document.getElementById('nuevoCorreo').value;
  const rfid = document.getElementById('nuevoRFID').value;
  const contrasena = document.getElementById('nuevoContrasena').value;
  const rol = document.getElementById('nuevoRol').value;
  try {
    const res = await fetch(`${API_URL}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: adminId, nombre, correo, contrasena, rfid, rol })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Usuario creado');
      document.getElementById('formCrearUsuario').reset();
      bootstrap.Modal.getInstance(document.getElementById('crearUsuarioModal')).hide();
      obtenerUsuarios();
    } else {
      alert(data.error || 'Error al crear usuario');
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión');
  }
});

function abrirEditarUsuario(id, nombre, correo, rfid, rol) {
  document.getElementById('editarUsuarioId').value = id;
  document.getElementById('editarNombre').value = nombre;
  document.getElementById('editarCorreo').value = correo;
  document.getElementById('editarRFID').value = rfid;
  document.getElementById('editarRol').value = rol;
  document.getElementById('editarContrasena').value = '';
  new bootstrap.Modal(document.getElementById('editarUsuarioModal')).show();
}

document.getElementById('formEditarUsuario').addEventListener('submit', async function (e) {
  e.preventDefault();
  const id = document.getElementById('editarUsuarioId').value;
  const nombre = document.getElementById('editarNombre').value;
  const correo = document.getElementById('editarCorreo').value;
  const rfid = document.getElementById('editarRFID').value;
  const contrasena = document.getElementById('editarContrasena').value;
  const rol = document.getElementById('editarRol').value;

  try {
    const res = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: adminId, nombre, correo, contrasena, rfid, rol })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Usuario actualizado');
      bootstrap.Modal.getInstance(document.getElementById('editarUsuarioModal')).hide();
      obtenerUsuarios();
    } else {
      alert(data.error || 'Error al actualizar usuario');
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión');
  }
});

async function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  try {
    const res = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: adminId })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Usuario eliminado');
      obtenerUsuarios();
    } else {
      alert(data.error || 'Error al eliminar usuario');
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión');
  }
}

async function obtenerProfesoresYSalones() {
  const [profSel1, profSel2] = [document.getElementById('profesorHorario'), document.getElementById('editarProfesorHorario')];
  const [salonSel1, salonSel2] = [document.getElementById('salonHorario'), document.getElementById('editarSalonHorario')];

  profSel1.innerHTML = profSel2.innerHTML = '';
  salonSel1.innerHTML = salonSel2.innerHTML = '';

  try {
    const [usuariosRes, salonesRes] = await Promise.all([
      fetch(`${API_URL}/usuarios`),
      fetch(`${API_URL}/salones`)
    ]);
    const usuarios = await usuariosRes.json();
    const salones = await salonesRes.json();

    usuarios.filter(u => u.rol === 'profesor').forEach(prof => {
      const opt = `<option value="${prof.id}">${prof.nombre}</option>`;
      profSel1.innerHTML += opt;
      profSel2.innerHTML += opt;
    });

    salones.forEach(salon => {
      const opt = `<option value="${salon.id}">${salon.nombre}</option>`;
      salonSel1.innerHTML += opt;
      salonSel2.innerHTML += opt;
    });

  } catch (err) {
    console.error(err);
    alert('Error al cargar profesores o salones');
  }
}

async function obtenerHorarios() {
  const tabla = document.getElementById('tablaHorarios');
  const profesorId = document.getElementById('filtroProfesor').value;
  tabla.innerHTML = '';
  try {
    const res = await fetch(`${API_URL}/horarios`);
    const horarios = await res.json();

    const vistos = new Set();

    horarios
      .filter(h => (!filtroDiaSeleccionado || h.dia_semana === filtroDiaSeleccionado) && (!profesorId || h.profesor_id == profesorId))
      .forEach(h => {
        if (vistos.has(h.id)) return;
        vistos.add(h.id);

        const fila = document.createElement('tr');
        fila.innerHTML = `
          <td>${h.id}</td>
          <td>${h.profesor}</td>
          <td>${h.salon}</td>
          <td>${h.dia_semana}</td>
          <td>${h.hora_inicio}</td>
          <td>${h.hora_fin}</td>
          <td>
            <button class="btn btn-warning btn-sm me-1" onclick="abrirEditarHorario(${h.id}, '${h.id_profesor}', '${h.id_salon}', '${h.dia_semana}', '${h.hora_inicio}', '${h.hora_fin}')">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="eliminarHorario(${h.id})">Eliminar</button>
          </td>`;
        tabla.appendChild(fila);
      });
  } catch (err) {
    console.error(err);
    alert('Error al cargar horarios');
  }
}

async function obtenerHorarios() {
  const tabla = document.getElementById('tablaHorarios');
  const profesorId = document.getElementById('filtroProfesor').value;
  tabla.innerHTML = '';
  try {
    const res = await fetch(`${API_URL}/horarios`);
    const horarios = await res.json();

    const vistos = new Set();

    horarios
      .filter(h => (!filtroDiaSeleccionado || h.dia_semana === filtroDiaSeleccionado) &&
                   (!profesorId || h.id_profesor == profesorId)) // importante usar id_profesor
      .forEach(h => {
        if (vistos.has(h.id)) return;
        vistos.add(h.id);

        const fila = document.createElement('tr');
        fila.innerHTML = `
          <td>${h.id}</td>
          <td>${h.profesor}</td>
          <td>${h.salon}</td>
          <td>${h.dia_semana}</td>
          <td>${h.hora_inicio}</td>
          <td>${h.hora_fin}</td>
          <td>
            <button class="btn btn-warning btn-sm me-1"
              onclick="abrirEditarHorario(${h.id}, ${h.id_profesor}, ${h.id_salon}, '${h.dia_semana}', '${h.hora_inicio}', '${h.hora_fin}')">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="eliminarHorario(${h.id})">Eliminar</button>
          </td>`;
        tabla.appendChild(fila);
      });
  } catch (err) {
    console.error(err);
    alert('Error al cargar horarios');
  }
}

document.getElementById('formCrearHorario').addEventListener('submit', async function (e) {
  e.preventDefault();

  const id_profesor = parseInt(document.getElementById('profesorHorario').value);
  const id_salon = parseInt(document.getElementById('salonHorario').value);
  const dia_semana = document.getElementById('diaHorario').value;
  const hora_inicio = document.getElementById('horaInicioHorario').value;
  const hora_fin = document.getElementById('horaFinHorario').value;

  if (!id_profesor || !id_salon || !dia_semana || !hora_inicio || !hora_fin) {
    alert("Por favor completa todos los campos");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/horarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_id: adminId,
        id_profesor,
        id_salon,
        dia_semana,
        hora_inicio,
        hora_fin
      })
    });
    const data = await res.json();

    if (res.ok) {
      alert('Horario creado correctamente');
      document.getElementById('formCrearHorario').reset();
      bootstrap.Modal.getInstance(document.getElementById('crearHorarioModal')).hide();
      obtenerHorarios();
    } else {
      alert(data.error || 'Error al crear horario');
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión al crear horario');
  }
});

document.getElementById('formEditarHorario').addEventListener('submit', async function (e) {
  e.preventDefault();

  const id = parseInt(document.getElementById('editarHorarioId').value);
  const id_profesor = parseInt(document.getElementById('editarProfesorHorario').value);
  const id_salon = parseInt(document.getElementById('editarSalonHorario').value);
  const dia_semana = document.getElementById('editarDiaHorario').value;
  const hora_inicio = document.getElementById('editarHoraInicio').value;
  const hora_fin = document.getElementById('editarHoraFin').value;

  if (!id || !id_profesor || !id_salon || !dia_semana || !hora_inicio || !hora_fin) {
    alert("Por favor completa todos los campos");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/horarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_id: adminId,
        id_profesor,
        id_salon,
        dia_semana,
        hora_inicio,
        hora_fin
      })
    });

    const data = await res.json();

    if (res.ok) {
      alert('Horario actualizado');
      bootstrap.Modal.getInstance(document.getElementById('editarHorarioModal')).hide();
      obtenerHorarios();
    } else {
      alert(data.error || 'Error al modificar horario');
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión al editar horario');
  }
});

function abrirEditarHorario(id, id_profesor, id_salon, dia_semana, hora_inicio, hora_fin) {
  document.getElementById('editarHorarioId').value = id;
  document.getElementById('editarProfesorHorario').value = id_profesor;
  document.getElementById('editarSalonHorario').value = id_salon;
  document.getElementById('editarDiaHorario').value = dia_semana;
  document.getElementById('editarHoraInicio').value = hora_inicio;
  document.getElementById('editarHoraFin').value = hora_fin;

  new bootstrap.Modal(document.getElementById('editarHorarioModal')).show();
}

async function eliminarHorario(id) {
  if (!confirm('¿Eliminar este horario?')) return;
  try {
    const res = await fetch(`${API_URL}/horarios/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: adminId })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Horario eliminado');
      obtenerHorarios();
    } else {
      alert(data.error || 'Error al eliminar horario');
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión');
  }
}

async function obtenerEstadoSalones() {
  const tabla = document.getElementById('tablaEstadoSalonesTiempoReal');
  if (!tabla) return;

  try {
    const res = await fetch(`${API_URL}/estadoSalones`);
    const data = await res.json();
    tabla.innerHTML = '';

    data.forEach(salon => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${salon.salon}</td>
        <td>${salon.estado === 'Ocupado' ? salon.profesor : '-'}</td>
        <td>${salon.hora_inicio || '-'}</td>
        <td>${salon.hora_fin || '-'}</td>
        <td><span class="badge bg-${salon.estado === 'Ocupado' ? 'danger' : 'success'}">${salon.estado}</span></td>
      `;
      tabla.appendChild(fila);
    });
  } catch (err) {
    console.error(err);
    alert('Error al obtener el estado de los salones');
  }
}

async function obtenerSalonesParaApertura() {
  const tabla = document.getElementById('tablaSalones');
  if (!tabla) return;
  try {
    const res = await fetch(`${API_URL}/salones`);
    const salones = await res.json();
    tabla.innerHTML = '';
    salones.forEach(salon => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${salon.id}</td>
        <td>${salon.nombre}</td>
        <td><button class="btn btn-outline-success btn-sm" onclick="abrirSalon(${salon.id})">Abrir</button></td>`;
      tabla.appendChild(fila);
    });
  } catch (err) {
    console.error(err);
    alert('Error al cargar salones');
  }
}

async function abrirSalon(id) {
  if (!confirm(`¿Abrir el salón ${id} ahora?`)) return;
  try {
    const res = await fetch(`${API_URL}/abrir/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: adminId })
    });
    const data = await res.json();
    if (res.ok && data.orden_enviada === true) {
      alert(`Solicitud de apertura enviada al salón ${id}`);
    } else {
      alert(data.error || 'Error al enviar solicitud');
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión');
  }
}

document.getElementById('btnBuscarHistorial').addEventListener('click', obtenerHistorial);

async function obtenerHistorial() {
  const tabla = document.getElementById('tablaHistorial');
  const filtro = document.getElementById('filtroUsuarioHistorial').value.trim();
  if (!tabla) return;

  try {
    const res = await fetch(`${API_URL}/historial?nombre=${encodeURIComponent(filtro)}`);
    const data = await res.json();
    tabla.innerHTML = '';

    data.forEach(entry => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${entry.id}</td>
        <td>${entry.salon}</td>
        <td>${entry.usuario}</td>
        <td>${entry.tipo}</td>
        <td>${entry.hora_apertura}</td>
        <td>${entry.hora_cerrar}</td>
      `;
      tabla.appendChild(fila);
    });
  } catch (err) {
    console.error(err);
    alert('Error al obtener historial');
  }
}

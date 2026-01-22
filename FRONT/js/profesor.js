const API_URL = '/api';

// Verifica sesión
const usuario = JSON.parse(localStorage.getItem('usuario'));
if (!usuario || usuario.rol !== 'profesor') {
  alert('Acceso no autorizado');
  window.location.href = '/login.html';
}

// Mostrar nombre del profesor
document.getElementById('infoProfesor').innerHTML = `<h5>Bienvenido, ${usuario.nombre}</h5>`;

// Al cargar la página
window.addEventListener('DOMContentLoaded', () => {
  cargarHorarios();
  cargarEstadoSalones();
});

// Cerrar sesión
function cerrarSesion() {
  localStorage.removeItem('usuario');
  window.location.href = '/login.html';
}

// Obtener horarios del profesor
async function cargarHorarios() {
  try {
    const res = await fetch(`${API_URL}/horarios/${usuario.id}`);
    const horarios = await res.json();

    const tabla = document.getElementById('tablaHorarios');
    tabla.innerHTML = '';

    horarios.forEach(h => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${h.dia_semana}</td>
        <td>${h.hora_inicio}</td>
        <td>${h.hora_fin}</td>
        <td>${h.salon}</td>
      `;
      tabla.appendChild(fila);
    });
  } catch (err) {
    console.error('Error al obtener horarios:', err);
    alert('Error al cargar horarios');
  }
}

// Obtener estado de salones
async function cargarEstadoSalones() {
  try {
    const res = await fetch(`${API_URL}/estadoSalones`);
    if (!res.ok) throw new Error('Error al obtener estado');

    const salones = await res.json();
    const tabla = document.getElementById('tablaSalones');
    tabla.innerHTML = '';

    salones.forEach(s => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${s.salon}</td>
        <td>${s.profesor || '-'}</td>
        <td>${s.hora_inicio || '-'}</td>
        <td>${s.hora_fin || '-'}</td>
        <td><span class="badge ${s.estado === 'Ocupado' ? 'bg-danger' : 'bg-success'}">${s.estado}</span></td>
      `;
      tabla.appendChild(fila);
    });
  } catch (err) {
    console.error('Error al obtener estado de salones:', err);
    alert('Error al cargar estado de salones');
  }
}

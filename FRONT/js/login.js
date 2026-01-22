document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const correo = document.getElementById('correo').value;
  const contrasena = document.getElementById('contrasena').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, contrasena })
    });

    const data = await res.json();

    if (res.ok) {
      // Guardar usuario en localStorage (temporal)
      localStorage.setItem('usuario', JSON.stringify(data));
      window.location.href = data.rol === 'admin' ? '/admin.html' : '/profesor.html';
    } else {
      alert(data.error);
    }

  } catch (err) {
    console.error(err);
    alert('Error de conexión con el servidor');
  }
});
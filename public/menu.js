// Menú hamburguesa compartido: navegación según rol, datos del usuario y logout.
(function () {
  const NAV = {
    admin: [{ href: "admin.html", label: "Eventos" }],
    vendedor: [{ href: "vendedor.html", label: "Vender boletas" }],
    portero: [{ href: "portero.html", label: "Control de acceso" }],
  };

  function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    localStorage.removeItem("nombre");
    localStorage.removeItem("eventoId");
    location.href = "index.html";
  }

  window.initMenu = function initMenu() {
    const token = localStorage.getItem("token");
    if (!token) { location.href = "index.html"; return; }

    const rol = localStorage.getItem("rol") || "";
    const nombre = localStorage.getItem("nombre") || "";
    const paginaActual = location.pathname.split("/").pop();
    const items = NAV[rol] || [];

    document.body.insertAdjacentHTML("afterbegin", `
      <div class="topbar">
        <div class="topbar-left">
          <button class="hamburger" id="menu-abrir" aria-label="Abrir menú">
            <span></span><span></span><span></span>
          </button>
          <span class="brand">Boletas</span>
        </div>
        <span class="badge" style="background:var(--surface-2); color:var(--gold)">${rol}</span>
      </div>
      <div class="menu-overlay" id="menu-overlay"></div>
      <nav class="menu-panel" id="menu-panel">
        <div class="menu-user">
          <div class="num" style="font-size:18px">${nombre}</div>
          <span class="badge" style="background:var(--surface-2); color:var(--gold)">${rol}</span>
        </div>
        <div class="menu-links">
          ${items.map((item) =>
            `<a class="menu-link ${item.href === paginaActual ? "activo" : ""}" href="${item.href}">${item.label}</a>`
          ).join("")}
        </div>
        <button class="menu-logout" id="menu-logout" type="button">Cerrar sesión</button>
      </nav>
    `);

    const overlay = document.getElementById("menu-overlay");
    const panel = document.getElementById("menu-panel");
    const abrir = () => { overlay.classList.add("visible"); panel.classList.add("visible"); };
    const cerrar = () => { overlay.classList.remove("visible"); panel.classList.remove("visible"); };

    document.getElementById("menu-abrir").addEventListener("click", abrir);
    overlay.addEventListener("click", cerrar);
    document.getElementById("menu-logout").addEventListener("click", cerrarSesion);
  };
})();
// Selector de evento compartido: cualquier rol elige contra qué evento activo
// va a trabajar. Guarda la elección en localStorage("eventoId") y avisa a la
// página cuando cambia, para que actualice lo que dependa de ese evento.
(function () {
  window.initEventoSelector = function initEventoSelector(onChange) {
    const TOKEN = localStorage.getItem("token");

    const barra = document.createElement("div");
    barra.className = "evento-bar";
    barra.innerHTML = `
      <label for="evento-global">Evento</label>
      <select id="evento-global"></select>
    `;
    const errorDiv = document.createElement("div");
    errorDiv.className = "status err hidden evento-bar-error";
    barra.appendChild(errorDiv);

    const topbar = document.querySelector(".topbar");
    topbar.insertAdjacentElement("afterend", barra);

    const select = barra.querySelector("#evento-global");

    function avisar(id) {
      if (typeof onChange === "function") onChange(id);
    }

    async function cargar() {
      errorDiv.classList.add("hidden");
      const r = await fetch("/api/eventos", { headers: { Authorization: `Bearer ${TOKEN}` } });
      if (!r.ok) {
        errorDiv.textContent = "No se pudieron cargar los eventos.";
        errorDiv.classList.remove("hidden");
        return;
      }
      const eventos = await r.json();
      const activos = eventos.filter((e) => e.estado === "activo");
      if (activos.length === 0) {
        select.innerHTML = "";
        localStorage.removeItem("eventoId");
        errorDiv.textContent = "No hay eventos activos en este momento.";
        errorDiv.classList.remove("hidden");
        avisar(null);
        return;
      }
      select.innerHTML = activos.map((e) =>
        `<option value="${e.id}">${e.nombre} · ${new Date(e.fecha_inicio).toLocaleString()}</option>`
      ).join("");
      const guardado = localStorage.getItem("eventoId");
      const sigueActivo = activos.some((e) => String(e.id) === guardado);
      select.value = sigueActivo ? guardado : String(activos[0].id);
      localStorage.setItem("eventoId", select.value);
      avisar(select.value);
    }

    select.addEventListener("change", () => {
      localStorage.setItem("eventoId", select.value);
      avisar(select.value);
    });

    cargar();
  };
})();
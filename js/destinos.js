(() => {
	const contenedor = document.getElementById("destinos");
	if (!contenedor) return;

	const destinos = [...contenedor.querySelectorAll(".destino")];
	const botonAnterior = contenedor.querySelector(".destinos__boton--anterior");
	const botonSiguiente = contenedor.querySelector(".destinos__boton--siguiente");
	const UMBRAL_DESLIZAR = 50;

	let indice = 0;
	let hay3d = false;
	let inicioX = null;
	let inicioY = 0;

	contenedor.classList.add("destinos--carrusel");

	destinos.forEach((destino) => {
		const nombre = destino.querySelector(".destino__nombre");
		const texto = nombre.textContent.trim();
		nombre.setAttribute("aria-label", texto);
		nombre.innerHTML = [...texto]
			.map((letra, i) => `<span class="letra" style="--i: ${i}" aria-hidden="true">${letra}</span>`)
			.join("");
	});

	function datosDe(destino) {
		return {
			clave: destino.id,
			nombre: destino.querySelector(".destino__nombre").getAttribute("aria-label"),
			color: destino.dataset.color,
			tamano: Number(destino.dataset.tamano),
			anillos: destino.dataset.anillos === "true",
		};
	}

	function usarRespaldo2d(datos) {
		contenedor.dataset.forma = "planeta";
		contenedor.dataset.color = datos.color;
		contenedor.dataset.tamano = datos.tamano;
		contenedor.dataset.anillos = datos.anillos;
		contenedor.dataset.opacidad = "1";
		window.dispatchEvent(new Event("scroll"));
	}

	function mostrar(nuevo, direccion) {
		indice = (nuevo + destinos.length) % destinos.length;
		const actual = destinos[indice];
		const datos = datosDe(actual);
		const siguiente = datosDe(destinos[(indice + 1) % destinos.length]);
		const anterior = datosDe(destinos[(indice - 1 + destinos.length) % destinos.length]);

		destinos.forEach((destino) => {
			const activo = destino === actual;
			destino.classList.toggle("activo", activo);
			destino.setAttribute("aria-hidden", activo ? "false" : "true");
		});

		contenedor.style.setProperty("--destino", datos.color);
		botonSiguiente.setAttribute("aria-label", `Siguiente destino: ${siguiente.nombre}`);
		botonAnterior.setAttribute("aria-label", `Destino anterior: ${anterior.nombre}`);

		contenedor.dispatchEvent(new CustomEvent("destino:cambio", { detail: { ...datos, direccion } }));
		if (!hay3d) usarRespaldo2d(datos);
	}

	botonSiguiente.addEventListener("click", () => mostrar(indice + 1, 1));
	botonAnterior.addEventListener("click", () => mostrar(indice - 1, -1));

	contenedor.addEventListener("pointerdown", (e) => {
		if (e.target.closest("button, a")) return;
		inicioX = e.clientX;
		inicioY = e.clientY;
	});

	contenedor.addEventListener("pointerup", (e) => {
		if (inicioX === null) return;
		const dx = e.clientX - inicioX;
		const dy = e.clientY - inicioY;
		inicioX = null;
		if (Math.abs(dx) > UMBRAL_DESLIZAR && Math.abs(dx) > Math.abs(dy)) {
			mostrar(indice + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
		}
	});

	contenedor.addEventListener("pointercancel", () => (inicioX = null));

	let enPantalla = false;
	new IntersectionObserver(([entrada]) => (enPantalla = entrada.isIntersecting), { threshold: 0.6 }).observe(
		contenedor,
	);

	document.addEventListener("keydown", (e) => {
		if (!enPantalla || e.target.closest("input, select, textarea")) return;
		if (e.key === "ArrowRight") mostrar(indice + 1, 1);
		if (e.key === "ArrowLeft") mostrar(indice - 1, -1);
	});

	contenedor.addEventListener("destinos:3d-listo", () => {
		hay3d = true;
		contenedor.dataset.forma = "nebulosa";
		contenedor.dataset.opacidad = "0";
		window.dispatchEvent(new Event("scroll"));
		contenedor.dispatchEvent(new CustomEvent("destino:cambio", { detail: { ...datosDe(destinos[indice]), direccion: 0 } }));
	});

	mostrar(0, 0);
})();

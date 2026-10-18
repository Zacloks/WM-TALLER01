(() => {
	const seccion = document.getElementById("ruta");
	if (!seccion) return;

	const escena = seccion.querySelector(".ruta__escena");
	const lienzo = seccion.querySelector(".ruta__lienzo");
	const ctx = lienzo.getContext("2d");
	const etapas = [...seccion.querySelectorAll(".ruta__etapa")];
	const destinos = document.getElementById("destinos");

	const reducirMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
	const PUNTOS_RUTA = 180;
	const LARGO_ESTELA = 36;
	const ANGULO_DORADO = Math.PI * (3 - Math.sqrt(5));
	const TRAMOS = [
		[0, 0],
		[0, 0.12],
		[0.12, 0.42],
		[0.42, 0.5],
		[0.5, 1],
	];
	const LUZ = { x: -0.7, y: -0.45, z: 0.55 };

	let ancho = 0;
	let alto = 0;
	let pixel = 1;
	let progresoSuave = 0;
	let etapaActual = -1;
	let visible = false;
	let cuadro = null;

	const planeta = { color: [184, 176, 168], tamano: 0.55, anillos: false };

	function esfera(cantidad) {
		const puntos = [];
		for (let i = 0; i < cantidad; i++) {
			const y = 1 - (2 * i + 1) / cantidad;
			const radio = Math.sqrt(1 - y * y);
			const theta = i * ANGULO_DORADO;
			puntos.push({ x: Math.cos(theta) * radio, y, z: Math.sin(theta) * radio });
		}
		return puntos;
	}

	const puntosTierra = esfera(420);
	const puntosPlaneta = esfera(760);
	const puntosAnillo = Array.from({ length: 320 }, () => {
		const a = Math.random() * Math.PI * 2;
		const r = 1.45 + Math.random() * 0.7;
		return { x: Math.cos(a) * r, z: Math.sin(a) * r };
	});

	function limitar(valor, min, max) {
		return Math.min(max, Math.max(min, valor));
	}

	function suavizar(t) {
		return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	}

	function hexARgb(hex) {
		const n = parseInt(hex.slice(1), 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}

	function separarLetras(elemento) {
		const texto = elemento.textContent.trim();
		elemento.setAttribute("aria-label", texto);
		elemento.innerHTML = [...texto]
			.map((letra, i) => `<span class="letra" style="--i: ${i}" aria-hidden="true">${letra}</span>`)
			.join("");
	}

	etapas.forEach((etapa) => separarLetras(etapa.querySelector(".ruta__nombre")));

	const pasos = document.createElement("ol");
	pasos.className = "ruta__pasos";
	pasos.setAttribute("aria-hidden", "true");
	pasos.innerHTML = etapas
		.map((etapa) => `<li>${etapa.querySelector(".ruta__nombre").getAttribute("aria-label")}</li>`)
		.join("");
	escena.append(pasos);
	seccion.classList.add("ruta--animada");

	function geometria() {
		const movil = ancho <= 768;
		return {
			cx: ancho * 0.5,
			cy: alto * (movil ? 0.47 : 0.5),
			rx: ancho * (movil ? 0.36 : 0.32),
			ry: alto * (movil ? 0.09 : 0.15),
			radio: Math.min(ancho, alto) * (movil ? 0.04 : 0.032),
		};
	}

	function puntoElipse(g, fraccion) {
		const angulo = Math.PI + fraccion * Math.PI * 2;
		return { x: g.cx + Math.cos(angulo) * g.rx, y: g.cy + Math.sin(angulo) * g.ry };
	}

	function dibujarEsfera(puntos, x, y, radio, color, giro) {
		const cos = Math.cos(giro);
		const sin = Math.sin(giro);
		const tamano = Math.max(1.2, radio * 0.07);
		ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

		for (const p of puntos) {
			const px = p.x * cos + p.z * sin;
			const pz = -p.x * sin + p.z * cos;
			if (pz < -0.1) continue;
			const luz = Math.max(0, px * LUZ.x + p.y * LUZ.y + pz * LUZ.z);
			ctx.globalAlpha = 0.06 + luz * 0.9;
			ctx.fillRect(x + px * radio, y + p.y * radio, tamano, tamano);
		}
	}

	function dibujarAnillo(x, y, radio, color, giro, delante) {
		const cos = Math.cos(giro * 0.5);
		const sin = Math.sin(giro * 0.5);
		ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

		for (const p of puntosAnillo) {
			const px = p.x * cos + p.z * sin;
			const pz = -p.x * sin + p.z * cos;
			if (delante !== pz > 0) continue;
			ctx.globalAlpha = 0.45;
			ctx.fillRect(x + px * radio, y + pz * radio * 0.28, 1.4, 1.4);
		}
	}

	function cambiarEtapa(indice) {
		if (indice === etapaActual) return;
		etapaActual = indice;
		etapas.forEach((etapa, i) => etapa.classList.toggle("activa", i === indice));
		[...pasos.children].forEach((paso, i) => paso.classList.toggle("activa", i === indice));
	}

	function medirProgreso() {
		const rect = seccion.getBoundingClientRect();
		return limitar(-rect.top / (rect.height - window.innerHeight), 0, 1);
	}

	function posicionNave(progreso) {
		const tramo = Math.min(4, Math.floor(progreso * 5));
		const local = suavizar(limitar(progreso * 5 - tramo, 0, 1));
		const [desde, hasta] = TRAMOS[tramo];
		return desde + (hasta - desde) * local;
	}

	function dibujar(tiempo) {
		const progreso = medirProgreso();
		progresoSuave = reducirMovimiento ? progreso : progresoSuave + (progreso - progresoSuave) * 0.1;
		cambiarEtapa(Math.min(4, Math.floor(progreso * 5)));

		const g = geometria();
		const nave = posicionNave(progresoSuave);
		const giro = reducirMovimiento ? 0.6 : tiempo * 0.00025;

		ctx.clearRect(0, 0, ancho, alto);

		ctx.fillStyle = "rgb(242, 242, 242)";
		for (let i = 0; i <= PUNTOS_RUTA; i++) {
			const f = i / PUNTOS_RUTA;
			const p = puntoElipse(g, f);
			ctx.globalAlpha = f <= nave ? 0.6 : 0.24;
			ctx.fillRect(p.x - 0.9, p.y - 0.9, 1.8, 1.8);
		}

		const tierra = puntoElipse(g, 0);
		const destino = puntoElipse(g, 0.5);
		const radioPlaneta = g.radio * (1.2 + planeta.tamano * 1.6);

		dibujarEsfera(puntosTierra, tierra.x, tierra.y, g.radio, [205, 222, 255], giro);
		if (planeta.anillos) dibujarAnillo(destino.x, destino.y, radioPlaneta, planeta.color, giro, false);
		dibujarEsfera(puntosPlaneta, destino.x, destino.y, radioPlaneta, planeta.color, giro * 0.7);
		if (planeta.anillos) dibujarAnillo(destino.x, destino.y, radioPlaneta, planeta.color, giro, true);

		ctx.fillStyle = "rgb(255, 255, 255)";
		for (let j = LARGO_ESTELA; j >= 0; j--) {
			const f = nave - j * 0.0035;
			if (f < 0) continue;
			const p = puntoElipse(g, f);
			const tamano = 3 - j * 0.07;
			ctx.globalAlpha = 1 - j / LARGO_ESTELA;
			ctx.fillRect(p.x - tamano / 2, p.y - tamano / 2, tamano, tamano);
		}
		ctx.globalAlpha = 1;

		cuadro = visible ? requestAnimationFrame(dibujar) : null;
	}

	function pedirCuadro() {
		if (cuadro === null) cuadro = requestAnimationFrame(dibujar);
	}

	function ajustar() {
		ancho = lienzo.clientWidth;
		alto = lienzo.clientHeight;
		pixel = Math.min(window.devicePixelRatio || 1, 2);
		lienzo.width = ancho * pixel;
		lienzo.height = alto * pixel;
		ctx.setTransform(pixel, 0, 0, pixel, 0, 0);
		pedirCuadro();
	}

	function usarDestino(clave) {
		const articulo = document.getElementById(clave);
		if (!articulo) return;
		const nombre = articulo.querySelector(".destino__nombre").getAttribute("aria-label")
			|| articulo.querySelector(".destino__nombre").textContent.trim();
		const duracion = [...articulo.querySelectorAll(".destino__datos dt")]
			.find((dt) => dt.textContent.trim() === "Duración del viaje")
			?.nextElementSibling.textContent.trim();

		planeta.color = hexARgb(articulo.dataset.color);
		planeta.tamano = Number(articulo.dataset.tamano);
		planeta.anillos = articulo.dataset.anillos === "true";
		seccion.style.setProperty("--destino", articulo.dataset.color);
		seccion.querySelectorAll(".ruta__destino").forEach((span) => (span.textContent = nombre));
		if (duracion) seccion.querySelectorAll(".ruta__duracion").forEach((span) => (span.textContent = duracion));
		pedirCuadro();
	}

	destinos?.addEventListener("destino:cambio", (e) => usarDestino(e.detail.clave));
	usarDestino(destinos?.querySelector(".destino.activo")?.id || "mercurio");

	new IntersectionObserver(
		([entrada]) => {
			visible = entrada.isIntersecting;
			if (visible) pedirCuadro();
		},
		{ rootMargin: "100px 0px" },
	).observe(seccion);

	window.addEventListener("resize", ajustar);
	ajustar();
	cambiarEtapa(0);
})();

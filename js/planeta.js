(() => {
	const canvas = document.getElementById("planeta");
	const ctx = canvas.getContext("2d");
	const dpr = Math.min(window.devicePixelRatio || 1, 2);

	const CANTIDAD = window.innerWidth <= 768 ? 1200 : 2500;
	const ANGULO_DORADO = Math.PI * (3 - Math.sqrt(5));
	const DISTANCIA_CAMARA = 4;
	const DISTANCIA_CAMARA_NAVE = 6;
	const RADIO_MOUSE = 110;
	const FUERZA_MOUSE = 4;
	const GIRO_ANILLO = 0.0006;
	const VELOCIDAD_ESCAPE = 0.0006;
	const SENSIBILIDAD = 0.008;
	const IDENTIDAD = [1, 0, 0, 0, 1, 0, 0, 0, 1];
	const ORBITAS = [0.34, 0.46, 0.6, 0.76, 1.08, 1.36, 1.64, 1.9];
	const TAMANOS = [0.025, 0.04, 0.042, 0.032, 0.09, 0.075, 0.055, 0.055];
	const FASES = [0.4, 2.1, 3.6, 5.2, 1.3, 4.4, 2.9, 0.9];
	const TIERRA = 2;
	const SATURNO = 5;
	const DESTINOS = [3, 4, 5, 6, 7, 0, 1];
	const VELOCIDAD_ORBITA = 0.00012;
	const DURACION_VIAJE = 9000;

	let ancho = 0;
	let alto = 0;
	let angulo = 0;
	let inclinacion = 1;
	let orientacion = IDENTIDAD;

	const mouse = { x: -9999, y: -9999 };
	const arrastre = { activo: false, x: 0, y: 0, vx: 0, vy: 0 };
	const zonaArrastre = document.querySelector(".nave__imagen");

	const objetivo = {
		forma: "nebulosa",
		color: [255, 255, 255],
		tamano: 1,
		anillos: false,
		opacidad: 1,
		inclinacion: 1.1,
		ancla: null,
	};

	const actual = {
		color: [255, 255, 255],
		opacidad: 0,
	};

	function puntoCilindro(x0, x1, r0, r1) {
		const t = Math.random();
		const a = Math.random() * Math.PI * 2;
		const r = r0 + (r1 - r0) * t;
		return { x: x0 + (x1 - x0) * t, y: Math.cos(a) * r, z: Math.sin(a) * r };
	}

	function crearPuntoNave() {
		const t = Math.random();
		const a = Math.random() * Math.PI * 2;

		if (t < 0.06) return puntoCilindro(1.1, 1.5, 0.16, 0); // nariz
		if (t < 0.16) return puntoCilindro(0.7, 1.1, 0.16, 0.16); // cabina
		if (t < 0.26) return puntoCilindro(-1, 0.7, 0.06, 0.06); // columna
		if (t < 0.3) return puntoCilindro(-0.05, 0.25, 0.14, 0.14); // eje del anillo
		if (t < 0.4) return puntoCilindro(-1.3, -1, 0.2, 0.2); // tanques
		if (t < 0.48) return puntoCilindro(-1.55, -1.3, 0.24, 0.1); // tobera

		if (t < 0.76) {
			// anillo de gravedad
			const b = Math.random() * Math.PI * 2;
			return {
				gira: true,
				a,
				x: 0.1 + Math.sin(b) * 0.06,
				r: 0.8 + Math.cos(b) * 0.06,
			};
		}
		if (t < 0.82) {
			// radios del anillo
			const radio = Math.floor(Math.random() * 4) * (Math.PI / 2);
			return { gira: true, a: radio, x: 0.1, r: 0.14 + Math.random() * 0.66 };
		}
		const r = Math.random(); // estela del motor
		return {
			escape: true,
			fase: Math.random(),
			avance: 0,
			dy: Math.cos(a) * r,
			dz: Math.sin(a) * r,
		};
	}

	function puntoNave(n, tiempo) {
		if (n.gira) {
			const a = n.a + tiempo * GIRO_ANILLO;
			return { x: n.x, y: Math.cos(a) * n.r, z: Math.sin(a) * n.r };
		}
		if (n.escape) {
			const avance = (n.fase + tiempo * VELOCIDAD_ESCAPE) % 1;
			const reinicio = avance < n.avance;
			const apertura = 0.1 + avance * 0.3;
			n.avance = avance;
			return {
				x: -1.55 - avance * 1.5,
				y: n.dy * apertura,
				z: n.dz * apertura,
				brillo: 1 - avance,
				reinicio,
			};
		}
		return n;
	}

	function elegirPonderado(pesos) {
		const total = pesos.reduce((suma, peso) => suma + peso, 0);
		let azar = Math.random() * total;
		for (let i = 0; i < pesos.length; i++) {
			azar -= pesos[i];
			if (azar <= 0) return i;
		}
		return pesos.length - 1;
	}

	function puntoEsfera(radio) {
		const a = Math.random() * Math.PI * 2;
		const b = Math.acos(2 * Math.random() - 1);
		const r = Math.cbrt(Math.random()) * radio;
		return {
			x: Math.sin(b) * Math.cos(a) * r,
			y: Math.cos(b) * r,
			z: Math.sin(b) * Math.sin(a) * r,
		};
	}

	function crearPuntoSistema(u) {
		if (u < 0.1) return puntoEsfera(0.13); // Sol

		if (u < 0.5) {
			// polvo que dibuja las órbitas
			const a = Math.random() * Math.PI * 2;
			const r = ORBITAS[elegirPonderado(ORBITAS)] + (Math.random() - 0.5) * 0.012;
			return { x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r, brillo: 0.45 };
		}

		if (u < 0.86) {
			const planeta = elegirPonderado(TAMANOS);
			const tamano = TAMANOS[planeta];
			if (planeta === SATURNO && Math.random() < 0.4) {
				const a = Math.random() * Math.PI * 2;
				const r = tamano * (1.6 + Math.random() * 0.7);
				return { planeta, dx: Math.cos(a) * r, dy: 0, dz: Math.sin(a) * r };
			}
			const p = puntoEsfera(tamano);
			return { planeta, dx: p.x, dy: p.y, dz: p.z };
		}

		return { estela: true, retraso: Math.random(), vuelta: -1 };
	}

	function anguloPlaneta(planeta, tiempo) {
		return FASES[planeta] + tiempo * VELOCIDAD_ORBITA * Math.pow(ORBITAS[TIERRA] / ORBITAS[planeta], 1.5);
	}

	function puntoSistema(s, tiempo) {
		if (s.planeta !== undefined) {
			const a = anguloPlaneta(s.planeta, tiempo);
			const r = ORBITAS[s.planeta];
			return { x: Math.cos(a) * r + s.dx, y: s.dy, z: Math.sin(a) * r + s.dz };
		}
		if (!s.estela) return s;

		const ciclo = tiempo / DURACION_VIAJE;
		const vuelta = Math.floor(ciclo);
		const avance = ciclo - vuelta - s.retraso * 0.16;
		const reinicio = vuelta !== s.vuelta || avance < 0;
		s.vuelta = vuelta;

		const destino = DESTINOS[vuelta % DESTINOS.length];
		const salida = anguloPlaneta(TIERRA, vuelta * DURACION_VIAJE);
		const llegada = anguloPlaneta(destino, (vuelta + 1) * DURACION_VIAJE);
		const recorrido = ((llegada - salida) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) || Math.PI * 2;
		const t = Math.max(0, avance);
		const a = salida + recorrido * t;
		const r = ORBITAS[TIERRA] + (ORBITAS[destino] - ORBITAS[TIERRA]) * (1 - Math.cos(Math.PI * t)) / 2;

		return {
			x: Math.cos(a) * r,
			y: 0,
			z: Math.sin(a) * r,
			brillo: avance < 0 ? 0 : (1 - s.retraso) * Math.sin(Math.PI * t),
			reinicio,
		};
	}

	function multiplicar(a, b) {
		const r = [];
		for (let i = 0; i < 3; i++) {
			for (let j = 0; j < 3; j++) {
				r.push(
					a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j],
				);
			}
		}
		return r;
	}

	function rotar(dx, dy) {
		const t = -dx * SENSIBILIDAD;
		const f = dy * SENSIBILIDAD;
		const giroY = [
			Math.cos(t),
			0,
			Math.sin(t),
			0,
			1,
			0,
			-Math.sin(t),
			0,
			Math.cos(t),
		];
		const giroX = [
			1,
			0,
			0,
			0,
			Math.cos(f),
			-Math.sin(f),
			0,
			Math.sin(f),
			Math.cos(f),
		];
		orientacion = multiplicar(multiplicar(giroX, giroY), orientacion);
	}

	const particulas = [];

	for (let i = 0; i < CANTIDAD; i++) {
		const y = 1 - (2 * i + 1) / CANTIDAD;
		const radioEnY = Math.sqrt(1 - y * y);
		const theta = i * ANGULO_DORADO;
		const esfera = {
			x: Math.cos(theta) * radioEnY,
			y,
			z: Math.sin(theta) * radioEnY,
		};

		const a = Math.random() * Math.PI * 2;
		const r = 1.4 + Math.random() * 0.6;
		const anillo = {
			x: Math.cos(a) * r,
			y: (Math.random() - 0.5) * 0.03,
			z: Math.sin(a) * r,
		};

		const distancia = Math.pow(Math.random(), 1.4) * 2;
		const brazo = (i % 3) * ((Math.PI * 2) / 3);
		const giro = brazo + distancia * 2.2 + (Math.random() - 0.5) * 0.6;
		const nebulosa = {
			x: Math.cos(giro) * distancia,
			y: (Math.random() - 0.5) * 0.25 * (2 - distancia),
			z: Math.sin(giro) * distancia,
		};

		particulas.push({
			esfera,
			anillo,
			nebulosa,
			nave: crearPuntoNave(),
			sistema: crearPuntoSistema(i / CANTIDAD),
			enAnillo: i % 3 === 0,
			x: Math.random() * window.innerWidth,
			y: Math.random() * window.innerHeight,
			k: 0.03 + Math.random() * 0.05,
			tamano: 0.8 + Math.random() * 1.2,
		});
	}

	const secciones = document.querySelectorAll("[data-forma]");

	function hexARgb(hex) {
		const n = parseInt(hex.slice(1), 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}

	function actualizarObjetivo() {
		const centro = window.innerHeight / 2;

		for (const seccion of secciones) {
			const rect = seccion.getBoundingClientRect();
			if (rect.top > centro || rect.bottom <= centro) continue;

			const datos = seccion.dataset;
			const color = datos.color || "#ffffff";

			objetivo.forma = datos.forma;
			objetivo.color = hexARgb(color);
			objetivo.tamano = parseFloat(datos.tamano || 1);
			objetivo.anillos = datos.anillos === "true";
			objetivo.opacidad = parseFloat(datos.opacidad || 1);
			objetivo.ancla = datos.ancla ? document.querySelector(datos.ancla) : null;
			if (datos.forma === "nebulosa") objetivo.inclinacion = 1.1;
			else if (datos.forma === "sistema") objetivo.inclinacion = 1.15;
			else if (datos.forma === "nave") objetivo.inclinacion = 0.3;
			else objetivo.inclinacion = objetivo.anillos ? 0.45 : 0.35;

			document.documentElement.style.setProperty("--acento", color);
			return;
		}
	}

	function calcularCentro() {
		const base = Math.min(ancho, alto);

		if (objetivo.ancla) {
			const rect = objetivo.ancla.getBoundingClientRect();
			return {
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2,
				escala: rect.width * 0.28,
			};
		}
		if (objetivo.forma === "nebulosa") {
			return { x: ancho * 0.5, y: alto * 0.45, escala: base * 0.32 };
		}
		if (objetivo.forma === "sistema") {
			return ancho <= 768
				? { x: ancho * 0.5, y: alto * 0.3, escala: base * 0.24 }
				: { x: ancho * 0.5, y: alto * 0.29, escala: base * 0.29 };
		}
		if (ancho <= 768) {
			return {
				x: ancho * 0.5,
				y: alto * 0.21,
				escala: base * 0.26 * objetivo.tamano,
			};
		}
		return {
			x: ancho * 0.7,
			y: alto * 0.5,
			escala: base * 0.3 * objetivo.tamano,
		};
	}

	function animar(tiempo) {
		ctx.clearRect(0, 0, ancho, alto);

		for (let c = 0; c < 3; c++) {
			actual.color[c] += (objetivo.color[c] - actual.color[c]) * 0.05;
		}
		actual.opacidad += (objetivo.opacidad - actual.opacidad) * 0.05;
		inclinacion += (objetivo.inclinacion - inclinacion) * 0.05;
		angulo += 0.0025;

		if (arrastre.activo) {
			arrastre.vx *= 0.6;
			arrastre.vy *= 0.6;
		} else if (Math.hypot(arrastre.vx, arrastre.vy) > 0.05) {
			rotar(arrastre.vx, arrastre.vy);
			arrastre.vx *= 0.95;
			arrastre.vy *= 0.95;
		}
		const siguiendo =
			arrastre.activo || Math.hypot(arrastre.vx, arrastre.vy) > 0.05;

		const esNave = objetivo.forma === "nave";
		const esSistema = objetivo.forma === "sistema";
		const giro = esNave ? 0.75 + Math.sin(tiempo * 0.0004) * 0.2 : esSistema ? 0.4 : angulo;
		const cosA = Math.cos(giro);
		const sinA = Math.sin(giro);
		const cosI = Math.cos(inclinacion);
		const sinI = Math.sin(inclinacion);
		const o = esNave ? orientacion : IDENTIDAD;
		const camara = esNave ? DISTANCIA_CAMARA_NAVE : DISTANCIA_CAMARA;
		const centro = calcularCentro();

		const [r, g, b] = actual.color.map(Math.round);
		ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

		for (const p of particulas) {
			let punto;
			if (objetivo.forma === "nebulosa") punto = p.nebulosa;
			else if (objetivo.forma === "nave") punto = puntoNave(p.nave, tiempo);
			else if (esSistema) punto = puntoSistema(p.sistema, tiempo);
			else if (objetivo.anillos && p.enAnillo) punto = p.anillo;
			else punto = p.esfera;

			const x1 = punto.x * cosA + punto.z * sinA;
			const z1 = -punto.x * sinA + punto.z * cosA;

			const y2 = punto.y * cosI - z1 * sinI;
			const z2 = punto.y * sinI + z1 * cosI;

			const x3 = o[0] * x1 + o[1] * y2 + o[2] * z2;
			const y3 = o[3] * x1 + o[4] * y2 + o[5] * z2;
			const z3 = o[6] * x1 + o[7] * y2 + o[8] * z2;

			const perspectiva = camara / (camara + z3);
			const destinoX = centro.x + x3 * centro.escala * perspectiva;
			const destinoY = centro.y + y3 * centro.escala * perspectiva;

			if (punto.reinicio) {
				p.x = destinoX;
				p.y = destinoY;
			} else {
				const k = siguiendo ? Math.min(p.k * 4, 0.35) : p.k;
				p.x += (destinoX - p.x) * k;
				p.y += (destinoY - p.y) * k;
			}

			const dx = p.x - mouse.x;
			const dy = p.y - mouse.y;
			const d = Math.hypot(dx, dy);
			if (d < RADIO_MOUSE && d > 0.01) {
				const fuerza = (1 - d / RADIO_MOUSE) * FUERZA_MOUSE;
				p.x += (dx / d) * fuerza;
				p.y += (dy / d) * fuerza;
			}

			const profundidad = Math.min(1, Math.max(0.15, 0.9 - z3 * 0.35));
			ctx.globalAlpha = profundidad * actual.opacidad * (punto.brillo ?? 1);
			const s = p.tamano * perspectiva;
			ctx.fillRect(p.x, p.y, s, s);
		}

		requestAnimationFrame(animar);
	}

	function ajustarTamano() {
		ancho = window.innerWidth;
		alto = window.innerHeight;
		canvas.width = ancho * dpr;
		canvas.height = alto * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	function moverMouse(x, y) {
		mouse.x = x;
		mouse.y = y;
	}

	window.addEventListener("pointermove", (e) => {
		if (!arrastre.activo) moverMouse(e.clientX, e.clientY);
	});
	document.documentElement.addEventListener("mouseleave", () =>
		moverMouse(-9999, -9999),
	);
	window.addEventListener(
		"touchmove",
		(e) => {
			if (!arrastre.activo)
				moverMouse(e.touches[0].clientX, e.touches[0].clientY);
		},
		{ passive: true },
	);
	window.addEventListener("touchend", () => moverMouse(-9999, -9999));

	zonaArrastre.addEventListener("pointerdown", (e) => {
		e.preventDefault();
		zonaArrastre.setPointerCapture(e.pointerId);
		zonaArrastre.classList.add("arrastrando");
		Object.assign(arrastre, {
			activo: true,
			x: e.clientX,
			y: e.clientY,
			vx: 0,
			vy: 0,
		});
		moverMouse(-9999, -9999);
	});

	zonaArrastre.addEventListener("pointermove", (e) => {
		if (!arrastre.activo) return;

		const dx = e.clientX - arrastre.x;
		const dy = e.clientY - arrastre.y;
		rotar(dx, dy);
		Object.assign(arrastre, { x: e.clientX, y: e.clientY, vx: dx, vy: dy });
	});

	function soltar() {
		arrastre.activo = false;
		zonaArrastre.classList.remove("arrastrando");
	}

	zonaArrastre.addEventListener("pointerup", soltar);
	zonaArrastre.addEventListener("pointercancel", soltar);

	window.addEventListener("click", (e) => {
		if (
			e.target.closest(
				"a, button, input, select, label, form, .pase-escena, .nave__imagen",
			)
		)
			return;

		const centro = calcularCentro();
		for (const p of particulas) {
			const impulso = 0.5 + Math.random();
			p.x += (p.x - centro.x) * impulso;
			p.y += (p.y - centro.y) * impulso;
		}
	});

	window.addEventListener("scroll", actualizarObjetivo, { passive: true });
	window.addEventListener("resize", () => {
		ajustarTamano();
		actualizarObjetivo();
	});

	ajustarTamano();
	actualizarObjetivo();
	requestAnimationFrame(animar);
})();

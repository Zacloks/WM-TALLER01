(() => {
	const seccion = document.getElementById("astronauta");
	if (!seccion) return;

	const LIMBO = 0.147;

	const figura = seccion.querySelector(".astronauta__figura");
	const tierra = seccion.querySelector(".astronauta__tierra");
	const luz = seccion.querySelector(".astronauta__luz");
	const texto = seccion.querySelector(".astronauta__texto");
	const sombra = seccion.querySelector(".astronauta__sombra");

	const reducirMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
	const conMouse = matchMedia("(hover: hover) and (pointer: fine)").matches;

	const mouse = { x: 0, y: 0 };
	const mouseSuave = { x: 0, y: 0 };
	let progreso = 0;
	let progresoSuave = 0;
	let alto = window.innerHeight;
	let altoTierra = tierra.offsetHeight;
	let cuadro = null;

	function limitar(valor, min, max) {
		return Math.min(max, Math.max(min, valor));
	}

	function suavizar(t) {
		return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	}

	function medirProgreso() {
		const rect = seccion.getBoundingClientRect();
		const recorrido = rect.height - alto;
		progreso = limitar(-rect.top / recorrido, 0, 1);
	}

	function componer(e, tiempo) {
		const flotarY = Math.sin(tiempo / 1600) * 10;
		const flotarGiro = Math.sin(tiempo / 2300) * 2;

		const x = mouseSuave.x * 40;
		const y = (-0.12 + 0.14 * e) * alto + flotarY + mouseSuave.y * 25;
		const giro = -18 + 22 * e + flotarGiro;
		const escala = 0.45 + 0.7 * e;

		figura.style.transform =
			`translate3d(${x}px, ${y}px, 0) rotate(${giro}deg) ` +
			`rotateY(${mouseSuave.x * 14}deg) rotateX(${-mouseSuave.y * 10}deg) scale(${escala})`;

		const horizonte = alto * (0.92 - 0.22 * e);
		tierra.style.transform =
			`translate3d(${-mouseSuave.x * 12}px, ${horizonte - altoTierra * LIMBO - mouseSuave.y * 6}px, 0) ` +
			`scale(${1.12 - 0.12 * e})`;

		luz.style.transform = `translate3d(${-mouseSuave.x * 60}px, ${-mouseSuave.y * 40}px, 0)`;
		luz.style.opacity = 0.35 + 0.65 * e;

		const aparicion = limitar((progresoSuave - 0.12) / 0.25, 0, 1);
		texto.style.opacity = aparicion;
		texto.style.transform = `translateY(${(1 - aparicion) * 30}px)`;
	}

	function animar(tiempo) {
		medirProgreso();
		progresoSuave += (progreso - progresoSuave) * 0.08;
		mouseSuave.x += (mouse.x - mouseSuave.x) * 0.06;
		mouseSuave.y += (mouse.y - mouseSuave.y) * 0.06;

		componer(suavizar(progresoSuave), tiempo);
		cuadro = requestAnimationFrame(animar);
	}

	function medirTamano() {
		alto = window.innerHeight;
		altoTierra = tierra.offsetHeight;
	}

	function curva(desde, hasta, valor) {
		const t = limitar((valor - desde) / (hasta - desde), 0, 1);
		return t * t * (3 - 2 * t);
	}

	function oscurecer() {
		const rect = seccion.getBoundingClientRect();
		if (rect.bottom < 0 || rect.top > alto) return;
		const encendido = curva(0.25, 1, 1 - rect.top / alto);
		sombra.style.opacity = (1 - encendido).toFixed(3);
	}

	window.addEventListener("scroll", oscurecer, { passive: true });
	oscurecer();

	window.addEventListener("resize", () => {
		medirTamano();
		oscurecer();
		if (reducirMovimiento) componer(1, 0);
	});

	if (reducirMovimiento) {
		progresoSuave = 1;
		componer(1, 0);
		return;
	}

	if (conMouse) {
		window.addEventListener("pointermove", (e) => {
			mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
			mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
		});
	}

	new IntersectionObserver(
		([entrada]) => {
			if (entrada.isIntersecting && cuadro === null) {
				cuadro = requestAnimationFrame(animar);
			} else if (!entrada.isIntersecting && cuadro !== null) {
				cancelAnimationFrame(cuadro);
				cuadro = null;
			}
		},
		{ rootMargin: "100px 0px" },
	).observe(seccion);

	medirProgreso();
	componer(suavizar(progreso), 0);
})();

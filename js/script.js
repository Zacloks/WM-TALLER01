(() => {
	document.documentElement.classList.add("js");

	const loader = document.getElementById("loader");
	const contador = document.getElementById("contador");
	const titulo = document.querySelector(".hero__titulo");
	const texto = titulo.textContent.trim();

	titulo.setAttribute("aria-label", texto);
	titulo.innerHTML = [...texto]
		.map((letra) => `<span class="letra" aria-hidden="true">${letra}</span>`)
		.join("");

	function terminarCarga() {
		loader.style.display = "none";
		document.body.classList.remove("cargando");
	}

	const sinIntro =
		!window.gsap || matchMedia("(prefers-reduced-motion: reduce)").matches;

	if (sinIntro) {
		terminarCarga();
	} else {
		const cuenta = { valor: 10 };

		gsap
			.timeline({ defaults: { ease: "expo.out" } })
			.to(cuenta, {
				valor: 0,
				duration: 1.2,
				ease: "none",
				onUpdate: () => (contador.textContent = `T-${Math.ceil(cuenta.valor)}`),
			})
			.addLabel("despegue", "+=0.3")
			.to(
				loader,
				{ yPercent: -100, duration: 0.9, ease: "power4.inOut" },
				"despegue",
			)
			.call(terminarCarga, null, "despegue+=0.9")
			.from(
				".hero__titulo .letra",
				{ yPercent: 110, duration: 1.1, stagger: 0.09 },
				"despegue+=0.3",
			)
			.from(
				".header",
				{
					yPercent: -100,
					opacity: 0,
					duration: 0.8,
					clearProps: "transform,opacity",
				},
				"despegue+=0.5",
			)
			.from(
				".hero__ayuda, .hero__pie",
				{ y: 24, opacity: 0, duration: 1, stagger: 0.1 },
				"despegue+=0.7",
			);
	}

	const menuBtn = document.getElementById("menu-btn");
	const nav = document.getElementById("nav");

	function cambiarMenu(abrir) {
		nav.classList.toggle("abierto", abrir);
		menuBtn.setAttribute("aria-expanded", abrir);
		menuBtn.textContent = abrir ? "Cerrar" : "Menú";
	}

	menuBtn.addEventListener("click", () =>
		cambiarMenu(!nav.classList.contains("abierto")),
	);
	nav.querySelectorAll("a").forEach((enlace) => {
		enlace.addEventListener("click", () => cambiarMenu(false));
	});

	const observador = new IntersectionObserver(
		(entradas) => {
			entradas.forEach((entrada) => {
				if (entrada.isIntersecting) {
					entrada.target.classList.add("visible");
					observador.unobserve(entrada.target);
				}
			});
		},
		{ threshold: 0.2 },
	);

	document.querySelectorAll(".revelar").forEach((el) => observador.observe(el));

	const elementosParallax = document.querySelectorAll("[data-parallax]");
	let esperandoCuadro = false;

	function actualizarParallax() {
		const centroPantalla = window.innerHeight / 2;

		elementosParallax.forEach((el) => {
			const rect = el.parentElement.getBoundingClientRect();
			const distancia = rect.top + rect.height / 2 - centroPantalla;
			const factor = parseFloat(el.dataset.parallax);
			el.style.transform = `translateY(${distancia * factor}px)`;
		});

		esperandoCuadro = false;
	}

	window.addEventListener(
		"scroll",
		() => {
			if (!esperandoCuadro) {
				esperandoCuadro = true;
				requestAnimationFrame(actualizarParallax);
			}
		},
		{ passive: true },
	);

	actualizarParallax();

	function separarLetras(elemento, texto) {
		let i = 0;
		elemento.innerHTML = texto
			.split(" ")
			.map((palabra) => {
				const letras = [...palabra]
					.map((letra) => `<span class="letra" style="--i: ${i++}">${letra}</span>`)
					.join("");
				i++;
				return `<span class="palabra" aria-hidden="true">${letras}</span>`;
			})
			.join(" ");
	}

	document.querySelectorAll(".titulo.revelar").forEach((tituloSeccion) => {
		const linea = tituloSeccion.firstChild;
		tituloSeccion.setAttribute("aria-label", tituloSeccion.textContent.trim());
		const envoltura = document.createElement("span");
		separarLetras(envoltura, linea.textContent.trim());
		tituloSeccion.replaceChild(envoltura, linea);
	});

	const pase = document.getElementById("pase");
	const reserva = document.getElementById("reserva");
	const paseDestino = document.getElementById("pase-destino");
	const paseEstado = pase.querySelector(".pase__estado");

	const form = document.getElementById("form-reserva");

	function azar(max) {
		return Math.floor(Math.random() * max);
	}

	function mostrarDestino() {
		const opcion = form.destino.options[form.destino.selectedIndex];
		if (pase.classList.contains("emitido")) {
			pase.classList.remove("emitido");
			paseEstado.textContent = "Pase de abordaje sin emitir";
			["pase-vuelo", "pase-fecha", "pase-puerta", "pase-asiento"].forEach(
				(id) => (document.getElementById(id).textContent = "—"),
			);
		}
		const datos = document.getElementById(opcion.value).dataset;
		paseDestino.setAttribute("aria-label", opcion.text);
		separarLetras(paseDestino, opcion.text);
		paseDestino.classList.remove("cambio");
		void paseDestino.offsetWidth;
		paseDestino.classList.add("cambio");

		reserva.style.setProperty("--destino", datos.color);
		reserva.dataset.color = datos.color;

		if (reserva.classList.contains("reserva--3d")) {
			reserva.dataset.forma = "nebulosa";
			reserva.dataset.opacidad = "0";
			reserva.dispatchEvent(
				new CustomEvent("destino:cambio", {
					detail: {
						clave: opcion.value,
						color: datos.color,
						tamano: Number(datos.tamano),
						anillos: datos.anillos === "true",
					},
				}),
			);
		} else {
			reserva.dataset.forma = "planeta";
			reserva.dataset.ancla = ".reserva__planeta";
			reserva.dataset.tamano = datos.tamano;
			reserva.dataset.anillos = datos.anillos === "true";
			reserva.dataset.opacidad = "1";
		}
		window.dispatchEvent(new Event("scroll"));
	}

	form.destino.addEventListener("change", mostrarDestino);
	reserva.addEventListener("reserva:3d-listo", mostrarDestino);
	mostrarDestino();

	const pie = document.querySelector(".footer");
	new ResizeObserver(() => (pie.style.marginTop = `-${pie.offsetHeight}px`)).observe(pie);

	const fondoPagina = [document.querySelector(".header"), document.querySelector("main"), document.querySelector(".footer")];
	const pantalla = { abierta: false, disparador: null, scroll: 0 };
	const botonCerrar = document.createElement("button");

	botonCerrar.type = "button";
	botonCerrar.className = "reserva__cerrar";
	botonCerrar.setAttribute("aria-label", "Cerrar reserva");
	botonCerrar.innerHTML =
		'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>';
	reserva.prepend(botonCerrar);
	reserva.classList.add("reserva--pantalla");
	reserva.setAttribute("role", "dialog");
	reserva.setAttribute("aria-modal", "true");
	reserva.setAttribute("aria-labelledby", "reserva-titulo");
	reserva.hidden = true;
	document.body.insertBefore(reserva, document.querySelector(".footer"));

	function origenDesde(boton) {
		const rect = boton?.getBoundingClientRect();
		const visible = rect && rect.width > 0;
		reserva.style.setProperty("--origen-x", `${visible ? rect.left + rect.width / 2 : window.innerWidth / 2}px`);
		reserva.style.setProperty("--origen-y", `${visible ? rect.top + rect.height / 2 : window.innerHeight / 2}px`);
	}

	function alTerminar(accion) {
		let hecho = false;
		const terminar = () => {
			if (hecho) return;
			hecho = true;
			reserva.removeEventListener("transitionend", alFinal);
			accion();
		};
		const alFinal = (e) => e.target === reserva && terminar();
		reserva.addEventListener("transitionend", alFinal);
		setTimeout(terminar, 900);
	}

	function abrirReserva(boton) {
		if (pantalla.abierta) return;
		pantalla.abierta = true;
		pantalla.disparador = boton;
		pantalla.scroll = window.scrollY;
		origenDesde(boton);
		fondoPagina.forEach((elemento) => (elemento.inert = true));
		reserva.hidden = false;
		reserva.scrollTop = 0;
		void reserva.offsetWidth;
		reserva.classList.add("abierta");
		window.dispatchEvent(new Event("resize"));
		form.destino.focus({ preventScroll: true });

		alTerminar(() => {
			if (!pantalla.abierta) return;
			document.body.classList.add("reserva-abierta");
			window.dispatchEvent(new Event("scroll"));
		});
	}

	function cerrarReserva() {
		if (!pantalla.abierta) return;
		pantalla.abierta = false;
		document.body.classList.remove("reserva-abierta");
		fondoPagina.forEach((elemento) => (elemento.inert = false));
		window.scrollTo({ top: pantalla.scroll, behavior: "instant" });
		window.dispatchEvent(new Event("resize"));
		origenDesde(pantalla.disparador);
		reserva.classList.remove("abierta");
		pantalla.disparador?.focus({ preventScroll: true });

		alTerminar(() => {
			if (!pantalla.abierta) reserva.hidden = true;
		});
	}

	function pedirCierre() {
		if (history.state?.reserva) {
			history.back();
		} else {
			cerrarReserva();
			history.replaceState(null, "", location.pathname + location.search);
		}
	}

	document.querySelectorAll('a[href="#reserva"]').forEach((boton) => {
		boton.addEventListener("click", (e) => {
			e.preventDefault();
			if (pantalla.abierta) return;
			if (boton.dataset.destino) {
				form.destino.value = boton.dataset.destino;
				mostrarDestino();
			}
			abrirReserva(boton);
			history.pushState({ reserva: true }, "", "#reserva");
		});
	});

	botonCerrar.addEventListener("click", pedirCierre);

	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && pantalla.abierta) pedirCierre();
	});

	window.addEventListener("popstate", () => {
		if (location.hash === "#reserva") abrirReserva(null);
		else cerrarReserva();
	});

	if (location.hash === "#reserva") abrirReserva(null);

	form.addEventListener("submit", (e) => {
		e.preventDefault();

		const destino = form.destino.options[form.destino.selectedIndex].text;

		const [anio, mes, dia] = form.fecha.value.split("-").map(Number);
		const fecha = new Date(anio, mes - 1, dia).toLocaleDateString("es-CL", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});

		document.getElementById("pase-nombre").textContent =
			form.nombre.value.trim();
		paseEstado.textContent = `Pase de abordaje emitido · ${destino}`;
		document.getElementById("pase-fecha").textContent = fecha;
		document.getElementById("pase-vuelo").textContent =
			`AP-${form.destino.value.slice(0, 3).toUpperCase()}${100 + azar(900)}`;
		document.getElementById("pase-puerta").textContent =
			`${"ABCD"[azar(4)]}${1 + azar(9)}`;
		document.getElementById("pase-asiento").textContent =
			`${1 + azar(40)}${"ABCDEF"[azar(6)]}`;

        pase.classList.remove("emitido");
        void pase.offsetWidth;
        pase.classList.add("emitido");

		const rectPase = pase.getBoundingClientRect();
		if (rectPase.top < 0 || rectPase.bottom > window.innerHeight) {
			pase.scrollIntoView({
				behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
				block: "center",
			});
		}

        mostrarToast("Pase de abordaje emitido con éxito");
    });

	// 1. Evitar que se seleccionen fechas del pasado en el formulario
	const inputFecha = document.getElementById("fecha");
	if (inputFecha) {
		const hoy = new Date();
		const formatoHoy = hoy.toISOString().split("T")[0];
		inputFecha.setAttribute("min", formatoHoy);
	}

    // 2. Lógica para mostrar/ocultar el botón de "Volver Arriba"
    const botonSubir = document.getElementById("boton-subir");
    if (botonSubir) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > window.innerHeight) {
                botonSubir.classList.add("visible");
            } else {
                botonSubir.classList.remove("visible");
            }
        }, { passive: true });
    }

    // 3. Sistema de Notificaciones (Toast)
    function mostrarToast(mensaje) {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = "toast";
        toast.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg> 
            ${mensaje}
        `;
        
        container.appendChild(toast);

        void toast.offsetWidth;
        toast.classList.add("visible");

        setTimeout(() => {
            toast.classList.remove("visible");
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

})();

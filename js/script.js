(() => {
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

    const sinIntro = !window.gsap || matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (sinIntro) {
        terminarCarga();
    } else {
        const cuenta = { valor: 10 };

        gsap.timeline({ defaults: { ease: "expo.out" } })
            .to(cuenta, {
                valor: 0,
                duration: 1.2,
                ease: "none",
                onUpdate: () => (contador.textContent = `T-${Math.ceil(cuenta.valor)}`),
            })
            .addLabel("despegue", "+=0.3")
            .to(loader, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, "despegue")
            .call(terminarCarga, null, "despegue+=0.9")
            .from(".hero__titulo .letra", { yPercent: 110, duration: 1.1, stagger: 0.09 }, "despegue+=0.3")
            .from(".header", { yPercent: -100, opacity: 0, duration: 0.8, clearProps: "transform,opacity" }, "despegue+=0.5")
            .from(".hero__ayuda, .hero__pie", { y: 24, opacity: 0, duration: 1, stagger: 0.1 }, "despegue+=0.7");
    }

    const menuBtn = document.getElementById("menu-btn");
    const nav = document.getElementById("nav");

    function cambiarMenu(abrir) {
        nav.classList.toggle("abierto", abrir);
        menuBtn.setAttribute("aria-expanded", abrir);
        menuBtn.textContent = abrir ? "Cerrar" : "Menú";
    }

    menuBtn.addEventListener("click", () => cambiarMenu(!nav.classList.contains("abierto")));
    nav.querySelectorAll("a").forEach((enlace) => {
        enlace.addEventListener("click", () => cambiarMenu(false));
    });

    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add("visible");
                observador.unobserve(entrada.target);
            }
        });
    }, { threshold: 0.2 });

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

    window.addEventListener("scroll", () => {
        if (!esperandoCuadro) {
            esperandoCuadro = true;
            requestAnimationFrame(actualizarParallax);
        }
    }, { passive: true });

    actualizarParallax();

    const escena = document.getElementById("pase-escena");
    const pase = document.getElementById("pase");
    const INCLINACION_MAX = 15;
    let esperaEnderezar;

    function inclinarPase(e) {
        clearTimeout(esperaEnderezar);

        const rect = escena.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        pase.style.setProperty("--ry", `${x * INCLINACION_MAX * 2}deg`);
        pase.style.setProperty("--rx", `${-y * INCLINACION_MAX * 2}deg`);
        pase.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
        pase.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
    }

    function enderezarPase() {
        pase.style.setProperty("--rx", "0deg");
        pase.style.setProperty("--ry", "0deg");
        pase.style.setProperty("--gx", "50%");
        pase.style.setProperty("--gy", "50%");
    }

    escena.addEventListener("pointerdown", inclinarPase);
    escena.addEventListener("pointermove", inclinarPase);
    escena.addEventListener("pointerleave", (e) => {
        esperaEnderezar = setTimeout(enderezarPase, e.pointerType === "touch" ? 600 : 0);
    });

    const form = document.getElementById("form-reserva");

    function azar(max) {
        return Math.floor(Math.random() * max);
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const destino = form.destino.options[form.destino.selectedIndex].text;

        const [anio, mes, dia] = form.fecha.value.split("-").map(Number);
        const fecha = new Date(anio, mes - 1, dia).toLocaleDateString("es-CL", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });

        document.getElementById("pase-nombre").textContent = form.nombre.value.trim();
        document.getElementById("pase-destino").textContent = destino;
        document.getElementById("pase-fecha").textContent = fecha;
        document.getElementById("pase-vuelo").textContent =
            `AP-${form.destino.value.slice(0, 3).toUpperCase()}${100 + azar(900)}`;
        document.getElementById("pase-puerta").textContent = `${"ABCD"[azar(4)]}${1 + azar(9)}`;
        document.getElementById("pase-asiento").textContent = `${1 + azar(40)}${"ABCDEF"[azar(6)]}`;

        pase.classList.remove("emitido");
        void pase.offsetWidth;
        pase.classList.add("emitido");
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
            // El botón aparece cuando el usuario baja el equivalente a una pantalla
            if (window.scrollY > window.innerHeight) {
                botonSubir.classList.add("visible");
            } else {
                botonSubir.classList.remove("visible");
            }
        }, { passive: true });
    }

})();
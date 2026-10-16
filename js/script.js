const loader = document.getElementById("loader");
const contador = document.getElementById("contador");
let segundos = 10;

const intervalo = setInterval(() => {
    segundos--;
    contador.textContent = `T-${segundos}`;

    if (segundos === 0) {
        clearInterval(intervalo);
        setTimeout(() => {
            loader.classList.add("oculto");
            document.body.classList.remove("cargando");
            document.body.classList.add("listo");
        }, 300);
    }
}, 120);

const titulo = document.querySelector(".hero__titulo");
const texto = titulo.textContent.trim();

titulo.setAttribute("aria-label", texto);
titulo.innerHTML = [...texto]
    .map((letra, i) => `<span class="letra" style="--i: ${i}" aria-hidden="true">${letra}</span>`)
    .join("");

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

escena.addEventListener("pointermove", (e) => {
    const rect = escena.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    pase.style.setProperty("--ry", `${x * INCLINACION_MAX * 2}deg`);
    pase.style.setProperty("--rx", `${-y * INCLINACION_MAX * 2}deg`);
    pase.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
    pase.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
});

escena.addEventListener("pointerleave", () => {
    pase.style.setProperty("--rx", "0deg");
    pase.style.setProperty("--ry", "0deg");
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

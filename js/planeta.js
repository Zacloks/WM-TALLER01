const canvas = document.getElementById("planeta");
const ctx = canvas.getContext("2d");
const dpr = Math.min(window.devicePixelRatio || 1, 2);

const CANTIDAD = window.innerWidth < 768 ? 1200 : 2500;
const ANGULO_DORADO = Math.PI * (3 - Math.sqrt(5));
const DISTANCIA_CAMARA = 4;
const RADIO_MOUSE = 110;
const FUERZA_MOUSE = 4;

let ancho = 0;
let alto = 0;
let angulo = 0;
let inclinacion = 1;

const mouse = { x: -9999, y: -9999 };

const objetivo = {
    forma: "nebulosa",
    color: [255, 255, 255],
    tamano: 1,
    anillos: false,
    opacidad: 1,
    inclinacion: 1.1,
};

const actual = {
    color: [255, 255, 255],
    opacidad: 0,
};

const particulas = [];

for (let i = 0; i < CANTIDAD; i++) {
    const y = 1 - (2 * i + 1) / CANTIDAD;
    const radioEnY = Math.sqrt(1 - y * y);
    const theta = i * ANGULO_DORADO;
    const esfera = { x: Math.cos(theta) * radioEnY, y, z: Math.sin(theta) * radioEnY };

    const a = Math.random() * Math.PI * 2;
    const r = 1.4 + Math.random() * 0.6;
    const anillo = { x: Math.cos(a) * r, y: (Math.random() - 0.5) * 0.03, z: Math.sin(a) * r };

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
        if (datos.forma === "nebulosa") objetivo.inclinacion = 1.1;
        else objetivo.inclinacion = objetivo.anillos ? 0.45 : 0.35;

        document.documentElement.style.setProperty("--acento", color);
        return;
    }
}

function calcularCentro() {
    const base = Math.min(ancho, alto);

    if (objetivo.forma === "nebulosa") {
        return { x: ancho * 0.5, y: alto * 0.45, escala: base * 0.32 };
    }
    if (ancho < 768) {
        return { x: ancho * 0.5, y: alto * 0.21, escala: base * 0.26 * objetivo.tamano };
    }
    return { x: ancho * 0.7, y: alto * 0.5, escala: base * 0.3 * objetivo.tamano };
}

function animar() {
    ctx.clearRect(0, 0, ancho, alto);

    for (let c = 0; c < 3; c++) {
        actual.color[c] += (objetivo.color[c] - actual.color[c]) * 0.05;
    }
    actual.opacidad += (objetivo.opacidad - actual.opacidad) * 0.05;
    inclinacion += (objetivo.inclinacion - inclinacion) * 0.05;
    angulo += 0.0025;

    const cosA = Math.cos(angulo);
    const sinA = Math.sin(angulo);
    const cosI = Math.cos(inclinacion);
    const sinI = Math.sin(inclinacion);
    const centro = calcularCentro();

    const [r, g, b] = actual.color.map(Math.round);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

    for (const p of particulas) {
        let punto;
        if (objetivo.forma === "nebulosa") punto = p.nebulosa;
        else if (objetivo.anillos && p.enAnillo) punto = p.anillo;
        else punto = p.esfera;

        const x1 = punto.x * cosA + punto.z * sinA;
        const z1 = -punto.x * sinA + punto.z * cosA;

        const y2 = punto.y * cosI - z1 * sinI;
        const z2 = punto.y * sinI + z1 * cosI;

        const perspectiva = DISTANCIA_CAMARA / (DISTANCIA_CAMARA + z2);
        const destinoX = centro.x + x1 * centro.escala * perspectiva;
        const destinoY = centro.y + y2 * centro.escala * perspectiva;

        p.x += (destinoX - p.x) * p.k;
        p.y += (destinoY - p.y) * p.k;

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < RADIO_MOUSE && d > 0.01) {
            const fuerza = (1 - d / RADIO_MOUSE) * FUERZA_MOUSE;
            p.x += (dx / d) * fuerza;
            p.y += (dy / d) * fuerza;
        }

        const profundidad = Math.min(1, Math.max(0.15, 0.9 - z2 * 0.35));
        ctx.globalAlpha = profundidad * actual.opacidad;
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

window.addEventListener("pointermove", (e) => moverMouse(e.clientX, e.clientY));
document.documentElement.addEventListener("mouseleave", () => moverMouse(-9999, -9999));
window.addEventListener("touchmove", (e) => moverMouse(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
window.addEventListener("touchend", () => moverMouse(-9999, -9999));

window.addEventListener("click", (e) => {
    if (e.target.closest("a, button, input, select, label, form, .pase-escena")) return;

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

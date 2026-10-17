(() => {
    const canvas = document.getElementById("fondo");
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let ancho = 0;
    let alto = 0;
    let estrellas = [];

    const mouse = { x: 0, y: 0 };
    const mouseSuave = { x: 0, y: 0 };

    function crearEstrellas() {
        const cantidad = Math.round((ancho * alto) / 4000);

        estrellas = Array.from({ length: cantidad }, () => {
            const profundidad = Math.random();
            return {
                x: Math.random() * ancho,
                y: Math.random() * alto,
                profundidad,
                radio: 0.3 + profundidad * 1.2,
                fase: Math.random() * Math.PI * 2,
            };
        });
    }

    function ajustarTamano() {
        const anchoAnterior = ancho;
        ancho = window.innerWidth;
        alto = window.innerHeight;

        canvas.width = ancho * dpr;
        canvas.height = alto * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (ancho !== anchoAnterior) crearEstrellas();
    }

    function envolver(valor, max) {
        return ((valor % max) + max) % max;
    }

    function animar(tiempo) {
        ctx.clearRect(0, 0, ancho, alto);

        mouseSuave.x += (mouse.x - mouseSuave.x) * 0.05;
        mouseSuave.y += (mouse.y - mouseSuave.y) * 0.05;

        const scroll = window.scrollY;
        ctx.fillStyle = "#ffffff";

        for (const e of estrellas) {
            e.x -= 0.05 + e.profundidad * 0.25;

            const x = envolver(e.x - mouseSuave.x * 60 * e.profundidad, ancho);
            const y = envolver(e.y - mouseSuave.y * 60 * e.profundidad - scroll * 0.2 * e.profundidad, alto);

            const parpadeo = 0.5 + 0.5 * Math.sin(tiempo * 0.002 + e.fase);
            ctx.globalAlpha = (0.3 + 0.7 * e.profundidad) * (0.5 + 0.5 * parpadeo);

            ctx.beginPath();
            ctx.arc(x, y, e.radio, 0, Math.PI * 2);
            ctx.fill();
        }

        requestAnimationFrame(animar);
    }

    window.addEventListener("resize", ajustarTamano);

    window.addEventListener("pointermove", (evento) => {
        mouse.x = evento.clientX / ancho - 0.5;
        mouse.y = evento.clientY / alto - 0.5;
    });

    ajustarTamano();
    requestAnimationFrame(animar);
})();

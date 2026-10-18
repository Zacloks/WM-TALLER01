import * as THREE from "three";

const destinos = document.getElementById("destinos");
const reserva = document.getElementById("reserva");
const reducirMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const conMouse = matchMedia("(hover: hover) and (pointer: fine)").matches;
const esMovil = () => window.innerWidth <= 768;
const cantidad = esMovil() ? 9000 : 18000;
const DURACION_CAMBIO = reducirMovimiento ? 0 : 1400;
const anguloDorado = Math.PI * (3 - Math.sqrt(5));
const direcciones = new Float32Array(cantidad * 3);
const cache = new Map();
const mouse = { x: 0, y: 0 };

for (let i = 0; i < cantidad; i++) {
	const y = 1 - (2 * i + 1) / cantidad;
	const radio = Math.sqrt(1 - y * y);
	const theta = i * anguloDorado;
	direcciones.set([Math.cos(theta) * radio, y, Math.sin(theta) * radio], i * 3);
}

function soportaWebGL() {
	try {
		return Boolean(document.createElement("canvas").getContext("webgl2"));
	} catch {
		return false;
	}
}

const RUIDO_GLSL = `
	float hash(vec2 p) {
		return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
	}

	float ruido(vec2 p) {
		vec2 i = floor(p);
		vec2 f = fract(p);
		vec2 u = f * f * (3.0 - 2.0 * f);
		return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
			mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
	}

	float fbm(vec2 p) {
		float valor = 0.0;
		float amplitud = 0.5;
		for (int i = 0; i < 5; i++) {
			valor += amplitud * ruido(p);
			p *= 2.0;
			amplitud *= 0.5;
		}
		return valor;
	}
`;

function cargarBrillo(clave) {
	if (cache.has(clave)) return cache.get(clave);
	const promesa = new Promise((resolver) => {
		const imagen = new Image();
		imagen.onload = () => {
			const ancho = imagen.naturalWidth;
			const alto = imagen.naturalHeight;
			const lienzoTemporal = document.createElement("canvas");
			lienzoTemporal.width = ancho;
			lienzoTemporal.height = alto;
			const contexto = lienzoTemporal.getContext("2d");
			contexto.drawImage(imagen, 0, 0);
			const pixeles = contexto.getImageData(0, 0, ancho, alto).data;
			const brillo = new Float32Array(cantidad);
			for (let i = 0; i < cantidad; i++) {
				const x = direcciones[i * 3];
				const y = direcciones[i * 3 + 1];
				const z = direcciones[i * 3 + 2];
				const u = 0.5 + Math.atan2(z, x) / (Math.PI * 2);
				const v = 0.5 - Math.asin(y) / Math.PI;
				const px = Math.min(ancho - 1, Math.floor(u * ancho));
				const py = Math.min(alto - 1, Math.floor(v * alto));
				brillo[i] = Math.pow(pixeles[(py * ancho + px) * 4] / 255, 1.3);
			}
			resolver(brillo);
		};
		imagen.onerror = () => resolver(new Float32Array(cantidad).fill(0.6));
		imagen.src = `assets/texturas/${clave}.jpg`;
	});
	cache.set(clave, promesa);
	return promesa;
}

function crearEscena({ contenedor, lienzo, conRelieve, escala, encuadrar }) {
	const renderer = new THREE.WebGLRenderer({ canvas: lienzo, alpha: true, antialias: false });
	renderer.setClearColor(0x000000, 0);

	const escena = new THREE.Scene();
	const camara = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
	camara.position.set(0, -0.3, 7.2);

	const anillos = new Float32Array(cantidad * 3);
	const esAnillo = new Float32Array(cantidad);
	const aleatorios = new Float32Array(cantidad);
	const brilloA = new Float32Array(cantidad);
	const brilloB = new Float32Array(cantidad);

	for (let i = 0; i < cantidad; i++) {
		const angulo = Math.random() * Math.PI * 2;
		const r = 1.35 + Math.pow(Math.random(), 0.8) * 0.85;
		anillos.set([Math.cos(angulo) * r, (Math.random() - 0.5) * 0.015, Math.sin(angulo) * r], i * 3);
		esAnillo[i] = i % 4 === 0 ? 1 : 0;
		aleatorios[i] = Math.random();
	}

	const geometria = new THREE.BufferGeometry();
	geometria.setAttribute("position", new THREE.BufferAttribute(direcciones, 3));
	geometria.setAttribute("aAnillo", new THREE.BufferAttribute(anillos, 3));
	geometria.setAttribute("aEsAnillo", new THREE.BufferAttribute(esAnillo, 1));
	geometria.setAttribute("aAleatorio", new THREE.BufferAttribute(aleatorios, 1));
	const atributoBrilloA = new THREE.BufferAttribute(brilloA, 1);
	const atributoBrilloB = new THREE.BufferAttribute(brilloB, 1);
	geometria.setAttribute("aBrilloA", atributoBrilloA);
	geometria.setAttribute("aBrilloB", atributoBrilloB);

	const uniformes = {
		uMezcla: { value: 0 },
		uColorA: { value: new THREE.Color(0xffffff) },
		uColorB: { value: new THREE.Color(0xffffff) },
		uAnilloA: { value: 0 },
		uAnilloB: { value: 0 },
		uRadioA: { value: 1.5 },
		uRadioB: { value: 1.5 },
		uLuz: { value: new THREE.Vector3(-1, 0.45, 0.65).normalize() },
		uTam: { value: 9 },
		uPixel: { value: 1 },
		uAparicion: { value: 0 },
	};

	const material = new THREE.ShaderMaterial({
		uniforms: uniformes,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		vertexShader: `
			attribute vec3 aAnillo;
			attribute float aEsAnillo;
			attribute float aAleatorio;
			attribute float aBrilloA;
			attribute float aBrilloB;
			uniform float uMezcla;
			uniform float uAnilloA;
			uniform float uAnilloB;
			uniform float uRadioA;
			uniform float uRadioB;
			uniform vec3 uLuz;
			uniform float uTam;
			uniform float uPixel;
			uniform float uAparicion;
			varying float vLuz;
			varying float vBorde;
			varying float vBrillo;
			varying float vAlfa;

			void main() {
				float anilloA = aEsAnillo * uAnilloA;
				float anilloB = aEsAnillo * uAnilloB;
				vec3 posicionA = mix(position * uRadioA, aAnillo * uRadioA, anilloA);
				vec3 posicionB = mix(position * uRadioB, aAnillo * uRadioB, anilloB);
				vec3 posicion = mix(posicionA, posicionB, uMezcla);

				float dispersion = sin(uMezcla * 3.14159265);
				posicion += position * dispersion * (0.4 + aAleatorio * 1.6);
				posicion *= mix(1.6, 1.0, uAparicion);

				float anillo = mix(anilloA, anilloB, uMezcla);
				vec3 normal = normalize(mat3(modelMatrix) * position);
				float lambert = max(dot(normal, uLuz), 0.0);
				vLuz = mix(lambert, 0.35 + 0.4 * lambert, anillo);

				vec4 vista = modelViewMatrix * vec4(posicion, 1.0);
				vec3 normalVista = normalize(mat3(viewMatrix) * normal);
				float frente = max(dot(normalVista, normalize(-vista.xyz)), 0.0);
				vBorde = pow(1.0 - frente, 3.0) * (1.0 - anillo) * step(0.0, -dot(normal, uLuz) + 0.6);
				vBrillo = mix(aBrilloA, aBrilloB, uMezcla);
				vAlfa = (1.0 - dispersion * 0.45) * uAparicion;

				vec4 centro = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
				float radio = mix(uRadioA, uRadioB, uMezcla);
				float detras = step(vista.z, centro.z) * step(length(vista.xy - centro.xy), radio * 0.98);
				vAlfa *= 1.0 - detras * anillo;

				gl_PointSize = uTam * (0.55 + vBrillo * 0.9) * (0.7 + aAleatorio * 0.6) * uPixel / -vista.z;
				gl_Position = projectionMatrix * vista;
			}
		`,
		fragmentShader: `
			uniform vec3 uColorA;
			uniform vec3 uColorB;
			uniform float uMezcla;
			varying float vLuz;
			varying float vBorde;
			varying float vBrillo;
			varying float vAlfa;

			void main() {
				float d = length(gl_PointCoord - 0.5);
				if (d > 0.5) discard;
				float suave = smoothstep(0.5, 0.1, d);
				vec3 tinte = mix(vec3(1.0), mix(uColorA, uColorB, uMezcla), 0.6);
				float intensidad = 0.04 + vLuz * (0.4 + vBrillo * 1.5);
				vec3 color = tinte * intensidad + vec3(0.45, 0.68, 1.0) * vBorde * 0.5;
				gl_FragColor = vec4(color, suave * vAlfa);
			}
		`,
	});

	const planeta = new THREE.Points(geometria, material);
	const inclinacion = new THREE.Group();
	inclinacion.rotation.set(0.32, 0, 0.12);
	inclinacion.add(planeta);
	escena.add(inclinacion);

	const uniformesRelieve = {
		uTiempo: { value: 0 },
		uSemilla: { value: 0 },
		uColor: { value: new THREE.Color(0xffffff) },
		uVisible: { value: 1 },
	};
	const relieve = new THREE.Mesh(
		new THREE.PlaneGeometry(18, 9, 1, 1),
		new THREE.ShaderMaterial({
			uniforms: uniformesRelieve,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			vertexShader: `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uTiempo;
				uniform float uSemilla;
				uniform vec3 uColor;
				uniform float uVisible;
				varying vec2 vUv;
				${RUIDO_GLSL}
				void main() {
					vec2 p = vUv * vec2(5.0, 2.6) + vec2(uSemilla, uTiempo * 0.015);
					float altura = fbm(p) + fbm(p * 0.5 + 3.0) * 0.5;
					float curvas = altura * 11.0;
					float distancia = abs(fract(curvas - 0.5) - 0.5) / fwidth(curvas);
					float linea = 1.0 - min(distancia, 1.0);
					float intensas = smoothstep(0.55, 0.85, altura);
					float bordes = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
					float lejania = smoothstep(1.0, 0.45, vUv.y) * smoothstep(0.0, 0.08, vUv.y);
					float alfa = linea * (0.18 + intensas * 0.75) * bordes * lejania * uVisible;
					vec3 color = mix(vec3(0.85, 0.9, 1.0), uColor, 0.35);
					gl_FragColor = vec4(color * alfa, alfa);
				}
			`,
		}),
	);
	relieve.rotation.x = -1.18;
	relieve.position.set(0, -2.35, -1.2);
	if (conRelieve) escena.add(relieve);

	const estado = {
		mouseSuaveX: 0,
		mouseSuaveY: 0,
		cambio: null,
		pendiente: null,
		actual: null,
		solicitado: null,
	};
	let visible = false;
	let cuadro = null;
	let tiempoAnterior = 0;

	function radioDe(tamano) {
		return (1.0 + (tamano - 0.55) * 0.9) * escala();
	}

	function aplicarComoActual(destino, brillo) {
		brilloA.set(brillo);
		atributoBrilloA.needsUpdate = true;
		uniformes.uColorA.value.set(destino.color);
		uniformes.uAnilloA.value = destino.anillos ? 1 : 0;
		uniformes.uRadioA.value = radioDe(destino.tamano);
		uniformes.uMezcla.value = 0;
		uniformesRelieve.uColor.value.set(destino.color);
		estado.actual = destino;
	}

	async function cambiarA(destino) {
		estado.solicitado = destino;
		const brillo = await cargarBrillo(destino.clave);
		if (estado.solicitado !== destino) return;

		if (!estado.actual) {
			aplicarComoActual(destino, brillo);
			pedirCuadro();
			return;
		}
		if (estado.cambio) {
			estado.pendiente = destino;
			return;
		}

		brilloB.set(brillo);
		atributoBrilloB.needsUpdate = true;
		uniformes.uColorB.value.set(destino.color);
		uniformes.uAnilloB.value = destino.anillos ? 1 : 0;
		uniformes.uRadioB.value = radioDe(destino.tamano);
		estado.cambio = { destino, brillo, inicio: performance.now(), semillaCambiada: false };
		pedirCuadro();
	}

	function suavizar(t) {
		return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	}

	function ajustar() {
		const ancho = lienzo.clientWidth;
		const alto = lienzo.clientHeight;
		const pixel = Math.min(window.devicePixelRatio || 1, esMovil() ? 1.5 : 2);
		renderer.setPixelRatio(pixel);
		renderer.setSize(ancho, alto, false);
		camara.aspect = ancho / alto;
		encuadrar(camara, ancho, alto);
		camara.updateProjectionMatrix();
		uniformes.uPixel.value = pixel * alto * 0.5;
		uniformes.uTam.value = esMovil() ? 0.036 : 0.03;
	}

	function dibujar(tiempo) {
		const delta = Math.min(0.05, (tiempo - (tiempoAnterior || tiempo)) / 1000);
		tiempoAnterior = tiempo;
		const movimiento = reducirMovimiento ? 0 : 1;

		estado.mouseSuaveX += (mouse.x - estado.mouseSuaveX) * 0.05;
		estado.mouseSuaveY += (mouse.y - estado.mouseSuaveY) * 0.05;

		uniformes.uAparicion.value = Math.min(1, uniformes.uAparicion.value + delta * (reducirMovimiento ? 100 : 0.8));

		if (estado.cambio) {
			const t = DURACION_CAMBIO === 0 ? 1 : Math.min(1, (tiempo - estado.cambio.inicio) / DURACION_CAMBIO);
			uniformes.uMezcla.value = suavizar(t);
			uniformesRelieve.uVisible.value = 1 - Math.sin(t * Math.PI);
			if (t > 0.5 && !estado.cambio.semillaCambiada) {
				uniformesRelieve.uSemilla.value += 7.3;
				uniformesRelieve.uColor.value.set(estado.cambio.destino.color);
				estado.cambio.semillaCambiada = true;
			}
			if (t >= 1) {
				const terminado = estado.cambio;
				estado.cambio = null;
				aplicarComoActual(terminado.destino, terminado.brillo);
				uniformesRelieve.uVisible.value = 1;
				if (estado.pendiente) {
					const siguiente = estado.pendiente;
					estado.pendiente = null;
					cambiarA(siguiente);
				}
			}
		}

		planeta.rotation.y += 0.06 * delta * movimiento;
		inclinacion.rotation.x = 0.32 + estado.mouseSuaveY * 0.12;
		inclinacion.rotation.y = estado.mouseSuaveX * 0.25;
		uniformesRelieve.uTiempo.value += delta * movimiento;

		renderer.render(escena, camara);

		const sigue = visible && (!reducirMovimiento || estado.cambio || uniformes.uAparicion.value < 1);
		cuadro = sigue ? requestAnimationFrame(dibujar) : null;
	}

	function pedirCuadro() {
		if (cuadro === null) cuadro = requestAnimationFrame(dibujar);
	}

	contenedor.addEventListener("destino:cambio", (e) => cambiarA(e.detail));

	window.addEventListener("resize", () => {
		ajustar();
		pedirCuadro();
	});

	new IntersectionObserver(
		([entrada]) => {
			visible = entrada.isIntersecting;
			if (visible) pedirCuadro();
		},
		{ rootMargin: "150px 0px" },
	).observe(contenedor);

	ajustar();
}

function iniciar() {
	if (conMouse && !reducirMovimiento) {
		window.addEventListener("pointermove", (e) => {
			mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
			mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
		});
	}

	const lienzoDestinos = destinos?.querySelector(".destinos__lienzo");
	if (lienzoDestinos) {
		crearEscena({
			contenedor: destinos,
			lienzo: lienzoDestinos,
			conRelieve: true,
			escala: () => (esMovil() ? 0.82 : 1),
			encuadrar: (camara, ancho, alto) => {
				camara.fov = camara.aspect < 1 ? 58 : 35;
				if (esMovil()) camara.setViewOffset(ancho, alto, 0, alto * 0.2, ancho, alto);
				else camara.setViewOffset(ancho, alto, ancho * 0.1, 0, ancho, alto);
			},
		});
		destinos.querySelectorAll(".destino").forEach((destino) => cargarBrillo(destino.id));
		destinos.dispatchEvent(new CustomEvent("destinos:3d-listo"));
	}

	const lienzoReserva = reserva?.querySelector(".reserva__lienzo");
	if (lienzoReserva) {
		crearEscena({
			contenedor: reserva,
			lienzo: lienzoReserva,
			conRelieve: false,
			escala: () => (esMovil() ? 0.8 : 0.7),
			encuadrar: (camara) => (camara.fov = 35),
		});
		reserva.classList.add("reserva--3d");
		reserva.dispatchEvent(new CustomEvent("reserva:3d-listo"));
	}
}

if (soportaWebGL()) iniciar();

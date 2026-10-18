import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const seccion = document.getElementById("astronauta");
const lienzo = seccion?.querySelector(".astronauta__3d");

function soportaWebGL() {
	try {
		return Boolean(document.createElement("canvas").getContext("webgl2"));
	} catch {
		return false;
	}
}

if (seccion && lienzo && soportaWebGL()) iniciar();

function hash(x, y) {
	const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
	return s - Math.floor(s);
}

function ruido(x, y) {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const fx = x - ix;
	const fy = y - iy;
	const ux = fx * fx * (3 - 2 * fx);
	const uy = fy * fy * (3 - 2 * fy);
	const a = hash(ix, iy);
	const b = hash(ix + 1, iy);
	const c = hash(ix, iy + 1);
	const d = hash(ix + 1, iy + 1);
	return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x, y) {
	let valor = 0;
	let amplitud = 0.5;
	let frecuencia = 1;
	for (let i = 0; i < 5; i++) {
		valor += amplitud * ruido(x * frecuencia, y * frecuencia);
		frecuencia *= 2;
		amplitud *= 0.5;
	}
	return valor;
}

function suavizarPaso(borde0, borde1, x) {
	const t = Math.min(1, Math.max(0, (x - borde0) / (borde1 - borde0)));
	return t * t * (3 - 2 * t);
}

function alturaTerreno(x, z) {
	const detalle = fbm(x * 0.08, z * 0.08);
	const pared = suavizarPaso(9, 26, Math.abs(x) + detalle * 6 - Math.min(0, z) * 0.15);
	const relieve = (fbm(x * 0.25 + 10, z * 0.25) - 0.5) * 0.6;
	const lejania = 1 - suavizarPaso(-22, -60, z) * 0.8;
	return pared * (10 + detalle * 8) * lejania + relieve;
}

function texturaGrano(tamano, repeticion) {
	const lienzoTextura = document.createElement("canvas");
	lienzoTextura.width = lienzoTextura.height = tamano;
	const contexto = lienzoTextura.getContext("2d");
	const imagen = contexto.createImageData(tamano, tamano);
	for (let i = 0; i < tamano * tamano; i++) {
		const valor = 128 + (Math.random() - 0.5) * 110;
		imagen.data.set([valor, valor, valor, 255], i * 4);
	}
	contexto.putImageData(imagen, 0, 0);
	const textura = new THREE.CanvasTexture(lienzoTextura);
	textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
	textura.repeat.set(repeticion, repeticion);
	return textura;
}

function texturaAnillos() {
	const lienzoTextura = document.createElement("canvas");
	lienzoTextura.width = 512;
	lienzoTextura.height = 4;
	const contexto = lienzoTextura.getContext("2d");
	for (let x = 0; x < 512; x++) {
		const t = x / 512;
		const bandas = 0.55 + 0.45 * Math.sin(t * 90 + Math.sin(t * 23) * 3) * Math.sin(t * 31);
		const division = t > 0.58 && t < 0.64 ? 0.12 : 1;
		const borde = Math.min(1, t * 8) * Math.min(1, (1 - t) * 5);
		const alfa = Math.max(0, bandas) * division * borde * (0.35 + hash(x, 3) * 0.25);
		contexto.fillStyle = `rgba(255, 255, 255, ${alfa})`;
		contexto.fillRect(x, 0, 1, 4);
	}
	return new THREE.CanvasTexture(lienzoTextura);
}

function iniciar() {
	const reducirMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
	const conMouse = matchMedia("(hover: hover) and (pointer: fine)").matches;
	const esMovil = () => window.innerWidth <= 768;
	const movil = esMovil();

	const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: "high-performance" });
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.05;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	const COLOR_CIELO = 0x22262c;
	const escena = new THREE.Scene();
	escena.background = new THREE.Color(0x050608);
	escena.fog = new THREE.FogExp2(COLOR_CIELO, 0.022);

	const camara = new THREE.PerspectiveCamera(45, 1, 0.1, 420);

	const cielo = new THREE.Mesh(
		new THREE.SphereGeometry(320, 32, 16),
		new THREE.ShaderMaterial({
			side: THREE.BackSide,
			depthWrite: false,
			uniforms: { uHorizonte: { value: new THREE.Color(COLOR_CIELO) } },
			vertexShader: `
				varying vec3 vDireccion;
				void main() {
					vDireccion = normalize(position);
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform vec3 uHorizonte;
				varying vec3 vDireccion;
				void main() {
					float altura = smoothstep(-0.02, 0.35, vDireccion.y);
					gl_FragColor = vec4(mix(uHorizonte, vec3(0.02, 0.022, 0.03), altura), 1.0);
				}
			`,
		}),
	);
	cielo.renderOrder = -2;
	escena.add(cielo);

	const cantidadEstrellas = movil ? 700 : 1400;
	const posicionesEstrellas = new Float32Array(cantidadEstrellas * 3);
	for (let i = 0; i < cantidadEstrellas; i++) {
		const tita = Math.random() * Math.PI * 2;
		const y = 0.08 + Math.random() * 0.92;
		const radio = Math.sqrt(1 - y * y);
		posicionesEstrellas.set([Math.cos(tita) * radio * 300, y * 300, Math.sin(tita) * radio * 300], i * 3);
	}
	const geometriaEstrellas = new THREE.BufferGeometry();
	geometriaEstrellas.setAttribute("position", new THREE.BufferAttribute(posicionesEstrellas, 3));
	const estrellas = new THREE.Points(
		geometriaEstrellas,
		new THREE.PointsMaterial({ color: 0xdfe6f0, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.55, fog: false, depthWrite: false }),
	);
	estrellas.renderOrder = -1;
	escena.add(estrellas);

	const direccionLuzPlaneta = new THREE.Vector3(-0.8, 0.35, 0.3).normalize();
	const fondoPlaneta = new THREE.Group();
	fondoPlaneta.position.set(movil ? 64 : 52, movil ? 27 : 31, -160);
	fondoPlaneta.rotation.set(0.18, 0, -0.32);
	escena.add(fondoPlaneta);

	const uniformesPlaneta = {
		uMapa: { value: null },
		uLuz: { value: direccionLuzPlaneta },
		uNiebla: { value: new THREE.Color(COLOR_CIELO) },
	};
	const planetaFondo = new THREE.Mesh(
		new THREE.SphereGeometry(30, 64, 32),
		new THREE.ShaderMaterial({
			uniforms: uniformesPlaneta,
			vertexShader: `
				varying vec2 vUv;
				varying vec3 vNormal;
				varying vec3 vVista;
				void main() {
					vUv = uv;
					vec4 mundo = modelMatrix * vec4(position, 1.0);
					vNormal = normalize(mat3(modelMatrix) * normal);
					vVista = normalize(cameraPosition - mundo.xyz);
					gl_Position = projectionMatrix * viewMatrix * mundo;
				}
			`,
			fragmentShader: `
				uniform sampler2D uMapa;
				uniform vec3 uLuz;
				uniform vec3 uNiebla;
				varying vec2 vUv;
				varying vec3 vNormal;
				varying vec3 vVista;
				void main() {
					float relieve = texture2D(uMapa, vUv).r;
					float luz = smoothstep(-0.05, 0.6, dot(vNormal, uLuz));
					float borde = pow(1.0 - max(dot(vNormal, vVista), 0.0), 3.0);
					vec3 color = vec3(0.8, 0.76, 0.68) * (0.3 + relieve * 0.85) * luz;
					color += vec3(0.5, 0.62, 0.8) * borde * 0.4 * smoothstep(-0.3, 0.3, dot(vNormal, uLuz));
					gl_FragColor = vec4(mix(color, uNiebla, 0.28), 1.0);
				}
			`,
		}),
	);
	fondoPlaneta.add(planetaFondo);
	new THREE.TextureLoader().load("assets/texturas/saturno.jpg", (mapa) => {
		uniformesPlaneta.uMapa.value = mapa;
		pedirCuadro();
	});

	const anillos = new THREE.Mesh(
		new THREE.RingGeometry(38, 68, 128, 1),
		new THREE.ShaderMaterial({
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide,
			uniforms: { uBandas: { value: texturaAnillos() }, uNiebla: { value: new THREE.Color(COLOR_CIELO) } },
			vertexShader: `
				varying float vRadio;
				void main() {
					vRadio = (length(position.xy) - 38.0) / 30.0;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform sampler2D uBandas;
				uniform vec3 uNiebla;
				varying float vRadio;
				void main() {
					float alfa = texture2D(uBandas, vec2(vRadio, 0.5)).a;
					vec3 color = mix(vec3(0.78, 0.74, 0.66), uNiebla, 0.3);
					gl_FragColor = vec4(color, alfa * 0.85);
				}
			`,
		}),
	);
	anillos.rotation.x = Math.PI / 2;
	fondoPlaneta.add(anillos);

	escena.add(new THREE.HemisphereLight(0xaab3c0, 0x15171b, 0.45));

	const foco = new THREE.SpotLight(0xffffff, 1100, 60, 0.32, 0.9, 1.6);
	foco.position.set(0, 24, -2);
	foco.target.position.set(0, 0, 0);
	foco.castShadow = true;
	foco.shadow.mapSize.set(movil ? 512 : 1024, movil ? 512 : 1024);
	foco.shadow.bias = -0.0004;
	escena.add(foco, foco.target);

	const luzLuna = new THREE.DirectionalLight(0x9fb0c8, 1.1);
	luzLuna.position.set(4, 8, 16);
	escena.add(luzLuna);

	const contraluz = new THREE.DirectionalLight(0xa9c3ff, 1.6);
	contraluz.position.set(-3, 6, -14);
	escena.add(contraluz);

	const segmentos = movil ? 110 : 180;
	const geometriaTerreno = new THREE.PlaneGeometry(140, 140, segmentos, segmentos);
	geometriaTerreno.rotateX(-Math.PI / 2);
	const vertices = geometriaTerreno.attributes.position;
	for (let i = 0; i < vertices.count; i++) {
		vertices.setY(i, alturaTerreno(vertices.getX(i), vertices.getZ(i)));
	}
	geometriaTerreno.computeVertexNormals();
	const coloresTerreno = new Float32Array(vertices.count * 3);
	for (let i = 0; i < vertices.count; i++) {
		const x = vertices.getX(i);
		const z = vertices.getZ(i);
		const manchas = fbm(x * 0.18 + 40, z * 0.18) * 0.35 + fbm(x * 0.9, z * 0.9) * 0.12;
		const pared = suavizarPaso(0, 12, vertices.getY(i)) * 0.35;
		const tono = 0.6 + manchas - pared;
		coloresTerreno.set([tono, tono, tono * 1.03], i * 3);
	}
	geometriaTerreno.setAttribute("color", new THREE.BufferAttribute(coloresTerreno, 3));
	const terreno = new THREE.Mesh(
		geometriaTerreno,
		new THREE.MeshStandardMaterial({
			color: 0xb3b8bf,
			roughness: 0.96,
			metalness: 0,
			vertexColors: true,
			bumpMap: texturaGrano(256, 45),
			bumpScale: 1.2,
		}),
	);
	terreno.receiveShadow = true;
	escena.add(terreno);

	const haz = new THREE.Mesh(
		new THREE.CylinderGeometry(0.6, 7, 24, 48, 1, true),
		new THREE.ShaderMaterial({
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			side: THREE.DoubleSide,
			uniforms: { intensidad: { value: 0.16 } },
			vertexShader: `
				varying float vAltura;
				varying vec3 vNormal;
				varying vec3 vVista;
				void main() {
					vAltura = uv.y;
					vec4 posicion = modelViewMatrix * vec4(position, 1.0);
					vNormal = normalize(normalMatrix * normal);
					vVista = normalize(-posicion.xyz);
					gl_Position = projectionMatrix * posicion;
				}
			`,
			fragmentShader: `
				uniform float intensidad;
				varying float vAltura;
				varying vec3 vNormal;
				varying vec3 vVista;
				void main() {
					float borde = pow(abs(dot(vNormal, vVista)), 2.5);
					float caida = smoothstep(0.0, 0.35, vAltura) * (1.0 - smoothstep(0.75, 1.0, vAltura));
					gl_FragColor = vec4(vec3(0.85, 0.9, 1.0), borde * caida * intensidad);
				}
			`,
		}),
	);
	haz.position.set(0, 12, -1);
	escena.add(haz);

	const geometriaPiedra = new THREE.IcosahedronGeometry(1, 1);
	const verticesPiedra = geometriaPiedra.attributes.position;
	for (let i = 0; i < verticesPiedra.count; i++) {
		const x = verticesPiedra.getX(i);
		const y = verticesPiedra.getY(i);
		const z = verticesPiedra.getZ(i);
		const factor = 0.72 + ruido(x * 2.1 + 5, z * 2.1 + y * 1.7) * 0.45 + hash(x * 9.1 + y, z * 7.3) * 0.12;
		verticesPiedra.setXYZ(i, x * factor, y * factor * 0.78, z * factor);
	}
	geometriaPiedra.computeVertexNormals();
	const materialPiedra = new THREE.MeshStandardMaterial({
		color: 0xb0b5bc,
		roughness: 0.95,
		flatShading: true,
		bumpMap: texturaGrano(128, 2),
		bumpScale: 2,
	});
	const tonoPiedra = new THREE.Color();
	const auxiliar = new THREE.Object3D();

	const cantidadSuelo = movil ? 220 : 420;
	const piedrasSuelo = new THREE.InstancedMesh(geometriaPiedra, materialPiedra, cantidadSuelo);
	for (let i = 0; i < cantidadSuelo; i++) {
		const anillo = 3.5 + (i % 4) * 2.2 + Math.random() * 1.2;
		const angulo = Math.random() * Math.PI * 2 + anillo * 0.4;
		const x = Math.cos(angulo) * anillo * 1.15;
		const z = Math.sin(angulo) * anillo;
		const tamano = 0.05 + Math.pow(Math.random(), 3) * 0.35;
		auxiliar.position.set(x, alturaTerreno(x, z) + tamano * 0.3, z);
		auxiliar.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
		auxiliar.scale.set(tamano, tamano * (0.6 + Math.random() * 0.6), tamano);
		auxiliar.updateMatrix();
		piedrasSuelo.setMatrixAt(i, auxiliar.matrix);
		piedrasSuelo.setColorAt(i, tonoPiedra.setScalar(0.55 + hash(i, 21) * 0.4));
	}
	piedrasSuelo.castShadow = true;
	piedrasSuelo.receiveShadow = true;
	escena.add(piedrasSuelo);

	const cantidadFlotantes = movil ? 45 : 90;
	const piedrasFlotantes = new THREE.InstancedMesh(geometriaPiedra, materialPiedra, cantidadFlotantes);
	const flotantes = Array.from({ length: cantidadFlotantes }, () => {
		const angulo = Math.random() * Math.PI * 2;
		const radio = 2 + Math.random() * 13;
		return {
			x: Math.cos(angulo) * radio,
			z: Math.sin(angulo) * radio - 2,
			y: Math.random() * 26,
			velocidad: 0.25 + Math.random() * 0.6,
			tamano: 0.06 + Math.pow(Math.random(), 2.5) * 0.45,
			giroX: Math.random() * 3,
			giroY: Math.random() * 3,
			velocidadGiro: (Math.random() - 0.5) * 0.8,
		};
	});
	flotantes.forEach((_, i) => piedrasFlotantes.setColorAt(i, tonoPiedra.setScalar(0.6 + hash(i, 31) * 0.35)));
	piedrasFlotantes.castShadow = true;
	escena.add(piedrasFlotantes);

	const cantidadNube = movil ? 2200 : 4500;
	const posicionesNube = new Float32Array(cantidadNube * 3);
	for (let i = 0; i < cantidadNube; i++) {
		const tita = Math.random() * Math.PI * 2;
		const fi = Math.acos(2 * Math.random() - 1);
		const r = Math.cbrt(Math.random());
		const deformacion = 0.75 + fbm(tita * 1.3, fi * 1.7) * 0.6;
		posicionesNube[i * 3] = Math.sin(fi) * Math.cos(tita) * 5.5 * r * deformacion;
		posicionesNube[i * 3 + 1] = Math.cos(fi) * 3.6 * r * deformacion;
		posicionesNube[i * 3 + 2] = Math.sin(fi) * Math.sin(tita) * 4.5 * r * deformacion;
	}

	const lienzoPunto = document.createElement("canvas");
	lienzoPunto.width = lienzoPunto.height = 32;
	const contextoPunto = lienzoPunto.getContext("2d");
	const degradado = contextoPunto.createRadialGradient(16, 16, 0, 16, 16, 16);
	degradado.addColorStop(0, "rgba(255,255,255,1)");
	degradado.addColorStop(0.5, "rgba(255,255,255,0.6)");
	degradado.addColorStop(1, "rgba(255,255,255,0)");
	contextoPunto.fillStyle = degradado;
	contextoPunto.fillRect(0, 0, 32, 32);

	const geometriaNube = new THREE.BufferGeometry();
	geometriaNube.setAttribute("position", new THREE.BufferAttribute(posicionesNube, 3));
	const nube = new THREE.Points(
		geometriaNube,
		new THREE.PointsMaterial({
			color: 0xe9eef6,
			size: 0.22,
			map: new THREE.CanvasTexture(lienzoPunto),
			transparent: true,
			depthWrite: false,
			opacity: 0.9,
			fog: false,
		}),
	);
	nube.position.set(0, 17, -4);
	escena.add(nube);

	const cantidadMotas = movil ? 220 : 480;
	const posicionesMotas = new Float32Array(cantidadMotas * 3);
	const motas = Array.from({ length: cantidadMotas }, () => ({
		y: Math.random() * 22,
		angulo: Math.random() * Math.PI * 2,
		distancia: Math.sqrt(Math.random()),
		velocidad: 0.15 + Math.random() * 0.35,
		fase: Math.random() * Math.PI * 2,
	}));
	const geometriaMotas = new THREE.BufferGeometry();
	geometriaMotas.setAttribute("position", new THREE.BufferAttribute(posicionesMotas, 3));
	const polvoHaz = new THREE.Points(
		geometriaMotas,
		new THREE.PointsMaterial({
			color: 0xe6edf7,
			size: 0.1,
			map: nube.material.map,
			transparent: true,
			opacity: 0.85,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		}),
	);
	polvoHaz.frustumCulled = false;
	escena.add(polvoHaz);

	function actualizarMotas(delta, tiempo) {
		motas.forEach((m, i) => {
			if (!reducirMovimiento) {
				m.y += m.velocidad * delta;
				m.angulo += delta * 0.05;
				if (m.y > 22) m.y = 0;
			}
			const radioHaz = (7 - (m.y / 24) * 6.4) * 0.85;
			const deriva = Math.sin(tiempo * 0.0004 + m.fase) * 0.3;
			posicionesMotas.set(
				[Math.cos(m.angulo) * m.distancia * radioHaz + deriva, m.y, Math.sin(m.angulo) * m.distancia * radioHaz - 1],
				i * 3,
			);
		});
		geometriaMotas.attributes.position.needsUpdate = true;
	}

	const pivote = new THREE.Group();
	escena.add(pivote);

	const estado = {
		progreso: 0,
		mouseX: 0,
		mouseY: 0,
		mouseSuaveX: 0,
		mouseSuaveY: 0,
		giro: -0.35,
		velocidad: 0,
		arrastrando: false,
		ultimoX: 0,
		ultimoTiempo: 0,
		torsion: 0,
	};
	const uniformesCuerpo = {
		uTiempo: { value: 0 },
		uTorsion: { value: 0 },
		uAltura: { value: 2 },
	};
	let listo = false;
	let visible = false;
	let cuadro = null;

	function limitar(valor, min, max) {
		return Math.min(max, Math.max(min, valor));
	}

	function suavizar(t) {
		return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	}

	function ajustar() {
		const ancho = lienzo.clientWidth;
		const alto = lienzo.clientHeight;
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, esMovil() ? 1.5 : 2));
		renderer.setSize(ancho, alto, false);
		camara.aspect = ancho / alto;
		camara.fov = camara.aspect < 1 ? 62 : 45;
		camara.updateProjectionMatrix();
	}

	function actualizarFlotantes(delta) {
		flotantes.forEach((p, i) => {
			if (!reducirMovimiento) {
				p.y += p.velocidad * delta;
				p.giroX += p.velocidadGiro * delta;
				p.giroY += p.velocidadGiro * 0.7 * delta;
				if (p.y > 28) p.y = 0;
			}
			const aparicion = suavizarPaso(0, 2, p.y) * (1 - suavizarPaso(22, 28, p.y));
			auxiliar.position.set(p.x, p.y + alturaTerreno(p.x, p.z), p.z);
			auxiliar.rotation.set(p.giroX, p.giroY, 0);
			auxiliar.scale.setScalar(p.tamano * aparicion);
			auxiliar.updateMatrix();
			piedrasFlotantes.setMatrixAt(i, auxiliar.matrix);
		});
		piedrasFlotantes.instanceMatrix.needsUpdate = true;
	}

	function dibujar(tiempo) {
		const delta = Math.min(0.05, (tiempo - (estado.ultimoTiempo || tiempo)) / 1000);
		estado.ultimoTiempo = tiempo;

		const rect = seccion.getBoundingClientRect();
		const objetivo = limitar(-rect.top / (rect.height - window.innerHeight), 0, 1);
		estado.progreso += (objetivo - estado.progreso) * 0.08;
		estado.mouseSuaveX += (estado.mouseX - estado.mouseSuaveX) * 0.05;
		estado.mouseSuaveY += (estado.mouseY - estado.mouseSuaveY) * 0.05;

		const e = reducirMovimiento ? 1 : suavizar(estado.progreso);
		const lejania = esMovil() ? 1.35 : 1;

		camara.position.set(
			estado.mouseSuaveX * 1.5,
			(19 - 13 * e) * lejania - estado.mouseSuaveY * 0.8,
			(24 - 12 * e) * lejania,
		);
		camara.lookAt(0, 9 - 5.6 * e, -2 - 2 * e);

		if (!estado.arrastrando) {
			estado.giro += estado.velocidad;
			estado.velocidad *= 0.94;
		}
		const movimiento = reducirMovimiento ? 0 : 1;
		pivote.rotation.y = estado.giro + Math.sin(tiempo * 0.00025) * 0.12 * movimiento;

		nube.rotation.y += 0.0008 * movimiento;
		nube.rotation.z = Math.sin(tiempo * 0.0002) * 0.05 * movimiento;
		actualizarFlotantes(delta);
		actualizarMotas(delta, tiempo);

		const torsionObjetivo = (estado.mouseSuaveX * 0.35 - estado.velocidad * 6) * movimiento;
		estado.torsion += (limitar(torsionObjetivo, -0.5, 0.5) - estado.torsion) * 0.08;
		uniformesCuerpo.uTiempo.value = (tiempo / 1000) * movimiento;
		uniformesCuerpo.uTorsion.value = estado.torsion;
		fondoPlaneta.rotation.y += 0.00004 * movimiento;

		renderer.render(escena, camara);

		const sigue = visible && (!reducirMovimiento || estado.arrastrando || Math.abs(estado.velocidad) > 0.0005);
		cuadro = sigue ? requestAnimationFrame(dibujar) : null;
	}

	function pedirCuadro() {
		if (listo && cuadro === null) cuadro = requestAnimationFrame(dibujar);
	}

	new GLTFLoader().load("assets/modelos/astronauta.glb", (gltf) => {
		const modelo = gltf.scene;
		const caja = new THREE.Box3().setFromObject(modelo);
		const tamano = caja.getSize(new THREE.Vector3());
		const centro = caja.getCenter(new THREE.Vector3());
		modelo.position.set(-centro.x, -caja.min.y, -centro.z);

		modelo.traverse((parte) => {
			if (parte.isMesh) {
				parte.castShadow = true;
				parte.receiveShadow = true;
				parte.material.roughness = 0.62;
				parte.material.metalness = 0.05;
				parte.geometry.computeBoundingBox();
				uniformesCuerpo.uAltura.value = parte.geometry.boundingBox.max.y;
				parte.material.onBeforeCompile = (shader) => {
					Object.assign(shader.uniforms, uniformesCuerpo);
					shader.vertexShader = shader.vertexShader
						.replace(
							"#include <common>",
							`#include <common>
							uniform float uTiempo;
							uniform float uTorsion;
							uniform float uAltura;`,
						)
						.replace(
							"#include <begin_vertex>",
							`#include <begin_vertex>
							float alturaRelativa = clamp(transformed.y / uAltura, 0.0, 1.0);
							float peso = smoothstep(0.32, 1.0, alturaRelativa);
							float pecho = smoothstep(0.5, 0.62, alturaRelativa) * (1.0 - smoothstep(0.72, 0.82, alturaRelativa));
							transformed.xz *= 1.0 + pecho * 0.02 * sin(uTiempo * 1.7);
							float giro = (uTorsion + sin(uTiempo * 0.45) * 0.08) * peso;
							transformed.xz = mat2(cos(giro), -sin(giro), sin(giro), cos(giro)) * transformed.xz;
							vec2 balanceo = vec2(sin(uTiempo * 0.8), sin(uTiempo * 0.6 + 1.3)) * 0.016 * peso * peso;
							transformed.xz += balanceo * uAltura;
							transformed.y -= dot(balanceo, balanceo) * uAltura * 4.0;`,
						);
				};
			}
		});

		const envoltura = new THREE.Group();
		envoltura.scale.setScalar(1.8 / tamano.y);
		envoltura.position.y = alturaTerreno(0, 0);
		envoltura.add(modelo);
		pivote.add(envoltura);

		listo = true;
		seccion.classList.add("astronauta--3d");
		ajustar();
		pedirCuadro();
	});

	lienzo.addEventListener("pointerdown", (e) => {
		estado.arrastrando = true;
		estado.ultimoX = e.clientX;
		estado.velocidad = 0;
		lienzo.setPointerCapture(e.pointerId);
		lienzo.classList.add("arrastrando");
		pedirCuadro();
	});

	lienzo.addEventListener("pointermove", (e) => {
		if (!estado.arrastrando) return;
		const dx = e.clientX - estado.ultimoX;
		estado.ultimoX = e.clientX;
		estado.giro += dx * 0.01;
		estado.velocidad = dx * 0.01;
	});

	function soltar() {
		estado.arrastrando = false;
		lienzo.classList.remove("arrastrando");
	}

	lienzo.addEventListener("pointerup", soltar);
	lienzo.addEventListener("pointercancel", soltar);

	if (conMouse && !reducirMovimiento) {
		window.addEventListener("pointermove", (e) => {
			estado.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
			estado.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
		});
	}

	window.addEventListener("resize", () => {
		if (!listo) return;
		ajustar();
		pedirCuadro();
	});

	if (reducirMovimiento) window.addEventListener("scroll", pedirCuadro, { passive: true });

	new IntersectionObserver(
		([entrada]) => {
			visible = entrada.isIntersecting;
			if (visible) pedirCuadro();
		},
		{ rootMargin: "200px 0px" },
	).observe(seccion);
}

# WM-TALLER01

Taller 1 de Introducción al Desarrollo Web/Móvil: landing page animada con HTML, CSS y JavaScript.

## Ver en línea

https://zacloks.github.io/WM-TALLER01/

## Ejecutar en local

Clonar el repositorio:

```bash
git clone https://github.com/Zacloks/WM-TALLER01.git
cd WM-TALLER01
```

Luego abrir `index.html` en el navegador (doble clic). No requiere instalar nada.

También se puede servir con un servidor local, usando **una** de estas opciones:

**Con Node.js** (abre el navegador automáticamente):

```bash
npx http-server -c-1 -o
```

**Con VS Code (instalar extensión live server):** abrir la carpeta, clic derecho sobre `index.html` → *Open with Live Server*.

## Librerías

- **[GSAP](https://gsap.com/) 3.15** (cargada desde jsDelivr), usada solo en la secuencia de entrada: cuenta regresiva → salida del loader → letras del título → header y eslogan. Es una animación de varios pasos encadenados, que es justo lo que resuelve una `timeline`: cada paso se ubica en el tiempo con etiquetas en vez de encadenar `setInterval`, `setTimeout` y retrasos de CSS.
- El resto de las animaciones (estrellas, nebulosa, planetas, nave 3D, parallax, pase de abordaje) está hecho a mano con Canvas 2D, `requestAnimationFrame`, `IntersectionObserver`, transiciones y variables CSS. Ahí el comportamiento depende de fórmulas propias (proyección 3D, interpolación, repulsión del cursor) que necesitábamos controlar directamente.
- Si GSAP no carga (sin conexión) o el sistema tiene activado "reducir movimiento", la página se muestra directamente, sin la intro.
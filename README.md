# Lluvia de sumas

Juego web en el que aparecen sumas de dos números que caen desde arriba. Debes escribir el resultado correcto para eliminarlas antes de que lleguen a la zona inferior. Hecho con **Next.js** (App Router), **React** y **Tailwind CSS**.

## Cómo ejecutarlo

Requisitos: **Node.js** (recomendado LTS) y npm.

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

Otros comandos:

| Comando | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run start` | Sirve la build (tras `npm run build`) |
| `npm run lint` | ESLint |

## Cómo se juega

1. En pantalla ves expresiones del tipo **a + b** que bajan en posiciones horizontales aleatorias.
2. Escribe el **resultado** en el campo de texto y pulsa **Enter** o el botón **Enviar**.
3. Si el número coincide con **alguna** suma visible, se elimina la que está **más abajo** entre las que tenían ese resultado (la más urgente).
4. Si una suma **alcanza la franja inferior** (zona marcada), se **resta** de tu puntuación el valor de esa suma (a + b).
5. Si aciertas, **sumas** a tu puntuación el mismo valor (a + b).

### Victoria y derrota

- **Ganas** si la puntuación llega a **500** o más.
- **Pierdes** si la puntuación llega a **-500** o menos.

La puntuación empieza en **0**.

### Modos de dificultad

Cada modo limita el **resultado** de la suma (a + b). En todos los casos cada número es al menos **2**.

| Modo | Condición del resultado | Rango típico del resultado |
|------|-------------------------|----------------------------|
| **Simple** | resultado menor que 25 | de 4 a 24 |
| **Intermedio** | resultado menor que 60 | de 4 a 59 |
| **Avanzado** | resultado menor que 100 | de 4 a 99 |

Al **cambiar de modo** se **reinicia** la partida y la puntuación. Tras ganar o perder, **«Jugar otra vez»** / **«Reintentar»** mantiene el modo que tenías seleccionado.

### Aparición de sumas

- Puede haber hasta **6** sumas a la vez en pantalla.
- Si el tablero queda **vacío**, aparece una nueva suma **enseguida** (no hace falta esperar al intervalo).
- Si ya hay sumas en juego, las nuevas siguen un **intervalo** entre apariciones (aprox. **2,2 segundos** desde la última suma generada).
- Si hay **6** sumas y el intervalo ya “habría” pasado, no cae otra hasta que liberes hueco; la interfaz muestra avisos en el bloque **«Próxima suma»**.

### Contador «Próxima suma»

Indica el tiempo aproximado hasta el siguiente **ciclo** de aparición según el reloj del juego. Si la pantalla está al máximo de sumas, el texto aclara que hace falta hueco aunque el contador llegue a cero.

## Controles

- **Números** en el campo de resultado (solo dígitos).
- **Enter** o botón **Enviar** para comprobar.
- Si no hay ninguna suma con ese resultado, el texto que escribiste **no se borra** (puedes corregir).
- Si aciertas, el campo se vacía tras eliminar la suma.

## Detalles técnicos del juego

- El movimiento usa **requestAnimationFrame** y posiciones relativas al alto del área de juego.
- La “línea de suelo” del juego está alrededor del **86 %** de la altura del panel; al cruzarla, la suma cuenta como fallada y se descuenta.
- La velocidad de caída y el intervalo de spawn están definidos como constantes en el código del componente (por si quieres tunear dificultad).

## Estructura del proyecto (relevante)

- `app/page.tsx` — Página principal que monta el juego.
- `app/components/SumFallGame.tsx` — Toda la lógica y la interfaz del juego.
- `app/layout.tsx` — Layout raíz y metadatos (título, descripción).

## Licencia y créditos

Proyecto privado (`"private": true` en `package.json`). Ajusta esta sección si publicas el repositorio o cambias la licencia.

# Sistema de Diseño - Bookmachs

Este documento recopila todas las especificaciones de diseño visual, paleta de colores, tipografías, componentes y estilos del proyecto **Bookmachs**. Está diseñado para servir como referencia y especificación técnica al migrar o construir la nueva aplicación web.

---

## 1. Identidad Visual y Concepto
Bookmachs utiliza una estética de **Modo Oscuro Premium de Alto Contraste**. Combina superficies oscuras y profundas (negro puro y grises asfalto) con acentos de color **Verde Neón (Neon Lime)** que generan un efecto de brillo y modernidad.

Adicionalmente, el proyecto conserva referencias a una identidad visual previa (V1) basada en gradientes cálidos (Rosa a Naranja), la cual puede utilizarse como tema secundario o de realce.

---

## 2. Paleta de Colores

### A. Colores de Marca y Acentos (Tema Principal - V2 Neon)
| Variable CSS | Propósito | Valor Hex / RGBA | Muestra |
| :--- | :--- | :--- | :--- |
| `--neon` | Color de realce principal / Acento | `#B6FF00` | ![#B6FF00](https://placehold.co/15x15/B6FF00/B6FF00.png) |
| `--neon-dark` | Estado hover de acentos | `#8FCC00` | ![#8FCC00](https://placehold.co/15x15/8FCC00/8FCC00.png) |
| `--neon-glow` | Sombra y resplandor sutil (25% opacidad) | `rgba(182, 255, 0, 0.25)` | - |
| `--neon-glow-strong` | Sombra y resplandor fuerte (45% opacidad) | `rgba(182, 255, 0, 0.45)` | - |
| `--dark-green` | Color secundario profundo de fondo | `#0F5B45` | ![#0F5B45](https://placehold.co/15x15/0F5B45/0F5B45.png) |

### B. Colores de Fondo y Superficie
| Variable CSS | Propósito | Valor Hex | Muestra |
| :--- | :--- | :--- | :--- |
| `--bg-primary` | Fondo principal del sitio / Body | `#000000` | ![#000000](https://placehold.co/15x15/000000/000000.png) |
| `--bg-secondary` | Fondo de secciones secundarias / Formularios | `#050505` | ![#050505](https://placehold.co/15x15/050505/050505.png) |
| `--bg-card` | Fondo de contenedores / Tarjetas | `#0A0A0A` | ![#0A0A0A](https://placehold.co/15x15/0A0A0A/0A0A0A.png) |
| `--bg-surface` | Fondo de superficies auxiliares | `#111111` | ![#111111](https://placehold.co/15x15/111111/111111.png) |

### C. Colores de Texto
| Variable CSS | Propósito | Valor Hex | Muestra |
| :--- | :--- | :--- | :--- |
| `--text-primary` | Texto principal (títulos y contenido destacado) | `#FFFFFF` | ![#FFFFFF](https://placehold.co/15x15/FFFFFF/FFFFFF.png) |
| `--text-secondary` | Texto secundario (etiquetas, descripciones, párrafos) | `#CFCFCF` | ![#CFCFCF](https://placehold.co/15x15/CFCFCF/CFCFCF.png) |
| *(Muted)* | Marcadores de posición / placeholders | `#555555` | ![#555555](https://placehold.co/15x15/555555/555555.png) |

### D. Bordes y Validación
| Variable CSS | Propósito | Valor Hex / RGBA | Muestra |
| :--- | :--- | :--- | :--- |
| `--border-color` | Bordes decorativos con brillo neón sutil | `rgba(182, 255, 0, 0.15)` | - |
| `--border-input` | Borde por defecto para inputs del formulario | `#2A2A2A` | ![#2A2A2A](https://placehold.co/15x15/2A2A2A/2A2A2A.png) |
| *(Borde Navbar)* | Borde inferior de la barra de navegación | `rgba(182, 255, 0, 0.08)` | - |
| *(Error Text)* | Texto de validación de errores | `#FF6B6B` | ![#FF6B6B](https://placehold.co/15x15/FF6B6B/FF6B6B.png) |
| *(Error BG)* | Fondo para el resumen de errores | `rgba(255, 107, 107, 0.05)` | - |
| *(Error Border)* | Borde del contenedor de errores | `rgba(255, 107, 107, 0.3)` | - |

### E. Identidad Alternativa (V1 Gradient Theme)
Utilizada en secciones secundarias o layouts alternativos del proyecto anterior:
- **Gradiente Principal:** `linear-gradient(90deg, #e91e63, #ff9800)` (Rosa `#e91e63` a Naranja `#ff9800`)
- **Fondo Footer V1:** Light gray `#f8f9fa` con enlaces en color Rosa `#e91e63`.

---

## 3. Tipografía

El sitio web utiliza la fuente **Poppins** de Google Fonts como tipografía base, proporcionando un aspecto moderno, limpio y geométrico.

- **URL de Carga:** `https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap`
- **Familia tipográfica:** `'Poppins', sans-serif`
- **Renderizado mejorado:**
  ```css
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  ```

### Jerarquía de Fuentes (Desktop & Mobile)

#### 1. Título Hero (Main Title)
- **Tamaño (Desktop):** `64px` (con `letter-spacing: -1px` y `line-height: 1.1`)
- **Tamaño (Medium/Tablet):** `52px` o `44px`
- **Tamaño (Mobile):** `36px` o `30px`
- **Peso:** Extra Bold (`800`)
- **Efecto Neon:** El texto destacado utiliza la clase `.neon-text` con color `var(--neon)` y sombras de texto (`text-shadow`):
  ```css
  text-shadow: 0 0 30px var(--neon-glow), 0 0 60px var(--neon-glow);
  ```

#### 2. Títulos de Secciones / Tarjetas (Card Title)
- **Tamaño (Desktop):** `28px`
- **Tamaño (Mobile):** `24px`
- **Peso:** Bold (`700`)
- **Color:** `var(--neon)`

#### 3. Subtítulos y Cuerpo Secundario
- **Tamaño:** `16px`
- **Peso:** Regular (`400`)
- **Color:** `var(--text-secondary)` (`#CFCFCF`)

#### 4. Etiquetas de Formularios (Form Labels)
- **Tamaño:** `13px`
- **Peso:** Semi Bold (`600`)
- **Estilo:** Todo Mayúsculas (`text-transform: uppercase`), espaciado entre letras (`letter-spacing: 1px`)
- **Color:** `var(--text-secondary)`

#### 5. Texto de Footer
- **Tamaño:** `14px`
- **Peso:** Regular (`400`)
- **Color:** `var(--text-secondary)`

---

## 4. Estructura y Distribución (Layout)

### Bordes Redondeados (Border Radii)
- Tarjetas (`--radius-card`): `20px`
- Botones (`--radius-btn`): `50px` (Botones ovalados tipo píldora)
- Campos de Entrada (`--radius-input`): `12px`

### Márgenes y Rellenos (Spacing)

| Sección | Dispositivo | Padding / Espaciado |
| :--- | :--- | :--- |
| **Barra de Navegación** | Desktop | `16px 40px` |
| | Tablet | `14px 24px` |
| | Mobile | `12px 20px` |
| **Sección Hero** | Desktop | `96px 40px 0 40px` (Mínimo alto: `90vh`) |
| | Tablet | `120px 24px 60px` |
| | Mobile | `100px 20px 48px` |
| **Sección de Registro** | General | `48px 40px 0 40px` |
| | Mobile | `60px 20px` |
| **Tarjeta de Registro** | Desktop | `56px 48px 48px` (Ancho máximo: `480px`) |
| | Mobile | `40px 24px 36px` |
| **Footer** | Desktop | `60px 40px 40px` |
| | Mobile | `40px 20px 32px` |

---

## 5. Especificaciones de Componentes

### A. Barra de Navegación (Navbar)
- **Posición:** Fija en la parte superior (`position: fixed; top: 0; left: 0; right: 0; z-index: 1000;`).
- **Fondo:** Translúcido con efecto esmerilado / desenfoque:
  ```css
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(182, 255, 0, 0.08);
  ```
- **Logo:** Altura máxima `32px` (Desktop) / `26px` (Mobile).
- **Badge ("Próximamente"):**
  - Borde: `1px solid var(--neon)`
  - Color de texto: `var(--neon)`
  - Relleno: `7px 22px`
  - Fondo: `rgba(182, 255, 0, 0.05)`
  - Sombra: `0 0 20px var(--neon-glow)`
  - Hover: Fondo `rgba(182, 255, 0, 0.12)`, sombra `0 0 30px var(--neon-glow-strong)`.

### B. Botones Premium (Neon Button)
Utilizado para llamadas a la acción (CTAs) principales y envío de formularios (`.btn-neon`, `.btn-submit`).
- **Fondo:** `var(--neon)` (`#B6FF00`)
- **Texto:** `#000000` (Negro puro)
- **Fuente:** `'Poppins', sans-serif`, peso `700`, tamaño `18px` (Desktop) / `16px` (Mobile).
- **Redondeado:** `var(--radius-btn)` (`50px`).
- **Efecto de sombra inicial:**
  ```css
  box-shadow: 0 0 25px var(--neon-glow), 0 4px 15px rgba(0, 0, 0, 0.3);
  ```
- **Comportamiento en Hover:**
  ```css
  background: var(--neon-dark); /* #8FCC00 */
  box-shadow: 0 0 40px var(--neon-glow-strong), 0 6px 20px rgba(0, 0, 0, 0.4);
  transform: translateY(-2px);
  ```
- **Comportamiento en Active:**
  ```css
  transform: translateY(0);
  ```

### C. Campos de Entrada (Form Inputs)
- **Fondo:** `#050505` (Negro profundo)
- **Borde inicial:** `1px solid var(--border-input)` (`#2A2A2A`)
- **Relleno:** `14px 18px`
- **Color de texto:** `#FFFFFF`
- **Comportamiento en Focus:**
  - Borde cambia a: `var(--neon)` (`#B6FF00`)
  - Sombra de enfoque: `box-shadow: 0 0 15px var(--neon-glow)`
- **Placeholder:** Color `#555555`

### D. Casilla de Verificación Personalizada (Custom Checkbox)
Oculta el checkbox nativo y usa un pseudo-elemento decorativo para mantener consistencia de marca:
- **Contenedor/Etiqueta:** Padding izquierdo `32px`, tamaño `13px`, color `var(--neon)`.
- **Casilla base:** `20px x 20px`, borde `2px solid #555555`, fondo transparente, redondeado `4px`.
- **Casilla seleccionada (Checked):** Fondo y borde cambian a `var(--neon)`.
- **Marca de verificación (Checked mark):**
  - Icono dibujado mediante bordes: ancho `6px`, alto `10px`, borde de `2px` sólido en color `#000000` (girado 45 grados).
  ```css
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  ```

### E. Tarjeta de Registro / Contenedores (Glass Card)
- **Fondo:** `var(--bg-card)` (`#0A0A0A`)
- **Borde:** `1px solid var(--border-color)` (`rgba(182, 255, 0, 0.15)`)
- **Efecto inicial:**
  ```css
  box-shadow: 0 0 40px var(--neon-glow), 0 20px 60px rgba(0, 0, 0, 0.5);
  ```
- **Hover de Tarjeta:**
  ```css
  box-shadow: 0 0 60px var(--neon-glow), 0 20px 80px rgba(0, 0, 0, 0.6);
  ```

### F. Enlaces Sociales en Footer (Social Icons)
Iconos de redes sociales dentro de enlaces circulares.
- **Dimensiones:** `44px x 44px` circular (`border-radius: 50%`).
- **Borde:** `1px solid var(--border-color)`.
- **Color de Icono (SVG):** `var(--neon)`.
- **Hover:**
  - Fondo cambia a: `var(--neon)`
  - Color de icono cambia a: `#000000` (Negro)
  - Sombra: `0 0 20px var(--neon-glow)`

---

## 6. Animaciones e Interactividad

### Animación de Flotación (Floating Animation)
Aplicada a las imágenes decorativas del Hero para dar dinamismo visual:
```css
@keyframes float {
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-12px);
    }
}

.hero-main-image {
    animation: float 6s ease-in-out infinite;
}
```

---

## 7. Variables de CSS Nativas

Puedes pegar este bloque directamente en tu archivo CSS principal (por ejemplo, `site.css`, `index.css` o `global.css`) para inicializar los valores de este sistema de diseño en tu aplicación web:

```css
:root {
  --neon: #B6FF00;
  --neon-dark: #8FCC00;
  --neon-glow: rgba(182, 255, 0, 0.25);
  --neon-glow-strong: rgba(182, 255, 0, 0.45);
  --dark-green: #0F5B45;
  --bg-primary: #000000;
  --bg-secondary: #050505;
  --bg-card: #0A0A0A;
  --bg-surface: #111111;
  --text-primary: #FFFFFF;
  --text-secondary: #CFCFCF;
  --border-color: rgba(182, 255, 0, 0.15);
  --border-input: #2A2A2A;
  
  --radius-card: 20px;
  --radius-btn: 50px;
  --radius-input: 12px;
}
```

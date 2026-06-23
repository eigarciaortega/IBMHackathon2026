# NeoWallet — Sistema de Diseño Bancario (claro corporativo)

Diseño serio, confiable y comercial. **Sin** emojis como iconos, **sin** confeti,
**sin** glow neón. Todo debe transmitir confianza bancaria.

> Mockup visual de referencia: [`design/mockups.html`](./design/mockups.html)
> (ábrelo en el navegador). El frontend React se implementa a partir de él.

Dirección: **elegante, formal, seria y empresarial** (banca privada/institucional).
Navy profundo + neutros cálidos + acento bronce/dorado **muy discreto**.

## Paleta
| Token | Hex | Uso |
|-------|-----|-----|
| `--navy` | `#0C2340` | Marca, barra lateral, **acción primaria**, texto fuerte |
| `--navy-600` | `#163457` | Hover/realces de navy |
| `--ink` | `#16202B` | Texto principal |
| `--muted` | `#5C6776` | Texto secundario |
| `--faint` | `#8A93A1` | Captions / labels |
| `--gold` | `#9C7C46` | Acento bronce (logo, indicadores activos, hairline) — **uso mínimo** |
| `--gold-soft` | `#C2A878` | Acento bronce claro (sobre navy) |
| `--line` | `#E6E3DC` | Hairline cálida |
| `--bg` | `#F6F4EF` | Fondo marfil de la app |
| `--surface` | `#FFFFFF` | Tarjetas / superficies |
| `--positive` | `#1F6B4A` | Montos recibidos / éxito |
| `--negative` | `#9E2B25` | Montos enviados / error (oxblood) |
| `--pending` | `#8A6D2F` | Revertido / pendiente |

El dorado es **acento, no protagonista**: filo superior de tarjetas, barra del
ítem activo, marca. Acción primaria = **navy** (no azul eléctrico). Contraste AA.

## Tipografía
- **Serif institucional** (`Source Serif 4`) para marca, títulos de página/tarjeta
  y cifras destacadas → transmite formalidad.
- **Inter** para toda la interfaz (labels, cuerpo, tablas, botones).
- Montos y números de cuenta: **cifras tabulares**; el saldo grande va en **peso
  ligero (300)** con tracking negativo → elegante, no "gritón".
- Labels de campo y eyebrows: 11px, mayúsculas, `letter-spacing:.10–.16em`.

## Forma y profundidad
- Radios contenidos: tarjetas 10px, inputs/botones 7px (más cuadrado = más formal).
- **Hairlines finas** en vez de sombras fuertes; sombra base apenas `0 1px 2px`.
- Estados: **punto + etiqueta** (no píldoras de colores saturados).
- Espaciado generoso (base 4px: 4/8/12/16/20/24/30); marco de ventana monocromo.

## Iconografía
Iconos **SVG de línea** (trazo 1.6–2, esquinas redondeadas), monocromáticos.
Nada de emojis. Set: inicio, enviar, agregar, actividad, alertas, documentos,
tarjeta, escudo, búsqueda, chevron, salir.

## Componentes
- **AppBar** (superior): búsqueda, alertas, menú de usuario.
- **SideNav** (navy): logo, navegación, usuario al pie, cerrar sesión.
- **AccountCard**: etiqueta, saldo grande tabular, número enmascarado `···· 4291`,
  moneda, acciones rápidas (Enviar / Agregar fondos / Estados).
- **Button**: primario (azul), secundario (borde), terciario (texto).
- **Field**: label arriba, input con foco azul, ayuda/errores debajo.
- **Table / ActivityRow**: icono tipo, contraparte, fecha, estado, monto (±, color).
- **StatusBadge**: COMPLETED (verde), FAILED (rojo), ROLLED_BACK (ámbar) — sutiles.
- **ReviewStep / Receipt**: resumen previo + comprobante con folio.
- **Toast**: sobrio, esquina superior derecha, sin animaciones lúdicas.
- **Skeleton**: carga en gris suave.

## Terminología (banca)
Acceso · Resumen · Enviar dinero · Agregar fondos · Actividad ·
Notificaciones · Estados de cuenta · Beneficiario · Comprobante · Folio.

## Movimiento
Transiciones cortas (120–200ms, ease-out). Éxito = pantalla de **comprobante**,
no confeti. Nada parpadea ni rebota.

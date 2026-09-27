# App de Finanzas (Iván)

App web personal de finanzas para reemplazar MoneyStats. Un solo usuario (Iván). Se usa sobre todo desde el iPhone, instalada como PWA.

Respondeme siempre en español. Antes de cambiar la estructura de la base de datos o agregar dependencias grandes, preguntame.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS.
- Supabase: Postgres, Auth (login por email) y Row Level Security en todas las tablas (cada fila con `user_id`, solo accesible por su dueño).
- Deploy en Vercel (plan Hobby). Código en GitHub.
- PWA instalable en iPhone (manifest + iconos).
- Sin librerías de UI pesadas. Diseño propio según el lienzo de diseño.

## Fases
1. Fase 1 (ahora): carga manual, pantallas del diseño, recurrentes, patrimonio, importación del histórico de MoneyStats (CSV).
2. Fase 2: sincronización bancaria con Santander y Wise vía Enable Banking. MyInvestor no está cubierto: saldo manual o CSV.

## Cuentas
| Cuenta | Tipo | Notas |
|---|---|---|
| Santander | corriente | Día a día. Entra la nómina. Es la cuenta del "cuánto me queda" y la que traslada saldo de mes a mes. |
| Wise | ahorro | Ahorro de corto plazo / imprevistos. |
| MyInvestor | inversión | ETFs. Saldo actualizado a mano. |
| Efectivo USD | efectivo | En dólares, se convierte a EUR para el patrimonio. |

## Reglas de negocio
- "Cuánto me queda" = proyectado a fin de mes de Santander: saldo al empezar el mes + todos los movimientos del mes (pasados y futuros). Es el número grande del inicio.
- El saldo final de un mes de Santander es el saldo inicial del siguiente (se calcula, no se carga a mano).
- Recurrentes: al empezar el mes quedan todos cargados como movimientos con su fecha. Si la fecha es posterior a hoy, se muestran como "pendientes". Frecuencias: mensual, bimestral (ej. luz), anual.
- Tipos de movimiento: gasto, ingreso, transferencia (entre cuentas propias, no cuenta como gasto/ingreso), saldo inicial (no cuenta como gasto/ingreso), devolución (vinculada al gasto original, lo resta).
- Categorías de dos niveles (categoría + subcategoría). Cada movimiento lleva además un nombre libre (ej. "Caña y Come").
- Ocultar saldos: botón de ojo que reemplaza importes por "•••• €". Aplica a toda la app y se recuerda.

### Retribución flexible
- Tarjeta de empresa: hasta 220 €/ciclo en comida y 120 €/ciclo en transporte. Lo no gastado se pierde.
- Ciclo del día 20 al 19. Lo gastado se descuenta de la nómina del día 1 dos meses después del inicio del ciclo (20 sep–19 oct → nómina del 1 nov).
- El Salario (2.540 €) se registra antes del descuento flex.
- El gasto se carga con su fecha real y la app calcula el mes al que imputa (`mes_imputacion`): si día ≥ 20 → mes + 2; si día < 20 → mes + 1.
- Se muestra "te quedan X de 220 / 120 hasta el 19".
- Se registra en la cuenta Santander (sale de la nómina) con categoría Retribución flexible.

## Categorías iniciales
| Categoría | Subcategorías |
|---|---|
| Vivienda | Renta, Servicios, Hogar |
| Comida | Súper, Delivery, Bares y restaurantes |
| Transporte | Transporte público, Taxi/VTC, Coche |
| Suscripciones | Apps y servicios digitales, Membresías |
| Salud y belleza | Tratamiento capilar, Farmacia, Peluquería, Salud |
| Compras | Tecnología, Ropa, Varios online |
| Retribución flexible | Comida (límite 220), Transporte (límite 120) |
| Ocio | |
| Regalos | |
| Vacaciones | |
| Otros | |
| Ingresos | Salario, Venta, Otros ingresos |

## Modelo de datos (borrador, confirmar antes de crear)
- `accounts`: id, user_id, name, type (corriente | ahorro | inversion | efectivo), currency (EUR | USD), is_daily (bool), sync_source (manual | enable_banking | csv), sort.
- `categories`: id, user_id, name, parent_id (null = categoría principal), kind (gasto | ingreso), cycle_limit (solo subcategorías flex), sort.
- `transactions`: id, user_id, account_id, date (fecha real), mes_imputacion (primer día del mes al que cuenta), amount (positivo), type (gasto | ingreso | transferencia | saldo_inicial | devolucion), category_id, name, note, recurring_id, related_id (devolución → gasto original; transferencia → contrapartida), created_at.
- `recurring`: id, user_id, name, amount, type, category_id, account_id, day_of_month, frequency (mensual | bimestral | anual), start_date, end_date, active.
- `balance_snapshots`: id, user_id, account_id, date, balance, fx_rate (para MyInvestor y USD, actualizados a mano).

## Pantallas (del diseño)
Referencia visual: lienzo "App de Finanzas" en claude.ai (https://claude.ai/artifact/H9YtV9a9vaEPRUMGSi4AHE).
- Inicio del mes: proyectado a fin de mes, desglose (saldo mes anterior, ingresos, gastado, pendientes), gasto por categoría con lo pendiente rayado, próximos recurrentes. Navegación entre meses.
- Cargar movimiento: tipo, importe, nombre, categoría y subcategoría en botones, fecha, cuenta, "repetir cada mes".
- Patrimonio: total, barra de reparto, cuentas con su función, "actualizar saldo".
- Movimientos y Recurrentes: pendientes de diseñar.
- Barra inferior: Mes, Movimientos, + (cargar), Recurrentes, Patrimonio.
- Estilo: fondo #F5F3EE, texto #1A1A17, acento verde #1F5E4A, gris #5E5B53. Tipografías Geist (texto) e Instrument Serif (números grandes). Cifras con tabular-nums. Formato de números español (1.234,56 €).

## Orden de trabajo sugerido
1. Proyecto Next.js + conexión a Supabase + login.
2. Tablas, RLS y datos iniciales (cuentas y categorías).
3. Cargar movimiento.
4. Inicio del mes.
5. Recurrentes.
6. Patrimonio.
7. PWA + deploy en Vercel.
8. Importación CSV de MoneyStats.

## Glosario
- Finas: finasterida. Mino: minoxidil. Meso: mesoterapia (tratamiento capilar).
- Devo: devolución. Flex: retribución flexible.

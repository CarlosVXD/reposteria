// ==========================================================================
// Tipos, constantes y datos de ejemplo del sistema.
// Lo que comparten las páginas vive aquí (datos) o en DatosService (lógica).
// ==========================================================================

export type Recurso = 'horno' | 'decoracion' | 'personal';
export type Complejidad = 'Baja' | 'Media' | 'Alta';
export type EstadoPedido =
  | 'Pendiente de aprobación'
  | 'En producción'
  | 'Listo para entrega'
  | 'Entregado'
  | 'Cancelado';
export type Origen = 'IA' | 'Manual';

/** Horas de cada recurso (usadas, disponibles o necesarias). */
export interface Uso {
  horno: number;
  decoracion: number;
  personal: number;
}

export interface Dia {
  fecha: Date;
  usado: Uso;
}

export interface Insumo {
  id: string;
  nombre: string;
  unidad: string;
  precioCotizado: number; // precio cuando se cotizaron los pedidos
  precioActual: number | null; // null si el usuario borra el campo
}

/** Ficha técnica: qué insumos y cuánta mano de obra lleva un tipo de producto. */
export interface Receta {
  nombre: string;
  tamanoBase: number; // para cuántas personas (o unidades) está pensada la receta
  manoObra: number;
  consumo: Record<string, number>;
}

export interface Pedido {
  id: string;
  cliente: string;
  producto: string;
  receta: string;
  complejidad: Complejidad;
  fecha: Date;
  estado: EstadoPedido;
  precio: number;
  origen: Origen;
  escala: number; // 1 = tamaño de la receta; 2 = el doble
  preciosCotizados: Record<string, number>; // precio de cada insumo cuando se cotizó ESTE pedido
}

/** Lo que hace falta para crear un pedido nuevo (el resto lo completa el servicio). */
export interface NuevoPedido {
  cliente: string;
  producto: string;
  receta: string;
  escala: number;
  complejidad: Complejidad;
  fecha: Date;
  precio: number;
}

export interface PedidoEvaluado extends Pedido {
  costoCotizado: number;
  costoActual: number;
  margenCotizado: number;
  margenActual: number;
  caida: number; // puntos de margen perdidos
  precioSugerido: number;
  nivel: 'Alta' | 'Media' | 'Leve';
  variante: 'rose' | 'amber' | 'neutral';
}

export interface ResumenRentabilidad {
  abiertos: Pedido[];
  evaluados: PedidoEvaluado[];
  afectados: PedidoEvaluado[];
  insumosConAlza: number;
  costoExtra: number;
  margenCotizado: number;
  margenHoy: number;
}

// ---------- Capacidad ----------

export const RECURSOS: Recurso[] = ['horno', 'decoracion', 'personal'];

export const NOMBRES_RECURSO: Record<Recurso, string> = {
  horno: 'Horno',
  decoracion: 'Decoración',
  personal: 'Personal',
};

/** Horas disponibles por día en cada recurso. */
export const CAPACIDAD_DIARIA: Uso = { horno: 8, decoracion: 6, personal: 10 };

/** Horas que gasta un pedido según su complejidad. */
export const CONSUMO_POR_COMPLEJIDAD: Record<Complejidad, Uso> = {
  Baja: { horno: 1, decoracion: 1, personal: 2 },
  Media: { horno: 2, decoracion: 2, personal: 3 },
  Alta: { horno: 3, decoracion: 4, personal: 4 },
};

export const COMPLEJIDADES: Complejidad[] = ['Baja', 'Media', 'Alta'];

export const ESTADOS: EstadoPedido[] = [
  'Pendiente de aprobación',
  'En producción',
  'Listo para entrega',
  'Entregado',
  'Cancelado',
];

// ---------- Insumos y recetas ----------

export const INSUMOS_EJEMPLO: Insumo[] = [
  { id: 'harina', nombre: 'Harina', unidad: 'kg', precioCotizado: 3200, precioActual: 3456 },
  { id: 'azucar', nombre: 'Azúcar', unidad: 'kg', precioCotizado: 4200, precioActual: 4200 },
  { id: 'mantequilla', nombre: 'Mantequilla', unidad: 'kg', precioCotizado: 28000, precioActual: 32000 },
  { id: 'huevos', nombre: 'Huevos', unidad: 'unidad', precioCotizado: 480, precioActual: 480 },
  { id: 'leche', nombre: 'Leche', unidad: 'litro', precioCotizado: 3800, precioActual: 3800 },
  { id: 'chocolate', nombre: 'Chocolate', unidad: 'kg', precioCotizado: 36000, precioActual: 40500 },
  { id: 'crema', nombre: 'Crema de leche', unidad: 'litro', precioCotizado: 12000, precioActual: 12000 },
];

export const RECETAS: Record<string, Receta> = {
  tematica: {
    nombre: 'Tortas temáticas',
    tamanoBase: 20,
    manoObra: 30000,
    consumo: { harina: 0.8, azucar: 0.7, mantequilla: 0.6, huevos: 10, chocolate: 0.9, crema: 0.8 },
  },
  clasica: {
    nombre: 'Tortas clásicas',
    tamanoBase: 20,
    manoObra: 18000,
    consumo: { harina: 0.7, azucar: 0.6, mantequilla: 0.4, huevos: 8, leche: 0.5, chocolate: 0.4 },
  },
  cupcakes: {
    nombre: 'Cupcakes',
    tamanoBase: 24,
    manoObra: 14000,
    consumo: { harina: 0.6, azucar: 0.5, mantequilla: 0.5, huevos: 8, leche: 0.4, chocolate: 0.3 },
  },
  tresleches: {
    nombre: 'Tortas tres leches',
    tamanoBase: 20,
    manoObra: 25000,
    consumo: { harina: 0.5, azucar: 0.6, mantequilla: 0.2, huevos: 12, leche: 2, crema: 1 },
  },
  boda: {
    nombre: 'Tortas de boda',
    tamanoBase: 60,
    manoObra: 90000,
    consumo: { harina: 2.5, azucar: 2, mantequilla: 1.8, huevos: 30, chocolate: 1.5, crema: 2.5, leche: 1 },
  },
  postres: {
    nombre: 'Postres individuales',
    tamanoBase: 12,
    manoObra: 20000,
    consumo: { azucar: 0.5, huevos: 12, leche: 1.5, crema: 1.2 },
  },
};

/** Margen de ganancia con el que se sugiere el precio de un pedido nuevo. */
export const MARGEN_OBJETIVO = 0.4;

// ---------- Historial de meses anteriores (los 5 previos al actual) ----------
// ingresos y costos en millones de pesos; el mes actual se calcula con los pedidos.

export const HISTORIAL_EJEMPLO = [
  { ingresos: 1.3, costos: 0.8, pedidos: 11 },
  { ingresos: 1.5, costos: 0.91, pedidos: 13 },
  { ingresos: 1.4, costos: 0.86, pedidos: 12 },
  { ingresos: 1.8, costos: 1.07, pedidos: 15 },
  { ingresos: 2.0, costos: 1.18, pedidos: 16 },
];

/** Cuántas veces se usó la Captura en el período (para la conversión de la IA). */
export const INTERPRETACIONES_EJEMPLO = 14;

// ---------- Pedidos de ejemplo ----------
// "dia" es cuántos días desde hoy: -4 = hace 4 días, 0 = hoy, 3 = dentro de 3 días.
// Así la agenda siempre tiene pedidos cerca de la fecha actual.

export type PedidoSemilla = Omit<Pedido, 'fecha' | 'escala' | 'preciosCotizados'> & { dia: number };

export const PEDIDOS_EJEMPLO: PedidoSemilla[] = [
  { id: 'P-001', cliente: 'Julián Castro', producto: 'Postres individuales x12', receta: 'postres', complejidad: 'Media', dia: -8, estado: 'Entregado', precio: 96000, origen: 'Manual' },
  { id: 'P-002', cliente: 'Carolina Vega', producto: 'Cupcakes x24, chocolate', receta: 'cupcakes', complejidad: 'Media', dia: -6, estado: 'Entregado', precio: 74000, origen: 'IA' },
  { id: 'P-003', cliente: 'Esteban Cruz', producto: 'Torta temática superhéroes', receta: 'tematica', complejidad: 'Alta', dia: -4, estado: 'Entregado', precio: 148000, origen: 'IA' },
  { id: 'P-004', cliente: 'Marta Salcedo', producto: 'Torta 3 leches · 25 porciones', receta: 'tresleches', complejidad: 'Alta', dia: -2, estado: 'Entregado', precio: 120000, origen: 'Manual' },
  { id: 'P-005', cliente: 'Kevin Torres', producto: 'Postres individuales x12', receta: 'postres', complejidad: 'Media', dia: 0, estado: 'Listo para entrega', precio: 94000, origen: 'IA' },
  { id: 'P-006', cliente: 'Sofía Martínez', producto: 'Torta cumpleaños infantil', receta: 'tematica', complejidad: 'Alta', dia: 1, estado: 'En producción', precio: 152000, origen: 'Manual' },
  { id: 'P-007', cliente: 'María Gómez', producto: 'Torta 3 leches · 20 porciones', receta: 'tresleches', complejidad: 'Alta', dia: 2, estado: 'En producción', precio: 110000, origen: 'IA' },
  { id: 'P-008', cliente: 'Pedro López', producto: 'Cupcakes x24, vainilla', receta: 'cupcakes', complejidad: 'Media', dia: 2, estado: 'En producción', precio: 72000, origen: 'IA' },
  { id: 'P-009', cliente: 'Camila Ortiz', producto: 'Torta temática mariposas', receta: 'tematica', complejidad: 'Alta', dia: 3, estado: 'Pendiente de aprobación', precio: 150000, origen: 'IA' },
  { id: 'P-010', cliente: 'Laura Duarte', producto: 'Torta de boda · 3 pisos', receta: 'boda', complejidad: 'Alta', dia: 5, estado: 'Pendiente de aprobación', precio: 420000, origen: 'Manual' },
  { id: 'P-011', cliente: 'Andrés Mejía', producto: 'Postres individuales x12', receta: 'postres', complejidad: 'Baja', dia: 5, estado: 'En producción', precio: 92000, origen: 'IA' },
  { id: 'P-012', cliente: 'Ana Ramírez', producto: 'Torta temática unicornio', receta: 'tematica', complejidad: 'Alta', dia: 7, estado: 'Pendiente de aprobación', precio: 150000, origen: 'IA' },
  { id: 'P-013', cliente: 'Daniela Pérez', producto: 'Cupcakes x24, chocolate', receta: 'cupcakes', complejidad: 'Media', dia: 7, estado: 'En producción', precio: 74000, origen: 'Manual' },
  { id: 'P-014', cliente: 'Valentina Ríos', producto: 'Torta 3 leches · 30 porciones', receta: 'tresleches', complejidad: 'Alta', dia: 9, estado: 'En producción', precio: 128000, origen: 'IA' },
  { id: 'P-015', cliente: 'Lucía Fernández', producto: 'Torta temática princesa', receta: 'tematica', complejidad: 'Alta', dia: 10, estado: 'Pendiente de aprobación', precio: 155000, origen: 'Manual' },
  { id: 'P-016', cliente: 'Hugo Barrios', producto: 'Postres individuales x12', receta: 'postres', complejidad: 'Baja', dia: 10, estado: 'Pendiente de aprobación', precio: 90000, origen: 'IA' },
  { id: 'P-017', cliente: 'Mateo Herrera', producto: 'Torta de bautizo', receta: 'tematica', complejidad: 'Alta', dia: 12, estado: 'Pendiente de aprobación', precio: 148000, origen: 'Manual' },
  { id: 'P-018', cliente: 'Isabela Cano', producto: 'Postres individuales x12', receta: 'postres', complejidad: 'Media', dia: 12, estado: 'Pendiente de aprobación', precio: 96000, origen: 'IA' },
];

/** Formatea un valor como pesos colombianos: 150000 -> $150.000 */
export function pesos(valor: number): string {
  return '$' + Math.round(valor).toLocaleString('es-CO');
}
// Tipos que viajan entre Angular y la API, más las constantes que solo usa la pantalla.

export type Recurso = 'horno' | 'decoracion' | 'personal';
export type Complejidad = 'Baja' | 'Media' | 'Alta';
export type EstadoPedido =
  | 'Pendiente de aprobación'
  | 'En producción'
  | 'Listo para entrega'
  | 'Entregado'
  | 'Cancelado';
export type Origen = 'IA' | 'Manual';

export const RECURSOS: Recurso[] = ['horno', 'decoracion', 'personal'];
export const NOMBRES_RECURSO: Record<Recurso, string> = {
  horno: 'Horno',
  decoracion: 'Decoración',
  personal: 'Personal',
};
export const COMPLEJIDADES: Complejidad[] = ['Baja', 'Media', 'Alta'];
export const ESTADOS: EstadoPedido[] = [
  'Pendiente de aprobación',
  'En producción',
  'Listo para entrega',
  'Entregado',
  'Cancelado',
];

/** Formatea un valor como pesos colombianos: 150000 -> $150.000 */
export function pesos(valor: number): string {
  return '$' + Math.round(valor).toLocaleString('es-CO');
}

// ---------- Pedidos ----------
export interface Pedido {
  id: number;
  codigo: string;
  cliente: string;
  producto: string;
  receta: string;
  complejidad: Complejidad;
  fecha: Date;
  estado: EstadoPedido;
  precio: number;
  origen: Origen;
  escala: number;
}

export interface NuevoPedido {
  cliente: string;
  producto: string;
  receta: string;
  escala: number;
  complejidad: Complejidad;
  fecha: Date;
  precio?: number | null;
  solicitudId?: number | null;
}

// ---------- Insumos ----------
export interface Insumo {
  id: number;
  codigo: string;
  nombre: string;
  unidad: string;
  precioCotizado: number;
  precioActual: number | null;
}

// ---------- Agenda ----------
export interface Uso {
  horno: number;
  decoracion: number;
  personal: number;
}

export interface Dia {
  fecha: Date;
  usado: Uso;
  ocupacion: number;
  estado: 'libre' | 'medio' | 'lleno';
}

export interface Faltante {
  recurso: Recurso;
  nombre: string;
  necesita: number;
  quedan: number;
}

export interface Verificacion {
  fecha: Date;
  cabe: boolean;
  faltantes: Faltante[];
  sugerencia: Dia | null;
}

export interface Reglas {
  capacidad: Uso;
  consumo: Record<Complejidad, Uso>;
}

export interface CampoInterpretado {
  etiqueta: string;
  valor: string;
  confianza: number; // de 0 a 1
  evidencia?: string; // el pedazo del texto del que se entendió
}

/** Lo que devuelve el servicio de NLP (Python + spaCy) al interpretar lo que escribió el cliente. */
export interface Interpretacion {
  motor: string;
  campos: CampoInterpretado[];
  pedido: {
    tipo: string | null; // torta | cupcakes | postres | boda
    sabor: string | null;
    sabores: string[];
    cantidad: number | null;
    unidad: string | null;
    fecha: string | null; // "2026-10-24"
    diseno: string | null;
    disenoSencillo: boolean;
    ocasion: string | null;
    cantidadProductos: number;
  };
  complejidad: Complejidad;
  razones: string[];
  preguntas: string[]; // lo que falta para completar el pedido
  avisos: string[]; // cosas que el sistema todavía no maneja
  solicitudId: number;
}

// ---------- Captura ----------
export interface Cotizacion {
  receta: string;
  escala: number;
  costo: number;
  precio: number;
  margenObjetivo: number;
}

export interface Solicitud {
  id: number;
  texto: string;
  creadoEn: Date;
}

// ---------- Rentabilidad ----------
export interface PedidoEvaluado {
  id: number;
  codigo: string;
  cliente: string;
  producto: string;
  precio: number;
  margenCotizado: number;
  margenActual: number;
  caida: number;
  nivel: 'Alta' | 'Media' | 'Leve';
  variante: 'rose' | 'amber' | 'neutral';
  precioSugerido: number;
}

export interface MargenMes {
  mes: string;
  margen: number;
}

export interface ResumenRentabilidad {
  margenCotizado: number;
  margenHoy: number;
  insumosConAlza: number;
  costoExtra: number;
  abiertos: number;
  afectados: PedidoEvaluado[];
  meses: MargenMes[];
}

// ---------- Panel ejecutivo ----------
export interface ResumenPedidos {
  total: number;
  entregados: number;
  enCurso: number;
  cancelados: number;
  ingresos: number;
  porIa: number;
}

export interface PuntoMensual {
  mes: string;
  valor: number;
}

export interface UsoRecurso {
  recurso: Recurso;
  nombre: string;
  semanas: number[];
}

export interface Panel {
  pedidos: ResumenPedidos;
  margenCotizado: number;
  margenHoy: number;
  ingresos: PuntoMensual[];
  conversion: { interpretaciones: number; confirmadas: number; porcentaje: number };
  uso: UsoRecurso[];
  cuello: { nombre: string; detalle: string };
  productos: { nombre: string; margen: number }[];
  pedidosPorMes: PuntoMensual[];
  proyeccion: number;
}
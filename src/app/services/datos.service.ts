import { Injectable } from '@angular/core';
import {
  CAPACIDAD_DIARIA,
  CONSUMO_POR_COMPLEJIDAD,
  Dia,
  EstadoPedido,
  HISTORIAL_EJEMPLO,
  INSUMOS_EJEMPLO,
  INTERPRETACIONES_EJEMPLO,
  Insumo,
  MARGEN_OBJETIVO,
  NOMBRES_RECURSO,
  NuevoPedido,
  PEDIDOS_EJEMPLO,
  Pedido,
  PedidoEvaluado,
  RECETAS,
  RECURSOS,
  Recurso,
  ResumenRentabilidad,
  Uso,
} from '../data/datos';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Injectable({ providedIn: 'root' })
export class DatosService {
  // Copiamos los insumos para que editar un precio no toque la constante original
  insumos: Insumo[] = INSUMOS_EJEMPLO.map((i) => ({ ...i }));
  readonly pedidos: Pedido[] = this.construirPedidos();

  /** Cuántas veces se ha usado la Captura. Sube cada vez que alguien interpreta un texto. */
  interpretaciones = INTERPRETACIONES_EJEMPLO;

  // ==========================================================================
  // Pedidos
  // ==========================================================================

  /** Un pedido "abierto" todavía no se entrega ni se cancela: es el que sufre alzas de precio. */
  estaAbierto(p: Pedido): boolean {
    return p.estado !== 'Entregado' && p.estado !== 'Cancelado';
  }

  cambiarEstado(p: Pedido, estado: EstadoPedido) {
    p.estado = estado;
  }

  resumenPedidos() {
    const vigentes = this.pedidos.filter((p) => p.estado !== 'Cancelado');
    return {
      total: vigentes.length,
      entregados: vigentes.filter((p) => p.estado === 'Entregado').length,
      enCurso: vigentes.filter((p) => this.estaAbierto(p)).length,
      cancelados: this.pedidos.length - vigentes.length,
      ingresos: vigentes.reduce((suma, p) => suma + p.precio, 0),
      porIA: vigentes.filter((p) => p.origen === 'IA').length,
    };
  }

  /** La Captura avisa cada vez que interpreta un texto (alimenta la conversión de la IA). */
  registrarInterpretacion() {
    this.interpretaciones++;
  }

  /** Crea un pedido que llegó por Captura. Guarda los precios de HOY como los de su cotización. */
  crearPedido(datos: NuevoPedido): Pedido {
    const pedido: Pedido = {
      ...datos,
      id: this.siguienteId(),
      estado: 'Pendiente de aprobación', // la repostera todavía tiene que aprobarlo
      origen: 'IA',
      preciosCotizados: this.foto(this.insumos, (i) => i.precioActual ?? i.precioCotizado),
    };
    this.pedidos.push(pedido);
    return pedido;
  }

  // ---------- Del texto de Captura a una receta, un tamaño y un precio ----------

  /** Elige la receta según lo que la Captura entendió (sabor, tamaño y diseño). */
  recetaPara(sabor: string, tamano: string, diseno: string): string {
    const t = this.normalizar(`${sabor} ${tamano} ${diseno}`);
    if (t.includes('cupcake')) return 'cupcakes';
    if (t.includes('boda')) return 'boda';
    if (t.includes('tres leches') || t.includes('3 leches')) return 'tresleches';

    // Si hay un diseño y no es de los sencillos, es una torta temática (león, unicornio, bautizo...)
    const d = this.normalizar(diseno);
    const sencillos = ['flores', 'minimalista'];
    const hayDiseno = d !== '' && d !== 'no detectado';
    if (hayDiseno && !sencillos.some((x) => d.includes(x))) return 'tematica';
    return 'clasica';
  }

  /** Cuántas veces el tamaño de la receta: 40 personas en una receta de 20 = 2. */
  escalaPara(receta: string, tamano: string): number {
    const cantidad = Number(tamano.match(/\d+/)?.[0]);
    if (!cantidad) return 1; // si no se detectó el tamaño, usamos el de la receta
    return Math.min(4, Math.max(0.5, cantidad / RECETAS[receta].tamanoBase));
  }

  /** Costo con los precios de hoy y el precio sugerido para lograr el margen objetivo. */
  cotizar(receta: string, escala: number): { costo: number; precio: number } {
    const costo = this.costoReceta(receta, escala, (i) => i.precioActual ?? 0);
    const precio = Math.ceil(costo / (1 - MARGEN_OBJETIVO) / 1000) * 1000;
    return { costo, precio };
  }

  // ==========================================================================
  // Agenda: el uso de cada día SALE de los pedidos, no está escrito a mano
  // ==========================================================================

  usoDelDia(fecha: Date): Uso {
    const total: Uso = { horno: 0, decoracion: 0, personal: 0 };
    for (const p of this.pedidos) {
      if (p.estado === 'Cancelado' || p.fecha.toDateString() !== fecha.toDateString()) continue;
      const consumo = CONSUMO_POR_COMPLEJIDAD[p.complejidad];
      for (const r of RECURSOS) total[r] += consumo[r];
    }
    return total;
  }

  diasConUso(cantidad: number): Dia[] {
    return Array.from({ length: cantidad }, (_, i) => {
      const fecha = this.fechaRelativa(i);
      return { fecha, usado: this.usoDelDia(fecha) };
    });
  }

  /** Para cada recurso, el día más cargado de cada una de 4 semanas (2 pasadas, la actual y la próxima). */
  picoSemanal(): Record<Recurso, number[]> {
    const resultado: Record<Recurso, number[]> = { horno: [], decoracion: [], personal: [] };
    for (const inicio of [-14, -7, 0, 7]) {
      const picos: Uso = { horno: 0, decoracion: 0, personal: 0 };
      for (let d = inicio; d < inicio + 7; d++) {
        const uso = this.usoDelDia(this.fechaRelativa(d));
        for (const r of RECURSOS) picos[r] = Math.max(picos[r], uso[r] / CAPACIDAD_DIARIA[r]);
      }
      for (const r of RECURSOS) resultado[r].push(Math.round(picos[r] * 100));
    }
    return resultado;
  }

  /** El recurso que más veces llega al límite en los próximos 14 días. */
  cuelloDeBotella(): { nombre: string; detalle: string } {
    const dias = this.diasConUso(14);
    const analisis = RECURSOS.map((r) => ({
      recurso: r,
      enLimite: dias.filter((d) => d.usado[r] / CAPACIDAD_DIARIA[r] >= 0.9).length,
      pico: Math.max(...dias.map((d) => d.usado[r] / CAPACIDAD_DIARIA[r])),
    })).sort((a, b) => b.enLimite - a.enLimite || b.pico - a.pico);

    const peor = analisis[0];
    const nombre = NOMBRES_RECURSO[peor.recurso];
    return peor.enLimite > 0
      ? { nombre, detalle: `llega al límite en ${peor.enLimite} de los próximos 14 días.` }
      : { nombre, detalle: `es el más exigido, con un pico de ${Math.round(peor.pico * 100)}% de uso.` };
  }

  // ==========================================================================
  // Costos y rentabilidad
  // ==========================================================================

  restablecerInsumos() {
    this.insumos = INSUMOS_EJEMPLO.map((i) => ({ ...i }));
  }

  /** Costo de un pedido: con los precios de cuando SE COTIZÓ ese pedido, o con los de hoy. */
  costo(p: Pedido, base: 'cotizado' | 'actual'): number {
    return this.costoReceta(p.receta, p.escala, (i) =>
      base === 'cotizado' ? (p.preciosCotizados[i.id] ?? i.precioCotizado) : (i.precioActual ?? 0),
    );
  }

  /** Lo ya entregado se produjo con los precios de entonces; lo pendiente, con los de hoy. */
  costoReal(p: Pedido): number {
    return this.costo(p, p.estado === 'Entregado' ? 'cotizado' : 'actual');
  }

  evaluar(p: Pedido): PedidoEvaluado {
    const costoCotizado = this.costo(p, 'cotizado');
    const costoActual = this.costo(p, 'actual');
    const margenCotizado = ((p.precio - costoCotizado) / p.precio) * 100;
    const margenActual = ((p.precio - costoActual) / p.precio) * 100;
    const caida = margenCotizado - margenActual;
    const precioSugerido = Math.ceil(costoActual / (1 - margenCotizado / 100) / 100) * 100;

    let nivel: PedidoEvaluado['nivel'] = 'Leve';
    let variante: PedidoEvaluado['variante'] = 'neutral';
    if (caida >= 4) {
      nivel = 'Alta';
      variante = 'rose';
    } else if (caida >= 2) {
      nivel = 'Media';
      variante = 'amber';
    }

    return { ...p, costoCotizado, costoActual, margenCotizado, margenActual, caida, precioSugerido, nivel, variante };
  }

  resumenRentabilidad(): ResumenRentabilidad {
    const abiertos = this.pedidos.filter((p) => this.estaAbierto(p));
    const evaluados = abiertos.map((p) => this.evaluar(p));
    const afectados = evaluados
      .filter((e) => e.costoActual > e.costoCotizado)
      .sort((a, b) => b.caida - a.caida); // el más golpeado primero

    const insumosConAlza = this.insumos.filter((i) => (i.precioActual ?? 0) > i.precioCotizado).length;
    const costoExtra = afectados.reduce((suma, e) => suma + (e.costoActual - e.costoCotizado), 0);

    const ventas = abiertos.reduce((suma, p) => suma + p.precio, 0);
    const costoCot = evaluados.reduce((suma, e) => suma + e.costoCotizado, 0);
    const costoHoy = evaluados.reduce((suma, e) => suma + e.costoActual, 0);

    return {
      abiertos,
      evaluados,
      afectados,
      insumosConAlza,
      costoExtra,
      margenCotizado: ventas ? ((ventas - costoCot) / ventas) * 100 : 0,
      margenHoy: ventas ? ((ventas - costoHoy) / ventas) * 100 : 0,
    };
  }

  /** Margen de los 5 meses anteriores (historial) + el mes actual (calculado con los pedidos). */
  margenPorMes(): { mes: string; margen: number }[] {
    const etiquetas = this.etiquetasMeses();
    const historicos = HISTORIAL_EJEMPLO.map((h, i) => ({
      mes: etiquetas[i],
      margen: Math.round(((h.ingresos - h.costos) / h.ingresos) * 100),
    }));
    const vigentes = this.pedidos.filter((p) => p.estado !== 'Cancelado');
    const ventas = vigentes.reduce((suma, p) => suma + p.precio, 0);
    const costos = vigentes.reduce((suma, p) => suma + this.costoReal(p), 0);
    const actual = ventas ? Math.round(((ventas - costos) / ventas) * 100) : 0;
    return [...historicos, { mes: etiquetas[etiquetas.length - 1], margen: actual }];
  }

  /** Margen por línea de producto, con los costos reales, de mayor a menor. */
  margenPorProducto(): { nombre: string; margen: number }[] {
    const lineas = new Map<string, { ventas: number; costo: number }>();
    for (const p of this.pedidos.filter((x) => x.estado !== 'Cancelado')) {
      const acumulado = lineas.get(p.receta) ?? { ventas: 0, costo: 0 };
      acumulado.ventas += p.precio;
      acumulado.costo += this.costoReal(p);
      lineas.set(p.receta, acumulado);
    }
    return [...lineas.entries()]
      .map(([receta, a]) => ({
        nombre: RECETAS[receta].nombre,
        margen: Math.round(((a.ventas - a.costo) / a.ventas) * 100),
      }))
      .sort((a, b) => b.margen - a.margen);
  }

  // ==========================================================================
  // Series para el Panel Ejecutivo
  // ==========================================================================

  /** Ingresos en millones: 5 meses de historial + el mes actual con los pedidos del sistema. */
  serieIngresos(): { mes: string; valor: number }[] {
    const etiquetas = this.etiquetasMeses();
    const ingresosActual = this.resumenPedidos().ingresos;
    return [
      ...HISTORIAL_EJEMPLO.map((h, i) => ({ mes: etiquetas[i], valor: h.ingresos })),
      { mes: etiquetas[etiquetas.length - 1], valor: Math.round(ingresosActual / 100000) / 10 },
    ];
  }

  /** Cantidad de pedidos por mes: historial + mes actual. */
  serieConteoPedidos(): { mes: string; valor: number }[] {
    const etiquetas = this.etiquetasMeses();
    return [
      ...HISTORIAL_EJEMPLO.map((h, i) => ({ mes: etiquetas[i], valor: h.pedidos })),
      { mes: etiquetas[etiquetas.length - 1], valor: this.resumenPedidos().total },
    ];
  }

  // ==========================================================================
  // Ayudas internas
  // ==========================================================================

  /** mano de obra + (cantidad x escala x precio) de cada insumo; el precio lo elige quien llama. */
  private costoReceta(clave: string, escala: number, precioDe: (insumo: Insumo) => number): number {
    const receta = RECETAS[clave];
    let total = receta.manoObra;
    for (const [id, cantidad] of Object.entries(receta.consumo)) {
      const insumo = this.insumos.find((i) => i.id === id);
      if (insumo) total += cantidad * escala * precioDe(insumo);
    }
    return total;
  }

  /** Una "foto" de precios: { harina: 3200, azucar: 4200, ... } */
  private foto(lista: Insumo[], precio: (insumo: Insumo) => number): Record<string, number> {
    const resultado: Record<string, number> = {};
    for (const insumo of lista) resultado[insumo.id] = precio(insumo);
    return resultado;
  }

  private construirPedidos(): Pedido[] {
    // Los pedidos de ejemplo se cotizaron todos con la lista de precios base
    const base = this.foto(INSUMOS_EJEMPLO, (i) => i.precioCotizado);
    return PEDIDOS_EJEMPLO.map(({ dia, ...resto }) => ({
      ...resto,
      escala: 1,
      preciosCotizados: { ...base },
      fecha: this.fechaRelativa(dia),
    }));
  }

  private siguienteId(): string {
    const mayor = Math.max(0, ...this.pedidos.map((p) => Number(p.id.replace(/\D/g, ''))));
    return 'P-' + String(mayor + 1).padStart(3, '0');
  }

  private fechaRelativa(dias: number): Date {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias);
  }

  /** Etiquetas de 6 meses terminando en el mes actual, ej: May Jun Jul Ago Sep Oct. */
  private etiquetasMeses(): string[] {
    const mesActual = new Date().getMonth();
    return Array.from({ length: 6 }, (_, i) => MESES[(mesActual - 5 + i + 12) % 12]);
  }

  // Minúsculas y sin tildes, para comparar texto
  private normalizar(texto: string): string {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
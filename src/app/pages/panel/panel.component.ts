import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ApiService } from '../../api/api.service';
import { Panel, PuntoMensual, UsoRecurso, pesos } from '../../api/modelos';
import { LocucionService } from '../../services/locucion.service';

interface Kpi {
  label: string;
  valor: string;
  detalle: string;
}

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.scss',
})
export class PanelComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly locucion = inject(LocucionService);

  // ---------- Resumen hablado ----------
  readonly vozDisponible = this.locucion.soportado;
  hablando = false;
  avisoVoz = '';
  private datos: Panel | null = null; // lo último que mandó el servidor, para armar el resumen

  // ---------- Indicadores principales ----------
  kpis: Kpi[] = [];

  // ---------- Tendencia de ingresos (millones de pesos) ----------
  ingresos: PuntoMensual[] = [];
  readonly graficaAncho = 560;
  readonly graficaAlto = 200;
  private readonly margen = 28;
  puntos: { x: number; y: number; mes: string; valor: number }[] = [];
  linea = '';
  area = '';

  // ---------- Conversión de la captura con IA ----------
  interpretaciones = 0;
  confirmadas = 0;
  conversion = 0;
  readonly circunferencia = 2 * Math.PI * 54;
  dash = `0 ${this.circunferencia}`;

  // ---------- Uso de capacidad por recurso (sale de la Agenda) ----------
  readonly etiquetasSemana = ['S−2', 'S−1', 'Esta', 'Próx.'];
  recursos: UsoRecurso[] = [];
  cuello = { nombre: '', detalle: '' };

  // ---------- Productos más rentables (salen de Rentabilidad) ----------
  productos: { nombre: string; margen: number }[] = [];

  // ---------- Proyección de demanda ----------
  historialPedidos: PuntoMensual[] = [];
  proyeccion = 0;
  maxPedidos = 1;

  async ngOnInit() {
    try {
      this.armar(await this.api.panel());
    } catch {
      // sin conexión: la app ya muestra el aviso
    }
  }

  ngOnDestroy() {
    this.locucion.detener(); // si se cambia de pantalla, se calla
  }

  claseUso(porcentaje: number): string {
    if (porcentaje >= 90) return 'alto';
    if (porcentaje >= 75) return 'medio';
    return 'bajo';
  }

  // ==========================================================================
  // Resumen hablado: NO se muestra como texto, solo se escucha.
  // ==========================================================================

  /** Botón del resumen: si está hablando lo detiene; si no, lo lee. */
  escucharResumen() {
    if (this.hablando) {
      this.locucion.detener();
      this.hablando = false;
      return;
    }
    if (!this.datos) return;

    this.avisoVoz = '';
    this.hablando = true;
    this.locucion.hablar(
      this.construirResumen(this.datos),
      () => (this.hablando = false),
      (mensaje) => (this.avisoVoz = mensaje),
    );
  }

  /** Arma las frases a partir de lo que ya muestra el Panel. Una frase = una pausa natural. */
  private construirResumen(p: Panel): string[] {
    const frases: string[] = [];

    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
    frases.push(`${saludo}. Este es el resumen de tu negocio.`);

    // Pedidos e ingresos
    const { enCurso, entregados, ingresos } = p.pedidos;
    frases.push(
      `Tienes ${enCurso} ${enCurso === 1 ? 'pedido en curso' : 'pedidos en curso'} ` +
        `y ${entregados} ${entregados === 1 ? 'entregado' : 'entregados'}.`,
    );
    frases.push(`Los ingresos esperados son de ${this.dineroHablado(ingresos)}.`);

    // Capacidad: el recurso más cargado de ESTA semana (índice 2 de etiquetasSemana)
    const estaSemana = p.uso.map((r) => ({ nombre: r.nombre.toLowerCase(), valor: r.semanas[2] ?? 0 }));
    if (estaSemana.length) {
      const mayor = estaSemana.reduce((a, b) => (b.valor > a.valor ? b : a));
      if (mayor.valor >= 90) {
        frases.push(`Atención. Esta semana el recurso más cargado es ${mayor.nombre}, al ${mayor.valor} por ciento. Está en su límite.`);
      } else if (mayor.valor >= 75) {
        frases.push(`Esta semana el recurso más cargado es ${mayor.nombre}, al ${mayor.valor} por ciento.`);
      } else {
        frases.push(`La capacidad de esta semana está holgada. Lo más cargado es ${mayor.nombre}, al ${mayor.valor} por ciento.`);
      }
    }

    // Conversión de la captura con IA
    const c = p.conversion;
    if (c.interpretaciones > 0) {
      frases.push(
        `De ${c.interpretaciones} pedidos interpretados por la captura inteligente, ` +
          `se confirmaron ${c.confirmadas}, el ${c.porcentaje} por ciento.`,
      );
    }

    // Proyección
    frases.push(`Si el ritmo se mantiene, el próximo mes entrarían ${p.proyeccion} pedidos.`);

    return frases;
  }

  /** 2389000 -> "2,4 millones de pesos". Así la voz lo lee natural, no dígito por dígito. */
  private dineroHablado(valor: number): string {
    if (valor >= 1_000_000) {
      const millones = Math.round(valor / 100_000) / 10;
      return `${String(millones).replace('.', ',')} ${millones === 1 ? 'millón' : 'millones'} de pesos`;
    }
    if (valor >= 1_000) return `${Math.round(valor / 1_000)} mil pesos`;
    return `${Math.round(valor)} pesos`;
  }

  /** Convierte lo que mandó el servidor en lo que las gráficas necesitan. */
  private armar(p: Panel) {
    this.datos = p;

    this.kpis = [
      {
        label: 'Ingresos esperados',
        valor: pesos(p.pedidos.ingresos),
        detalle: `${p.pedidos.entregados} entregados · ${p.pedidos.enCurso} en curso`,
      },
      {
        label: 'Pedidos',
        valor: String(p.pedidos.total),
        detalle: p.pedidos.cancelados ? `${p.pedidos.cancelados} cancelados aparte` : 'Ninguno cancelado',
      },
      {
        label: 'Margen de lo pendiente',
        valor: `${Math.round(p.margenHoy)}%`,
        detalle: `Era ${Math.round(p.margenCotizado)}% al cotizar`,
      },
      {
        label: 'Pedidos por IA',
        valor: `${p.pedidos.porIa} de ${p.pedidos.total}`,
        detalle: 'Entraron por Captura',
      },
    ];

    this.ingresos = p.ingresos;
    this.puntos = this.calcularPuntos();
    this.linea = this.puntos.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
    const base = this.graficaAlto - this.margen;
    this.area = this.puntos.length
      ? `${this.linea} L ${this.puntos[this.puntos.length - 1].x} ${base} L ${this.puntos[0].x} ${base} Z`
      : '';

    this.interpretaciones = p.conversion.interpretaciones;
    this.confirmadas = p.conversion.confirmadas;
    this.conversion = p.conversion.porcentaje;
    this.dash = `${(this.conversion / 100) * this.circunferencia} ${this.circunferencia}`;

    this.recursos = p.uso;
    this.cuello = p.cuello;
    this.productos = p.productos;

    this.historialPedidos = p.pedidosPorMes;
    this.proyeccion = p.proyeccion;
    this.maxPedidos = Math.max(...this.historialPedidos.map((x) => x.valor), this.proyeccion, 1);
  }

  private calcularPuntos() {
    if (this.ingresos.length < 2) return [];
    const max = Math.max(...this.ingresos.map((i) => i.valor));
    const paso = (this.graficaAncho - this.margen * 2) / (this.ingresos.length - 1);
    return this.ingresos.map((item, i) => ({
      x: this.margen + i * paso,
      y: this.graficaAlto - this.margen - (item.valor / max) * (this.graficaAlto - this.margen * 2),
      mes: item.mes,
      valor: item.valor,
    }));
  }
}

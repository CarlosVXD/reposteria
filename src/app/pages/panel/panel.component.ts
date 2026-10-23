import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DatosService } from '../../services/datos.service';
import { NOMBRES_RECURSO, RECURSOS, pesos } from '../../data/datos';

interface PuntoMensual {
  mes: string;
  valor: number;
}

interface UsoRecurso {
  nombre: string;
  semanas: number[]; // % de uso del día más cargado de cada semana
}

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.scss',
})
export class PanelComponent {
  // Primero el servicio: todos los campos de abajo le piden datos
  private readonly datos = inject(DatosService);

  // ---------- Indicadores principales ----------
  readonly kpis = this.calcularKpis();

  // ---------- Tendencia de ingresos (millones de pesos) ----------
  readonly ingresos: PuntoMensual[] = this.datos.serieIngresos();

  readonly graficaAncho = 560;
  readonly graficaAlto = 200;
  private readonly margen = 28;

  readonly puntos = this.calcularPuntos();
  readonly linea = this.puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  readonly area = `${this.linea} L ${this.puntos[this.puntos.length - 1].x} ${this.graficaAlto - this.margen} L ${this.puntos[0].x} ${this.graficaAlto - this.margen} Z`;

  // ---------- Conversión de la captura con IA ----------
  readonly interpretaciones = this.datos.interpretaciones;
  readonly confirmadas = this.datos.resumenPedidos().porIA;
  readonly conversion = this.interpretaciones
    ? Math.min(100, Math.round((this.confirmadas / this.interpretaciones) * 100))
    : 0;
  readonly circunferencia = 2 * Math.PI * 54;
  readonly dash = `${(this.conversion / 100) * this.circunferencia} ${this.circunferencia}`;

  // ---------- Uso de capacidad por recurso (sale de la Agenda) ----------
  readonly etiquetasSemana = ['S−2', 'S−1', 'Esta', 'Próx.'];
  readonly recursos: UsoRecurso[] = this.calcularRecursos();
  readonly cuello = this.datos.cuelloDeBotella();

  // ---------- Productos más rentables (salen de Rentabilidad) ----------
  readonly productos = this.datos.margenPorProducto();

  // ---------- Proyección de demanda ----------
  readonly historialPedidos: PuntoMensual[] = this.datos.serieConteoPedidos();
  readonly proyeccion = this.calcularProyeccion();
  readonly maxPedidos = Math.max(...this.historialPedidos.map((p) => p.valor), this.proyeccion);

  // ---------- Métodos ----------
  claseUso(porcentaje: number): string {
    if (porcentaje >= 90) return 'alto';
    if (porcentaje >= 75) return 'medio';
    return 'bajo';
  }

  private calcularKpis() {
    const pedidos = this.datos.resumenPedidos();
    const rentabilidad = this.datos.resumenRentabilidad();
    return [
      {
        label: 'Ingresos esperados',
        valor: pesos(pedidos.ingresos),
        detalle: `${pedidos.entregados} entregados · ${pedidos.enCurso} en curso`,
      },
      {
        label: 'Pedidos',
        valor: String(pedidos.total),
        detalle: pedidos.cancelados ? `${pedidos.cancelados} cancelados aparte` : 'Ninguno cancelado',
      },
      {
        label: 'Margen de lo pendiente',
        valor: `${Math.round(rentabilidad.margenHoy)}%`,
        detalle: `Era ${Math.round(rentabilidad.margenCotizado)}% al cotizar`,
      },
      {
        label: 'Pedidos por IA',
        valor: `${pedidos.porIA} de ${pedidos.total}`,
        detalle: 'Entraron por Captura',
      },
    ];
  }

  private calcularPuntos() {
    const max = Math.max(...this.ingresos.map((i) => i.valor));
    const paso = (this.graficaAncho - this.margen * 2) / (this.ingresos.length - 1);
    return this.ingresos.map((item, i) => ({
      x: this.margen + i * paso,
      y: this.graficaAlto - this.margen - (item.valor / max) * (this.graficaAlto - this.margen * 2),
      mes: item.mes,
      valor: item.valor,
    }));
  }

  private calcularRecursos(): UsoRecurso[] {
    const semanal = this.datos.picoSemanal();
    return RECURSOS.map((r) => ({ nombre: NOMBRES_RECURSO[r], semanas: semanal[r] }));
  }

  private calcularProyeccion(): number {
    const valores = this.historialPedidos.map((p) => p.valor);
    const ultimos = valores.slice(-4); // 4 valores dan 3 cambios
    let suma = 0;
    for (let i = 1; i < ultimos.length; i++) {
      suma += ultimos[i] - ultimos[i - 1];
    }
    return Math.round(valores[valores.length - 1] + suma / (ultimos.length - 1));
  }
}
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DatosService } from '../../services/datos.service';
import { Insumo, Pedido, PedidoEvaluado, pesos } from '../../data/datos';

@Component({
  selector: 'app-rentabilidad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rentabilidad.component.html',
  styleUrl: './rentabilidad.component.scss',
})
export class RentabilidadComponent {
  private readonly datos = inject(DatosService);

  readonly escalaMax = 60; // el 60% de margen llena la barra
  readonly pesos = pesos;

  // Resultados que calcula recalcular()
  meses: { mes: string; margen: number }[] = [];
  pedidos: Pedido[] = []; // los pedidos abiertos (aún sin entregar)
  evaluados: PedidoEvaluado[] = [];
  afectados: PedidoEvaluado[] = [];
  insumosConAlza = 0;
  costoExtra = 0;
  margenCotizado = 0;
  margenHoy = 0;

  constructor() {
    this.recalcular();
  }

  // Los insumos viven en el servicio: si cambias un precio aquí, el Panel también lo ve
  get insumos(): Insumo[] {
    return this.datos.insumos;
  }

  // ---------- Acciones de la pantalla ----------
  cambiarPrecio(insumo: Insumo, valor: number | null) {
    insumo.precioActual = valor;
    this.recalcular();
  }

  restablecer() {
    this.datos.restablecerInsumos();
    this.recalcular();
  }

  // ---------- Pedimos las cuentas al servicio ----------
  private recalcular() {
    const r = this.datos.resumenRentabilidad();
    this.pedidos = r.abiertos;
    this.evaluados = r.evaluados;
    this.afectados = r.afectados;
    this.insumosConAlza = r.insumosConAlza;
    this.costoExtra = r.costoExtra;
    this.margenCotizado = r.margenCotizado;
    this.margenHoy = r.margenHoy;
    this.meses = this.datos.margenPorMes(); // la barra del mes actual también depende de los precios
  }

  // ---------- Ayudas para pintar ----------
  variacion(i: Insumo): number {
    return (((i.precioActual ?? 0) - i.precioCotizado) / i.precioCotizado) * 100;
  }

  etiquetaVariacion(i: Insumo): string {
    const v = this.variacion(i);
    if (v === 0) return 'Sin cambio';
    return `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(1).replace('.', ',')}%`;
  }

  claseVariacion(i: Insumo): 'rose' | 'green' | 'neutral' {
    const v = this.variacion(i);
    if (v > 0) return 'rose';
    if (v < 0) return 'green';
    return 'neutral';
  }

  alto(margen: number): number {
    return Math.max(0, Math.min(100, (margen / this.escalaMax) * 100));
  }
}
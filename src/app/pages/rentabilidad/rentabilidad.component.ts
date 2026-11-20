import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../api/api.service';
import { Insumo, MargenMes, PedidoEvaluado, pesos } from '../../api/modelos';

@Component({
  selector: 'app-rentabilidad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rentabilidad.component.html',
  styleUrl: './rentabilidad.component.scss',
})
export class RentabilidadComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);

  readonly escalaMax = 60; // el 60% de margen llena la barra
  readonly pesos = pesos;

  insumos: Insumo[] = [];
  meses: MargenMes[] = [];
  afectados: PedidoEvaluado[] = [];
  abiertos = 0; // pedidos todavía sin entregar
  insumosConAlza = 0;
  costoExtra = 0;
  margenCotizado = 0;
  margenHoy = 0;

  // Al escribir un precio no se llama al servidor en cada tecla: se espera a que la persona pare
  private readonly esperas = new Map<number, ReturnType<typeof setTimeout>>();

  async ngOnInit() {
    try {
      const [insumos] = await Promise.all([this.api.insumos(), this.refrescar()]);
      this.insumos = insumos;
    } catch {
      // sin conexión: la app ya muestra el aviso
    }
  }

  ngOnDestroy() {
    this.esperas.forEach((espera) => clearTimeout(espera));
  }

  // ---------- Acciones de la pantalla ----------
  cambiarPrecio(insumo: Insumo, valor: number | null) {
    insumo.precioActual = valor;
    clearTimeout(this.esperas.get(insumo.id));
    this.esperas.set(insumo.id, setTimeout(() => this.guardar(insumo), 400));
  }

  async restablecer() {
    try {
      this.insumos = await this.api.restablecerInsumos();
      await this.refrescar();
    } catch {
      // sin conexión
    }
  }

  /** Guarda el precio en el servidor y vuelve a pedir las alertas, que dependen de él. */
  private async guardar(insumo: Insumo) {
    try {
      await this.api.cambiarPrecio(insumo.id, insumo.precioActual);
      await this.refrescar();
    } catch {
      // si falló, el valor en pantalla queda distinto al del servidor hasta la próxima carga
    }
  }

  private async refrescar() {
    const r = await this.api.rentabilidad();
    this.meses = r.meses;
    this.afectados = r.afectados;
    this.abiertos = r.abiertos;
    this.insumosConAlza = r.insumosConAlza;
    this.costoExtra = r.costoExtra;
    this.margenCotizado = r.margenCotizado;
    this.margenHoy = r.margenHoy;
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
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { DatosService } from '../../services/datos.service';
import { ESTADOS, EstadoPedido, Pedido, pesos } from '../../data/datos';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pedidos.component.html',
  styleUrl: './pedidos.component.scss',
})
export class PedidosComponent {
  private readonly datos = inject(DatosService);

  readonly estados = ESTADOS;
  readonly pesos = pesos;

  busqueda = '';
  filtroEstado: EstadoPedido | 'Todos' = 'Todos';
  visibles: Pedido[] = [];
  enCurso = 0;

  constructor() {
    this.actualizar();
  }

  // ---------- Acciones de la pantalla ----------
  actualizar() {
    const texto = this.normalizar(this.busqueda);
    this.visibles = this.datos.pedidos
      .filter((p) => this.filtroEstado === 'Todos' || p.estado === this.filtroEstado)
      .filter((p) => !texto || this.normalizar(`${p.cliente} ${p.producto}`).includes(texto))
      .sort((a, b) => this.grupo(a) - this.grupo(b) || a.fecha.getTime() - b.fecha.getTime());
    this.enCurso = this.datos.pedidos.filter((p) => this.datos.estaAbierto(p)).length;
  }

  cambiarEstado(pedido: Pedido, estado: EstadoPedido) {
    this.datos.cambiarEstado(pedido, estado);
    this.actualizar();
  }

  // ---------- Ayudas para pintar ----------
  variante(estado: EstadoPedido): 'green' | 'amber' | 'rose' | 'neutral' {
    switch (estado) {
      case 'Pendiente de aprobación':
        return 'rose';
      case 'En producción':
        return 'amber';
      case 'Listo para entrega':
        return 'green';
      default:
        return 'neutral';
    }
  }

  fechaCorta(fecha: Date): string {
    const texto = fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
    return texto.replace(/[.,]/g, '');
  }

  relativo(fecha: Date): string {
    const dias = Math.round((this.inicioDelDia(fecha).getTime() - this.inicioDelDia(new Date()).getTime()) / 86400000);
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Mañana';
    if (dias === -1) return 'Ayer';
    return dias > 0 ? `En ${dias} días` : `Hace ${-dias} días`;
  }

  // Abiertos primero, luego entregados, al final cancelados
  private grupo(p: Pedido): number {
    if (p.estado === 'Cancelado') return 2;
    if (p.estado === 'Entregado') return 1;
    return 0;
  }

  private inicioDelDia(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  }

  // Minúsculas y sin tildes, para que "maria" encuentre "María"
  private normalizar(texto: string): string {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
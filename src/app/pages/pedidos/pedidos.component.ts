import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../api/api.service';
import { ESTADOS, EstadoPedido, Pedido, pesos } from '../../api/modelos';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pedidos.component.html',
  styleUrl: './pedidos.component.scss',
})
export class PedidosComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly estados = ESTADOS;
  readonly pesos = pesos;

  cargando = true;
  todos: Pedido[] = []; // lo que mandó el servidor
  visibles: Pedido[] = []; // lo que se ve después de buscar y filtrar
  busqueda = '';
  filtroEstado: EstadoPedido | 'Todos' = 'Todos';
  enCurso = 0;

  async ngOnInit() {
    try {
      this.todos = await this.api.pedidos();
    } catch {
      // si el servidor no responde, el aviso de "sin conexión" ya lo muestra la app
    } finally {
      this.cargando = false;
      this.actualizar();
    }
  }

  // ---------- Acciones de la pantalla ----------
  actualizar() {
    const texto = this.normalizar(this.busqueda);
    this.visibles = this.todos
      .filter((p) => this.filtroEstado === 'Todos' || p.estado === this.filtroEstado)
      .filter((p) => !texto || this.normalizar(`${p.cliente} ${p.producto}`).includes(texto))
      .sort((a, b) => this.grupo(a) - this.grupo(b) || a.fecha.getTime() - b.fecha.getTime());
    this.enCurso = this.todos.filter((p) => this.grupo(p) === 0).length;
  }

  async cambiarEstado(pedido: Pedido, estado: EstadoPedido) {
    const anterior = pedido.estado;
    pedido.estado = estado; // se ve al instante...
    this.actualizar();
    try {
      const guardado = await this.api.cambiarEstado(pedido.id, estado); // ...y se confirma con el servidor
      pedido.estado = guardado.estado;
    } catch {
      pedido.estado = anterior; // si falló, vuelve a como estaba
    }
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

  // Abiertos (0) primero, luego entregados (1), al final cancelados (2)
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
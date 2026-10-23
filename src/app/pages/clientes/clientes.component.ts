import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Cliente {
  nombre: string;
  telefono: string;
  pedidos: number;
  ultimoPedido: string;
  iniciales: string;
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss',
})
export class ClientesComponent {
  readonly clientes: Cliente[] = [
    { nombre: 'María Gómez', telefono: '300 512 4487', pedidos: 6, ultimoPedido: 'Hace 3 días', iniciales: 'MG' },
    { nombre: 'Pedro López', telefono: '311 908 2210', pedidos: 2, ultimoPedido: 'Hace 1 semana', iniciales: 'PL' },
    { nombre: 'Ana Ramírez', telefono: '320 774 1156', pedidos: 4, ultimoPedido: 'Hace 2 días', iniciales: 'AR' },
    { nombre: 'Julián Castro', telefono: '317 663 9902', pedidos: 1, ultimoPedido: 'Hace 1 mes', iniciales: 'JC' },
    { nombre: 'Laura Duarte', telefono: '304 221 5567', pedidos: 9, ultimoPedido: 'Hoy', iniciales: 'LD' },
    { nombre: 'Kevin Torres', telefono: '350 118 3345', pedidos: 3, ultimoPedido: 'Hace 5 días', iniciales: 'KT' },
  ];
}

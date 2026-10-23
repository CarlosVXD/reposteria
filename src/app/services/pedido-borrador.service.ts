import { Injectable } from '@angular/core';

export type Complejidad = 'Baja' | 'Media' | 'Alta';

export interface PedidoBorrador {
  cliente: string; 
  texto: string;
  sabor: string;
  tamano: string;
  diseno: string;
  fecha: Date | null; // null si no se pudo detectar la fecha
  fechaTexto: string;
  complejidad: Complejidad;
}

@Injectable({ providedIn: 'root' })
export class PedidoBorradorService {
  borrador: PedidoBorrador | null = null;

  guardar(pedido: PedidoBorrador) {
    this.borrador = pedido;
  }

  limpiar() {
    this.borrador = null;
  }
}
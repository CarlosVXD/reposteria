import { Injectable } from '@angular/core';

import { Complejidad } from '../api/modelos';

export interface PedidoBorrador {
  cliente: string;
  texto: string;
  sabor: string;
  tamano: string;
  diseno: string;
  fecha: Date | null; // null si no se pudo detectar la fecha
  fechaTexto: string;
  complejidad: Complejidad;
  solicitudId: number | null; // la interpretación registrada en el servidor
  tipo: string | null; // torta | cupcakes | postres | boda, según el NLP
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
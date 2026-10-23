import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Complejidad, PedidoBorrador, PedidoBorradorService } from '../../services/pedido-borrador.service';
import { DatosService } from '../../services/datos.service';
import {
  CAPACIDAD_DIARIA,
  COMPLEJIDADES,
  CONSUMO_POR_COMPLEJIDAD,
  Dia,
  MARGEN_OBJETIVO,
  NOMBRES_RECURSO,
  Pedido,
  RECURSOS,
  Recurso,
  pesos,
} from '../../data/datos';

interface Faltante {
  nombre: string;
  necesita: number;
  quedan: number;
}

interface Verificacion {
  cabe: boolean;
  faltantes: Faltante[];
}

interface Resultado {
  fecha: Date;
  verificacion: Verificacion;
  sugerencia: Dia | null;
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss',
})
export class AgendaComponent implements OnInit {
  // El orden importa: estas dos primero, porque los campos de abajo las usan
  private readonly datos = inject(DatosService);
  private readonly servicio = inject(PedidoBorradorService);

  // Capacidad y consumo vienen de los datos compartidos
  readonly recursos = RECURSOS;
  readonly nombres = NOMBRES_RECURSO;
  readonly capacidad = CAPACIDAD_DIARIA;
  readonly consumo = CONSUMO_POR_COMPLEJIDAD;
  readonly complejidades = COMPLEJIDADES;
  readonly pesos = pesos;
  readonly margenObjetivo = Math.round(MARGEN_OBJETIVO * 100);

  // Ya no es readonly: al confirmar un pedido se vuelve a calcular con el pedido nuevo adentro
  dias: Dia[] = this.datos.diasConUso(14);

  // Arranca en el primer día lleno que haya, para que la demo muestre el conflicto
  indiceSeleccionado = Math.max(0, this.dias.findIndex((d) => this.estado(d) === 'lleno'));
  complejidad: Complejidad = 'Alta';
  resultado: Resultado | null = null;
  pedido: PedidoBorrador | null = null;
  avisoFecha = '';

  // Lo que sale de interpretar el pedido de Captura
  receta = 'clasica';
  escala = 1;
  precioSugerido = 0;
  confirmado: Pedido | null = null;

  get diaActual(): Dia {
    return this.dias[this.indiceSeleccionado];
  }

  ngOnInit() {
    const borrador = this.servicio.borrador;
    if (!borrador) return;

    this.servicio.limpiar(); // el pedido se recoge una vez, como una nota que se lee y se tira
    this.pedido = borrador;
    this.complejidad = borrador.complejidad;

    // Con lo que entendió la Captura: qué receta es, de qué tamaño y cuánto costaría
    this.receta = this.datos.recetaPara(borrador.sabor, borrador.tamano, borrador.diseno);
    this.escala = this.datos.escalaPara(this.receta, borrador.tamano);
    this.precioSugerido = this.datos.cotizar(this.receta, this.escala).precio;

    const fecha = borrador.fecha;
    if (!fecha) {
      this.avisoFecha = 'No pudimos detectar la fecha en el texto. Elige un día en el calendario.';
      return;
    }

    const indice = this.dias.findIndex((d) => this.mismoDia(d.fecha, fecha));
    if (indice === -1) {
      this.avisoFecha = 'La fecha pedida queda fuera de los próximos 14 días de la agenda.';
      return;
    }

    this.indiceSeleccionado = indice;
    this.comprobar(); // verifica solo, sin que nadie toque un botón
  }

  descartarPedido() {
    this.pedido = null;
    this.avisoFecha = '';
    this.resultado = null;
    this.confirmado = null;
  }

  /** Crea el pedido de verdad: desde aquí aparece en Pedidos, ocupa la agenda y cuenta en el Panel. */
  confirmar() {
    if (!this.pedido) return;

    this.confirmado = this.datos.crearPedido({
      cliente: this.pedido.cliente,
      producto: this.nombreProducto(this.pedido),
      receta: this.receta,
      escala: this.escala,
      complejidad: this.complejidad,
      fecha: this.diaActual.fecha,
      precio: this.precioSugerido,
    });

    this.pedido = null;
    this.resultado = null;
    this.avisoFecha = '';
    this.dias = this.datos.diasConUso(14); // el calendario ahora incluye el pedido nuevo
  }

  // ---------- Acciones de la pantalla ----------
  seleccionar(indice: number) {
    this.indiceSeleccionado = indice;
    this.resultado = null;
  }

  cambiarComplejidad(valor: Complejidad) {
    this.complejidad = valor;
    this.resultado = null;
  }

  comprobar() {
    const verificacion = this.verificar(this.diaActual, this.complejidad);
    this.resultado = {
      fecha: this.diaActual.fecha,
      verificacion,
      sugerencia: verificacion.cabe
        ? null
        : this.buscarSugerencia(this.indiceSeleccionado, this.complejidad),
    };
  }

  usarSugerencia(dia: Dia) {
    this.indiceSeleccionado = this.dias.indexOf(dia);
    this.comprobar();
  }

  // ---------- El corazón: verificar y sugerir ----------
  private verificar(dia: Dia, complejidad: Complejidad): Verificacion {
    const faltantes: Faltante[] = [];
    for (const r of this.recursos) {
      const necesita = this.consumo[complejidad][r];
      const quedan = this.capacidad[r] - dia.usado[r];
      if (necesita > quedan) {
        faltantes.push({ nombre: this.nombres[r], necesita, quedan });
      }
    }
    return { cabe: faltantes.length === 0, faltantes };
  }

  private buscarSugerencia(desde: number, complejidad: Complejidad): Dia | null {
    for (let paso = 1; paso < this.dias.length; paso++) {
      const candidatos = [desde + paso, desde - paso]; // primero el posterior, luego el anterior
      for (const i of candidatos) {
        const existe = i >= 0 && i < this.dias.length;
        if (existe && this.verificar(this.dias[i], complejidad).cabe) {
          return this.dias[i];
        }
      }
    }
    return null;
  }

  // ---------- Ayudas para pintar ----------
  ocupacion(dia: Dia): number {
    const ratios = this.recursos.map((r) => dia.usado[r] / this.capacidad[r]);
    return Math.round(Math.max(...ratios) * 100);
  }

  estado(dia: Dia): 'libre' | 'medio' | 'lleno' {
    const o = this.ocupacion(dia);
    if (o >= 90) return 'lleno';
    if (o >= 70) return 'medio';
    return 'libre';
  }

  porcentaje(r: Recurso): number {
    return Math.round((this.diaActual.usado[r] / this.capacidad[r]) * 100);
  }

  alcanza(r: Recurso): boolean {
    return this.capacidad[r] - this.diaActual.usado[r] >= this.consumo[this.complejidad][r];
  }

  diaCorto(fecha: Date): string {
    const texto = fecha.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '');
    return this.capitalizar(texto);
  }

  fechaLarga(fecha: Date): string {
    const texto = fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    return this.capitalizar(texto);
  }

  // "Chocolate · 20 personas · Unicornio": lo que la Captura entendió, sin lo que no detectó
  private nombreProducto(p: PedidoBorrador): string {
    const partes = [p.sabor, p.tamano, p.diseno].filter((v) => v && v !== 'No detectado');
    return partes.length ? partes.join(' · ') : 'Pedido personalizado';
  }

  private mismoDia(a: Date, b: Date): boolean {
    return a.toDateString() === b.toDateString();
  }

  private capitalizar(texto: string): string {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
}
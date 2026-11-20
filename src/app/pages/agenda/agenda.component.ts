import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiError, ApiService } from '../../api/api.service';
import {
  COMPLEJIDADES,
  Complejidad,
  Dia,
  Faltante,
  NOMBRES_RECURSO,
  Pedido,
  RECURSOS,
  Recurso,
  Uso,
  pesos,
} from '../../api/modelos';
import { PedidoBorrador, PedidoBorradorService } from '../../services/pedido-borrador.service';

interface Resultado {
  fecha: Date;
  verificacion: { cabe: boolean; faltantes: Faltante[] };
  sugerencia: Dia | null;
}

const SIN_USO: Uso = { horno: 0, decoracion: 0, personal: 0 };

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss',
})
export class AgendaComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly servicio = inject(PedidoBorradorService);

  readonly recursos = RECURSOS;
  readonly nombres = NOMBRES_RECURSO;
  readonly complejidades = COMPLEJIDADES;
  readonly pesos = pesos;

  // Las reglas (horas por día y horas por complejidad) llegan del servidor
  capacidad: Uso = SIN_USO;
  consumo: Record<Complejidad, Uso> = { Baja: SIN_USO, Media: SIN_USO, Alta: SIN_USO };
  margenObjetivo = 40;

  cargando = true;
  dias: Dia[] = [];
  indiceSeleccionado = 0;
  complejidad: Complejidad = 'Alta';
  resultado: Resultado | null = null;
  pedido: PedidoBorrador | null = null;
  avisoFecha = '';
  enviando = false;

  // Lo que sale de interpretar el pedido de Captura
  receta = 'clasica';
  escala = 1;
  precioSugerido = 0;
  confirmado: Pedido | null = null;

  /** Mientras llegan los datos, el día "actual" es uno vacío para que la pantalla no falle. */
  private readonly diaVacio: Dia = { fecha: new Date(), usado: SIN_USO, ocupacion: 0, estado: 'libre' };

  get diaActual(): Dia {
    return this.dias[this.indiceSeleccionado] ?? this.diaVacio;
  }

  async ngOnInit() {
    try {
      const [dias, reglas] = await Promise.all([this.api.dias(), this.api.reglas()]);
      this.dias = dias;
      this.capacidad = reglas.capacidad;
      this.consumo = reglas.consumo;
      // Arranca en el primer día lleno que haya, para que la demo muestre el conflicto
      this.indiceSeleccionado = Math.max(0, dias.findIndex((d) => d.estado === 'lleno'));
    } catch {
      return; // sin conexión: la app ya muestra el aviso
    } finally {
      this.cargando = false;
    }

    await this.recibirPedidoDeCaptura();
  }

  /** Si venimos de Captura, calcula el precio y verifica la capacidad sin que nadie toque un botón. */
  private async recibirPedidoDeCaptura() {
    const borrador = this.servicio.borrador;
    if (!borrador) return;

    this.servicio.limpiar(); // el pedido se recoge una vez, como una nota que se lee y se tira
    this.pedido = borrador;
    this.complejidad = borrador.complejidad;

    try {
      const cotizacion = await this.api.cotizar(borrador.sabor, borrador.tamano, borrador.diseno, borrador.tipo);
      this.receta = cotizacion.receta;
      this.escala = cotizacion.escala;
      this.precioSugerido = cotizacion.precio;
      this.margenObjetivo = Math.round(cotizacion.margenObjetivo * 100);
    } catch (e) {
      this.avisoFecha = this.mensaje(e, 'No pudimos calcular el precio sugerido.');
      return;
    }

    const fecha = borrador.fecha;
    if (!fecha) {
      this.avisoFecha = 'No pudimos detectar la fecha en el texto. Elige un día en el calendario.';
      return;
    }

    const indice = this.indiceDe(fecha);
    if (indice === -1) {
      this.avisoFecha = 'La fecha pedida queda fuera de los próximos 14 días de la agenda.';
      return;
    }

    this.indiceSeleccionado = indice;
    await this.comprobar();
  }

  descartarPedido() {
    this.pedido = null;
    this.avisoFecha = '';
    this.resultado = null;
    this.confirmado = null;
  }

  /** Crea el pedido de verdad: desde aquí aparece en Pedidos, ocupa la agenda y cuenta en el Panel. */
  async confirmar() {
    if (!this.pedido || this.enviando) return;
    this.enviando = true;
    try {
      this.confirmado = await this.api.crearPedido({
        cliente: this.pedido.cliente,
        producto: this.nombreProducto(this.pedido),
        receta: this.receta,
        escala: this.escala,
        complejidad: this.complejidad,
        fecha: this.diaActual.fecha,
        solicitudId: this.pedido.solicitudId,
      });
      this.pedido = null;
      this.resultado = null;
      this.avisoFecha = '';
      this.dias = await this.api.dias(); // el calendario ahora incluye el pedido nuevo
    } catch (e) {
      if (e instanceof ApiError && e.estado === 409) {
        // Mientras confirmabas, alguien más ocupó ese cupo: se refresca y se vuelve a verificar
        this.avisoFecha = 'Ese día se acaba de llenar. Revisa la fecha sugerida.';
        this.dias = await this.api.dias();
        await this.comprobar();
      } else {
        this.avisoFecha = this.mensaje(e, 'No se pudo confirmar el pedido.');
      }
    } finally {
      this.enviando = false;
    }
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

  /** Le pregunta al servidor si cabe el pedido ese día y, si no, qué recurso falla y qué fecha sugiere. */
  async comprobar() {
    try {
      const v = await this.api.verificar(this.diaActual.fecha, this.complejidad);
      this.resultado = {
        fecha: v.fecha,
        verificacion: { cabe: v.cabe, faltantes: v.faltantes },
        sugerencia: v.sugerencia,
      };
    } catch (e) {
      this.resultado = null;
      this.avisoFecha = this.mensaje(e, 'No se pudo verificar la capacidad.');
    }
  }

  async usarSugerencia(dia: Dia) {
    const indice = this.indiceDe(dia.fecha);
    if (indice === -1) return;
    this.indiceSeleccionado = indice;
    await this.comprobar();
  }

  // ---------- Ayudas para pintar ----------
  ocupacion(dia: Dia): number {
    return dia.ocupacion;
  }

  estado(dia: Dia): 'libre' | 'medio' | 'lleno' {
    return dia.estado;
  }

  porcentaje(r: Recurso): number {
    const total = this.capacidad[r];
    return total ? Math.round((this.diaActual.usado[r] / total) * 100) : 0;
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

  private indiceDe(fecha: Date): number {
    return this.dias.findIndex((d) => d.fecha.toDateString() === fecha.toDateString());
  }

  private mensaje(e: unknown, porDefecto: string): string {
    return e instanceof ApiError && e.estado !== 0 ? e.message : porDefecto;
  }

  private capitalizar(texto: string): string {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
}
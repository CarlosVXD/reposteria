import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';

import { API_URL } from './config';
import {
  Complejidad,
  Cotizacion,
  Dia,
  EstadoPedido,
  Insumo,
  Interpretacion,
  NuevoPedido,
  Panel,
  Pedido,
  Reglas,
  ResumenRentabilidad,
  Solicitud,
  Verificacion,
} from './modelos';

/** Un error que devolvió la API (400, 404, 409...) o la falta de conexión (estado 0). */
export class ApiError extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
    readonly detalle?: unknown,
  ) {
    super(mensaje);
  }
}

/** Todo lo que Angular le pide al servidor. Las fechas viajan como "2026-10-26T00:00:00" (hora local). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /** true si la última llamada no pudo comunicarse con el servidor. La pantalla muestra un aviso. */
  readonly sinConexion = signal(false);

  // ---------- Pedidos ----------
  async pedidos(estado?: string, busqueda?: string): Promise<Pedido[]> {
    const parametros = [estado ? `estado=${encodeURIComponent(estado)}` : '', busqueda ? `q=${encodeURIComponent(busqueda)}` : '']
      .filter(Boolean)
      .join('&');
    const lista = await this.pedir(this.http.get<any[]>(`${API_URL}/pedidos${parametros ? '?' + parametros : ''}`));
    return lista.map((p) => this.aPedido(p));
  }

  async crearPedido(nuevo: NuevoPedido): Promise<Pedido> {
    const cuerpo = { ...nuevo, fecha: this.fechaLocal(nuevo.fecha) };
    return this.aPedido(await this.pedir(this.http.post<any>(`${API_URL}/pedidos`, cuerpo)));
  }

  async cambiarEstado(id: number, estado: EstadoPedido): Promise<Pedido> {
    return this.aPedido(await this.pedir(this.http.patch<any>(`${API_URL}/pedidos/${id}/estado`, { estado })));
  }

  // ---------- Insumos ----------
  insumos(): Promise<Insumo[]> {
    return this.pedir(this.http.get<Insumo[]>(`${API_URL}/insumos`));
  }

  cambiarPrecio(id: number, precioActual: number | null): Promise<Insumo> {
    return this.pedir(this.http.put<Insumo>(`${API_URL}/insumos/${id}/precio`, { precioActual }));
  }

  restablecerInsumos(): Promise<Insumo[]> {
    return this.pedir(this.http.post<Insumo[]>(`${API_URL}/insumos/restablecer`, {}));
  }

  // ---------- Agenda ----------
  async dias(cantidad = 14): Promise<Dia[]> {
    const lista = await this.pedir(this.http.get<any[]>(`${API_URL}/agenda/dias?cantidad=${cantidad}`));
    return lista.map((d) => this.aDia(d));
  }

  reglas(): Promise<Reglas> {
    return this.pedir(this.http.get<Reglas>(`${API_URL}/agenda/reglas`));
  }

  async verificar(fecha: Date, complejidad: Complejidad): Promise<Verificacion> {
    const r = await this.pedir(
      this.http.post<any>(`${API_URL}/agenda/verificar`, { fecha: this.fechaLocal(fecha), complejidad }),
    );
    return { ...r, fecha: new Date(r.fecha), sugerencia: r.sugerencia ? this.aDia(r.sugerencia) : null };
  }

  // ---------- Captura ----------
  interpretar(texto: string): Promise<Interpretacion> {
    return this.pedir(this.http.post<Interpretacion>(`${API_URL}/captura/interpretar`, { texto }));
  }

  cotizar(sabor: string, tamano: string, diseno: string, tipo?: string | null): Promise<Cotizacion> {
    return this.pedir(this.http.post<Cotizacion>(`${API_URL}/captura/cotizar`, { sabor, tamano, diseno, tipo }));
  }

  async registrarSolicitud(texto: string, resultadoJson?: string): Promise<Solicitud> {
    const s = await this.pedir(this.http.post<any>(`${API_URL}/captura/solicitudes`, { texto, resultadoJson }));
    return { ...s, creadoEn: new Date(s.creadoEn) };
  }

  // ---------- Análisis ----------
  rentabilidad(): Promise<ResumenRentabilidad> {
    return this.pedir(this.http.get<ResumenRentabilidad>(`${API_URL}/rentabilidad`));
  }

  panel(): Promise<Panel> {
    return this.pedir(this.http.get<Panel>(`${API_URL}/panel`));
  }

  // ---------- Ayudas internas ----------

  /** Hace la llamada y convierte los errores de HTTP en ApiError con el mensaje que mandó el servidor. */
  private async pedir<T>(llamada: Observable<T>): Promise<T> {
    try {
      const respuesta = await firstValueFrom(llamada);
      this.sinConexion.set(false);
      return respuesta;
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        if (e.status === 0) {
          this.sinConexion.set(true);
          throw new ApiError(0, 'No hay conexión con el servidor.');
        }
        throw new ApiError(e.status, e.error?.error ?? e.message, e.error?.detalle);
      }
      throw e;
    }
  }

  private aPedido(p: any): Pedido {
    return { ...p, fecha: new Date(p.fecha) };
  }

  private aDia(d: any): Dia {
    return { ...d, fecha: new Date(d.fecha) };
  }

  /** "2026-10-26T00:00:00": la fecha tal como se ve en pantalla. toISOString() la pasaría a UTC y podría correrla un día. */
  private fechaLocal(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}T00:00:00`;
  }
}
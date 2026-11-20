import { Injectable, NgZone, inject } from '@angular/core';

/**
 * Dictado por voz con la Web Speech API del navegador (gratis, sin claves).
 * Funciona en Chrome y Edge. Brave suele bloquearlo (error "network").
 *
 * Solo entrega TEXTO. Quien lo interprete (reglas actuales o spaCy) no cambia nada.
 */

// Errores típicos del reconocedor de voz del navegador (ver r.onerror) y qué mostrarle al usuario
const MENSAJES_ERROR: Record<string, string> = {
  'not-allowed': 'El navegador no tiene permiso para usar el micrófono. Actívalo en el candado de la barra de direcciones.',
  'service-not-allowed': 'Este navegador no permite el dictado por voz. Prueba en Chrome o Edge.',
  'audio-capture': 'No se encontró ningún micrófono.',
  'no-speech': 'No se escuchó nada. Intenta de nuevo, más cerca del micrófono.',
  network: 'No se pudo conectar con el servicio de voz. Revisa tu internet; en Brave suele estar bloqueado, prueba en Chrome o Edge.',
};

// Cómo suele escribir el reconocedor algunas palabras del negocio.
// Es una limpieza ligera; cuando spaCy tenga su lexicón se puede borrar.
const CORRECCIONES: [RegExp, string][] = [
  [/\b(?:cup|cap|kap)\s*(?:cakes?|keis|queques?)\b/gi, 'cupcakes'],
  [/\btres leche\b/gi, 'tres leches'],
];

export interface OpcionesDictado {
  /** Se llama mientras la persona habla, con TODO lo dictado hasta ese momento. */
  alTexto: (dictado: string) => void;
  /** Se llama cuando el micrófono se apaga (por el botón o por silencio). */
  alTerminar: () => void;
  /** Se llama con un mensaje legible si algo falla. */
  alError: (mensaje: string) => void;
}

@Injectable({ providedIn: 'root' })
export class DictadoService {
  private readonly zona = inject(NgZone);
  private reconocedor: any = null;

  private get constructorVoz(): (new () => any) | null {
    const w = window as any;
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  }

  get soportado(): boolean {
    return this.constructorVoz !== null;
  }

  iniciar(opciones: OpcionesDictado): void {
    const Voz = this.constructorVoz;
    if (!Voz) {
      opciones.alError(MENSAJES_ERROR['service-not-allowed']);
      opciones.alTerminar();
      return;
    }
    this.detener();

    const r = new Voz();
    r.lang = 'es-CO';
    r.continuous = true; // no se corta a la primera pausa
    r.interimResults = true; // muestra el texto mientras se habla
    r.maxAlternatives = 1;

    r.onresult = (e: any) => {
      let finales = '';
      let parcial = '';
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finales += res[0].transcript;
        else parcial += res[0].transcript;
      }
      // El reconocedor corre fuera de Angular: hay que volver a su zona para que la pantalla se actualice
      this.zona.run(() => opciones.alTexto(this.limpiar(`${finales} ${parcial}`)));
    };

    r.onerror = (e: any) => {
      this.zona.run(() => opciones.alError(MENSAJES_ERROR[e.error] ?? 'No se pudo usar el dictado por voz.'));
    };

    r.onend = () => {
      this.reconocedor = null;
      this.zona.run(() => opciones.alTerminar());
    };

    this.reconocedor = r;
    try {
      r.start();
    } catch {
      this.reconocedor = null;
      opciones.alTerminar();
    }
  }

  detener(): void {
    try {
      this.reconocedor?.stop();
    } catch {
      // ya estaba detenido
    }
  }

  private limpiar(texto: string): string {
    let s = texto.replace(/\s+/g, ' ').trim();
    for (const [patron, reemplazo] of CORRECCIONES) s = s.replace(patron, reemplazo);
    return s;
  }
}

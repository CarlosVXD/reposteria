import { Injectable, NgZone, inject } from '@angular/core';

/**
 * Lee frases en voz alta con la síntesis de voz del navegador (speechSynthesis).
 * Gratis, sin claves y sin internet en la mayoría de equipos.
 * Es el "contrario" de DictadoService: aquel convierte voz en texto; este, texto en voz.
 */

// Orden de preferencia de la voz: Colombia, México, EE. UU., Latinoamérica y, al final, cualquier español
const PREFERENCIA_VOZ = ['es-co', 'es-mx', 'es-us', 'es-419', 'es'];

@Injectable({ providedIn: 'root' })
export class LocucionService {
  private readonly zona = inject(NgZone);

  // Cada vez que se habla o se detiene, el número sube. Así los avisos tardíos de una
  // lectura anterior (por ejemplo, el "cancelado" al detenerla) no afectan a la nueva.
  private sesion = 0;

  get soportado(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  /**
   * Lee las frases una tras otra. Se leen por separado porque Chrome corta los textos largos
   * y porque así la voz hace pausas naturales entre frase y frase.
   */
  hablar(frases: string[], alTerminar: () => void, alError?: (mensaje: string) => void): void {
    if (!this.soportado || !frases.length) {
      alTerminar();
      return;
    }

    const sintesis = window.speechSynthesis;
    sintesis.cancel();
    const miSesion = ++this.sesion;

    const voces = sintesis.getVoices();
    const voz = this.elegirVoz(voces);

    // Hay voces instaladas pero ninguna en español: leería con acento extranjero
    if (voces.length > 0 && !voz) {
      alError?.('Este equipo no tiene una voz en español instalada. Agrégala en la configuración de voz del sistema.');
      alTerminar();
      return;
    }

    const terminar = () => {
      if (miSesion !== this.sesion) return; // ya hay otra lectura (o se detuvo)
      this.zona.run(alTerminar);
    };

    frases.forEach((frase, i) => {
      const u = new SpeechSynthesisUtterance(frase);
      u.lang = voz?.lang ?? 'es-CO';
      if (voz) u.voice = voz;
      u.rate = 1;
      u.pitch = 1;
      u.onerror = terminar;
      if (i === frases.length - 1) u.onend = terminar;
      sintesis.speak(u);
    });
  }

  detener(): void {
    if (!this.soportado) return;
    this.sesion++; // invalida los avisos pendientes de la lectura actual
    window.speechSynthesis.cancel();
  }

  private elegirVoz(voces: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    for (const prefijo of PREFERENCIA_VOZ) {
      const hallada = voces.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(prefijo));
      if (hallada) return hallada;
    }
    return null;
  }
}

import { DatosService } from '../../services/datos.service';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Complejidad, PedidoBorradorService } from '../../services/pedido-borrador.service';
interface CampoDetectado {
  etiqueta: string;
  valor: string;
  confianza: number; // de 0 a 1
}

@Component({
  selector: 'app-captura',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './captura.component.html',
  styleUrl: './captura.component.scss',
})
export class CapturaComponent {
  texto = '';
  campos: CampoDetectado[] = [];
  interpretado = false;
  private readonly router = inject(Router);
  private readonly servicio = inject(PedidoBorradorService);
  private textoInterpretado = '';
  cliente = '';
  private readonly datos = inject(DatosService);

  readonly ejemplos = [
    'Hola! Para el sábado quiero una torta de chocolate para 20 personas, temática unicornio',
    'Necesito 24 cupcakes de vainilla para el 15 de octubre, decoración de flores',
    'Una torta de tres leches para 30 invitados, el viernes, estilo minimalista',
  ];

  private readonly sabores = ['chocolate', 'vainilla', 'fresa', 'tres leches', '3 leches', 'red velvet', 'zanahoria', 'limon', 'arequipe', 'cafe'];
  private readonly dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  private readonly disenos = ['unicornio', 'princesa', 'superheroes', 'spiderman', 'mario', 'flores', 'minimalista', 'boda', 'bautizo'];
  usarEjemplo(ejemplo: string) {
    this.texto = ejemplo;
    this.interpretar();
  }

  interpretar() {
    const t = this.normalizar(this.texto);
    this.campos = [
      this.detectarSabor(t, this.texto),
      this.detectarTamano(t),
      this.detectarFecha(t, this.texto),
      this.detectarDiseno(t, this.texto),
    ];
    this.interpretado = true;
    this.textoInterpretado = this.texto;
    this.datos.registrarInterpretacion();
  }

  variante(confianza: number): string {
    if (confianza >= 0.85) return 'green';
    if (confianza >= 0.6) return 'amber';
    return 'rose';
  }

  continuar() {
    const t = this.normalizar(this.textoInterpretado);
    const valor = (etiqueta: string) =>
      this.campos.find((c) => c.etiqueta === etiqueta)?.valor ?? '';

    this.servicio.guardar({
      cliente: this.cliente.trim(),
      texto: this.textoInterpretado,
      sabor: valor('Sabor'),
      tamano: valor('Tamaño'),
      diseno: valor('Diseño'),
      fecha: this.resolverFecha(t),
      fechaTexto: valor('Fecha de entrega'),
      complejidad: this.calcularComplejidad(t, valor('Diseño')),
    });

    this.router.navigate(['/agenda']);
  }

  private resolverFecha(t: string): Date | null {
    const hoy = new Date();
    const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    // Caso 1: fecha explícita, como "15 de octubre"
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const explicita = t.match(/(\d{1,2})\s*de\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/);
    if (explicita) {
      const mes = meses.indexOf(explicita[2]);
      const dia = Number(explicita[1]);
      let fecha = new Date(base.getFullYear(), mes, dia);
      if (fecha < base) fecha = new Date(base.getFullYear() + 1, mes, dia); // si ya pasó, es del año siguiente
      return fecha;
    }

    // Caso 2: día de la semana, como "sábado" -> el próximo que llegue
    const i = this.dias.findIndex((d) => t.includes(d));
    if (i >= 0) {
      const objetivo = (i + 1) % 7; // nuestra lista empieza en lunes; getDay() empieza en domingo (0)
      let faltan = (objetivo - base.getDay() + 7) % 7;
      if (faltan === 0) faltan = 7; // si hoy es ese día, se entiende el de la otra semana
      return new Date(base.getFullYear(), base.getMonth(), base.getDate() + faltan);
    }

    return null;
  }

  private calcularComplejidad(t: string, diseno: string): Complejidad {
    const d = this.normalizar(diseno);
    const sencillos = ['flores', 'minimalista'];
    let puntos = 0;

    // Un diseño sencillo suma poco; cualquier otro (unicornio, león...) es un diseño temático
    if (d !== 'no detectado') puntos += sencillos.some((x) => d.includes(x)) ? 1 : 3;

    const cantidad = t.match(/(\d+)\s*(personas?|porciones?|invitados?|comensales?|cupcakes?)/);
    if (cantidad && Number(cantidad[1]) >= 24) puntos += 1;

    if (puntos >= 3) return 'Alta';
    if (puntos === 2) return 'Media';
    return 'Baja';
  }

  private normalizar(texto: string): string {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private detectarSabor(t: string, original: string): CampoDetectado {
    const hallado = this.sabores.find((s) => t.includes(s));
    if (!hallado) return { etiqueta: 'Sabor', valor: 'No detectado', confianza: 0 };
    const inicio = t.indexOf(hallado);
    return { etiqueta: 'Sabor', valor: this.delOriginal(t, original, inicio, inicio + hallado.length), confianza: 0.95 };
  }

  private detectarTamano(t: string): CampoDetectado {
    // "personas?" acepta singular y plural: "4 persona", "4 personas"
    const personas = t.match(/(\d+)\s*(personas?|porciones?|invitados?|comensales?)/);
    if (personas) {
      const unidad = personas[1] === '1' ? 'persona' : 'personas';
      return { etiqueta: 'Tamaño', valor: `${personas[1]} ${unidad}`, confianza: 0.92 };
    }
    const cupcakes = t.match(/(\d+)\s*cupcakes?/);
    if (cupcakes) return { etiqueta: 'Tamaño', valor: `${cupcakes[1]} cupcakes`, confianza: 0.92 };
    return { etiqueta: 'Tamaño', valor: 'No detectado', confianza: 0 };
  }

  private detectarFecha(t: string, original: string): CampoDetectado {
    const explicita = t.match(/(\d{1,2})\s*de\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/);
    if (explicita) return { etiqueta: 'Fecha de entrega', valor: `${explicita[1]} de ${explicita[2]}`, confianza: 0.95 };

    const dia = this.dias.find((d) => t.includes(d));
    if (dia) {
      const inicio = t.indexOf(dia);
      const escrito = this.delOriginal(t, original, inicio, inicio + dia.length); // "Sábado", con tilde
      return { etiqueta: 'Fecha de entrega', valor: `${escrito} (próximo)`, confianza: 0.74 };
    }
    return { etiqueta: 'Fecha de entrega', valor: 'No detectada', confianza: 0 };
  }

  private detectarDiseno(t: string, original: string): CampoDetectado {
    // 1) Una frase de tema: "temática de león", "tema de dinosaurios", "decorada con mariposas".
    //    La bandera "d" hace que el resultado traiga las posiciones exactas de lo capturado.
    const frase = /(?:tematica|tema|decorad[oa]|decoracion|estilo)\s+(?:de\s+(?:los|las|la|el)\s+|de\s+|del\s+|con\s+|tipo\s+)?(?!para\b|con\b)([a-z ]{3,30}?)(?=\s*[,.;]|\s+para\s|\s+con\s|$)/d.exec(t);
    if (frase?.indices) {
      const grupo = frase?.indices?.[1];
      if (grupo) {
        const [inicio, fin] = grupo;
        const conocido = this.disenos.some((d) => t.slice(inicio, fin).includes(d));
        return { etiqueta: 'Diseño', valor: this.delOriginal(t, original, inicio, fin), confianza: conocido ? 0.88 : 0.7 };
      }
    }

      // 2) Sin frase de tema, buscamos un diseño conocido suelto: "torta de unicornio"
      const suelto = this.disenos.find((d) => t.includes(d));
      if (suelto) {
        const inicio = t.indexOf(suelto);
        return { etiqueta: 'Diseño', valor: this.delOriginal(t, original, inicio, inicio + suelto.length), confianza: 0.88 };
      }

      return { etiqueta: 'Diseño', valor: 'No detectado', confianza: 0 };
    }

  /** Lo que el usuario escribió (con tildes y ñ) en la posición donde se encontró algo en el texto sin tildes. */
  private delOriginal(t: string, original: string, inicio: number, fin: number): string {
    // Solo sirve si ambos textos miden lo mismo; si no, usamos la versión sin tildes
    const fuente = original.length === t.length ? original : t;
    return this.capitalizar(fuente.slice(inicio, fin).trim().toLowerCase());
  }

  private capitalizar(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

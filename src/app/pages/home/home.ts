import { AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, signal, viewChild, viewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { ThemeSwitcher } from '@components/layout/theme-switcher/theme-switcher';
import type { EvaluacionResponse } from '@features/evaluaciones/models';
import { ETIQUETA_ESTADO_CURSADA, calcularPromedio, detalleEstadoCursada, type EstadoCursada } from '@features/evaluaciones/promedio';

type Punto = [number, number];
type EstadoControl = 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADA' | 'PENDIENTE';

interface Dibujo {
  nombre: 'tilde' | 'libro' | 'reloj';
  limpio: Punto[];
  mano: Punto[];
  c: Punto;
  inicio: number;
  chico: string;
  titulo: string;
}

interface Tarea {
  titulo: string;
  materia: string;
  dias: number;
  hecha: boolean;
}

interface DiaCalendario {
  numero: number;
  controles: EstadoControl[];
  tarea: boolean;
  evaluacion: boolean;
}

// cuántos controles tiene cada día de lunes a viernes (como en "Tu semana")
const CONTROLES_POR_DIA = [2, 1, 1, 2, 0];
// lo que se fue marcando, en orden, hasta hoy
const MARCAS: EstadoControl[] = ['PRESENTE', 'PRESENTE', 'PRESENTE', 'PRESENTE', 'PRESENTE', 'AUSENTE', 'PRESENTE', 'PRESENTE',
  'JUSTIFICADA', 'PRESENTE', 'PRESENTE', 'AUSENTE', 'PRESENTE', 'PRESENTE', 'PRESENTE', 'PRESENTE'];
const HOY_CALENDARIO = 12;

function armarCalendario(): DiaCalendario[] {
  const dias: DiaCalendario[] = [];
  let k = 0;
  for (let semana = 0; semana < 4; semana++) {
    for (let d = 0; d < 5; d++) {
      const i = dias.length;
      const controles: EstadoControl[] = [];
      for (let c = 0; c < CONTROLES_POR_DIA[d]; c++) {
        controles.push(i <= HOY_CALENDARIO ? MARCAS[k++] : 'PENDIENTE');
      }
      dias.push({ numero: 2 + semana * 7 + d, controles, tarea: i === 8 || i === 15, evaluacion: i === 10 || i === 17 });
    }
  }
  return dias;
}

const TAM = 540;
const N = 36;
const SEP = 15;
const MARGEN = 7.5;
const CELDA = 6;
const MAPA = N * CELDA;
const LOOP = 12;
const GESTO = 4;
const PUNTOS = 120;

function aRgb(valor: string): number[] | null {
  const v = valor.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
  const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

const cl = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (t: number, a: number, b: number) => cl((t - a) / (b - a));
const eo = (x: number) => 1 - Math.pow(1 - x, 5);
const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

function repartir(pts: Punto[], n: number): Punto[] {
  const largos = [0];
  for (let i = 1; i < pts.length; i++) {
    largos.push(largos[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = largos[largos.length - 1];
  const out: Punto[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const d = (total * i) / (n - 1);
    while (j < largos.length - 2 && largos[j + 1] < d) j++;
    const u = (d - largos[j]) / (largos[j + 1] - largos[j] || 1);
    out.push([lerp(pts[j][0], pts[j + 1][0], u), lerp(pts[j][1], pts[j + 1][1], u)]);
  }
  return out;
}

function aMano(p: Punto[], semilla: number): Punto[] {
  return p.map((q, i) => {
    const a = p[Math.max(0, i - 1)];
    const b = p[Math.min(p.length - 1, i + 1)];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    const u = i / (p.length - 1);
    const w = 22 * (Math.sin(u * 9.1 + semilla) * 0.7 + Math.sin(u * 17.3 + semilla * 2) * 0.3) *
      (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 1.15)));
    return [q[0] - (ty / l) * w + Math.sin(u * 5 + semilla) * 8, q[1] + (tx / l) * w];
  });
}

function armarDibujo(nombre: Dibujo['nombre'], camino: Punto[], semilla: number, inicio: number, chico: string, titulo: string): Dibujo {
  const limpio = repartir(camino, PUNTOS);
  let x = 0;
  let y = 0;
  limpio.forEach((q) => { x += q[0]; y += q[1]; });
  const c: Punto = nombre === 'reloj' ? [270, 275] : [x / limpio.length, y / limpio.length];
  return { nombre, limpio, mano: aMano(limpio, semilla), c, inicio, chico, titulo };
}

const reloj: Punto[] = [];
for (let a = 0; a <= 1.0001; a += 1 / 90) {
  reloj.push([270 + 125 * Math.sin(a * Math.PI * 2), 275 - 125 * Math.cos(a * Math.PI * 2)]);
}
const DIBUJOS: Dibujo[] = [
  armarDibujo('tilde', [[160, 280], [235, 355], [385, 190]], 2.7, 0, 'ASISTENCIA', 'Presente, bloque 1'),
  armarDibujo('libro', [[270, 400], [270, 178], [245, 166], [195, 160], [140, 170], [140, 384], [195, 376], [245, 382], [270, 400],
    [295, 382], [345, 376], [400, 384], [400, 170], [345, 160], [295, 166], [270, 178]], 1.3, 4, 'APUNTES', 'Guardado en Análisis Matemático I'),
  armarDibujo('reloj', reloj, 4.1, 8, 'TAREAS', 'Entrega del TP 2: 14 de noviembre'),
];

@Component({
  selector: 'app-home',
  imports: [RouterLink, ThemeSwitcher],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  private lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private cuadro = viewChild.required<ElementRef<HTMLElement>>('cuadro');
  private dedo = viewChild.required<ElementRef<HTMLElement>>('dedo');
  private etiquetas = viewChildren<ElementRef<HTMLElement>>('etiqueta');
  private pasos = viewChildren<ElementRef<HTMLElement>>('paso');
  private pista = viewChild.required<ElementRef<HTMLElement>>('pista');

  dibujos = DIBUJOS;
  hoy = new Date();
  reducir = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
  calendario = armarCalendario();
  hoyCalendario = HOY_CALENDARIO;
  mesCalendario = this.hoy.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  diasVisibles = signal(0);
  suave: Record<EstadoControl, string> = {
    PRESENTE: 'var(--attendance-present-soft)',
    AUSENTE: 'var(--attendance-absent-soft)',
    JUSTIFICADA: 'var(--attendance-justified-soft)',
    PENDIENTE: 'var(--surface-2)',
  };
  icono: Record<EstadoControl, string> = { PRESENTE: 'check_circle', AUSENTE: 'cancel', JUSTIFICADA: 'verified', PENDIENTE: '' };
  tinta: Record<EstadoControl, string> = {
    PRESENTE: 'text-[var(--attendance-present-ink)]',
    AUSENTE: 'text-[var(--attendance-absent-ink)]',
    JUSTIFICADA: 'text-[var(--attendance-justified-ink)]',
    PENDIENTE: '',
  };
  resumenCalendario = computed(() => {
    const marcados: EstadoControl[] = [];
    this.calendario.forEach((dia, i) => {
      this.estadosDia(dia, i).forEach((e) => {
        if (e !== 'PENDIENTE') marcados.push(e);
      });
    });
    const presentes = marcados.filter((e) => e === 'PRESENTE').length;
    return {
      marcados: marcados.length,
      presentes,
      ausentes: marcados.filter((e) => e === 'AUSENTE').length,
      justificadas: marcados.filter((e) => e === 'JUSTIFICADA').length,
      porcentaje: marcados.length === 0 ? 0 : Math.round((presentes / marcados.length) * 100),
    };
  });

  dias = [
    { dia: 'Lunes', clases: [{ materia: 'Análisis Matemático I', hora: '18:00 a 22:00', controles: 2 }] },
    { dia: 'Martes', clases: [{ materia: 'Álgebra y Geometría Analítica', hora: '18:00 a 21:00', controles: 1 }] },
    { dia: 'Miércoles', clases: [{ materia: 'Sistemas y Organizaciones', hora: '19:00 a 22:00', controles: 1 }] },
    { dia: 'Jueves', clases: [{ materia: 'Análisis Matemático I', hora: '18:00 a 22:00', controles: 2 }] },
    { dia: 'Viernes', clases: [] as { materia: string; hora: string; controles: number }[] },
  ];
  hoyIndice = (this.hoy.getDay() + 6) % 7;

  opciones: { estado: EstadoControl; letra: string; texto: string; color: string }[] = [
    { estado: 'PRESENTE', letra: 'P', texto: 'Presente', color: 'var(--accent)' },
    { estado: 'AUSENTE', letra: 'A', texto: 'Ausente', color: 'var(--absent)' },
    { estado: 'JUSTIFICADA', letra: 'J', texto: 'Justificada', color: 'var(--justified)' },
  ];
  textoEstado: Record<EstadoControl, string> = { PRESENTE: 'Presente', AUSENTE: 'Ausente', JUSTIFICADA: 'Justificada', PENDIENTE: 'Pendiente' };
  controlesHoy = signal<{ hora: string; numero: number; estado: EstadoControl }[]>([
    { hora: '18:00 a 20:00', numero: 1, estado: 'PRESENTE' },
    { hora: '20:00 a 22:00', numero: 2, estado: 'PENDIENTE' },
  ]);

  materias = ['Análisis Matemático I', 'Álgebra y Geometría Analítica', 'Sistemas y Organizaciones'];
  tareas = signal<Tarea[]>([
    { titulo: 'Guía de ejercicios 1', materia: 'Álgebra y Geometría Analítica', dias: -1, hecha: false },
    { titulo: 'TP 2: Límites', materia: 'Análisis Matemático I', dias: 2, hecha: false },
    { titulo: 'Ejercicios de matrices', materia: 'Álgebra y Geometría Analítica', dias: 4, hecha: false },
    { titulo: 'Repasar derivadas', materia: 'Análisis Matemático I', dias: 9, hecha: false },
    { titulo: 'Leer el caso de estudio', materia: 'Sistemas y Organizaciones', dias: 6, hecha: true },
  ]);
  seleccionadas = signal<string[]>([]);

  palabras = 'La derivada mide cómo cambia una función cuando cambia x. La regla de la cadena sirve para funciones compuestas.'.split(' ');
  claves = ['derivada', 'cambia', 'cadena', 'compuestas.'];
  palabrasEncendidas = signal(0);

  preguntas = [
    { pregunta: '¿Qué mide la derivada de una función?', respuesta: 'Cuánto cambia la función cuando cambia x, en un punto.' },
    { pregunta: '¿Para qué sirve la regla de la cadena?', respuesta: 'Para derivar funciones compuestas, como sen(x²).' },
  ];
  preguntaAbierta = signal<number | null>(0);

  evaluaciones = signal<EvaluacionResponse[]>([
    { id: 1, nombre: 'Parcial 1', fecha: '2026-09-22', calificacion: 8, materiaId: 1 },
    { id: 2, nombre: 'TP integrador', fecha: '2026-10-20', calificacion: 9, materiaId: 1 },
    { id: 3, nombre: 'Parcial 2', fecha: '2026-11-24', calificacion: null, materiaId: 1 },
  ]);
  notasDePrueba: (number | null)[] = [null, 4, 7, 9.5];
  resumenEvaluaciones = computed(() => calcularPromedio(this.evaluaciones()));
  detalleEvaluaciones = computed(() => detalleEstadoCursada(this.resumenEvaluaciones()));
  etiquetaEstado = ETIQUETA_ESTADO_CURSADA;
  colorEstado: Record<EstadoCursada, string> = {
    PROMOCIONADO: 'bg-[var(--accent)] text-[var(--on-accent)]',
    REGULAR: 'bg-[var(--attendance-justified-soft)] text-[var(--attendance-justified-ink)]',
    DESAPROBADO: 'bg-[var(--attendance-absent-soft)] text-[var(--attendance-absent-ink)]',
    PENDIENTE: 'bg-[var(--surface-2)] text-[var(--muted)]',
  };

  private frame = 0;
  private heroVisible = true;
  private observer: IntersectionObserver | null = null;
  private lenis: Lenis | null = null;
  private tickerLenis = (t: number) => this.lenis?.raf(t * 1000);
  private contexto: gsap.Context | null = null;
  private mapa: CanvasRenderingContext2D | null = null;
  private brillo: HTMLCanvasElement | null = null;

  // colores de la pizarra, sacados del tema que eligió el usuario
  private colores = { fondo: [26, 26, 30], punto: [237, 237, 238], acento: [86, 91, 140], oscuro: true };
  private ultimaLectura = -1;

  private leerColores() {
    const estilos = getComputedStyle(document.documentElement);
    const fondo = aRgb(estilos.getPropertyValue('--theme-surface'));
    const punto = aRgb(estilos.getPropertyValue('--theme-foreground'));
    const acento = aRgb(estilos.getPropertyValue('--theme-accent'));
    if (fondo) this.colores.fondo = fondo;
    if (punto) this.colores.punto = punto;
    if (acento) this.colores.acento = acento;
    const luz = (this.colores.fondo[0] * 299 + this.colores.fondo[1] * 587 + this.colores.fondo[2] * 114) / 1000;
    this.colores.oscuro = luz < 128;
  }

  ngAfterViewInit() {
    this.prepararHero();
    if (this.reducir) {
      this.diasVisibles.set(HOY_CALENDARIO + 1);
      this.palabrasEncendidas.set(this.palabras.length);
      return;
    }
    this.prepararScroll();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    window.removeEventListener('resize', this.ajustarLienzo);
    gsap.ticker.remove(this.tickerLenis);
    this.lenis?.destroy();
    this.contexto?.revert();
  }

  private prepararHero() {
    const mapa = document.createElement('canvas');
    mapa.width = MAPA;
    mapa.height = MAPA;
    this.mapa = mapa.getContext('2d', { willReadFrequently: true });
    this.brillo = document.createElement('canvas');
    this.brillo.width = 270;
    this.brillo.height = 270;
    this.ajustarLienzo();
    window.addEventListener('resize', this.ajustarLienzo);

    if (this.reducir) {
      this.dibujarHero(2.95);
      return;
    }
    // Sin IntersectionObserver (jsdom, navegadores viejos) el hero se anima igual:
    // heroVisible arranca en true, así que sólo se saltea el observar.
    if (typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver((es) => (this.heroVisible = es[0].isIntersecting));
    this.observer.observe(this.cuadro().nativeElement);
    const inicio = performance.now();
    const cuadro = (ahora: number) => {
      if (this.heroVisible) this.dibujarHero((ahora - inicio) / 1000);
      this.frame = requestAnimationFrame(cuadro);
    };
    this.frame = requestAnimationFrame(cuadro);
  }

  private ajustarLienzo = () => {
    const lienzo = this.lienzo().nativeElement;
    const lado = Math.round(Math.min(1620, Math.max(540, lienzo.clientWidth * (window.devicePixelRatio || 1))));
    if (lienzo.width !== lado) {
      lienzo.width = lado;
      lienzo.height = lado;
    }
  };

  private trazo(o: CanvasRenderingContext2D, pts: Punto[], hasta: number, ancho: number) {
    const n = pts.length;
    const k = hasta * (n - 1);
    if (k <= 0) return;
    o.lineWidth = ancho;
    o.lineCap = 'round';
    o.lineJoin = 'round';
    o.strokeStyle = '#fff';
    o.beginPath();
    o.moveTo(pts[0][0], pts[0][1]);
    let i = 1;
    for (; i <= Math.floor(k); i++) o.lineTo(pts[i][0], pts[i][1]);
    const fr = k - Math.floor(k);
    if (fr > 0 && i < n) o.lineTo(lerp(pts[i - 1][0], pts[i][0], fr), lerp(pts[i - 1][1], pts[i][1], fr));
    o.stroke();
  }

  private dibujarHero(tiempo: number) {
    const m = this.mapa;
    const capaBrillo = this.brillo;
    const lienzo = this.lienzo().nativeElement;
    const ctx = lienzo.getContext('2d');
    const b = capaBrillo?.getContext('2d');
    if (!m || !ctx || !b || !capaBrillo) return;

    let t = tiempo % LOOP;
    if (t < 0) t += LOOP;
    const gi = Math.min(2, Math.floor(t / GESTO));
    const g = DIBUJOS[gi];
    const lt = t - g.inicio;
    const avance = eio(seg(lt, 0.3, 1.35)) * 0.6 + seg(lt, 0.3, 1.35) * 0.4;
    const ajuste = eo(seg(lt, 1.45, 2.05));
    const pts: Punto[] = g.mano.map((q, i) => [lerp(q[0], g.limpio[i][0], ajuste), lerp(q[1], g.limpio[i][1], ajuste)]);
    const reaccion = seg(lt, 2.0, 2.9);

    m.clearRect(0, 0, MAPA, MAPA);
    m.save();
    m.scale(MAPA / TAM, MAPA / TAM);
    this.trazo(m, pts, avance, lerp(20, 26, ajuste));
    m.strokeStyle = '#fff';
    m.lineCap = 'round';
    if (g.nombre === 'tilde') {
      const an = eio(reaccion);
      if (an > 0) {
        m.lineWidth = 18;
        m.beginPath();
        m.arc(270, 270, 200, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * an);
        m.stroke();
      }
    }
    if (g.nombre === 'libro') {
      m.lineWidth = 13;
      for (let r = 0; r < 4; r++) {
        const p1 = eio(seg(lt, 2.0 + r * 0.16, 2.3 + r * 0.16));
        const p2 = eio(seg(lt, 2.08 + r * 0.16, 2.38 + r * 0.16));
        const y = 222 + r * 40;
        if (p1 > 0) { m.beginPath(); m.moveTo(166, y); m.lineTo(166 + (r === 3 ? 50 : 78) * p1, y); m.stroke(); }
        if (p2 > 0) { m.beginPath(); m.moveTo(298, y); m.lineTo(298 + (r === 1 ? 52 : 76) * p2, y); m.stroke(); }
      }
    }
    if (g.nombre === 'reloj') {
      const ag = eio(seg(lt, 1.9, 2.2));
      if (ag > 0) {
        const giro = -Math.PI / 2 + eio(reaccion) * Math.PI * 2 * 1.25;
        m.lineWidth = 16;
        m.beginPath(); m.moveTo(270, 275); m.lineTo(270, 275 - 62 * ag); m.stroke();
        m.beginPath(); m.moveTo(270, 275); m.lineTo(270 + Math.cos(giro) * 92 * ag, 275 + Math.sin(giro) * 92 * ag); m.stroke();
      }
    }
    m.restore();
    const datos = m.getImageData(0, 0, MAPA, MAPA).data;

    const fi = avance * (PUNTOS - 1);
    const i0 = Math.floor(fi);
    const i1 = Math.min(PUNTOS - 1, i0 + 1);
    const fr = fi - i0;
    const fx = lerp(g.mano[i0][0], g.mano[i1][0], fr);
    const fy = lerp(g.mano[i0][1], g.mano[i1][1], fr);
    const fop = seg(lt, 0.05, 0.25) * (1 - seg(lt, 1.4, 1.65));
    const apoyo = seg(lt, 0.22, 0.3) * (1 - seg(lt, 1.35, 1.43));
    const ondas: [number, Punto, number][] = [[g.inicio + 1.45, g.c, 1], [g.inicio + 2.9, g.c, 0.8]];

    // relee los colores cada medio segundo, por si cambiás el tema
    if (Math.floor(tiempo * 2) !== this.ultimaLectura) {
      this.ultimaLectura = Math.floor(tiempo * 2);
      this.leerColores();
    }
    const { fondo, punto, acento, oscuro } = this.colores;
    const rgb = (c: number[]) => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';

    const esc = lienzo.width / TAM;
    ctx.setTransform(esc, 0, 0, esc, 0, 0);
    ctx.fillStyle = rgb(fondo);
    ctx.fillRect(0, 0, TAM, TAM);
    b.setTransform(0.5, 0, 0, 0.5, 0, 0);
    b.clearRect(0, 0, TAM, TAM);
    const ambiente = (t / LOOP) * Math.PI * 2;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const px = MARGEN + i * SEP;
        const py = MARGEN + j * SEP;
        let v = 0;
        for (let yy = 0; yy < CELDA; yy++) {
          const fila = ((j * CELDA + yy) * MAPA + i * CELDA) * 4 + 3;
          for (let xx = 0; xx < CELDA; xx++) v += datos[fila + xx * 4];
        }
        v = v / (CELDA * CELDA * 255);
        const dd = Math.hypot(px - g.c[0], py - g.c[1]) / 380;
        v *= 1 - eio(seg(lt, 3.25 + dd * 0.35, 3.65 + dd * 0.35));
        let rp = 0;
        let ux = 0;
        let uy = 0;
        for (const [desde, c, fuerza] of ondas) {
          const tt = t - desde;
          if (tt < 0 || tt > 1.3) continue;
          const dr = Math.hypot(px - c[0], py - c[1]);
          const x = (dr - tt * 390) / 28;
          const aa = Math.exp(-x * x) * (1 - tt / 1.3) * fuerza;
          rp += aa;
          ux += ((px - c[0]) / (dr + 0.01)) * aa;
          uy += ((py - c[1]) / (dr + 0.01)) * aa;
        }
        const fd = Math.hypot(px - fx, py - fy);
        const fa = Math.exp(-Math.pow(fd / 36, 2)) * apoyo;
        v = cl(v + rp * 0.36 + fa * 0.3);
        const dx = px + ux * 4 + ((px - fx) / (fd + 0.01)) * fa * 7;
        const dy = py + uy * 4 + ((py - fy) / (fd + 0.01)) * fa * 7;
        const reposo = (oscuro ? 0.13 : 0.18) + 0.03 * Math.sin(ambiente + px * 0.012 + py * 0.008);
        if (v > 0.03) {
          // en modo oscuro los puntos más encendidos se aclaran un poco
          const calor = oscuro ? cl(v * 1.2) * 0.4 : 0;
          const color = rgb(acento.map((x) => Math.round(lerp(x, 255, calor))));
          ctx.globalAlpha = lerp(reposo, 1, cl(v * 1.35));
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(dx, dy, lerp(0.7, 4.6, v), 0, 6.2832); ctx.fill();
          b.globalAlpha = v;
          b.fillStyle = color;
          b.beginPath(); b.arc(dx, dy, lerp(0.7, 4.6, v), 0, 6.2832); b.fill();
        } else {
          ctx.globalAlpha = reposo;
          ctx.fillStyle = rgb(punto);
          ctx.beginPath(); ctx.arc(dx, dy, 0.7, 0, 6.2832); ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // en modo claro el brillo se suma más suave, si no se lava contra el fondo
    ctx.globalCompositeOperation = oscuro ? 'lighter' : 'source-over';
    ctx.globalAlpha = oscuro ? 1 : 0.35;
    ctx.filter = 'blur(' + Math.round(lienzo.width * 0.008) + 'px)';
    ctx.drawImage(capaBrillo, 0, 0, lienzo.width, lienzo.height);
    ctx.filter = 'blur(' + Math.round(lienzo.width * 0.022) + 'px)';
    ctx.globalAlpha = oscuro ? 0.6 : 0.25;
    ctx.drawImage(capaBrillo, 0, 0, lienzo.width, lienzo.height);
    ctx.restore();

    const dedo = this.dedo().nativeElement;
    dedo.style.left = (fx / TAM) * 100 + '%';
    dedo.style.top = (fy / TAM) * 100 + '%';
    dedo.style.opacity = (fop * 0.9).toFixed(3);
    dedo.style.transform = 'translate(-50%, -50%) scale(' + (1 - 0.14 * apoyo).toFixed(3) + ')';
    this.etiquetas().forEach((el, k) => {
      const o = k === gi ? eo(seg(lt, 1.5, 2.1)) * (1 - seg(lt, 3.3, 3.7)) : 0;
      el.nativeElement.style.opacity = String(o);
      el.nativeElement.style.transform = 'translateY(' + ((1 - o) * 8).toFixed(2) + 'px)';
      el.nativeElement.style.filter = o > 0.001 && o < 0.999 ? 'blur(' + ((1 - o) * 5).toFixed(2) + 'px)' : 'none';
    });
    this.pasos().forEach((el, k) => {
      el.nativeElement.style.width = (k < gi ? 100 : k === gi ? seg(lt, 0, GESTO) * 100 : 0) + '%';
    });
  }

  private prepararScroll() {
    gsap.registerPlugin(ScrollTrigger);
    // Lenis se apoya en ResizeObserver: si no está (jsdom, navegadores viejos) se
    // deja el scroll nativo, que ya alcanza para las animaciones con ScrollTrigger.
    if (typeof ResizeObserver !== 'undefined') {
      this.lenis = new Lenis({ lerp: 0.09 });
      this.lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(this.tickerLenis);
    }
    gsap.ticker.lagSmoothing(0);

    this.contexto = gsap.context(() => {
      gsap.from('.hero-linea span span', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.08 });
      gsap.from('.hero-sub', { opacity: 0, y: 16, duration: 0.9, ease: 'expo.out', delay: 0.35, stagger: 0.08 });
      gsap.from('.hero-card', { opacity: 0, y: 40, duration: 1.2, ease: 'expo.out', delay: 0.3 });

      const pista = this.pista().nativeElement;
      gsap.matchMedia().add('(min-width: 768px)', () => {
        const distancia = () => pista.scrollWidth - window.innerWidth;
        gsap.to(pista, {
          x: () => -distancia(),
          ease: 'none',
          scrollTrigger: { trigger: '.pin-semana', start: 'top top', end: () => '+=' + distancia(), pin: true, scrub: 1, invalidateOnRefresh: true, refreshPriority: 3 },
        });
      });

      // el calendario se va pintando día por día mientras scrolleás.
      // En pantallas grandes queda fijo; en el celular no entra entero, así que se pinta mientras pasa.
      const pintarCalendario = (scrollTrigger: ScrollTrigger.Vars) => {
        const progreso = { n: 0 };
        return gsap.to(progreso, {
          n: HOY_CALENDARIO + 1,
          ease: 'none',
          scrollTrigger,
          onUpdate: () => this.diasVisibles.set(Math.round(progreso.n)),
        });
      };
      gsap.matchMedia()
        .add('(min-width: 1024px)', () => {
          pintarCalendario({ trigger: '.pin-calendario', start: 'top top', end: '+=1200', pin: true, scrub: 0.6, refreshPriority: 2 });
        })
        .add('(max-width: 1023px)', () => {
          pintarCalendario({ trigger: '.pin-calendario', start: 'top 60%', end: 'bottom 80%', scrub: 0.6 });
        });

      gsap.from('.hoy-card', { opacity: 0, y: 40, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: '.hoy-card', start: 'top 85%' } });
      gsap.from('.lista-tareas', { opacity: 0, y: 30, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: '.lista-tareas', start: 'top 85%' } });

      ScrollTrigger.create({
        trigger: '.apunte', start: 'top 75%', end: 'bottom 40%', scrub: true,
        onUpdate: (st) => this.palabrasEncendidas.set(Math.round(st.progress * this.palabras.length)),
      });

      gsap.from('.cierre', { scale: 0.86, borderRadius: 64, ease: 'none', scrollTrigger: { trigger: '.cierre-wrap', start: 'top bottom', end: 'top 30%', scrub: true } });
    }, this.host.nativeElement);

    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    // Sin FontFaceSet no hay tipografías que esperar antes de rem edir.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }

  fechaHoy() {
    return this.hoy.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // los días que todavía no se "pintaron" con el scroll se ven pendientes
  estadosDia(dia: DiaCalendario, i: number): EstadoControl[] {
    if (i < this.diasVisibles()) return dia.controles;
    return dia.controles.map(() => 'PENDIENTE');
  }

  // mismo criterio que el calendario de la app: un color si todo es igual, si no se parte en diagonal
  fondoDia(dia: DiaCalendario, i: number) {
    const estados = this.estadosDia(dia, i);
    const marcados = estados.filter((e) => e !== 'PENDIENTE');
    if (marcados.length === 0) return estados.length > 0 ? 'var(--surface-2)' : 'var(--surface)';
    if (marcados.length === estados.length && marcados.every((e) => e === marcados[0])) return this.suave[marcados[0]];
    const partes = estados.map((e, k) =>
      this.suave[e] + ' ' + (k * 100) / estados.length + '% ' + ((k + 1) * 100) / estados.length + '%'
    );
    return 'linear-gradient(135deg, ' + partes.join(', ') + ')';
  }

  abrirPregunta(i: number) {
    this.preguntaAbierta.set(this.preguntaAbierta() === i ? null : i);
  }

  ponerNota(nota: number | null) {
    this.evaluaciones.set(this.evaluaciones().map((e) => (e.id === 3 ? { ...e, calificacion: nota } : e)));
  }

  fechaCorta(fecha: string) {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  }

  marcar(i: number, estado: EstadoControl) {
    this.controlesHoy.set(this.controlesHoy().map((c, k) =>
      k === i ? { ...c, estado: c.estado === estado ? 'PENDIENTE' : estado } : c
    ));
  }

  fechaEn(dias: number) {
    const f = new Date();
    f.setDate(f.getDate() + dias);
    return f.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  }

  filtrar(materia: string) {
    const lista = this.seleccionadas();
    this.seleccionadas.set(lista.includes(materia) ? lista.filter((m) => m !== materia) : [...lista, materia]);
  }

  tareasFiltradas(hechas: boolean) {
    const sel = this.seleccionadas();
    return this.tareas()
      .filter((t) => t.hecha === hechas && (sel.length === 0 || sel.includes(t.materia)))
      .sort((a, b) => a.dias - b.dias);
  }

  completar(tarea: Tarea) {
    this.tareas.set(this.tareas().map((t) => (t === tarea ? { ...t, hecha: !t.hecha } : t)));
  }
}

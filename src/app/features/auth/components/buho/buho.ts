import { Component, ElementRef, OnDestroy, OnInit, input, viewChild } from '@angular/core';

export type EstadoBuho = 'normal' | 'escribiendo' | 'tapado' | 'error' | 'feliz';

// Tamaño del dibujo (el canvas se escala con la densidad de la pantalla)
const ANCHO = 200;
const ALTO = 200;

@Component({
  selector: 'app-buho',
  template: `<canvas #lienzo class="block size-[150px] sm:size-[180px]" role="img"
    aria-label="Un búho con birrete que te acompaña mientras completás el formulario"></canvas>`,
})
export class Buho implements OnInit, OnDestroy {
  // Qué está haciendo, hacia dónde mira al escribir (0 a 1) y si espía la contraseña
  estado = input<EstadoBuho>('normal');
  mirada = input(0);
  espiando = input(false);

  lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');

  private ctx: CanvasRenderingContext2D | null = null;
  private frame = 0;
  private tiempo = 0;
  private ultimo = 0;
  private reducido = false;
  private mouseX = -1;
  private mouseY = -1;

  // Colores: se arman a partir del color de acento del tema
  private c = {
    cuerpo: '#565b8c', oscuro: '#3c4062', claro: '#7a7fb0', cara: '#e4e5f3', panza: '#c9cbe6',
    pluma: '#9a9dc8', ojo: '#ffffff', iris: '#ffb020', pupila: '#121214', pico: '#2a2420',
    patas: '#ffb020', birrete: '#1f1f24', birreteBase: '#34343c', borla: '#ffb020', sombra: 'rgba(0,0,0,0.18)',
  };

  // Valores que se animan de a poco
  private tapa = 0;
  private espia = 0;
  private feliz = 0;
  private error = 0;
  private pupilaX = 0;
  private pupilaY = 0;
  private parpadeo = 0;
  private proximoParpadeo = 2;
  private giroCabeza = 0;
  private salto = 0;
  private velSalto = 0;
  private aplasta = 0;

  ngOnInit() {
    const canvas = this.lienzo().nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = ANCHO * dpr;
    canvas.height = ALTO * dpr;
    this.ctx = canvas.getContext('2d');
    this.ctx?.scale(dpr, dpr);
    this.reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.addEventListener('pointermove', this.moverMouse);
    this.leerColores();
    this.ultimo = performance.now();
    this.frame = requestAnimationFrame(this.animar);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('pointermove', this.moverMouse);
  }

  private moverMouse = (e: PointerEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  };

  // Arma la paleta del búho con el color de acento del tema (se relee cada tanto por si lo cambiás)
  private leerColores() {
    const estilos = getComputedStyle(document.documentElement);
    const acento = this.aRgb(estilos.getPropertyValue('--theme-accent'));
    if (!acento) return;
    this.c.cuerpo = this.mezclar(acento, [0, 0, 0], 0);
    this.c.oscuro = this.mezclar(acento, [0, 0, 0], 0.32);
    this.c.claro = this.mezclar(acento, [255, 255, 255], 0.22);
    this.c.cara = this.mezclar(acento, [255, 255, 255], 0.82);
    this.c.panza = this.mezclar(acento, [255, 255, 255], 0.6);
    this.c.pluma = this.mezclar(acento, [255, 255, 255], 0.3);
  }

  private aRgb(valor: string): number[] | null {
    const v = valor.trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
    const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  }

  private mezclar(a: number[], b: number[], t: number) {
    return 'rgb(' + a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',') + ')';
  }

  private animar = (ahora: number) => {
    const dt = Math.min((ahora - this.ultimo) / 1000, 0.05);
    this.ultimo = ahora;
    this.tiempo += dt;
    if (Math.floor(this.tiempo * 2) !== Math.floor((this.tiempo - dt) * 2)) this.leerColores();
    this.actualizar(dt);
    this.dibujar();
    this.frame = requestAnimationFrame(this.animar);
  };

  private acercar(actual: number, objetivo: number, velocidad: number, dt: number) {
    if (this.reducido) return objetivo;
    return actual + (objetivo - actual) * (1 - Math.exp(-velocidad * dt));
  }

  private actualizar(dt: number) {
    const estado = this.estado();
    this.tapa = this.acercar(this.tapa, estado === 'tapado' ? 1 : 0, 9, dt);
    this.espia = this.acercar(this.espia, estado === 'tapado' && this.espiando() ? 1 : 0, 9, dt);
    this.feliz = this.acercar(this.feliz, estado === 'feliz' ? 1 : 0, 7, dt);
    this.error = this.acercar(this.error, estado === 'error' ? 1 : 0, 5, dt);

    // Hacia dónde miran los ojos
    let x = 0;
    let y = 0;
    if (estado === 'escribiendo') {
      x = -0.8 + this.mirada() * 1.6; // sigue lo que vas escribiendo
      y = 0.9;
    } else if (estado === 'error') {
      y = 0.7;
    } else if (this.mouseX >= 0) {
      const caja = this.lienzo().nativeElement.getBoundingClientRect();
      x = Math.max(-1, Math.min(1, (this.mouseX - (caja.left + caja.width / 2)) / 320));
      y = Math.max(-1, Math.min(1, (this.mouseY - (caja.top + caja.height / 2.4)) / 320));
    } else {
      x = Math.sin(this.tiempo * 0.6) * 0.6;
    }
    this.pupilaX = this.acercar(this.pupilaX, x, 10, dt);
    this.pupilaY = this.acercar(this.pupilaY, y, 10, dt);

    // La cabeza acompaña la mirada y niega cuando hay un error
    const negar = this.reducido ? 0 : Math.sin(this.tiempo * 14) * 0.12 * this.error;
    this.giroCabeza = this.acercar(this.giroCabeza, this.pupilaX * 0.08 + negar, 8, dt);

    // Parpadeo cada algunos segundos
    this.proximoParpadeo -= dt;
    if (this.proximoParpadeo <= 0 && this.feliz < 0.3) {
      this.parpadeo = 1;
      this.proximoParpadeo = 2.5 + Math.random() * 3;
    }
    this.parpadeo = Math.max(0, this.parpadeo - dt * 6);

    // Saltitos cuando está feliz: sube, cae y se aplasta un poco
    if (!this.reducido) {
      if (this.feliz > 0.5 && this.salto <= 0 && this.velSalto <= 0) this.velSalto = 260;
      this.velSalto -= 1100 * dt;
      this.salto += this.velSalto * dt;
      if (this.salto < 0) {
        if (this.velSalto < -120) this.aplasta = 0.12;
        this.salto = 0;
        this.velSalto = 0;
      }
      this.aplasta = this.acercar(this.aplasta, 0, 10, dt);
    }
  }

  private dibujar() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, ANCHO, ALTO);
    const respira = this.reducido ? 0 : Math.sin(this.tiempo * 2.2) * 0.015;

    // Sombra suave debajo de la rama
    ctx.fillStyle = this.c.sombra;
    this.elipse(100, 194, 52, 4);

    // Rama / perch firme donde se apoya el búho
    this.rama();

    ctx.save();
    // Se apoya firme en las patas (salto solo si festeja éxito)
    ctx.translate(100, 184 - this.salto);
    ctx.scale(1 + this.aplasta, 1 - this.aplasta + respira);
    ctx.translate(-100, -184);

    this.patas();
    this.cuerpo();
    this.alas(false);

    ctx.save();
    ctx.translate(100, 92);
    ctx.rotate(this.giroCabeza);
    ctx.translate(-100, -92);
    this.cabeza();
    this.ojos();
    this.pico();
    this.cejas();
    this.birrete();
    ctx.restore();

    this.alas(true);
    ctx.restore();
  }

  // Rama de madera con acabado cálido y hojas para que el búho esté apoyado y no flote
  private rama() {
    const ctx = this.ctx!;
    ctx.save();
    const g = ctx.createLinearGradient(0, 182, 0, 193);
    g.addColorStop(0, '#5a3d2e');
    g.addColorStop(0.5, '#452c20');
    g.addColorStop(1, '#321e16');
    ctx.fillStyle = g;
    ctx.beginPath();
    const x = 36;
    const y = 182;
    const w = 128;
    const h = 10;
    const r = 5;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();

    // Detalle de nudo / veta de madera
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(62, 187, 2.5, 0, Math.PI * 2);
    ctx.stroke();

    // Hojitas verdes frescas brotando a la izquierda
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.ellipse(32, 181, 6, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(36, 177, 4.5, 2.2, -0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private cuerpo() {
    const ctx = this.ctx!;
    const g = ctx.createLinearGradient(0, 70, 0, 184);
    g.addColorStop(0, this.c.cuerpo);
    g.addColorStop(1, this.c.oscuro);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(62, 100);
    ctx.bezierCurveTo(52, 140, 66, 178, 100, 180);
    ctx.bezierCurveTo(134, 178, 148, 140, 138, 100);
    ctx.closePath();
    ctx.fill();

    // Pecho claro con plumitas en V
    ctx.fillStyle = this.c.panza;
    ctx.beginPath();
    ctx.moveTo(78, 118);
    ctx.bezierCurveTo(74, 150, 84, 172, 100, 172);
    ctx.bezierCurveTo(116, 172, 126, 150, 122, 118);
    ctx.bezierCurveTo(112, 110, 88, 110, 78, 118);
    ctx.fill();
    ctx.strokeStyle = this.c.pluma;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (const [x, y] of [[90, 128], [110, 128], [100, 138], [86, 148], [114, 148], [100, 158]]) {
      ctx.beginPath();
      ctx.moveTo(x - 4, y);
      ctx.lineTo(x, y + 3.5);
      ctx.lineTo(x + 4, y);
      ctx.stroke();
    }
  }

  private cabeza() {
    const ctx = this.ctx!;
    const g = ctx.createLinearGradient(0, 30, 0, 120);
    g.addColorStop(0, this.c.claro);
    g.addColorStop(1, this.c.cuerpo);
    ctx.fillStyle = g;
    ctx.beginPath();
    // De oreja a oreja pasando por los costados de la cara
    ctx.moveTo(100, 50);
    ctx.quadraticCurveTo(116, 44, 138, 26);
    ctx.quadraticCurveTo(146, 50, 150, 78);
    ctx.bezierCurveTo(154, 108, 130, 124, 100, 124);
    ctx.bezierCurveTo(70, 124, 46, 108, 50, 78);
    ctx.quadraticCurveTo(54, 50, 62, 26);
    ctx.quadraticCurveTo(84, 44, 100, 50);
    ctx.fill();

    // Cara en forma de corazón
    ctx.fillStyle = this.c.cara;
    ctx.beginPath();
    ctx.moveTo(100, 66);
    ctx.bezierCurveTo(90, 54, 58, 56, 58, 84);
    ctx.bezierCurveTo(58, 104, 80, 116, 100, 118);
    ctx.bezierCurveTo(120, 116, 142, 104, 142, 84);
    ctx.bezierCurveTo(142, 56, 110, 54, 100, 66);
    ctx.fill();
  }

  private ojos() {
    const ctx = this.ctx!;
    for (const [x, y] of [[80, 86], [120, 86]]) {
      if (this.feliz > 0.5) {
        // Ojos felices: arcos ^
        ctx.strokeStyle = this.c.pupila;
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x, y + 7, 11, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        continue;
      }
      const abierto = 1 - Math.sin(this.parpadeo * Math.PI); // cierra y abre suave
      ctx.fillStyle = this.c.oscuro;
      this.elipse(x, y, 17, 17);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y, 15, 15 * Math.max(abierto, 0.06), 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = this.c.ojo;
      this.elipse(x, y, 15, 15);
      const ix = x + this.pupilaX * 5;
      const iy = y + this.pupilaY * 5;
      ctx.fillStyle = this.c.iris;
      this.elipse(ix, iy, 10, 10);
      const pupila = 6 - this.error * 1.5;
      ctx.fillStyle = this.c.pupila;
      this.elipse(ix, iy, pupila, pupila);
      ctx.fillStyle = '#ffffff';
      this.elipse(ix - 3, iy - 3.5, 2.4, 2.4);
      ctx.restore();
    }
  }

  private pico() {
    const ctx = this.ctx!;
    ctx.fillStyle = this.c.pico;
    ctx.beginPath();
    ctx.moveTo(94, 98);
    ctx.quadraticCurveTo(100, 95, 106, 98);
    ctx.lineTo(100, 110);
    ctx.closePath();
    ctx.fill();
  }

  private cejas() {
    if (this.error < 0.05) return;
    const ctx = this.ctx!;
    ctx.strokeStyle = this.c.oscuro;
    ctx.globalAlpha = this.error;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.lineTo(88, 70);
    ctx.moveTo(136, 64);
    ctx.lineTo(112, 70);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private birrete() {
    const ctx = this.ctx!;
    ctx.save();
    ctx.translate(100, 40);
    ctx.rotate(-0.08);
    // Base que se apoya en la cabeza
    ctx.fillStyle = this.c.birreteBase;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(20, 0);
    ctx.lineTo(18, 12);
    ctx.quadraticCurveTo(0, 16, -18, 12);
    ctx.closePath();
    ctx.fill();
    // Tabla de arriba
    ctx.fillStyle = this.c.birrete;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(42, -2);
    ctx.lineTo(0, 10);
    ctx.lineTo(-42, -2);
    ctx.closePath();
    ctx.fill();
    // Borla que se balancea (más cuando está feliz)
    const balanceo = this.reducido ? 0 : Math.sin(this.tiempo * 3) * 4 + this.feliz * Math.sin(this.tiempo * 12) * 6;
    ctx.strokeStyle = this.c.borla;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(34, 0);
    ctx.quadraticCurveTo(36 + balanceo * 0.5, 12, 36 + balanceo, 22);
    ctx.stroke();
    ctx.fillStyle = this.c.borla;
    ctx.beginPath();
    ctx.moveTo(32 + balanceo, 22);
    ctx.lineTo(40 + balanceo, 22);
    ctx.lineTo(38 + balanceo, 32);
    ctx.lineTo(34 + balanceo, 32);
    ctx.fill();
    ctx.restore();
  }

  private patas() {
    const ctx = this.ctx!;
    ctx.strokeStyle = this.c.patas;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    for (const x of [88, 112]) {
      for (const dedo of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.moveTo(x, 176);
        ctx.lineTo(x + dedo * 5, 184);
        ctx.stroke();
      }
    }
  }

  // Las alas van detrás del cuerpo en reposo y adelante cuando tapan los ojos
  private alas(adelante: boolean) {
    const ctx = this.ctx!;
    for (const lado of [-1, 1]) {
      // el ala derecha baja un poco cuando mostrás la contraseña: espía con un ojo
      const cubre = lado === 1 ? this.tapa * (1 - this.espia * 0.7) : this.tapa;
      if ((cubre > 0.35) !== adelante) continue;
      const aleteo = this.reducido ? 0 : this.feliz * Math.sin(this.tiempo * 20) * 0.6;
      const x = 100 + lado * 44 + (lado * 20 - lado * 44) * cubre;
      const y = 136 + (90 - 136) * cubre;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lado * (0.18 + cubre * 2.2 + Math.abs(aleteo)));
      ctx.scale(lado, 1);
      this.ala();
      ctx.restore();
    }
  }

  // Forma de un ala: una gota con plumas
  private ala() {
    const ctx = this.ctx!;
    const g = ctx.createLinearGradient(0, -34, 0, 34);
    g.addColorStop(0, this.c.cuerpo);
    g.addColorStop(1, this.c.oscuro);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.bezierCurveTo(18, -26, 20, 14, 4, 36);
    ctx.bezierCurveTo(-2, 30, -6, 34, -10, 30);
    ctx.bezierCurveTo(-18, 8, -16, -24, 0, -34);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-6 + i * 5, 6 + i * 4);
      ctx.quadraticCurveTo(-2 + i * 5, 20, -4 + i * 6, 30);
      ctx.stroke();
    }
  }

  private elipse(x: number, y: number, rx: number, ry: number) {
    const ctx = this.ctx!;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

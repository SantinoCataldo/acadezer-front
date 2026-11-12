import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Una función del producto, contada como la ve quien la usa. */
interface Feature {
  icon: string;
  title: string;
  description: string;
}

/** Un paso del ciclo de uso. Es una secuencia real, por eso va numerada. */
interface Step {
  title: string;
  description: string;
}

interface Faq {
  question: string;
  answer: string;
}

/** Fila de la vista previa del hero: una materia con su asistencia. */
interface MateriaPreview {
  nombre: string;
  icon: string;
  dias: string;
  porcentaje: number;
}

const ctaPrimary =
  'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-[var(--theme-accent)] px-6 text-sm font-semibold text-[var(--theme-on-accent)] transition-[filter,transform] duration-150 hover:scale-[0.99] hover:brightness-110 active:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent-content)] motion-reduce:transition-none';

const ctaSecondary =
  'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-[var(--theme-border)] px-6 text-sm font-semibold text-[var(--theme-foreground)] transition-[transform,background-color] duration-150 hover:scale-[0.99] hover:bg-[var(--theme-surface-high)] active:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent-content)] motion-reduce:transition-none';

/** Accesos de la barra fija: mismos colores, algo más compactos. */
const navLogin =
  'hidden min-h-11 cursor-pointer items-center justify-center rounded-[14px] border border-[var(--theme-border)] px-4 text-sm font-semibold text-[var(--theme-foreground)] transition-[transform,background-color] duration-150 hover:scale-[0.99] hover:bg-[var(--theme-surface-high)] active:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent-content)] motion-reduce:transition-none md:flex';

const navRegister =
  'flex min-h-11 cursor-pointer items-center justify-center rounded-[14px] bg-[var(--theme-accent)] px-4 text-sm font-semibold text-[var(--theme-on-accent)] transition-[filter,transform] duration-150 hover:scale-[0.99] hover:brightness-110 active:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent-content)] motion-reduce:transition-none sm:px-5';

/**
 * Landing pública de Acadezer (ruta /).
 *
 * Es la puerta de entrada al producto: explica en una pantalla qué se puede
 * hacer y deriva a creación de cuenta o inicio de sesión. Los textos hablan de
 * funciones que existen hoy en la aplicación; la vista previa del hero es
 * ilustrativa y está marcada como tal para lectores de pantalla.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly ctaPrimary = ctaPrimary;
  readonly ctaSecondary = ctaSecondary;
  readonly navLogin = navLogin;
  readonly navRegister = navRegister;
  readonly year = new Date().getFullYear();

  readonly features: readonly Feature[] = [
    {
      icon: 'calendar_month',
      title: 'Materias y horarios',
      description:
        'Cargá cada materia con sus días y horarios de cursada. Acadezer arma tu semana y sabe cuántos controles debería tener cada clase.',
    },
    {
      icon: 'fact_check',
      title: 'Asistencia al día',
      description:
        'Marcá cada control como presente, ausente o justificada. El porcentaje se calcula sobre los controles que marcaste.',
    },
    {
      icon: 'event_busy',
      title: 'Días sin cursada',
      description:
        'Feriados, paros o cancelaciones de la cátedra: marcalos y no bajan tu porcentaje.',
    },
    {
      icon: 'edit_note',
      title: 'Apuntes con formato',
      description:
        'Escribí con títulos, negrita y listas. Cada apunte queda en su materia, ordenado por la última edición.',
    },
    {
      icon: 'quiz',
      title: 'Repaso con preguntas',
      description: 'Convertí un apunte en preguntas de práctica para comprobar si lo entendiste.',
    },
    {
      icon: 'palette',
      title: 'Tu tema',
      description:
        'Claro, oscuro o automático, y el color de acento que quieras: la paleta se arma a partir de ese color.',
    },
  ];

  readonly steps: readonly Step[] = [
    {
      title: 'Creá tu materia',
      description:
        'Nombre, fechas y los horarios de cursada. Si cursás dos veces por semana, cargás los dos y la semana se arma sola.',
    },
    {
      title: 'Marcá cada clase',
      description:
        'Al terminar un control, registralo. Los días sin cursada se marcan aparte y no cuentan en tu porcentaje.',
    },
    {
      title: 'Guardá lo que estudiás',
      description:
        'Tus apuntes quedan dentro de la materia, con formato y con la fecha de la última edición a la vista.',
    },
  ];

  readonly faqs: readonly Faq[] = [
    {
      question: '¿Tiene costo?',
      answer: 'No. Crear una cuenta y usar Acadezer no tiene costo.',
    },
    {
      question: '¿Qué es un control de asistencia?',
      answer:
        'Cada clase puede dividirse en bloques: una materia de cuatro horas suele tener dos. Los marcás por separado, y el porcentaje se calcula sobre los que marcaste.',
    },
    {
      question: '¿Quién ve mis apuntes?',
      answer:
        'Solo vos. Cada materia y cada apunte se guardan asociados a tu cuenta, y nadie más puede acceder a ellos.',
    },
    {
      question: '¿Sirve en el celular?',
      answer:
        'Sí. Está pensada para usarse con una mano: botones grandes y una sola columna en pantallas chicas.',
    },
    {
      question: '¿Puedo cambiar los colores?',
      answer:
        'Sí. Modo claro, oscuro o automático, y un color de acento a elección desde el botón de la esquina.',
    },
  ];

  /** Datos ilustrativos de la vista previa: no son cifras reales de nadie. */
  readonly previewMaterias: readonly MateriaPreview[] = [
    {
      nombre: 'Análisis matemático',
      icon: 'functions',
      dias: 'Lun y jue · 18 a 22',
      porcentaje: 86,
    },
    { nombre: 'Biología', icon: 'biotech', dias: 'Mar · 16 a 20', porcentaje: 72 },
    { nombre: 'Historia', icon: 'history_edu', dias: 'Mié · 18 a 22', porcentaje: 94 },
  ];
}

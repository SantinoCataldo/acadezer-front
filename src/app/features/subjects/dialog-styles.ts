/**
 * Clases compartidas por los diálogos del feature de materias.
 * Reutilizan los tokens semánticos globales (--theme-*, --md-sys-color-*);
 * no se incorporan colores locales nuevos.
 */

/** Botón principal: misma forma que el de login/registro. */
export const primaryButton =
  'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-[var(--theme-accent)] px-4 py-3 text-sm font-semibold text-[var(--theme-on-accent)] transition-[filter,transform] duration-150 hover:brightness-110 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent-content)] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none';

/** Botón secundario: misma forma que el de "Cerrar sesión" en Mi espacio. */
export const secondaryButton =
  'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-[var(--theme-border)] bg-transparent px-4 py-3 text-sm font-semibold text-[var(--theme-foreground)] transition-[transform,background-color] duration-150 hover:bg-[var(--theme-surface-high)] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent-content)] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none';

/** Botón destructivo para la confirmación de borrado. */
export const dangerButton =
  'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-[var(--theme-error)] px-4 py-3 text-sm font-semibold text-[var(--md-sys-color-on-error)] transition-[filter,transform] duration-150 hover:brightness-110 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent-content)] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none';

/** Superficie de error reutilizable (mensajes de operación fallida). */
export const errorSurface =
  'rounded-[14px] bg-[var(--md-sys-color-error-container)] p-3 text-sm text-[var(--md-sys-color-on-error-container)]';

/** Icon button cuadrado, objetivo táctil de 44px. */
export const iconButton =
  'flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-[var(--theme-muted)] transition-colors hover:bg-[var(--theme-surface-high)] hover:text-[var(--theme-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-content)] motion-reduce:transition-none';

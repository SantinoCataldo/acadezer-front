export const authAppearance = {
  card: 'rounded-[28px] border-0 bg-[var(--theme-surface)] text-[var(--theme-foreground)] shadow-none',
  muted: 'text-[var(--theme-muted)]',
  brand: 'text-[var(--theme-accent)]',
  foreground: 'text-[var(--theme-foreground)]',
  mark: 'rounded-[14px] bg-[var(--theme-accent)] text-[var(--theme-on-accent)]',
  field: 'rounded-[14px] border-[var(--theme-border)] bg-[var(--theme-canvas)] text-[var(--theme-foreground)] placeholder:text-[var(--theme-muted)] focus-visible:outline-[var(--theme-accent)]',
  button: 'rounded-[14px] bg-[var(--theme-accent)] text-[var(--theme-on-accent)] hover:brightness-110 focus-visible:outline-[var(--theme-accent)]',
  link: 'text-[var(--theme-accent)]',
  error: 'bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]',
} as const;

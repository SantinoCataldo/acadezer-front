---
name: angular-modern-core
description: Standards for modern Angular 22+ development. Enforces Standalone Components, Angular Signals, inject() dependency injection, and Modern Control Flow (@if, @for).
---

# Modern Angular (v22+) Architectural Standards

## 1. Absolute Directives
- **Standalone Only:** Every component, directive, and pipe must be standalone. `NgModule` is banned.
- **Modern Control Flow:** Always use `@if`, `@else`, `@for (item of items; track item.id)`, and `@switch`. Legacy structural directives (`*ngIf`, `*ngFor`) are banned.
- **Modern Dependency Injection:** Always use `inject(Service)` instead of constructor parameter injection.
- **Host Bindings in Decorator:** Define host classes and event listeners directly inside the `@Component({ host: { class: '...', '(click)': '...' } })` object, not with `@HostBinding` or `@HostListener`.

## 2. Reactivity with Angular Signals
- **State:** Use `signal<T>(initialValue)`.
- **Derivations:** Use `computed(() => ...)` for pure derived state. Never trigger side-effects inside computed.
- **Component Inputs & Outputs:**
  ```typescript
  readonly property = input.required<PropiedadResponse>();
  readonly variant = input<'primary' | 'secondary'>('primary');
  readonly selected = output<number>();
  ```
- **Bridging RxJS to Signals:** When consuming `HttpClient` observables in components, convert them seamlessly with `toSignal(observable$, { initialValue: null })`.
- **No Leaky Subscriptions:** Avoid manual `.subscribe()` inside component methods unless strictly managing transient side-effects.

## 3. Route-Level Lazy Loading
Always load routed pages with modern functional lazy-loading in `app.routes.ts`:
```typescript
{
  path: 'propiedades',
  loadComponent: () => import('./pages/properties/properties').then((m) => m.PropertiesComponent)
}
```

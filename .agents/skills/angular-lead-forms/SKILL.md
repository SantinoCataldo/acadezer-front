---
name: angular-lead-forms
description: Patterns for high-conversion real estate forms in Angular. Enforces strictly typed Reactive Forms, clean inline validation, monetary masks, and smooth submission states.
---

# Real Estate High-Conversion Reactive Forms

## 1. Strictly Typed Reactive Forms
Always use typed `FormGroup` with `NonNullableFormBuilder`:
```typescript
private readonly fb = inject(NonNullableFormBuilder);

readonly form = this.fb.group({
  titulo: ['', [Validators.required, Validators.minLength(10)]],
  tipo: ['DEPARTAMENTO' as TipoPropiedad, Validators.required],
  operacion: ['VENTA' as TipoOperacion, Validators.required],
  precio: [0, [Validators.required, Validators.min(1000)]],
  ambientes: [1, [Validators.required, Validators.min(1)]],
  metrosCuadrados: [10, [Validators.required, Validators.min(5)]],
  direccion: ['', Validators.required],
  descripcion: ['']
});
```

## 2. Clean Validation Feedback (Anti-Slop Pattern)
Never repeat long conditional checks like `form.get('field')?.invalid && form.get('field')?.touched` across templates. Create or use an inline helper:
```typescript
isFieldInvalid(name: keyof typeof this.form.controls): boolean {
  const control = this.form.get(name);
  return !!control && control.invalid && (control.dirty || control.touched);
}
```
In template:
```html
@if (isFieldInvalid('precio')) {
  <span class="text-xs text-rose-600 font-medium">Ingresá un precio válido en dólares (mín. 1000).</span>
}
```

## 3. Real Estate Input Standards
- **Prices:** Use input with currency indicator badge (`USD` or `$`) and tabular numbers (`tabular-nums font-mono`).
- **Areas:** Suffix with `m²` badge.
- **Loading State:** Disable submit button during active HTTP transfer, replace icon with spinning SVG or loader, and emit toast via `toast.success()` / `toast.error()` (Ngx-Sonner).

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

type TextFieldType = 'email' | 'number' | 'password' | 'search' | 'tel' | 'text' | 'url';

@Component({
  selector: 'app-text-field',
  templateUrl: './text-field.html',
  host: { class: 'block w-full' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextField),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextField implements ControlValueAccessor {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly type = input<TextFieldType>('text');
  readonly inputMode = input<'decimal' | 'numeric' | null>(null);
  readonly autocomplete = input('off');
  readonly placeholder = input('');
  readonly supportingText = input('');
  readonly counterText = input('');
  readonly errorText = input<string | null>(null);
  readonly maxLength = input<number | null>(null);
  readonly multiline = input(false);
  readonly rows = input(4);
  readonly required = input(false);
  readonly prefix = input('');
  readonly suffix = input('');
  readonly revealable = input(false);

  readonly value = signal('');
  readonly focused = signal(false);
  readonly disabled = signal(false);
  readonly passwordVisible = signal(false);
  readonly floatingLabel = computed(() => this.focused() || this.value().length > 0);
  readonly renderedType = computed(() =>
    this.revealable() && this.passwordVisible() ? 'text' : this.type(),
  );
  readonly describedBy = computed(() => {
    const descriptions: string[] = [];
    if (this.errorText()) descriptions.push(`${this.id()}-error`);
    else if (this.supportingText()) descriptions.push(`${this.id()}-supporting`);
    if (this.counterText()) descriptions.push(`${this.id()}-counter`);
    return descriptions.length > 0 ? descriptions.join(' ') : null;
  });

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null | undefined): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  handleInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;

    this.value.set(target.value);
    this.onChange(target.value);
  }

  handleBlur(): void {
    this.focused.set(false);
    this.onTouched();
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  SecurityContext,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

interface ToolbarAction {
  icon: string;
  label: string;
  /** Comando de `document.execCommand`; null cuando se resuelve a mano. */
  command: string | null;
  /** Argumento del comando. */
  value?: string;
}

const TOOLBAR: readonly ToolbarAction[] = [
  { icon: 'undo', label: 'Deshacer', command: 'undo' },
  { icon: 'redo', label: 'Rehacer', command: 'redo' },
  { icon: 'format_bold', label: 'Negrita', command: 'bold' },
  { icon: 'format_italic', label: 'Cursiva', command: 'italic' },
  { icon: 'format_underlined', label: 'Subrayado', command: 'underline' },
  { icon: 'strikethrough_s', label: 'Tachado', command: 'strikeThrough' },
  { icon: 'format_list_bulleted', label: 'Lista con viñetas', command: 'insertUnorderedList' },
  { icon: 'format_list_numbered', label: 'Lista numerada', command: 'insertOrderedList' },
  { icon: 'title', label: 'Título', command: 'formatBlock', value: 'H1' },
  { icon: 'segment', label: 'Subtítulo', command: 'formatBlock', value: 'H2' },
  { icon: 'notes', label: 'Párrafo', command: 'formatBlock', value: 'P' },
];

/**
 * APU-02: editor de contenido enriquecido sobre `contenteditable`.
 *
 * No se agregan dependencias: el backend guarda el HTML tal cual y el requisito
 * se limita a negrita, cursiva, títulos y listas. Cada edición viaja al padre
 * como HTML y `execCommand` conserva el deshacer nativo del navegador. El HTML
 * se sanea al cargarse para no inyectar etiquetas desde el contenido guardado.
 */
@Component({
  selector: 'app-rich-text-editor',
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextEditor {
  readonly value = input<string>('');
  readonly placeholder = input('Escribí tu apunte acá…');
  readonly invalid = input(false);
  readonly errorText = input<string | null>(null);
  readonly valueChange = output<string>();

  protected readonly toolbar = TOOLBAR;
  protected readonly focused = signal(false);
  private readonly editable = viewChild.required<ElementRef<HTMLElement>>('editable');
  private readonly sanitizer = inject(DomSanitizer);
  private lastEmitted = '';

  constructor() {
    // El valor entra desde el padre (abrir un apunte o resetear el formulario);
    // no se reescribe mientras el usuario escribe, para no mover el cursor.
    effect(() => {
      const next = this.value();
      const element = this.editable()?.nativeElement;
      if (!element || next === this.lastEmitted) return;
      element.innerHTML = this.sanitize(next);
      this.lastEmitted = next;
    });
  }

  protected apply(action: ToolbarAction): void {
    const element = this.editable().nativeElement;
    element.focus();
    // El navegador necesita foco real para aplicar el comando a la selección.
    if (action.command && typeof document.execCommand === 'function') {
      document.execCommand(action.command, false, action.value);
    }
    this.emit(element.innerHTML);
  }

  protected onInput(): void {
    this.emit(this.editable().nativeElement.innerHTML);
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.emit(this.editable().nativeElement.innerHTML);
  }

  private emit(html: string): void {
    if (html === this.lastEmitted) return;
    this.lastEmitted = html;
    this.valueChange.emit(html);
  }

  private sanitize(html: string): string {
    return this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
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
  /** Comando que permite consultar si el formato está activo. */
  stateCommand?: string;
}

const TOOLBAR: readonly ToolbarAction[] = [
  { icon: 'undo', label: 'Deshacer', command: 'undo' },
  { icon: 'redo', label: 'Rehacer', command: 'redo' },
  { icon: 'format_bold', label: 'Negrita', command: 'bold', stateCommand: 'bold' },
  { icon: 'format_italic', label: 'Cursiva', command: 'italic', stateCommand: 'italic' },
  { icon: 'format_underlined', label: 'Subrayado', command: 'underline', stateCommand: 'underline' },
  {
    icon: 'format_list_bulleted',
    label: 'Lista con viñetas',
    command: 'insertUnorderedList',
    stateCommand: 'insertUnorderedList',
  },
  {
    icon: 'format_list_numbered',
    label: 'Lista numerada',
    command: 'insertOrderedList',
    stateCommand: 'insertOrderedList',
  },
  { icon: 'format_h1', label: 'Título 1', command: 'formatBlock', value: 'H1' },
  { icon: 'format_h2', label: 'Título 2', command: 'formatBlock', value: 'H2' },
  { icon: 'format_align_left', label: 'Alinear a la izquierda', command: 'justifyLeft', stateCommand: 'justifyLeft' },
  { icon: 'format_align_center', label: 'Centrar', command: 'justifyCenter', stateCommand: 'justifyCenter' },
  { icon: 'format_align_right', label: 'Alinear a la derecha', command: 'justifyRight', stateCommand: 'justifyRight' },
];

/**
 * APU-02: editor de contenido enriquecido sobre `contenteditable`.
 *
 * No se agregan dependencias: el backend guarda el HTML tal cual y el requisito
 * incluye estilos de texto, títulos, listas y alineación. Cada edición viaja al padre
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
  protected readonly activeActions = signal<ReadonlySet<string>>(new Set());
  private readonly editable = viewChild.required<ElementRef<HTMLElement>>('editable');
  private readonly sanitizer = inject(DomSanitizer);
  private lastEmitted = '';
  private savedRange: Range | null = null;

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
    this.restoreSelection(element);
    if (action.command && typeof document.execCommand === 'function') {
      document.execCommand(action.command, false, action.value);
    }
    this.captureSelection(element);
    this.refreshActiveActions();
    this.emit(element.innerHTML);
  }

  protected preserveSelection(event: PointerEvent): void {
    this.captureSelection(this.editable().nativeElement);
    event.preventDefault();
  }

  protected isActive(action: ToolbarAction): boolean {
    return this.activeActions().has(action.label);
  }

  protected onInput(): void {
    const element = this.editable().nativeElement;
    this.captureSelection(element);
    this.refreshActiveActions();
    this.emit(element.innerHTML);
  }

  protected onBlur(): void {
    const element = this.editable().nativeElement;
    this.captureSelection(element);
    this.focused.set(false);
    this.emit(element.innerHTML);
  }

  @HostListener('document:selectionchange')
  protected onSelectionChange(): void {
    const element = this.editable().nativeElement;
    if (this.containsSelection(element)) {
      this.captureSelection(element);
      this.refreshActiveActions();
    }
  }

  private captureSelection(element: HTMLElement): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (element.contains(range.commonAncestorContainer)) this.savedRange = range.cloneRange();
  }

  private restoreSelection(element: HTMLElement): void {
    const selection = window.getSelection();
    if (!selection || !this.savedRange || !element.contains(this.savedRange.commonAncestorContainer)) return;
    selection.removeAllRanges();
    selection.addRange(this.savedRange);
  }

  private containsSelection(element: HTMLElement): boolean {
    const selection = window.getSelection();
    return !!selection && selection.rangeCount > 0 && element.contains(selection.getRangeAt(0).commonAncestorContainer);
  }

  private refreshActiveActions(): void {
    const active = new Set<string>();
    for (const action of TOOLBAR) {
      if (action.stateCommand && this.queryCommandState(action.stateCommand)) active.add(action.label);
      if (action.command === 'formatBlock' && action.value && this.queryCurrentBlock(action.value)) {
        active.add(action.label);
      }
    }
    this.activeActions.set(active);
  }

  private queryCommandState(command: string): boolean {
    try {
      return typeof document.queryCommandState === 'function' && document.queryCommandState(command);
    } catch {
      return false;
    }
  }

  private queryCurrentBlock(expected: string): boolean {
    try {
      if (typeof document.queryCommandValue !== 'function') return false;
      return document.queryCommandValue('formatBlock').replace(/[<>]/g, '').toUpperCase() === expected;
    } catch {
      return false;
    }
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

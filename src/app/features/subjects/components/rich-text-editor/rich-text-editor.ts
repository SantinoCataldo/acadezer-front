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
import { toast } from 'ngx-sonner';

interface ToolbarAction {
  icon: string;
  label: string;
  command: string | null;
  value?: string;
  stateCommand?: string;
  clearValue?: string;
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
  { icon: 'format_h1', label: 'Título 1', command: 'formatBlock', value: 'H1', clearValue: 'p', stateCommand: 'formatBlock' },
  { icon: 'format_h2', label: 'Título 2', command: 'formatBlock', value: 'H2', clearValue: 'p', stateCommand: 'formatBlock' },
  { icon: 'format_align_left', label: 'Alinear a la izquierda', command: 'justifyLeft', stateCommand: 'justifyLeft' },
  { icon: 'format_align_center', label: 'Centrar', command: 'justifyCenter', stateCommand: 'justifyCenter' },
  { icon: 'format_align_right', label: 'Alinear a la derecha', command: 'justifyRight', stateCommand: 'justifyRight' },
];

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
  private userEditedLocally = false;

  constructor() {
        effect(() => {
      const next = this.value();
      const element = this.editable()?.nativeElement;
      if (!element || next === this.lastEmitted) return;
      element.innerHTML = this.sanitize(next);
      this.lastEmitted = next;
      this.userEditedLocally = false;
    });
  }

  protected apply(action: ToolbarAction): void {
    const element = this.editable().nativeElement;
    element.focus();
    this.restoreSelection(element);
    if (action.command && typeof document.execCommand === 'function') {
            let cmdValue = action.value;
      if (action.command === 'formatBlock' && action.value && action.clearValue && this.queryCurrentBlock(action.value)) {
        cmdValue = action.clearValue;
      }
      document.execCommand(action.command, false, cmdValue);
    }
        this.refreshActiveActions();
    this.userEditedLocally = true;
    this.emit(element.innerHTML);
  }

    protected onToolbarMousedown(event: MouseEvent): void {
    this.captureSelection(this.editable().nativeElement);
    event.preventDefault();
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
    this.userEditedLocally = true;
    this.emit(element.innerHTML);
  }

  protected onBlur(): void {
    const element = this.editable().nativeElement;
    this.captureSelection(element);
    this.focused.set(false);
    if (this.userEditedLocally) {
      this.emit(element.innerHTML);
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    const clipboard = event.clipboardData;
    if (!clipboard) return;

    const items = clipboard.items;
    let hasImage = false;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          hasImage = true;
          break;
        }
      }
    }

    if (hasImage) {
      event.preventDefault();
      toast.warning('Imágenes no admitidas', {
        description:
          'Los apuntes solo admiten texto con formato (títulos, listas, negrita). No es posible pegar imágenes.',
      });
      return;
    }

    const html = clipboard.getData('text/html');
    if (html && /<img\b[^>]*>/i.test(html)) {
      event.preventDefault();
      const plainText = clipboard.getData('text/plain') ?? '';
      if (plainText && typeof document.execCommand === 'function') {
        document.execCommand('insertText', false, plainText);
      }
      toast.warning('Imágenes omitidas', {
        description:
          'Se omitieron las imágenes pegadas. Los apuntes solo admiten texto con formato.',
      });
      const element = this.editable().nativeElement;
      this.userEditedLocally = true;
      this.emit(element.innerHTML);
    }
  }

  protected onDrop(event: DragEvent): void {
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          event.preventDefault();
          toast.warning('Imágenes no admitidas', {
            description:
              'Los apuntes solo admiten texto con formato. No es posible arrastrar imágenes.',
          });
          return;
        }
      }
    }
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

    protected isBlockActive(blockTag: string): boolean {
    return this.queryCurrentBlock(blockTag);
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
    const withoutImages = html.replace(/<img\b[^>]*>/gi, '');
    return this.sanitizer.sanitize(SecurityContext.HTML, withoutImages) ?? '';
  }
}

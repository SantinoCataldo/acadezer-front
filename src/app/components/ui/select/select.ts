import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { gsap } from 'gsap';

export interface SelectOption<T = unknown> {
  value: T;
  label: string;
  icon?: string;
  description?: string;
}

interface PopoverPosition {
  top?: string;
  bottom?: string;
  left: string;
  width: string;
}

@Component({
  selector: 'app-select',
  imports: [],
  templateUrl: './select.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Select),
      multi: true,
    },
  ],
  host: {
    class: 'relative block w-full',
  },
})
export class Select implements ControlValueAccessor {
  readonly id = input<string>('select-' + Math.random().toString(36).slice(2, 8));
  readonly label = input<string>('');
  readonly placeholder = input<string>('Seleccionar...');
  readonly options = input<readonly SelectOption<unknown>[]>([]);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly triggerBtn = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');
  private readonly popoverEl = viewChild<ElementRef<HTMLElement>>('popoverEl');
  private readonly bottomSheetEl = viewChild<ElementRef<HTMLElement>>('bottomSheetEl');

  readonly value = signal<unknown>(null);
  readonly disabled = signal<boolean>(false);
  readonly isOpen = signal<boolean>(false);
  readonly isMobile = signal<boolean>(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  readonly focusedIndex = signal<number>(-1);
  readonly popoverPosition = signal<PopoverPosition>({ left: '0px', width: '100%' });

  private isClosing = false;

  readonly selectedOption = computed(() => {
    const currentVal = this.value();
    const opts = this.options();
    if (currentVal === null || currentVal === undefined) return null;
    return opts.find((opt) => opt.value === currentVal) ?? null;
  });

  readonly displayText = computed(() => {
    const selected = this.selectedOption();
    return selected ? selected.label : this.placeholder();
  });

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: unknown): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  toggle(): void {
    if (this.disabled()) return;
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.disabled() || this.isOpen() || this.isClosing) return;
    this.checkMobile();
    if (!this.isMobile()) {
      this.recalculatePosition();
    }

    const currentVal = this.value();
    const opts = this.options();
    const idx = opts.findIndex((opt) => opt.value === currentVal);
    this.focusedIndex.set(idx >= 0 ? idx : 0);

    this.isOpen.set(true);

    if (this.prefersReducedMotion()) return;

    requestAnimationFrame(() => {
      if (this.isMobile()) {
        const sheet = this.bottomSheetEl()?.nativeElement;
        if (sheet) {
          gsap.killTweensOf(sheet);
          gsap.fromTo(sheet, { y: '100%' }, { y: '0%', duration: 0.28, ease: 'power3.out' });
        }
      } else {
        const el = this.popoverEl()?.nativeElement;
        if (el) {
          gsap.killTweensOf(el);
          gsap.fromTo(
            el,
            { autoAlpha: 0, y: 6, scale: 0.99, filter: 'blur(4px)' },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              filter: 'blur(0px)',
              duration: 0.2,
              ease: 'power2.out',
              onComplete: () => gsap.set(el, { clearProps: 'willChange,filter,transform' }),
            }
          );
        }
      }
    });
  }

  close(): void {
    if (!this.isOpen() || this.isClosing) return;
    this.onTouched();

    if (this.prefersReducedMotion()) {
      this.isOpen.set(false);
      return;
    }

    this.isClosing = true;

    if (this.isMobile()) {
      const sheet = this.bottomSheetEl()?.nativeElement;
      if (!sheet) {
        this.isClosing = false;
        this.isOpen.set(false);
        return;
      }
      gsap.to(sheet, {
        y: '100%',
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          this.isClosing = false;
          this.isOpen.set(false);
        },
      });
    } else {
      const el = this.popoverEl()?.nativeElement;
      if (!el) {
        this.isClosing = false;
        this.isOpen.set(false);
        return;
      }
      gsap.to(el, {
        autoAlpha: 0,
        y: 6,
        scale: 0.99,
        filter: 'blur(3px)',
        duration: 0.15,
        ease: 'power1.in',
        onComplete: () => {
          this.isClosing = false;
          this.isOpen.set(false);
        },
      });
    }
  }

  selectOption(option: SelectOption<unknown>): void {
    this.value.set(option.value);
    this.onChange(option.value);
    this.close();
    this.triggerBtn()?.nativeElement.focus();
  }

  private recalculatePosition(): void {
    const btn = this.triggerBtn()?.nativeElement ?? this.elementRef.nativeElement;
    const rect = btn.getBoundingClientRect();
    const dropdownHeight = 240;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < dropdownHeight && spaceAbove >= dropdownHeight) {
      this.popoverPosition.set({
        bottom: `${viewportHeight - rect.top + 6}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      });
    } else {
      this.popoverPosition.set({
        top: `${rect.bottom + 6}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      });
    }
  }

  private checkMobile(): void {
    if (typeof window !== 'undefined') {
      this.isMobile.set(window.innerWidth < 640);
    }
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen() || this.isClosing) return;
    const target = event.target as Node;
    const clickedInsideTrigger = this.elementRef.nativeElement.contains(target);
    const clickedInsidePopover = this.popoverEl()?.nativeElement.contains(target);
    const clickedInsideSheet = this.bottomSheetEl()?.nativeElement.contains(target);
    if (!clickedInsideTrigger && !clickedInsidePopover && !clickedInsideSheet) {
      this.close();
    }
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) return;

    if (!this.isOpen()) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        this.open();
      }
      return;
    }

    const opts = this.options();
    if (opts.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusedIndex.update((curr) => (curr + 1) % opts.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusedIndex.update((curr) => (curr - 1 + opts.length) % opts.length);
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const idx = this.focusedIndex();
        if (idx >= 0 && idx < opts.length) {
          this.selectOption(opts[idx]);
        }
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
    if (this.isOpen() && !this.isClosing && !this.isMobile()) {
      this.recalculatePosition();
    }
  }
}


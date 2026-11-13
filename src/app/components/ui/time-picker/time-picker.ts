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

interface PopoverPosition {
  top?: string;
  bottom?: string;
  left: string;
  width: string;
}

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 7; h <= 23; h++) {
    const hh = String(h).padStart(2, '0');
    slots.push(`${hh}:00`);
    slots.push(`${hh}:30`);
  }
  return slots;
}

const DEFAULT_SLOTS = generateTimeSlots();

@Component({
  selector: 'app-time-picker',
  imports: [],
  templateUrl: './time-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimePicker),
      multi: true,
    },
  ],
  host: {
    class: 'relative block w-full',
  },
})
export class TimePicker implements ControlValueAccessor {
  readonly id = input<string>('time-picker-' + Math.random().toString(36).slice(2, 8));
  readonly label = input<string>('Horario');
  readonly placeholder = input<string>('00:00');
  readonly allowClear = input<boolean>(false);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly triggerBtn = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');
  private readonly popoverEl = viewChild<ElementRef<HTMLElement>>('popoverEl');
  private readonly bottomSheetEl = viewChild<ElementRef<HTMLElement>>('bottomSheetEl');
  private readonly activeItemEl = viewChild<ElementRef<HTMLElement>>('activeItem');

  readonly value = signal<string | null>(null);
  readonly disabled = signal<boolean>(false);
  readonly isOpen = signal<boolean>(false);
  readonly isMobile = signal<boolean>(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  readonly popoverPosition = signal<PopoverPosition>({ left: '0px', width: '180px' });
  readonly customInput = signal<string>('');

  private isClosing = false;

  readonly timeSlots = computed<readonly string[]>(() => {
    const val = this.value();
    if (!val || DEFAULT_SLOTS.includes(val)) {
      return DEFAULT_SLOTS;
    }
    return [...DEFAULT_SLOTS, val].sort();
  });

  readonly displayTime = computed(() => {
    const val = this.value();
    return val && /^\d{2}:\d{2}/.test(val) ? val.slice(0, 5) : null;
  });

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    if (value && /^\d{2}:\d{2}/.test(value)) {
      const formatted = value.slice(0, 5);
      this.value.set(formatted);
      this.customInput.set(formatted);
    } else {
      this.value.set(null);
      this.customInput.set('');
    }
  }

  registerOnChange(fn: (value: string | null) => void): void {
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
    this.customInput.set(this.value() ?? '');
    this.isOpen.set(true);

    requestAnimationFrame(() => {
      this.scrollActiveIntoView();

      if (this.prefersReducedMotion()) return;

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
            { autoAlpha: 0, y: 6, scale: 0.99 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.18,
              ease: 'power2.out',
              onComplete: () => gsap.set(el, { clearProps: 'willChange,transform' }),
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
        duration: 0.14,
        ease: 'power1.in',
        onComplete: () => {
          this.isClosing = false;
          this.isOpen.set(false);
        },
      });
    }
  }

  selectTime(time: string): void {
    this.value.set(time);
    this.onChange(time);
    this.close();
    this.triggerBtn()?.nativeElement.focus();
  }

  onCustomInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.trim();
    this.customInput.set(raw);
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) {
      this.value.set(raw);
      this.onChange(raw);
    }
  }

  setMinutes(minutes: string): void {
    const current = this.value() ?? '08:00';
    const hh = current.split(':')[0] || '08';
    this.selectTime(`${hh}:${minutes}`);
  }

  clear(event?: MouseEvent): void {
    event?.stopPropagation();
    this.value.set(null);
    this.onChange(null);
    this.close();
  }

  private scrollActiveIntoView(): void {
    const container = this.popoverEl()?.nativeElement?.querySelector('.slots-container');
    const active = container?.querySelector('.is-selected') as HTMLElement | null;
    if (active && container) {
      container.scrollTop = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2;
    }
  }

  private recalculatePosition(): void {
    const btn = this.triggerBtn()?.nativeElement ?? this.elementRef.nativeElement;
    const rect = btn.getBoundingClientRect();
    const dropdownHeight = 260;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < dropdownHeight && spaceAbove >= dropdownHeight) {
      this.popoverPosition.set({
        bottom: `${viewportHeight - rect.top + 6}px`,
        left: `${rect.left}px`,
        width: `${Math.max(rect.width, 180)}px`,
      });
    } else {
      this.popoverPosition.set({
        top: `${rect.bottom + 6}px`,
        left: `${rect.left}px`,
        width: `${Math.max(rect.width, 180)}px`,
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

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
    if (this.isOpen() && !this.isClosing && !this.isMobile()) {
      this.recalculatePosition();
    }
  }
}

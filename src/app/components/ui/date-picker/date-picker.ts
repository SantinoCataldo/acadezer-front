import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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

function parseIso(iso: string): { year: number; month: number; day: number } | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function toIsoString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayIso(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const val = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${val('year')}-${val('month')}-${val('day')}`;
}

interface CalendarCell {
  iso: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

interface PopoverPosition {
  top?: string;
  bottom?: string;
  left: string;
}

@Component({
  selector: 'app-date-picker',
  imports: [],
  templateUrl: './date-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePicker),
      multi: true,
    },
  ],
  host: {
    class: 'relative inline-block',
  },
})
export class DatePicker implements ControlValueAccessor {
  readonly id = input<string>('date-picker-' + Math.random().toString(36).slice(2, 8));
  readonly label = input<string>('Fecha');
  readonly placeholder = input<string>('Fecha');
  readonly allowClear = input<boolean>(true);
  readonly panelClass = input<string>('');
  readonly errorText = input<string | null>(null);
  readonly required = input(false);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly triggerBtn = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');
  private readonly popoverEl = viewChild<ElementRef<HTMLElement>>('popoverEl');
  private readonly bottomSheetEl = viewChild<ElementRef<HTMLElement>>('bottomSheetEl');

  readonly value = signal<string | null>(null);
  readonly disabled = signal<boolean>(false);
  readonly isOpen = signal<boolean>(false);
  readonly isMobile = signal<boolean>(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  readonly popoverPosition = signal<PopoverPosition>({ left: '0px' });

  private isClosing = false;
  private readonly today = todayIso();
  readonly currentMonth = signal<{ year: number; month: number }>(this.initialMonth());

  readonly weekdayNames = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'] as const;

  readonly monthLabel = computed(() => {
    const { year, month } = this.currentMonth();
    const date = new Date(Date.UTC(year, month - 1, 1));
    const formatted = new Intl.DateTimeFormat('es-AR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  });

  readonly displayText = computed(() => {
    const val = this.value();
    if (!val) return this.label();
    const parsed = parseIso(val);
    if (!parsed) return this.label();
    const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(date);
  });

  readonly calendarCells = computed<CalendarCell[]>(() => {
    const { year, month } = this.currentMonth();
    const selected = this.value();

    const firstDayIndex = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
    const daysInCurrentMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const daysInPrevMonth = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();

    const cells: CalendarCell[] = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = month === 1 ? 12 : month - 1;
      const prevY = month === 1 ? year - 1 : year;
      const iso = toIsoString(prevY, prevM, d);
      cells.push({
        iso,
        dayNumber: d,
        inCurrentMonth: false,
        isToday: iso === this.today,
        isSelected: iso === selected,
      });
    }

    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const iso = toIsoString(year, month, d);
      cells.push({
        iso,
        dayNumber: d,
        inCurrentMonth: true,
        isToday: iso === this.today,
        isSelected: iso === selected,
      });
    }

    const remaining = (7 - (cells.length % 7)) % 7;
    const targetLength = cells.length + remaining;
    const finalLength = targetLength < 35 ? 35 : targetLength;
    const nextCount = finalLength - cells.length;

    for (let d = 1; d <= nextCount; d++) {
      const nextM = month === 12 ? 1 : month + 1;
      const nextY = month === 12 ? year + 1 : year;
      const iso = toIsoString(nextY, nextM, d);
      cells.push({
        iso,
        dayNumber: d,
        inCurrentMonth: false,
        isToday: iso === this.today,
        isSelected: iso === selected,
      });
    }

    return cells;
  });

  private onChange: (val: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    this.destroyRef.onDestroy(() => {
      const el = this.popoverEl()?.nativeElement;
      if (el) gsap.killTweensOf(el);
    });
  }

  private initialMonth(): { year: number; month: number } {
    const parsed = parseIso(this.today);
    return parsed ? { year: parsed.year, month: parsed.month } : { year: 2026, month: 11 };
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  writeValue(val: string | null | undefined): void {
    const cleaned = val && val.trim() ? val.trim() : null;
    this.value.set(cleaned);
    if (cleaned) {
      const parsed = parseIso(cleaned);
      if (parsed) {
        this.currentMonth.set({ year: parsed.year, month: parsed.month });
      }
    }
  }

  registerOnChange(fn: (val: string | null) => void): void {
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
      return;
    }

    this.checkMobile();
    if (!this.isMobile()) {
      this.recalculatePosition();
    }
    const val = this.value();
    const parsed = val ? parseIso(val) : parseIso(this.today);
    if (parsed) {
      this.currentMonth.set({ year: parsed.year, month: parsed.month });
    }
    this.isOpen.set(true);

    if (!this.prefersReducedMotion()) {
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
              { autoAlpha: 0, y: 10, scale: 0.985, filter: 'blur(6px)' },
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                filter: 'blur(0px)',
                duration: 0.24,
                ease: 'power2.out',
                onComplete: () => gsap.set(el, { clearProps: 'willChange,filter,transform' }),
              },
            );
          }
        }
      });
    }
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
      gsap.killTweensOf(el);
      gsap.to(el, {
        autoAlpha: 0,
        y: 8,
        scale: 0.985,
        filter: 'blur(4px)',
        duration: 0.18,
        ease: 'power1.in',
        onComplete: () => {
          this.isClosing = false;
          this.isOpen.set(false);
        },
      });
    }
  }

  selectDate(iso: string): void {
    this.value.set(iso);
    this.onChange(iso);
    this.close();
  }

  clear(event?: MouseEvent): void {
    event?.stopPropagation();
    this.value.set(null);
    this.onChange(null);
    this.close();
  }

  prevMonth(event: MouseEvent): void {
    event.stopPropagation();
    this.currentMonth.update(({ year, month }) => {
      return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    });
  }

  nextMonth(event: MouseEvent): void {
    event.stopPropagation();
    this.currentMonth.update(({ year, month }) => {
      return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
    });
  }

  selectToday(event: MouseEvent): void {
    event.stopPropagation();
    this.selectDate(this.today);
  }

  private recalculatePosition(): void {
    const btn = this.triggerBtn()?.nativeElement ?? this.elementRef.nativeElement;
    const rect = btn.getBoundingClientRect();
    const calendarHeight = 310;
    const calendarWidth = 288;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const left = Math.max(12, Math.min(rect.left, viewportWidth - calendarWidth - 12));
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < calendarHeight && spaceAbove >= calendarHeight) {
      this.popoverPosition.set({
        bottom: `${viewportHeight - rect.top + 6}px`,
        left: `${left}px`,
      });
    } else {
      this.popoverPosition.set({
        top: `${rect.bottom + 6}px`,
        left: `${left}px`,
      });
    }
  }

  private checkMobile(): void {
    if (typeof window !== 'undefined') {
      this.isMobile.set(window.innerWidth < 640);
    }
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

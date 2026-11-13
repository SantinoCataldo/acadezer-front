import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { DatePicker } from './date-picker';

describe('DatePicker', () => {
  let fixture: ComponentFixture<DatePicker>;

  function open(): void {
    fixture = TestBed.createComponent(DatePicker);
    fixture.componentRef.setInput('id', 'fecha');
    fixture.componentRef.setInput('label', 'Fecha');
    fixture.detectChanges();
  }

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement;
  }

  function dayButton(day: number): HTMLButtonElement {
    const cell = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.trim() === String(day)) as HTMLButtonElement;
    return cell;
  }

  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    TestBed.configureTestingModule({ imports: [DatePicker, FormsModule] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('shows the label until a date is chosen', () => {
    open();

    expect(trigger().textContent).toContain('Fecha');
  });

  it('opens the calendar and writes the chosen date into the control', () => {
    open();
    trigger().click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fixture.componentInstance.isOpen()).toBe(true);

    dayButton(15).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toMatch(/-\d{2}-15$/);
    expect(trigger().textContent).not.toContain('Fecha');
  });

  it('reads the value written by the form control', () => {
    open();
    fixture.componentInstance.writeValue('2026-09-20');
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('2026-09-20');
    expect(fixture.nativeElement.textContent).toContain('septiembre');
  });

  it('moves to the next month and keeps the chosen day', () => {
    open();
    trigger().click();
    fixture.detectChanges();

    const labelBefore = fixture.componentInstance.monthLabel();
    (
      fixture.nativeElement.querySelector('button[aria-label="Mes siguiente"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.monthLabel()).not.toBe(labelBefore);

    dayButton(8).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toMatch(/-\d{2}-08$/);
  });

  it('clears the value when there is nothing chosen', () => {
    open();
    fixture.componentInstance.writeValue('2026-09-20');
    fixture.detectChanges();

    trigger().click();
    fixture.detectChanges();

    const clear = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Sin fecha')) as HTMLButtonElement;
    clear.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBeNull();
  });

  it('disables the trigger when the control is disabled', () => {
    open();
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();

    expect(trigger().disabled).toBe(true);
  });

  it('shows the error text once the form reports one', () => {
    open();
    fixture.componentRef.setInput('errorText', 'Elegí la fecha del examen');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Elegí la fecha del examen');
    expect(trigger().getAttribute('aria-invalid')).toBe('true');
  });

  it('reports the chosen date to the form control', () => {
    open();
    const seen: (string | null)[] = [];
    fixture.componentInstance.registerOnChange((value) => seen.push(value));
    fixture.detectChanges();

    trigger().click();
    fixture.detectChanges();
    dayButton(12).click();

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatch(/-\d{2}-12$/);
  });
});

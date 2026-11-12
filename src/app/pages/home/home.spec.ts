import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home';

/** Destino de los routerLink: solo hace falta que exista la ruta. */
@Component({ selector: 'app-route-stub', template: '' })
class RouteStub {}

describe('HomeComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([
          { path: 'login', component: RouteStub },
          { path: 'register', component: RouteStub },
        ]),
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function open(): ComponentFixture<HomeComponent> {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('presenta la propuesta de valor y lleva a crear cuenta o iniciar sesión', () => {
    const fixture = open();
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Todo lo que estudiás, en un solo lugar.');

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    );
    expect(links.some((link) => link.getAttribute('href') === '/register')).toBe(true);
    expect(links.some((link) => link.getAttribute('href') === '/login')).toBe(true);
  });

  it('tiene una sola jerarquía de títulos: un h1 y secciones con h2', () => {
    const fixture = open();

    expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);

    const headings = Array.from(
      fixture.nativeElement.querySelectorAll('h2') as NodeListOf<HTMLHeadingElement>,
    );
    expect(headings.map((heading) => heading.textContent?.trim())).toEqual([
      'Lo que hace Acadezer',
      'Cómo funciona',
      'Preguntas frecuentes',
      'Empezá a organizar la cursada hoy',
    ]);
  });

  it('expone las anclas que usa la barra fija', () => {
    const fixture = open();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('#funciones')).toBeTruthy();
    expect(root.querySelector('#como-funciona')).toBeTruthy();
    expect(root.querySelector('#preguntas')).toBeTruthy();

    const anchors = Array.from(
      root.querySelectorAll('header a[href^="#"]') as NodeListOf<HTMLAnchorElement>,
    );
    expect(anchors.map((anchor) => anchor.getAttribute('href'))).toEqual([
      '#funciones',
      '#como-funciona',
      '#preguntas',
    ]);
  });

  it('muestra las preguntas como detalles plegables, no como texto suelto', () => {
    const fixture = open();
    const details = fixture.nativeElement.querySelectorAll('details');

    expect(details.length).toBe(5);
    expect((details[0] as HTMLDetailsElement).querySelector('summary')?.textContent).toContain(
      '¿Tiene costo?',
    );
  });

  it('marca la vista previa del hero como ilustrativa para lectores de pantalla', () => {
    const fixture = open();
    const figure = fixture.nativeElement.querySelector('figure');

    expect(figure?.getAttribute('aria-hidden')).toBeNull();
    expect(figure?.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(figure?.querySelector('figcaption')?.textContent).toContain('Vista ilustrada');
  });
});

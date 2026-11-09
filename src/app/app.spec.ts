import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { Router, provideRouter } from '@angular/router';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the home page through the configured lazy route', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    const root: unknown = fixture.nativeElement;
    if (!(root instanceof HTMLElement)) throw new Error('Missing application root');
    expect(root.querySelector('h1')?.textContent).toContain('Home');
  });
});

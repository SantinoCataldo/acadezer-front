import { Injectable, signal } from '@angular/core';
import type { EstadoBuho } from '../components/buho/buho';

@Injectable({ providedIn: 'root' })
export class BuhoStateService {
  readonly estado = signal<EstadoBuho>('normal');
  readonly mirada = signal<number>(0);
  readonly espiando = signal<boolean>(false);

  setEstado(estado: EstadoBuho): void {
    this.estado.set(estado);
  }

  setMirada(mirada: number): void {
    this.mirada.set(mirada);
  }

  setEspiando(espiando: boolean): void {
    this.espiando.set(espiando);
  }

  reset(): void {
    this.estado.set('normal');
    this.mirada.set(0);
    this.espiando.set(false);
  }
}

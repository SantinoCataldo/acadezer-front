import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TextField } from '../../../../components/ui/text-field/text-field';
import { DatePicker } from '../../../../components/ui/date-picker/date-picker';
import { TareaService } from '../../tarea-service';
import { TareaRequest } from '../../tarea';

@Component({
  selector: 'app-tarea-form',
  imports: [ReactiveFormsModule, RouterLink, TextField, DatePicker],
  templateUrl: './tarea-form.html',
})
export class TareaForm implements OnInit {
  private tareaService = inject(TareaService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  id = this.route.snapshot.paramMap.get('id');
  materiaId = Number(this.route.snapshot.paramMap.get('materiaId'));
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly submitError = signal('');

  form = new FormGroup({
    titulo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    descripcion: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
    fechaLimite: new FormControl('', { nonNullable: true }),
  });

  ngOnInit() {
    if (this.id) this.cargarTarea();
  }

  cargarTarea(): void {
    if (!this.id || this.loading()) return;
    this.loading.set(true);
    this.loadError.set('');

    this.tareaService.getTarea(Number(this.id)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (tarea) => {
          this.materiaId = tarea.materiaId;
          this.form.patchValue({
            titulo: tarea.titulo,
            descripcion: tarea.descripcion ?? '',
            fechaLimite: tarea.fechaLimite ?? '',
          });
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('No se pudo cargar la tarea. Revisá tu conexión e intentá nuevamente.');
          this.loading.set(false);
        },
      });
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving() || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitError.set('');
    this.saving.set(true);
    const values = this.form.getRawValue();
    const tarea: TareaRequest = {
      titulo: values.titulo.trim(),
      descripcion: values.descripcion.trim() || null,
      fechaLimite: values.fechaLimite || null,
    };

    const request = this.id
      ? this.tareaService.editarTarea(Number(this.id), tarea)
      : this.tareaService.crearTarea(this.materiaId, tarea);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.volverALista();
      },
      error: () => {
        this.submitError.set(`No se pudo ${this.id ? 'editar' : 'crear'} la tarea. Revisá tu conexión e intentá nuevamente.`);
        this.saving.set(false);
      },
    });
  }

  volverALista(): void {
    this.router.navigate(['/estudio/tareas'], { queryParams: { materia: this.materiaId } });
  }
}

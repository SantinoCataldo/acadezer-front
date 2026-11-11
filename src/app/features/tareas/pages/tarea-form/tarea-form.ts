import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TareaService } from '../../tarea-service';
import { TareaRequest } from '../../tarea';

@Component({
  selector: 'app-tarea-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './tarea-form.html',
})
export class TareaForm {
  private tareaService = inject(TareaService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  materiaId = Number(this.route.snapshot.paramMap.get('materiaId'));

  form = new FormGroup({
    titulo: new FormControl('', [Validators.required, Validators.maxLength(200)]),
    descripcion: new FormControl('', Validators.maxLength(2000)),
    fechaLimite: new FormControl('')
  })

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const tarea: TareaRequest = {
      titulo: this.form.value.titulo!,
      descripcion: this.form.value.descripcion ? this.form.value.descripcion : null,
      fechaLimite: this.form.value.fechaLimite ? this.form.value.fechaLimite : null
    };

    this.tareaService.crearTarea(this.materiaId, tarea).subscribe({
      next: () => {
        this.router.navigate(['/estudio/tareas'], { queryParams: { materia: this.materiaId } });
      },
      error: (e) => {
        alert('Error al crear la tarea');
      }
    })
  }
}

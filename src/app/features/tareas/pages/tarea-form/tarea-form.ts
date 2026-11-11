import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TareaService } from '../../tarea-service';
import { TareaRequest } from '../../tarea';

@Component({
  selector: 'app-tarea-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './tarea-form.html',
})
export class TareaForm implements OnInit {
  private tareaService = inject(TareaService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  id = this.route.snapshot.paramMap.get('id');
  materiaId = Number(this.route.snapshot.paramMap.get('materiaId'));

  form = new FormGroup({
    titulo: new FormControl('', [Validators.required, Validators.maxLength(200)]),
    descripcion: new FormControl('', Validators.maxLength(2000)),
    fechaLimite: new FormControl('')
  })

  ngOnInit() {
    if (this.id) {
      this.tareaService.getTarea(Number(this.id)).subscribe({
        next: (tarea) => {
          this.materiaId = tarea.materiaId;
          this.form.patchValue({
            titulo: tarea.titulo,
            descripcion: tarea.descripcion,
            fechaLimite: tarea.fechaLimite
          });
        },
        error: (e) => {
          alert('Error al cargar la tarea');
        }
      })
    }
  }

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

    if (this.id) {
      this.tareaService.editarTarea(Number(this.id), tarea).subscribe({
        next: () => {
          this.volverALista();
        },
        error: (e) => {
          alert('Error al editar la tarea');
        }
      })
    } else {
      this.tareaService.crearTarea(this.materiaId, tarea).subscribe({
        next: () => {
          this.volverALista();
        },
        error: (e) => {
          alert('Error al crear la tarea');
        }
      })
    }
  }

  volverALista() {
    this.router.navigate(['/estudio/tareas'], { queryParams: { materia: this.materiaId } });
  }
}

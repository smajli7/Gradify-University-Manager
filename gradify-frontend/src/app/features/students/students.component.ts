import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page animate-slide-up">
      <h1>Studenten</h1>
      <p class="text-muted">Studentenverwaltung - Wird in Commit 4b implementiert</p>
      
      <div class="card mt-lg">
        <p>Hier werden Studenten angezeigt und verwaltet.</p>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: var(--spacing-md) 0; }
  `]
})
export class StudentsComponent {}

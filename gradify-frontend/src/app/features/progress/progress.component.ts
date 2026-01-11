import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page animate-slide-up">
      <h1>Mein Fortschritt</h1>
      <p class="text-muted">ECTS, Durchschnitt und Prognose</p>
      
      <div class="card mt-lg">
        <p>Hier wird dein Studienfortschritt angezeigt.</p>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: var(--spacing-md) 0; }
  `]
})
export class ProgressComponent {}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page animate-slide-up">
      <h1>Statistik</h1>
      <p class="text-muted">Auswertungen und Diagramme</p>
      
      <div class="card mt-lg">
        <p>Hier werden Statistiken und Diagramme angezeigt.</p>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: var(--spacing-md) 0; }
  `]
})
export class StatsComponent {}

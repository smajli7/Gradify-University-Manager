import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-grades',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page animate-slide-up">
      <h1>Noten</h1>
      <p class="text-muted">Notenuebersicht - Wird in Commit 4b implementiert</p>
      
      <div class="card mt-lg">
        <p>Hier werden Noten angezeigt und erfasst.</p>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: var(--spacing-md) 0; }
  `]
})
export class GradesComponent {}

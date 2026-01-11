import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calculation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page animate-slide-up">
      <h1>Berechnung</h1>
      <p class="text-muted">Gesamtnoten nach PO-Gewichtung berechnen</p>
      
      <div class="card mt-lg">
        <p>Hier werden Gesamtnoten und Durchschnitte berechnet.</p>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: var(--spacing-md) 0; }
  `]
})
export class CalculationComponent {}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-validation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page animate-slide-up">
      <h1>Notenvalidierung</h1>
      <p class="text-muted">Noten pruefen und freigeben</p>
      
      <div class="card mt-lg">
        <p>Hier werden Noten validiert und freigegeben.</p>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: var(--spacing-md) 0; }
  `]
})
export class ValidationComponent {}

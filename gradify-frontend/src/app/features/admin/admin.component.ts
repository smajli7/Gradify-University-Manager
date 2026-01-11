import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page animate-slide-up">
      <h1>Administration</h1>
      <p class="text-muted">Mandanten, Studiengaenge und Pruefungsordnungen</p>
      
      <div class="card mt-lg">
        <p>Hier werden Systemeinstellungen verwaltet.</p>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: var(--spacing-md) 0; }
  `]
})
export class AdminComponent {}

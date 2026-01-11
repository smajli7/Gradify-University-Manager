import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page animate-slide-up">
      <h1>Mein Profil</h1>
      <p class="text-muted">Persoenliche Daten und Einstellungen</p>
      
      <div class="card mt-lg">
        <p>Hier kannst du dein Profil bearbeiten.</p>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: var(--spacing-md) 0; }
  `]
})
export class ProfileComponent {}

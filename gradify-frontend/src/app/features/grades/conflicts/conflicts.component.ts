import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-conflicts',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page pa-page">
      <header class="page-header">
        <div class="header-content">
          <h1 class="page-title">Rückfragen / Konflikte</h1>
          <p class="page-subtitle">Zurückgewiesen, Konflikte automatisch erkannt – nichts soll untergehen.</p>
        </div>
      </header>
      <div class="card empty-state-card">
        <p class="empty-state-text">Hier erscheinen: Zurückgewiesen (wartet auf Korrektur), Konflikte (Versuch, doppelte Einträge, fehlendes Datum, Note außer Skala).</p>
        <p class="empty-state-hint">Filter-Chips und Schnellaktionen: „An Dozent senden“, „Manuell überschreiben“.</p>
        <a routerLink="/grades/validation" class="btn btn-primary">Zur Validierung</a>
      </div>
    </div>
  `,
  styles: [`
    .pa-page { padding: 0; }
    .page-header { margin-bottom: var(--spacing-xl); }
    .page-title { font-size: 1.75rem; font-weight: 700; margin: 0 0 var(--spacing-xs) 0; color: var(--text-primary); }
    .page-subtitle { font-size: 0.9375rem; color: var(--text-muted); margin: 0; }
    .empty-state-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: var(--spacing-xl);
      text-align: center;
    }
    .empty-state-text { color: var(--text-secondary); margin: 0 0 var(--spacing-sm) 0; }
    .empty-state-hint { font-size: 0.875rem; color: var(--text-muted); margin: 0 0 var(--spacing-lg) 0; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 8px; font-weight: 500; text-decoration: none; border: none; cursor: pointer; }
    .btn-primary { background: var(--text-primary); color: var(--bg-deep); }
  `]
})
export class ConflictsComponent {}

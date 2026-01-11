import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-page">
      <h1 class="page-title animate-slide-up">Dashboard</h1>
      <p class="page-subtitle animate-slide-up">Willkommen zurueck! Hier ist deine Uebersicht.</p>

      <!-- Stats Cards -->
      <div class="stats-grid mt-lg">
        <div class="stat-card animate-slide-up" style="animation-delay: 100ms">
          <div class="stat-icon stat-icon--primary">
            <span class="material-icons-outlined">school</span>
          </div>
          <div class="stat-content">
            <span class="stat-value">1.7</span>
            <span class="stat-label">Durchschnitt</span>
          </div>
        </div>

        <div class="stat-card animate-slide-up" style="animation-delay: 200ms">
          <div class="stat-icon stat-icon--success">
            <span class="material-icons-outlined">check_circle</span>
          </div>
          <div class="stat-content">
            <span class="stat-value">24</span>
            <span class="stat-label">Bestandene Module</span>
          </div>
        </div>

        <div class="stat-card animate-slide-up" style="animation-delay: 300ms">
          <div class="stat-icon stat-icon--secondary">
            <span class="material-icons-outlined">trending_up</span>
          </div>
          <div class="stat-content">
            <span class="stat-value">144</span>
            <span class="stat-label">ECTS erreicht</span>
          </div>
        </div>

        <div class="stat-card animate-slide-up" style="animation-delay: 400ms">
          <div class="stat-icon stat-icon--warning">
            <span class="material-icons-outlined">pending</span>
          </div>
          <div class="stat-content">
            <span class="stat-value">3</span>
            <span class="stat-label">Offene Pruefungen</span>
          </div>
        </div>
      </div>

      <!-- Recent Grades -->
      <section class="section mt-xl animate-slide-up" style="animation-delay: 500ms">
        <div class="section-header">
          <h2>Letzte Noten</h2>
          <a routerLink="/grades" class="btn btn--secondary btn--sm">
            Alle anzeigen
            <span class="material-icons-outlined">arrow_forward</span>
          </a>
        </div>

        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Modul</th>
                <th>Datum</th>
                <th>Note</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div class="module-info">
                    <span class="module-name">Mathematik I</span>
                    <span class="module-code text-muted">MAT101</span>
                  </div>
                </td>
                <td>15.01.2026</td>
                <td><span class="grade grade--1">1.3</span></td>
                <td><span class="badge badge--success">Bestanden</span></td>
              </tr>
              <tr>
                <td>
                  <div class="module-info">
                    <span class="module-name">Physik</span>
                    <span class="module-code text-muted">PHY101</span>
                  </div>
                </td>
                <td>12.01.2026</td>
                <td><span class="grade grade--2">2.0</span></td>
                <td><span class="badge badge--success">Bestanden</span></td>
              </tr>
              <tr>
                <td>
                  <div class="module-info">
                    <span class="module-name">Programmieren II</span>
                    <span class="module-code text-muted">INF202</span>
                  </div>
                </td>
                <td>08.01.2026</td>
                <td><span class="grade grade--3">2.7</span></td>
                <td><span class="badge badge--primary">Validiert</span></td>
              </tr>
              <tr>
                <td>
                  <div class="module-info">
                    <span class="module-name">Statistik</span>
                    <span class="module-code text-muted">STA101</span>
                  </div>
                </td>
                <td>05.01.2026</td>
                <td><span class="grade grade--4">3.7</span></td>
                <td><span class="badge badge--warning">Erfasst</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .dashboard-page {
      padding: var(--spacing-md) 0;
    }

    .page-title {
      margin-bottom: var(--spacing-xs);
    }

    .page-subtitle {
      color: var(--text-muted);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--spacing-lg);
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      transition: all var(--transition-normal);
    }

    .stat-card:hover {
      border-color: var(--border-color-light);
      transform: translateY(-2px);
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-lg);
      font-size: 28px;
    }

    .stat-icon--primary {
      background: rgba(var(--color-primary-rgb), 0.15);
      color: var(--color-primary);
    }

    .stat-icon--success {
      background: rgba(var(--color-success-rgb), 0.15);
      color: var(--color-success);
    }

    .stat-icon--secondary {
      background: rgba(var(--color-secondary-rgb), 0.15);
      color: #a855f7;
    }

    .stat-icon--warning {
      background: rgba(var(--color-warning-rgb), 0.15);
      color: var(--color-warning);
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1;
    }

    .stat-label {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      margin-top: var(--spacing-xs);
    }

    /* Section */
    .section {
      margin-top: var(--spacing-xl);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);
    }

    .section-header h2 {
      font-size: var(--font-size-lg);
    }

    /* Table Customization */
    .module-info {
      display: flex;
      flex-direction: column;
    }

    .module-name {
      font-weight: 500;
      color: var(--text-primary);
    }

    .module-code {
      font-size: var(--font-size-xs);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
      }
    }
  `]
})
export class DashboardComponent {}

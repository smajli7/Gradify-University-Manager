import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SkeletonStateComponent } from '../../shared/components/skeleton-state/skeleton-state.component';

// Query für alle Studenten (User-Service)
const GET_STUDENTS_QUERY = gql`
  query GetAllStudents {
    students {
      id
      vorname
      nachname
      matrikelnummer
    }
  }
`;

// Query für Einschreibungen (Studiengang-Service)
const GET_EINSCHREIBUNGEN_QUERY = gql`
  query GetEinschreibungen($studentId: ID!) {
    einschreibungen(studentId: $studentId) {
      id
      aktuellesSemester
      studiengang {
        id
        name
        kuerzel
      }
    }
  }
`;

// Query für Fortschrittsdaten (Studiengang-Service) – ohne Module (werden separat geladen)
const PROGRESS_EINSCHREIBUNG_QUERY = gql`
  query GetProgressData($einschreibungId: ID!) {
    einschreibung(id: $einschreibungId) {
      id
      aktuellesSemester
      immatrikuliertAm
      studiengang {
        id
        name
        kuerzel
        gesamtEcts
        regelstudienzeit
      }
      poId
      pruefungsordnung {
        id
        version
      }
    }
  }
`;

// Query für Noten (Noten-Service)
const PROGRESS_NOTEN_QUERY = gql`
  query GetProgressNoten($einschreibungId: ID!) {
    notenByStudent(einschreibungId: $einschreibungId) {
      id
      modulId
      noteWert
      bestanden
      status
      pruefungsdatum
    }
  }
`;

// Module separat laden (Studiengang-Service) – zuverlässiger als verschachtelte Auflösung
const PROGRESS_MODULE_QUERY = gql`
  query GetModuleForProgress($studiengangId: ID, $poId: ID) {
    module(studiengangId: $studiengangId, poId: $poId) {
      id
      modulNr
      name
      ects
      semester
      gewichtung
      inGesamtnote
    }
  }
`;

interface StudentOption {
  id: string;
  name: string;
  matrikelnummer: string;
}

interface EinschreibungOption {
  id: string;
  studiengang: string;
  kuerzel: string;
  semester: number;
}

interface SemesterProgress {
  semester: number;
  ects: number;
  ectsGesamt: number;
  bestandenCount: number;
  modulCount: number;
  durchschnitt: number | null;
}

export type ModulStatus = 'offen' | 'bestanden' | 'nicht-bestanden';

interface ModulWithStatus {
  id: string;
  modulNr: string;
  name: string;
  ects: number;
  semester: number;
  status: ModulStatus;
  noteWert: number | null;
  noteId?: string;
}

interface RoadmapSemester {
  semester: number;
  ects: number;
  ectsGesamt: number;
  durchschnitt: number | null;
  module: ModulWithStatus[];
}

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SkeletonStateComponent],
  template: `
    <div class="page animate-slide-up">
      <div class="page-header">
        <div class="header-content">
          <h1>Mein Fortschritt</h1>
          <p class="text-muted">ECTS, Durchschnitt und Studienfortschritt</p>
        </div>
      </div>

      <!-- Auswahl (nur für Nicht-Studenten) -->
      @if (canSelectStudent()) {
        <div class="selection-controls">
          <div class="control-group">
            <label>Student:</label>
            <select
              class="select-input"
              [(ngModel)]="selectedStudent"
              (change)="onStudentChange()"
              [disabled]="loadingStudents()">
              <option value="">-- Student wählen --</option>
              @for (student of students(); track student.id) {
                <option [value]="student.id">{{ student.name }} ({{ student.matrikelnummer }})</option>
              }
            </select>
          </div>

          <div class="control-group">
            <label>Einschreibung:</label>
            <select
              class="select-input"
              [(ngModel)]="selectedEinschreibung"
              (change)="loadData()"
              [disabled]="!selectedStudent || einschreibungen().length === 0">
              <option value="">-- Einschreibung wählen --</option>
              @for (e of einschreibungen(); track e.id) {
                <option [value]="e.id">{{ e.studiengang }} ({{ e.kuerzel }}) - {{ e.semester }}. Sem</option>
              }
            </select>
          </div>

          <button class="btn btn--primary" (click)="loadData()" [disabled]="!selectedEinschreibung || loading()">
            @if (loading()) {
              <span class="spinner-sm"></span>
            } @else {
              <span>Laden</span>
            }
          </button>
        </div>
      }

      <!-- Einschreibungs-Auswahl für Studenten -->
      @if (isStudent() && einschreibungen().length > 1) {
        <div class="selection-controls">
          <div class="control-group">
            <label>Einschreibung:</label>
            <select
              class="select-input"
              [(ngModel)]="selectedEinschreibung"
              (change)="loadData()">
              @for (e of einschreibungen(); track e.id) {
                <option [value]="e.id">{{ e.studiengang }} ({{ e.kuerzel }}) - {{ e.semester }}. Sem</option>
              }
            </select>
          </div>
        </div>
      }

      <!-- Loading -->
      @if (loadingStudents() || loading()) {
        <app-skeleton-state [lineCount]="6" />
      }

      <!-- Error -->
      @if (error()) {
        <div class="error-state">
          <span class="error-icon">!</span>
          <p>{{ error() }}</p>
          @if (isStudent()) {
            <button class="btn btn--primary" (click)="loadOwnData()">Erneut versuchen</button>
          } @else {
            <button class="btn btn--primary" (click)="loadStudents()">Erneut versuchen</button>
          }
        </div>
      }

      <!-- Content -->
      @if (!loading() && !error() && dataLoaded()) {
        <!-- A) Sticky Header: ein Satz + Plan ansehen -->
        <header class="progress-sticky-header">
          <p class="progress-sticky-line">
            Noch <strong>{{ totalEcts() - ectsErreicht() }} ECTS</strong> bis Abschluss · {{ offenCount() }} Module offen · Ø <strong>{{ durchschnitt() !== null ? (durchschnitt() | number:'1.2-2') : '–' }}</strong>
          </p>
          <div class="progress-sticky-actions">
            <a routerLink="/study-plan" class="btn btn--primary btn--sm">Plan ansehen</a>
          </div>
        </header>

        <!-- B) Dein Stand – kompakter Fortschritts-Puls -->
        <section class="progress-pulse-section">
          <div class="progress-pulse-bar-wrap">
            <div class="progress-pulse-bar" [style.width.%]="progressPercent()"></div>
          </div>
          <div class="progress-pulse-meta">
            <span class="progress-pulse-ects">{{ ectsErreicht() }} / {{ totalEcts() }} ECTS</span>
            @if (ectsErreicht() < totalEcts() && ectsProSemester() > 0) {
              <span class="progress-pulse-hint">Bei {{ ectsProSemester() | number:'1.0-0' }} ECTS/Sem → Abschluss in ca. {{ semesterBisAbschluss() }} Sem.</span>
            }
          </div>
          @if (nextActions().length > 0) {
            <div class="progress-pulse-cta">
              <span class="progress-pulse-next">Nächster Schritt: {{ nextActions()[0].name }} ({{ nextActions()[0].ects }} ECTS)</span>
              <a [routerLink]="['/study-plan']" class="btn btn--primary btn--sm">Zum Studienplan</a>
            </div>
          }
        </section>

        <!-- C) Roadmap + D) Insights (2-Spalten auf Desktop) -->
        <div class="progress-body-grid">
          <div class="roadmap-column">
            <h2 class="section-title">Roadmap</h2>
            <div class="roadmap-accordion">
              @for (row of roadmapBySemester(); track row.semester) {
                <div class="roadmap-semester" [class.roadmap-semester--current]="row.semester === currentSemester()">
                  <button type="button" class="roadmap-semester-head" (click)="toggleRoadmapSemester(row.semester)">
                    <span class="roadmap-semester-title">{{ row.semester }}. Semester {{ row.semester === currentSemester() ? '(aktuell)' : '' }}</span>
                    <span class="roadmap-semester-ects">{{ row.ects }}/{{ row.ectsGesamt }} ECTS</span>
                    @if (row.durchschnitt !== null) {
                      <span class="roadmap-semester-avg">Ø {{ row.durchschnitt | number:'1.1-1' }}</span>
                    }
                    <span class="roadmap-semester-chevron">{{ expandedRoadmapSemester() === row.semester ? '▼' : '▶' }}</span>
                  </button>
                  @if (expandedRoadmapSemester() === row.semester) {
                    <ul class="roadmap-module-list">
                      @for (m of row.module; track m.id) {
                        <li class="roadmap-module-row" (click)="selectedModul.set(m)">
                          <span class="roadmap-module-name">{{ m.name }}</span>
                          <span class="roadmap-module-ects">{{ m.ects }} ECTS</span>
                          <span class="roadmap-module-status roadmap-module-status--{{ m.status }}">{{ m.status === 'bestanden' ? '✓' : m.status === 'offen' ? '○' : '✕' }}</span>
                          <span class="roadmap-module-note">{{ m.noteWert != null ? (m.noteWert | number:'1.1-1') : '-' }}</span>
                          <span class="roadmap-module-arrow">›</span>
                        </li>
                      }
                    </ul>
                  }
                </div>
              }
            </div>
          </div>

          <aside class="insights-column">
            <h3 class="insights-title">Insights</h3>
            <div class="insight-item">
              <span class="insight-label">Pace</span>
              <span class="insight-value">Ø {{ paceEctsPerSem() | number:'1.0-0' }} ECTS/Sem</span>
            </div>
            @if (noteTrendData().length > 0) {
              <div class="insight-item">
                <span class="insight-label">Notentrend</span>
                <div class="mini-sparkline" [attr.aria-label]="'Letzte ' + noteTrendData().length + ' Noten'">
                  @for (v of noteTrendData(); track $index) {
                    <span class="sparkline-bar" [style.height.%]="(v / 5) * 100"></span>
                  }
                </div>
              </div>
            }
            @if (riskHint(); as hint) {
              <div class="insight-item insight-item--risk">
                <span class="insight-label">Hinweis</span>
                <span class="insight-value">{{ hint }}</span>
              </div>
            }
          </aside>
        </div>

        <!-- Modul-Side-Panel -->
        @if (selectedModul(); as modul) {
          <div class="side-panel-overlay" (click)="selectedModul.set(null)">
            <div class="side-panel" (click)="$event.stopPropagation()">
              <div class="side-panel-header">
                <h3>{{ modul.name }}</h3>
                <button type="button" class="side-panel-close" (click)="selectedModul.set(null)">✕</button>
              </div>
              <div class="side-panel-body">
                <p class="side-panel-meta">{{ modul.modulNr }} · {{ modul.ects }} ECTS · {{ modul.semester }}. Sem</p>
                <p class="side-panel-status">Status: {{ modul.status === 'bestanden' ? 'Bestanden' : modul.status === 'offen' ? 'Offen' : 'Nicht bestanden' }}</p>
                @if (modul.noteWert != null) {
                  <p class="side-panel-note">Note: {{ modul.noteWert | number:'1.1-1' }}</p>
                }
                <div class="side-panel-ctas">
                  <a routerLink="/study-plan" class="btn btn--primary btn--sm">Zum Studienplan</a>
                  <a routerLink="/grades" class="btn btn--secondary btn--sm">Zum Notenverlauf</a>
                </div>
              </div>
            </div>
          </div>
        }
      }

      <!-- Empty State (nur für Nicht-Studenten) -->
      @if (!loading() && !loadingStudents() && !error() && !dataLoaded() && canSelectStudent() && students().length > 0) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="12" y1="20" x2="12" y2="10"/>
              <line x1="18" y1="20" x2="18" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="16"/>
            </svg>
          </div>
          <h3>Studienfortschritt</h3>
          <p>Wählen Sie einen Studenten und eine Einschreibung, um den Fortschritt anzuzeigen.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-md) 0;
      min-height: calc(100vh - 140px);
    }

    .page-header {
      margin-bottom: var(--spacing-lg);
    }

    .page-header h1 {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: 1.75rem;
      font-weight: 700;
    }

    .page-header .text-muted {
      color: var(--text-muted);
      margin: 0;
      font-size: var(--font-size-sm);
    }

    /* Selection Controls */
    .selection-controls {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-md);
      align-items: flex-end;
      margin-bottom: var(--spacing-lg);
      padding: var(--spacing-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
    }

    .control-group {
      flex: 1;
      min-width: 200px;
    }

    .control-group label {
      display: block;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      margin-bottom: var(--spacing-xs);
    }

    .select-input {
      width: 100%;
      padding: 10px 14px;
      background: var(--bg-deep);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: 0.95rem;
    }

    .select-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Loading & States */
    .loading-state,
    .error-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--spacing-2xl);
      color: var(--text-muted);
    }

    .spinner-lg {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border-color);
      border-top-color: var(--text-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: var(--spacing-md);
    }

    .spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(0, 0, 0, 0.3);
      border-top-color: var(--bg-deep);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(239, 68, 68, 0.15);
      color: var(--color-danger);
      border-radius: 50%;
      font-size: 24px;
      font-weight: bold;
      margin-bottom: var(--spacing-md);
    }

    .empty-icon {
      color: var(--text-muted);
      margin-bottom: var(--spacing-md);
    }

    .empty-state h3 {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-primary);
    }

    /* A) Sticky Header */
    .progress-sticky-header {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 20px;
      margin: 0 -20px 16px -20px;
      padding-left: 20px;
      padding-right: 20px;
      margin-left: 0;
      margin-right: 0;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      flex-wrap: wrap;
    }

    .progress-sticky-line {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      font-variant-numeric: tabular-nums;
    }

    .progress-sticky-line strong {
      color: var(--text-primary);
    }

    .progress-sticky-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* B) Dein Stand – Fortschritts-Puls */
    .progress-pulse-section {
      padding: var(--spacing-lg);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      margin-bottom: var(--spacing-lg);
    }

    .progress-pulse-bar-wrap {
      height: 8px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: var(--spacing-sm);
    }

    .progress-pulse-bar {
      height: 100%;
      background: linear-gradient(90deg, rgba(34, 197, 94, 0.6), rgba(34, 197, 94, 0.9));
      border-radius: 999px;
      transition: width 0.4s ease;
    }

    .progress-pulse-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-sm);
      font-variant-numeric: tabular-nums;
    }

    .progress-pulse-ects {
      font-weight: 600;
      color: var(--text-primary);
    }

    .progress-pulse-hint {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .progress-pulse-cta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-sm);
      padding-top: var(--spacing-sm);
      border-top: 1px solid var(--border-color);
    }

    .progress-pulse-next {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .progress-pulse-cta .btn {
      flex-shrink: 0;
    }

    /* Section titles */
    .section-title {
      margin: 0 0 12px 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    /* C) Roadmap + D) Insights Grid */
    .progress-body-grid {
      display: grid;
      grid-template-columns: 1fr 220px;
      gap: 20px;
      margin-bottom: 16px;
    }

    .roadmap-column {
      min-width: 0;
    }

    .roadmap-accordion {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .roadmap-semester {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .roadmap-semester--current {
      border-color: rgba(34, 197, 94, 0.35);
    }

    .roadmap-semester-head {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 16px;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: var(--font-size-sm);
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s;
    }

    .roadmap-semester-head:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .roadmap-semester-title {
      flex: 1;
    }

    .roadmap-semester-ects {
      font-variant-numeric: tabular-nums;
      color: var(--text-secondary);
    }

    .roadmap-semester-avg {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .roadmap-semester-chevron {
      font-size: 10px;
      color: var(--text-muted);
    }

    .roadmap-module-list {
      list-style: none;
      margin: 0;
      padding: 0 0 8px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .roadmap-module-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      font-size: var(--font-size-sm);
      cursor: pointer;
      transition: background 0.15s;
    }

    .roadmap-module-row:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .roadmap-module-name {
      flex: 1;
      min-width: 0;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .roadmap-module-ects {
      font-variant-numeric: tabular-nums;
      color: var(--text-muted);
    }

    .roadmap-module-status {
      width: 20px;
      text-align: center;
    }

    .roadmap-module-note {
      min-width: 2.5em;
      font-variant-numeric: tabular-nums;
      text-align: right;
      color: var(--text-secondary);
    }

    .roadmap-module-arrow {
      color: var(--text-muted);
      font-size: 14px;
    }

    /* Insights (rechte Spalte) */
    .insights-column {
      padding: 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      height: fit-content;
    }

    .insights-title {
      margin: 0 0 12px 0;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .insight-item {
      margin-bottom: 12px;
    }

    .insight-item:last-child {
      margin-bottom: 0;
    }

    .insight-label {
      display: block;
      font-size: 10px;
      color: var(--text-muted);
      margin-bottom: 2px;
    }

    .insight-value {
      font-size: var(--font-size-sm);
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      color: var(--text-primary);
    }

    .insight-item--risk .insight-value {
      color: var(--color-warning);
    }

    .mini-sparkline {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 24px;
    }

    .sparkline-bar {
      flex: 1;
      min-width: 4px;
      background: var(--color-success);
      border-radius: 2px;
      opacity: 0.8;
    }

    /* Side Panel */
    .side-panel-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 500;
      display: flex;
      justify-content: flex-end;
    }

    .side-panel {
      width: 100%;
      max-width: 360px;
      background: var(--bg-surface);
      border-left: 1px solid var(--border-color);
      padding: 20px;
      overflow-y: auto;
    }

    .side-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .side-panel-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .side-panel-close {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 18px;
      padding: 0 4px;
    }

    .side-panel-close:hover {
      color: var(--text-primary);
    }

    .side-panel-body {
      font-size: var(--font-size-sm);
    }

    .side-panel-meta {
      margin: 0 0 8px 0;
      color: var(--text-muted);
    }

    .side-panel-status,
    .side-panel-note {
      margin: 0 0 8px 0;
      color: var(--text-secondary);
    }

    .side-panel-ctas {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
    }

    .btn--sm {
      padding: 8px 14px;
      font-size: var(--font-size-sm);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: 10px 18px;
      border-radius: var(--radius-lg);
      font-weight: 500;
      cursor: pointer;
      border: none;
    }

    .btn--primary {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn--primary:hover:not(:disabled) { filter: brightness(1.1); }
    .btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Responsive */
    @media (max-width: 768px) {
      .progress-sticky-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .progress-body-grid {
        grid-template-columns: 1fr;
      }
      .insights-column {
        order: -1;
      }
      .selection-controls { flex-direction: column; }
      .control-group { width: 100%; }
    }
  `]
})
export class ProgressComponent implements OnInit {
  private readonly authService = inject(AuthService);
  
  selectedStudent = '';
  selectedEinschreibung = '';
  circumference = 2 * Math.PI * 54;

  loadingStudents = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  dataLoaded = signal(false);

  // Role-based visibility
  isStudent = computed(() => this.authService.isStudent());
  canSelectStudent = computed(() => !this.isStudent());

  students = signal<StudentOption[]>([]);
  einschreibungen = signal<EinschreibungOption[]>([]);
  einschreibung = signal<any>(null);
  module = signal<any[]>([]);
  noten = signal<any[]>([]);
  
  studiengangName = computed(() => {
    const e = this.einschreibung();
    return e?.studiengang ? `${e.studiengang.name} (${e.studiengang.kuerzel})` : '';
  });
  
  currentSemester = computed(() => this.einschreibung()?.aktuellesSemester || 1);
  regelstudienzeit = computed(() => this.einschreibung()?.studiengang?.regelstudienzeit || 7);

  /** ECTS immer als Zahl (Backend kann String liefern). */
  private static ectsNum(m: { ects?: number | string | null }): number {
    const v = m?.ects;
    if (v == null) return 0;
    return typeof v === 'number' ? v : Number(v) || 0;
  }

  /** BVT: "6-7" (Praxisphase, Bachelor-Arbeit) → Anzeige als 7. Semester. */
  private static normalizeSemesterForDisplay(sem: string | number | null | undefined): number {
    if (sem == null) return 1;
    const s = String(sem).trim();
    if (s === '6-7') return 7;
    const n = Number.parseInt(s, 10);
    return Number.isNaN(n) ? 1 : n;
  }

  /**
   * Nur freigegebene Noten zählen für den Studienfortschritt.
   * ERFASST/VALIDIERT sind Zwischenstände, die der Student nicht sieht.
   */
  freigegebeneNoten = computed(() =>
    this.noten().filter(n => n.status === 'FREIGEGEBEN')
  );

  /** Gesamt-ECTS: bevorzugt Summe der PO-Module, sonst aus Studiengang. */
  totalEcts = computed(() => {
    const mods = this.module();
    if (mods.length > 0) {
      return mods.reduce((sum, m) => sum + ProgressComponent.ectsNum(m), 0);
    }
    const fromStudiengang = this.einschreibung()?.studiengang?.gesamtEcts;
    return fromStudiengang == null ? 0 : (Number(fromStudiengang) || 0);
  });
  totalModules = computed(() => this.module().length);

  /** IDs der Module, die offiziell bestanden sind (nur FREIGEGEBEN). */
  bestandenModulIds = computed(() => {
    return new Set(
      this.freigegebeneNoten()
        .filter(n => n.bestanden === true && n.modulId != null)
        .map(n => String(n.modulId))
    );
  });

  bestandenCount = computed(() => this.bestandenModulIds().size);

  ectsErreicht = computed(() => {
    const ids = this.bestandenModulIds();
    return this.module()
      .filter(m => ids.has(String(m.id ?? '')))
      .reduce((sum, m) => sum + ProgressComponent.ectsNum(m), 0);
  });

  progressPercent = computed(() => {
    const total = this.totalEcts();
    if (total <= 0) return 0;
    return Math.min(100, (this.ectsErreicht() / total) * 100);
  });
  
  progressOffset = computed(() => {
    const percent = this.progressPercent();
    return this.circumference - (percent / 100) * this.circumference;
  });
  
  durchschnitt = computed(() => {
    const bewertet = this.freigegebeneNoten().filter(n => n.noteWert != null && n.bestanden === true);
    if (bewertet.length === 0) return 0;
    const sum = bewertet.reduce((acc, n) => acc + n.noteWert, 0);
    return sum / bewertet.length;
  });
  
  /** Nicht bestanden: freigegebene Note mit bestanden === false. */
  nichtBestandenCount = computed(() =>
    this.freigegebeneNoten().filter(n => n.bestanden === false).length
  );
  
  /** Offen: Module, die noch KEINE freigegebene Note haben. */
  offenCount = computed(() => {
    const modulMitFreigegebenerNote = new Set(
      this.freigegebeneNoten().map(n => String(n.modulId ?? ''))
    );
    return this.module().filter(m => !modulMitFreigegebenerNote.has(String(m.id ?? ''))).length;
  });
  
  bestandenPercent = computed(() => (this.bestandenCount() / Math.max(this.totalModules(), 1)) * 100);
  nichtBestandenPercent = computed(() => (this.nichtBestandenCount() / Math.max(this.totalModules(), 1)) * 100);
  offenPercent = computed(() => (this.offenCount() / Math.max(this.totalModules(), 1)) * 100);
  
  semesterProgress = computed((): SemesterProgress[] => {
    const moduleList = this.module();
    // Nur freigegebene Noten für Fortschritt
    const notenMap = new Map(this.freigegebeneNoten().map(n => [String(n.modulId ?? ''), n]));
    const regelzeit = this.regelstudienzeit();
    
    const result: SemesterProgress[] = [];
    
    for (let sem = 1; sem <= regelzeit; sem++) {
      const semModule = moduleList.filter(m =>
        ProgressComponent.normalizeSemesterForDisplay(m.semester) === sem
      );
      
      const semNoten = semModule
        .map(m => notenMap.get(String(m.id ?? '')))
        .filter(n => n?.bestanden === true);
      
      const ectsGesamt = semModule.reduce((sum, m) => sum + ProgressComponent.ectsNum(m), 0);
      const ectsErreicht = semModule
        .filter(m => notenMap.get(String(m.id ?? ''))?.bestanden === true)
        .reduce((sum, m) => sum + ProgressComponent.ectsNum(m), 0);
      
      const notenMitWert = semNoten.filter(n => n.noteWert !== null);
      const durchschnitt = notenMitWert.length > 0
        ? notenMitWert.reduce((sum, n) => sum + n.noteWert, 0) / notenMitWert.length
        : null;
      
      result.push({
        semester: sem,
        ects: ectsErreicht,
        ectsGesamt,
        bestandenCount: semNoten.length,
        modulCount: semModule.length,
        durchschnitt
      });
    }
    
    return result;
  });
  
  semesterBisAbschluss = computed(() => {
    const offeneEcts = this.totalEcts() - this.ectsErreicht();
    const ectsProSem = this.ectsProSemester();
    if (ectsProSem <= 0) return this.regelstudienzeit() - this.currentSemester();
    return Math.ceil(offeneEcts / ectsProSem);
  });
  
  ectsProSemester = computed(() => {
    const sem = this.currentSemester();
    if (sem <= 0) return 30;
    return this.ectsErreicht() / sem;
  });

  /** Module mit Status für Roadmap & Next Actions (nur freigegebene Noten). */
  modulesWithStatus = computed((): ModulWithStatus[] => {
    const moduleList = this.module();
    // Nur freigegebene Noten bestimmen den Status
    const notenByModul = new Map(
      this.freigegebeneNoten().map(n => [String(n.modulId ?? ''), n])
    );
    return moduleList.map(m => {
      const n = notenByModul.get(String(m.id ?? ''));
      let status: ModulStatus = 'offen';
      let noteWert: number | null = null;
      if (n) {
        noteWert = n.noteWert ?? null;
        if (n.bestanden === true) status = 'bestanden';
        else if (n.bestanden === false) status = 'nicht-bestanden';
      }
      return {
        id: String(m.id ?? ''),
        modulNr: m.modulNr ?? '',
        name: m.name ?? '',
        ects: ProgressComponent.ectsNum(m),
        semester: ProgressComponent.normalizeSemesterForDisplay(m.semester),
        status,
        noteWert,
        noteId: n?.id
      };
    });
  });

  /** Roadmap: pro Semester mit Modulliste (absteigend: 6, 5, 4, …) */
  roadmapBySemester = computed((): RoadmapSemester[] => {
    const list = this.modulesWithStatus();
    const regelzeit = this.regelstudienzeit();
    const bySem = new Map<number, ModulWithStatus[]>();
    for (const m of list) {
      const sem = m.semester;
      if (!bySem.has(sem)) bySem.set(sem, []);
      bySem.get(sem)!.push(m);
    }
    const result: RoadmapSemester[] = [];
    for (let s = regelzeit; s >= 1; s--) {
      const module = [...(bySem.get(s) ?? [])].sort((a, b) => (b.ects ?? 0) - (a.ects ?? 0));
      const ectsGesamt = module.reduce((sum, m) => sum + (m.ects ?? 0), 0);
      const bestanden = module.filter(m => m.status === 'bestanden');
      const ects = bestanden.reduce((sum, m) => sum + (m.ects ?? 0), 0);
      const mitNote = bestanden.filter(m => m.noteWert != null);
      const durchschnitt = mitNote.length > 0
        ? mitNote.reduce((acc, m) => acc + (m.noteWert ?? 0), 0) / mitNote.length
        : null;
      result.push({ semester: s, ects, ectsGesamt, durchschnitt, module });
    }
    return result;
  });

  /** Top 3 „Next Actions“: Offen, nach ECTS absteigend */
  nextActions = computed((): ModulWithStatus[] => {
    return [...this.modulesWithStatus()]
      .filter(m => m.status === 'offen')
      .sort((a, b) => (b.ects ?? 0) - (a.ects ?? 0))
      .slice(0, 3);
  });

  /** Pace: Ø ECTS/Semester (letzte 2 Semester) – vereinfacht: aktuelle Rate */
  paceEctsPerSem = computed(() => this.ectsProSemester());

  /** Risiko-Hinweis: z. B. „4 offene Module, 1 davon 12 ECTS“ */
  riskHint = computed(() => {
    const offen = this.modulesWithStatus().filter(m => m.status === 'offen');
    if (offen.length === 0) return null;
    const maxEcts = Math.max(...offen.map(m => m.ects), 0);
    if (offen.length === 1) return `1 offenes Modul (${maxEcts} ECTS)`;
    return `${offen.length} offene Module, davon 1 mit ${maxEcts} ECTS`;
  });

  /** Notenverlauf für Mini-Sparkline (z. B. letzte 10 Noten nach Datum) */
  noteTrendData = computed(() => {
    const noten = [...this.freigegebeneNoten()].filter((n): n is typeof n & { noteWert: number } => n.noteWert != null);
    return noten
      .slice()
      .sort((a, b) => (b.pruefungsdatum ?? '').localeCompare(a.pruefungsdatum ?? ''))
      .slice(0, 10)
      .map(n => n.noteWert)
      .reverse();
  });

  // UI State: Roadmap-Accordion (null = aktuelles Sem aufgeklappt, 0 = alle zu)
  roadmapExpandedSemester = signal<number | null>(null);

  // Side-Panel: ausgewähltes Modul
  selectedModul = signal<ModulWithStatus | null>(null);

  toggleRoadmapSemester(sem: number): void {
    const cur = this.roadmapExpandedSemester();
    if (cur === sem) this.roadmapExpandedSemester.set(0);
    else this.roadmapExpandedSemester.set(sem);
  }

  expandedRoadmapSemester(): number {
    const v = this.roadmapExpandedSemester();
    if (v === null) return this.currentSemester();
    if (v === 0) return 0;
    return v;
  }

  constructor(private readonly apollo: Apollo) {}

  ngOnInit(): void {
    if (this.isStudent()) {
      this.loadOwnData();
    } else {
      this.loadStudents();
    }
  }

  loadOwnData(): void {
    const studentId = this.authService.getStudentId();
    if (!studentId) {
      this.error.set('Keine Student-ID gefunden. Bitte erneut einloggen.');
      return;
    }

    this.selectedStudent = studentId;
    this.loadingStudents.set(true);
    this.error.set(null);

    this.apollo.query<{ einschreibungen: any[] }>({
      query: GET_EINSCHREIBUNGEN_QUERY,
      variables: { studentId },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    }).subscribe({
      next: (result) => {
        console.log('Einschreibungen Query Result:', result);
        
        // Prüfe zuerst, ob Daten vorhanden sind (auch bei Fehlern)
        const list = result.data?.einschreibungen || [];
        
        if (result.errors && result.errors.length > 0) {
          console.error('GraphQL Errors:', result.errors);
          const errorMsg = result.errors[0].message;
          
          // Wenn Daten vorhanden sind, trotzdem verwenden (könnte nur Warnung sein)
          if (list.length > 0) {
            console.warn('GraphQL Errors vorhanden, aber Daten gefunden. Verwende Daten trotzdem.');
            this.einschreibungen.set(list.map(e => ({
              id: e.id,
              studiengang: e.studiengang?.name || 'Unbekannt',
              kuerzel: e.studiengang?.kuerzel || '?',
              semester: e.aktuellesSemester
            })));
            this.loadingStudents.set(false);
            this.selectedEinschreibung = list[0].id;
            console.log('Auto-selecting einschreibung:', this.selectedEinschreibung);
            this.loadData();
            return;
          }
          
          // Keine Daten vorhanden - zeige Fehler
          this.error.set(`Fehler beim Laden der Einschreibungen: ${errorMsg}`);
          this.loadingStudents.set(false);
          return;
        }

        // list wurde bereits oben deklariert
        console.log('Loaded einschreibungen:', list.length);
        this.einschreibungen.set(list.map(e => ({
          id: e.id,
          studiengang: e.studiengang?.name || 'Unbekannt',
          kuerzel: e.studiengang?.kuerzel || '?',
          semester: e.aktuellesSemester
        })));
        this.loadingStudents.set(false);

        if (list.length > 0) {
          this.selectedEinschreibung = list[0].id;
          console.log('Auto-selecting einschreibung:', this.selectedEinschreibung);
          this.loadData();
        } else {
          this.error.set('Keine Einschreibungen gefunden');
        }
      },
      error: (err) => {
        console.error('Error loading einschreibungen:', err);
        this.error.set(`Fehler beim Laden der Einschreibungen: ${err.message || 'Unbekannter Fehler'}`);
        this.loadingStudents.set(false);
      }
    });
  }

  loadStudents(): void {
    this.loadingStudents.set(true);
    this.error.set(null);

    this.apollo.query<{ students: any[] }>({
      query: GET_STUDENTS_QUERY,
      context: { clientName: 'user' },
      fetchPolicy: 'network-only'
    }).subscribe({
      next: (result) => {
        const list = result.data?.students || [];
        this.students.set(list.map(s => ({
          id: s.id,
          name: `${s.vorname} ${s.nachname}`,
          matrikelnummer: s.matrikelnummer
        })));
        this.loadingStudents.set(false);
      },
      error: (err) => {
        console.error('Error loading students:', err);
        this.error.set('Fehler beim Laden der Studenten. Ist der User-Service gestartet?');
        this.loadingStudents.set(false);
      }
    });
  }

  onStudentChange(): void {
    this.selectedEinschreibung = '';
    this.einschreibungen.set([]);
    this.dataLoaded.set(false);

    if (!this.selectedStudent) return;

    this.apollo.query<{ einschreibungen: any[] }>({
      query: GET_EINSCHREIBUNGEN_QUERY,
      variables: { studentId: this.selectedStudent },
      fetchPolicy: 'network-only'
    }).subscribe({
      next: (result) => {
        const list = result.data?.einschreibungen || [];
        this.einschreibungen.set(list.map(e => ({
          id: e.id,
          studiengang: e.studiengang?.name || 'Unbekannt',
          kuerzel: e.studiengang?.kuerzel || '?',
          semester: e.aktuellesSemester
        })));

        if (list.length > 0) {
          this.selectedEinschreibung = list[0].id;
          this.loadData();
        }
      },
      error: (err) => {
        console.error('Error loading einschreibungen:', err);
        this.error.set('Fehler beim Laden der Einschreibungen');
      }
    });
  }

  loadData(): void {
    if (!this.selectedEinschreibung) return;

    this.loading.set(true);
    this.error.set(null);
    this.dataLoaded.set(false);

    // ── Schritt 1: Einschreibung + Noten parallel laden ──────────────
    const einschreibungQuery = firstValueFrom(this.apollo.query<any>({
      query: PROGRESS_EINSCHREIBUNG_QUERY,
      variables: { einschreibungId: this.selectedEinschreibung },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    })).catch(err => {
      console.error('[Progress] Einschreibung Query Error:', err);
      return { data: null, errors: [{ message: err.message || 'Unbekannter Fehler' }] } as any;
    });

    const notenQuery = firstValueFrom(this.apollo.query<any>({
      query: PROGRESS_NOTEN_QUERY,
      variables: { einschreibungId: this.selectedEinschreibung },
      context: { clientName: 'noten' },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    })).catch(err => {
      console.error('[Progress] Noten Query Error:', err);
      return { data: { notenByStudent: [] }, errors: [] } as any;
    });

    Promise.all([einschreibungQuery, notenQuery]).then(async ([einschreibungResult, notenResult]) => {
      // ── Einschreibung auswerten ────────────────────────────────────
      const data = einschreibungResult?.data?.einschreibung;
      if (!data) {
        const msg = einschreibungResult?.errors?.[0]?.message || 'Einschreibung nicht gefunden';
        console.error('[Progress] Einschreibung fehlt:', msg);
        this.error.set(msg);
        this.loading.set(false);
        return;
      }
      this.einschreibung.set(data);

      // ── Noten setzen ───────────────────────────────────────────────
      const notenList: any[] = notenResult?.data?.notenByStudent || [];
      this.noten.set(notenList);

      // ── Schritt 2: Module separat laden (nicht nested) ─────────────
      // Primär über poId, Fallback über studiengangId.
      // Eigene Top-Level-Query ist zuverlässiger als die verschachtelte
      // Lazy-Auflösung über pruefungsordnung.module.
      const poId = data.poId ?? data.pruefungsordnung?.id;
      const sgId = data.studiengang?.id;

      let moduleList: any[] = [];
      try {
        // Versuch 1: per poId
        if (poId) {
          const res = await firstValueFrom(this.apollo.query<{ module: any[] }>({
            query: PROGRESS_MODULE_QUERY,
            variables: { poId: String(poId) },
            context: { clientName: 'studiengang' },
            fetchPolicy: 'network-only',
            errorPolicy: 'all'
          }));
          moduleList = res?.data?.module ?? [];
        }
        // Versuch 2: per studiengangId (greift auf aktuelle PO im Backend)
        if (moduleList.length === 0 && sgId) {
          console.warn('[Progress] Module per poId leer – versuche über studiengangId', sgId);
          const res = await firstValueFrom(this.apollo.query<{ module: any[] }>({
            query: PROGRESS_MODULE_QUERY,
            variables: { studiengangId: String(sgId) },
            context: { clientName: 'studiengang' },
            fetchPolicy: 'network-only',
            errorPolicy: 'all'
          }));
          moduleList = res?.data?.module ?? [];
        }
      } catch (e) {
        console.error('[Progress] Module laden fehlgeschlagen:', e);
      }

      this.module.set(moduleList);

      // ── Diagnostik ─────────────────────────────────────────────────
      const freigegebene = notenList.filter(n => n.status === 'FREIGEGEBEN');
      const bestandenIds = new Set(
        freigegebene.filter(n => n.bestanden === true).map(n => String(n.modulId))
      );
      const matchedModules = moduleList.filter(m => bestandenIds.has(String(m.id)));
      const ectsSum = matchedModules.reduce((s, m) => s + (Number(m.ects) || 0), 0);

      console.log('[Progress] ──────────────────────────────────────');
      console.log('[Progress] poId:', poId, '| studiengangId:', sgId);
      console.log('[Progress] Module geladen:', moduleList.length);
      console.log('[Progress] Noten gesamt:', notenList.length, '| davon FREIGEGEBEN:', freigegebene.length);
      console.log('[Progress] Bestanden modulIds:', [...bestandenIds]);
      console.log('[Progress] Match:', matchedModules.length, 'Module →', ectsSum, 'ECTS');
      console.log('[Progress] ──────────────────────────────────────');

      this.dataLoaded.set(true);
      this.loading.set(false);
    }).catch(err => {
      console.error('[Progress] Unerwarteter Fehler:', err);
      this.error.set(`Fehler beim Laden der Daten: ${err.message || 'Unbekannter Fehler'}`);
      this.loading.set(false);
    });
  }

  getGradeColor(_noteWert: number | null): string {
    return 'muted';
  }
}

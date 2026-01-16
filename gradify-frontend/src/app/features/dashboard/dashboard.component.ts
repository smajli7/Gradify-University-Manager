import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CalculationService, BerechnungDto, FortschrittDto } from '../../core/services/calculation.service';

// Query für alle Studenten (User-Service)
const GET_STUDENTS_QUERY = gql`
  query GetAllStudents {
    students {
      id
      vorname
      nachname
      matrikelnummer
      status
    }
  }
`;

// Query für Einschreibungen eines Studenten (Studiengang-Service)
const GET_EINSCHREIBUNGEN_QUERY = gql`
  query GetEinschreibungen($studentId: ID!) {
    einschreibungen(studentId: $studentId) {
      id
      aktuellesSemester
      status
      studiengang {
        id
        name
        kuerzel
        gesamtEcts
      }
    }
  }
`;

// Query für Dashboard-Daten einer Einschreibung (Studiengang-Service)
const DASHBOARD_EINSCHREIBUNG_QUERY = gql`
  query GetDashboardEinschreibung($einschreibungId: ID!) {
    einschreibung(id: $einschreibungId) {
      id
      aktuellesSemester
      studiengang {
        id
        name
        kuerzel
        gesamtEcts
      }
      poId
      pruefungsordnung {
        id
        version
        module {
          id
          modulNr
          name
          ects
        }
      }
    }
  }
`;

// Query für Noten (Noten-Service)
const DASHBOARD_NOTEN_QUERY = gql`
  query GetDashboardNoten($einschreibungId: ID!) {
    notenByStudent(einschreibungId: $einschreibungId) {
      id
      modulId
      noteWert
      bestanden
      versuch
      status
      pruefungsdatum
    }
    durchschnittsnote(einschreibungId: $einschreibungId)
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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="dashboard-page">
      <div class="page-header animate-slide-up">
        <div class="header-content">
          <h1>Dashboard</h1>
          <p class="page-subtitle">
            @if (studiengangName()) {
              {{ studiengangName() }} - {{ currentSemester() }}. Semester
            } @else {
              Willkommen! Wählen Sie einen Studenten und eine Einschreibung.
            }
          </p>
        </div>
      </div>

      <!-- Auswahl (nur für Nicht-Studenten sichtbar) -->
      @if (canSelectStudent()) {
        <div class="selection-controls animate-slide-up">
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
              (change)="loadDashboard()"
              [disabled]="!selectedStudent || einschreibungen().length === 0">
              <option value="">-- Einschreibung wählen --</option>
              @for (einschreibung of einschreibungen(); track einschreibung.id) {
                <option [value]="einschreibung.id">
                  {{ einschreibung.studiengang }} ({{ einschreibung.kuerzel }}) - {{ einschreibung.semester }}. Sem
                </option>
              }
            </select>
          </div>

          <button class="btn btn--primary" (click)="loadDashboard()" [disabled]="!selectedEinschreibung || loading()">
            @if (loading()) {
              <span class="spinner-sm"></span>
            } @else {
              <span>Laden</span>
            }
          </button>
        </div>
      }

      <!-- Einschreibungs-Auswahl für Studenten (falls mehrere vorhanden) -->
      @if (isStudent() && einschreibungen().length > 1) {
        <div class="selection-controls animate-slide-up">
          <div class="control-group">
            <label>Einschreibung:</label>
            <select 
              class="select-input" 
              [(ngModel)]="selectedEinschreibung" 
              (change)="loadDashboard()">
              @for (einschreibung of einschreibungen(); track einschreibung.id) {
                <option [value]="einschreibung.id">
                  {{ einschreibung.studiengang }} ({{ einschreibung.kuerzel }}) - {{ einschreibung.semester }}. Sem
                </option>
              }
            </select>
          </div>
        </div>
      }

      <!-- Loading Students -->
      @if (loadingStudents()) {
        <div class="loading-state">
          <div class="spinner-lg"></div>
          <p>Lade Studenten...</p>
        </div>
      }

      <!-- Loading Dashboard -->
      @if (loading() && !loadingStudents()) {
        <div class="loading-state">
          <div class="spinner-lg"></div>
          <p>Lade Dashboard...</p>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="error-state">
          <span class="error-icon">!</span>
          <p>{{ error() }}</p>
          <button class="btn btn--secondary" (click)="loadStudents()">Erneut versuchen</button>
        </div>
      }

      <!-- Dashboard Content -->
      @if (!loading() && !error() && dataLoaded()) {
        <!-- Stats Cards -->
        <div class="stats-grid animate-slide-up">
          <div class="stat-card" style="animation-delay: 100ms">
            <div class="stat-icon stat-icon--primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18"/>
                <path d="M18 17V9"/>
                <path d="M13 17V5"/>
                <path d="M8 17v-3"/>
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-value-wrapper">
                <span class="stat-value">
                  @if (gesamtnote() !== null) {
                    {{ gesamtnote() | number:'1.1-1' }}
                  } @else {
                    -
                  }
                </span>
                <span class="stat-verified-icon" 
                      title="Berechnet durch Berechnungs-Service nach Prüfungsordnung"
                      aria-label="Berechnet durch Berechnungs-Service">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </span>
              </div>
              <span class="stat-label">Gesamtnote</span>
            </div>
          </div>

          <div class="stat-card" style="animation-delay: 200ms">
            <div class="stat-icon stat-icon--success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ bestandenCount() }}</span>
              <span class="stat-label">Bestandene Module</span>
            </div>
          </div>

          <div class="stat-card" style="animation-delay: 300ms">
            <div class="stat-icon stat-icon--secondary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ ectsErreicht() }}</span>
              <span class="stat-label">ECTS erreicht</span>
            </div>
          </div>

          <div class="stat-card" style="animation-delay: 400ms">
            <div class="stat-icon stat-icon--warning">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ offeneModule() }}</span>
              <span class="stat-label">Offene Module</span>
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-section animate-slide-up" style="animation-delay: 450ms">
          <div class="progress-header">
            <span>Studienfortschritt</span>
            <span>{{ ectsErreicht() }} / {{ totalEcts() }} ECTS ({{ progressPercent() | number:'1.0-0' }}%)</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progressPercent()"></div>
          </div>
        </div>

        <!-- Recent Grades -->
        <section class="section animate-slide-up" style="animation-delay: 500ms">
          <div class="section-header">
            <h2>Letzte Noten</h2>
            <a routerLink="/grades" class="btn btn--secondary btn--sm">
              Alle anzeigen
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
                @for (note of recentNoten(); track note.id) {
                  <tr>
                    <td>
                      <div class="module-info">
                        <span class="module-name">{{ getModulName(note.modulId) }}</span>
                        <span class="module-code">{{ getModulNr(note.modulId) }}</span>
                      </div>
                    </td>
                    <td>{{ formatDate(note.pruefungsdatum) }}</td>
                    <td>
                      <span class="grade grade--{{ getNoteColor(note.noteWert) }}">
                        {{ formatNote(note.noteWert) }}
                      </span>
                    </td>
                    <td>
                      <span class="badge badge--{{ getStatusColor(note.status) }}">
                        {{ getStatusLabel(note.status) }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="empty-cell">Noch keine Noten vorhanden</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <!-- Quick Links -->
        <section class="quick-links animate-slide-up" style="animation-delay: 600ms">
          <a routerLink="/study-plan" class="quick-link">
            <span class="quick-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </span>
            <span class="quick-text">Studienverlaufsplan</span>
          </a>
          <a routerLink="/progress" class="quick-link">
            <span class="quick-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="20" x2="12" y2="10"/>
                <line x1="18" y1="20" x2="18" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="16"/>
              </svg>
            </span>
            <span class="quick-text">Mein Fortschritt</span>
          </a>
          <a routerLink="/calculation" class="quick-link">
            <span class="quick-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="4" y="2" width="16" height="20" rx="2"/>
                <line x1="8" y1="6" x2="16" y2="6"/>
                <line x1="8" y1="10" x2="16" y2="10"/>
                <line x1="8" y1="14" x2="12" y2="14"/>
                <line x1="8" y1="18" x2="12" y2="18"/>
              </svg>
            </span>
            <span class="quick-text">Berechnung</span>
          </a>
        </section>
      }

      <!-- Empty State (nur für Nicht-Studenten) -->
      @if (!loading() && !loadingStudents() && !error() && !dataLoaded() && canSelectStudent() && students().length > 0) {
        <div class="empty-state animate-slide-up">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 3v18h18"/>
              <path d="M18 17V9"/>
              <path d="M13 17V5"/>
              <path d="M8 17v-3"/>
            </svg>
          </div>
          <h3>Dashboard</h3>
          <p>Wählen Sie einen Studenten und eine Einschreibung, um das Dashboard anzuzeigen.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-page {
      padding: var(--spacing-md) 0;
      min-height: calc(100vh - 140px);
    }

    .page-header {
      margin-bottom: var(--spacing-lg);
    }

    .page-header h1 {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: 1.75rem;
      font-weight: 600;
    }

    .page-subtitle {
      color: var(--text-muted);
      margin: 0;
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

    .select-input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .select-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Loading & Error States */
    .loading-state,
    .error-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-2xl);
      color: var(--text-muted);
    }

    .spinner-lg {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border-color);
      border-top-color: var(--color-primary);
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
      background: rgba(255, 0, 85, 0.15);
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

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
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
    }

    .stat-icon--primary {
      background: rgba(0, 242, 255, 0.15);
      color: var(--color-primary);
    }

    .stat-icon--success {
      background: rgba(0, 255, 136, 0.15);
      color: var(--color-success);
    }

    .stat-icon--secondary {
      background: rgba(112, 0, 255, 0.15);
      color: var(--color-secondary);
    }

    .stat-icon--warning {
      background: rgba(255, 184, 0, 0.15);
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

    .stat-value-wrapper {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .stat-verified-icon {
      display: inline-flex;
      align-items: center;
      color: var(--color-success);
      opacity: 0.7;
      cursor: help;
      transition: opacity 0.2s ease;
    }

    .stat-verified-icon:hover {
      opacity: 1;
    }

    /* Progress Section */
    .progress-section {
      padding: var(--spacing-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      margin-bottom: var(--spacing-lg);
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .progress-bar {
      height: 10px;
      background: var(--bg-deep);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--color-primary), var(--color-success));
      border-radius: var(--radius-full);
      transition: width 0.5s ease;
    }

    /* Section */
    .section {
      margin-bottom: var(--spacing-lg);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);
    }

    .section-header h2 {
      font-size: var(--font-size-lg);
      margin: 0;
    }

    /* Table */
    .table-container {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
    }

    .table th {
      padding: var(--spacing-md);
      text-align: left;
      font-weight: 500;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--border-color);
    }

    .table td {
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
    }

    .table tr:last-child td {
      border-bottom: none;
    }

    .table tr:hover {
      background: var(--bg-hover);
    }

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
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }

    .grade {
      display: inline-block;
      padding: 4px 10px;
      border-radius: var(--radius-md);
      font-weight: 600;
    }

    .grade--success { background: rgba(0, 255, 136, 0.15); color: var(--color-success); }
    .grade--info { background: rgba(0, 242, 255, 0.15); color: var(--color-primary); }
    .grade--warning { background: rgba(255, 184, 0, 0.15); color: var(--color-warning); }
    .grade--danger { background: rgba(255, 0, 85, 0.15); color: var(--color-danger); }
    .grade--muted { background: var(--bg-hover); color: var(--text-muted); }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: 500;
    }

    .badge--success { background: rgba(0, 255, 136, 0.15); color: var(--color-success); }
    .badge--warning { background: rgba(255, 184, 0, 0.15); color: var(--color-warning); }
    .badge--info { background: rgba(0, 242, 255, 0.15); color: var(--color-primary); }

    .empty-cell {
      text-align: center;
      color: var(--text-muted);
      padding: var(--spacing-xl) !important;
    }

    /* Quick Links */
    .quick-links {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--spacing-md);
    }

    .quick-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-lg);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      text-decoration: none;
      color: var(--text-primary);
      transition: all 0.2s ease;
    }

    .quick-link:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
    }

    .quick-icon {
      color: var(--color-primary);
    }

    .quick-text {
      font-weight: 500;
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
      transition: all 0.15s ease;
      border: none;
      text-decoration: none;
    }

    .btn--primary {
      background: var(--color-primary);
      color: var(--bg-deep);
    }

    .btn--primary:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    .btn--primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn--secondary {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .btn--secondary:hover {
      background: var(--bg-hover);
    }

    .btn--sm {
      padding: 6px 12px;
      font-size: var(--font-size-sm);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
      }

      .selection-controls {
        flex-direction: column;
      }

      .control-group {
        width: 100%;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  
  selectedStudent = '';
  selectedEinschreibung = '';
  
  loadingStudents = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  dataLoaded = signal(false);
  
  // Role-based visibility
  isStudent = computed(() => this.authService.isStudent());
  canSelectStudent = computed(() => !this.isStudent());
  
  // Data
  students = signal<StudentOption[]>([]);
  einschreibungen = signal<EinschreibungOption[]>([]);
  einschreibung = signal<any>(null);
  noten = signal<any[]>([]);
  module = signal<any[]>([]);
  berechnung = signal<BerechnungDto | null>(null);
  fortschritt = signal<FortschrittDto | null>(null);
  
  // Computed
  studiengangName = computed(() => {
    const e = this.einschreibung();
    return e?.studiengang?.name ? `${e.studiengang.name} (${e.studiengang.kuerzel})` : null;
  });
  
  currentSemester = computed(() => this.einschreibung()?.aktuellesSemester || 1);
  totalEcts = computed(() => this.einschreibung()?.studiengang?.gesamtEcts || 0);
  
  // Berechnungsdaten vom Service
  gesamtnote = computed(() => this.berechnung()?.gesamtnote ?? null);
  
  bestandenCount = computed(() => {
    const f = this.fortschritt();
    if (f) return f.moduleBestanden;
    // Fallback: aus Noten berechnen
    return this.noten().filter(n => n.bestanden === true).length;
  });
  
  ectsErreicht = computed(() => {
    const f = this.fortschritt();
    if (f) return f.ectsErreicht;
    // Fallback: aus Noten berechnen
    const bestandeneModulIds = new Set(
      this.noten().filter(n => n.bestanden === true).map(n => n.modulId)
    );
    return this.module()
      .filter(m => bestandeneModulIds.has(m.id))
      .reduce((sum, m) => sum + m.ects, 0);
  });
  
  offeneModule = computed(() => {
    const f = this.fortschritt();
    if (f) return f.moduleOffen;
    // Fallback: aus Noten berechnen
    const bestandeneModulIds = new Set(
      this.noten().filter(n => n.bestanden === true).map(n => n.modulId)
    );
    return this.module().filter(m => !bestandeneModulIds.has(m.id)).length;
  });
  
  progressPercent = computed(() => {
    const f = this.fortschritt();
    if (f) return f.fortschrittProzent;
    // Fallback: aus ECTS berechnen
    const total = this.totalEcts();
    if (total === 0) return 0;
    return (this.ectsErreicht() / total) * 100;
  });
  
  recentNoten = computed(() => {
    return [...this.noten()]
      .sort((a, b) => new Date(b.pruefungsdatum).getTime() - new Date(a.pruefungsdatum).getTime())
      .slice(0, 5);
  });

  private readonly calculationService = inject(CalculationService);

  constructor(private readonly apollo: Apollo) {}

  ngOnInit(): void {
    if (this.isStudent()) {
      // Studenten sehen nur ihre eigenen Daten
      this.loadOwnData();
    } else {
      // Admins/Dozenten/Prüfungsamt können Studenten auswählen
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

    // Lade Einschreibungen für den eingeloggten Studenten
    this.apollo.query<{ einschreibungen: any[] }>({
      query: GET_EINSCHREIBUNGEN_QUERY,
      variables: { studentId },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    }).subscribe({
      next: (result) => {
        console.log('Einschreibungen Query Result:', result);
        
        if (result.errors && result.errors.length > 0) {
          console.error('GraphQL Errors:', result.errors);
          this.error.set(`Fehler beim Laden der Einschreibungen: ${result.errors[0].message}`);
          this.loadingStudents.set(false);
          return;
        }

        const einschreibungList = result.data?.einschreibungen || [];
        console.log('Loaded einschreibungen:', einschreibungList.length);
        
        this.einschreibungen.set(einschreibungList.map(e => ({
          id: e.id,
          studiengang: e.studiengang?.name || 'Unbekannt',
          kuerzel: e.studiengang?.kuerzel || '?',
          semester: e.aktuellesSemester
        })));
        this.loadingStudents.set(false);

        // Automatisch erste Einschreibung auswählen und Dashboard laden
        if (einschreibungList.length > 0) {
          this.selectedEinschreibung = einschreibungList[0].id;
          console.log('Auto-selecting einschreibung:', this.selectedEinschreibung);
          this.loadDashboard();
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
        const studentList = result.data?.students || [];
        this.students.set(studentList.map(s => ({
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

    // Lade Einschreibungen für den gewählten Studenten
    this.apollo.query<{ einschreibungen: any[] }>({
      query: GET_EINSCHREIBUNGEN_QUERY,
      variables: { studentId: this.selectedStudent },
      fetchPolicy: 'network-only'
    }).subscribe({
      next: (result) => {
        const einschreibungList = result.data?.einschreibungen || [];
        this.einschreibungen.set(einschreibungList.map(e => ({
          id: e.id,
          studiengang: e.studiengang?.name || 'Unbekannt',
          kuerzel: e.studiengang?.kuerzel || '?',
          semester: e.aktuellesSemester
        })));

        // Automatisch erste Einschreibung auswählen
        if (einschreibungList.length > 0) {
          this.selectedEinschreibung = einschreibungList[0].id;
          this.loadDashboard();
        }
      },
      error: (err) => {
        console.error('Error loading einschreibungen:', err);
        this.error.set('Fehler beim Laden der Einschreibungen');
      }
    });
  }

  loadDashboard(): void {
    if (!this.selectedEinschreibung) return;

    this.loading.set(true);
    this.error.set(null);
    this.dataLoaded.set(false);

    const einschreibungQuery = this.apollo.query<any>({
      query: DASHBOARD_EINSCHREIBUNG_QUERY,
      variables: { einschreibungId: this.selectedEinschreibung },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });

    const notenQuery = this.apollo.query<any>({
      query: DASHBOARD_NOTEN_QUERY,
      variables: { einschreibungId: this.selectedEinschreibung },
      context: { clientName: 'noten' },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });

    Promise.all([
      firstValueFrom(einschreibungQuery).catch(err => {
        console.error('Einschreibung Query Error:', err);
        return { data: null, errors: [{ message: err.message || 'Unbekannter Fehler' }] };
      }),
      firstValueFrom(notenQuery).catch(err => {
        console.error('Noten Query Error:', err);
        return { data: { notenByStudent: [], durchschnittsnote: null }, errors: [] };
      }),
      // Lade Berechnungsdaten vom Berechnungs-Service
      firstValueFrom(this.calculationService.getGesamtnote(this.selectedEinschreibung)).catch(err => {
        console.warn('Berechnung Service Error:', err);
        return { success: false, data: null, message: err.message || 'Berechnung nicht verfügbar' };
      }),
      firstValueFrom(this.calculationService.getFortschritt(this.selectedEinschreibung)).catch(err => {
        console.warn('Fortschritt Service Error:', err);
        return { success: false, data: null, message: err.message || 'Fortschritt nicht verfügbar' };
      })
    ]).then(([einschreibungResult, notenResult, berechnungResult, fortschrittResult]) => {
      console.log('Einschreibung Result:', einschreibungResult);
      console.log('Noten Result:', notenResult);
      
      // Prüfe auf GraphQL-Fehler
      if (einschreibungResult.errors && einschreibungResult.errors.length > 0) {
        console.error('GraphQL Errors (Einschreibung):', einschreibungResult.errors);
        const errorMsg = einschreibungResult.errors[0].message;
        this.error.set(`Fehler beim Laden der Einschreibung: ${errorMsg}`);
        this.loading.set(false);
        return;
      }

      if (notenResult.errors && notenResult.errors.length > 0) {
        console.warn('GraphQL Errors (Noten):', notenResult.errors);
        // Noten-Fehler sind nicht kritisch, wir zeigen trotzdem das Dashboard
      }

      const einschreibungData = einschreibungResult?.data?.einschreibung;
      
      if (!einschreibungData) {
        this.error.set('Einschreibung nicht gefunden');
        this.loading.set(false);
        return;
      }

      this.einschreibung.set(einschreibungData);
      
      // Module aus Prüfungsordnung laden (kann null sein)
      const moduleList = einschreibungData.pruefungsordnung?.module || [];
      console.log('Loaded modules from PO:', moduleList.length);
      this.module.set(moduleList);
      
      // Noten laden (kann leer sein)
      const notenList = notenResult?.data?.notenByStudent || [];
      console.log('Loaded noten:', notenList.length);
      this.noten.set(notenList);
      
      // Berechnungsdaten vom Berechnungs-Service
      if (berechnungResult?.success && berechnungResult.data) {
        console.log('Loaded berechnung:', berechnungResult.data);
        this.berechnung.set(berechnungResult.data);
      } else {
        console.warn('Berechnung nicht verfügbar, versuche Neuberechnung...');
        // Versuche Neuberechnung zu triggern, wenn poId vorhanden
        const poId = einschreibungData.poId;
        const ectsGesamt = einschreibungData.studiengang?.gesamtEcts || 180;
        if (poId) {
          this.calculationService.berechneGesamtnote(this.selectedEinschreibung, poId, ectsGesamt)
            .subscribe({
              next: (result) => {
                if (result.success && result.data) {
                  this.berechnung.set(result.data);
                }
              },
              error: (err) => console.warn('Neuberechnung fehlgeschlagen:', err)
            });
        }
      }
      
      // Fortschrittsdaten vom Berechnungs-Service
      if (fortschrittResult?.success && fortschrittResult.data) {
        console.log('Loaded fortschritt:', fortschrittResult.data);
        this.fortschritt.set(fortschrittResult.data);
      }
      
      console.log('Loaded modules:', this.module().length);
      console.log('Loaded noten:', this.noten().length);
      
      this.dataLoaded.set(true);
      this.loading.set(false);
    }).catch((err) => {
      console.error('Error loading dashboard:', err);
      this.error.set(`Fehler beim Laden des Dashboards: ${err.message || 'Unbekannter Fehler'}`);
      this.loading.set(false);
    });
  }

  getModulName(modulId: string): string {
    const modul = this.module().find(m => m.id === modulId);
    return modul?.name || 'Unbekanntes Modul';
  }

  getModulNr(modulId: string): string {
    const modul = this.module().find(m => m.id === modulId);
    return modul?.modulNr || modulId;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  formatNote(noteWert: number | null): string {
    if (noteWert === null || noteWert === undefined) return '-';
    return noteWert.toFixed(1).replace('.', ',');
  }

  getNoteColor(noteWert: number | null): string {
    if (noteWert === null || noteWert === undefined) return 'muted';
    if (noteWert <= 1.5) return 'success';
    if (noteWert <= 2.5) return 'info';
    if (noteWert <= 3.5) return 'warning';
    return 'danger';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'ERFASST': 'Erfasst',
      'VALIDIERT': 'Validiert',
      'FREIGEGEBEN': 'Bestanden'
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'ERFASST': 'warning',
      'VALIDIERT': 'info',
      'FREIGEGEBEN': 'success'
    };
    return colors[status] || 'info';
  }
}

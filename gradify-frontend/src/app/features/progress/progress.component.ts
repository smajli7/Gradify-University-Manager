import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

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

// Query für Fortschrittsdaten (Studiengang-Service)
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
        module {
          id
          modulNr
          name
          ects
          semester
          gewichtung
          inGesamtnote
        }
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

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
        <div class="loading-state">
          <div class="spinner-lg"></div>
          <p>{{ loadingStudents() ? 'Lade Studenten...' : 'Lade Fortschritt...' }}</p>
        </div>
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
        <!-- Overview Cards -->
        <div class="overview-grid">
          <div class="overview-card overview-card--primary">
            <div class="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c0 2 4 3 6 3s6-1 6-3v-5"/>
              </svg>
            </div>
            <div class="card-content">
              <span class="card-value">{{ studiengangName() }}</span>
              <span class="card-label">Studiengang</span>
            </div>
          </div>
          
          <div class="overview-card">
            <div class="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div class="card-content">
              <span class="card-value">{{ currentSemester() }}. Semester</span>
              <span class="card-label">von {{ regelstudienzeit() }}</span>
            </div>
          </div>
          
          <div class="overview-card">
            <div class="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18"/>
                <path d="M18 17V9"/>
                <path d="M13 17V5"/>
                <path d="M8 17v-3"/>
              </svg>
            </div>
            <div class="card-content">
              <span class="card-value">{{ durchschnitt() | number:'1.2-2' }}</span>
              <span class="card-label">Notendurchschnitt</span>
            </div>
          </div>
        </div>

        <!-- Main Progress Section -->
        <div class="progress-section">
          <h2>ECTS-Fortschritt</h2>
          
          <div class="progress-display">
            <div class="progress-circle">
              <svg viewBox="0 0 120 120">
                <circle class="progress-bg" cx="60" cy="60" r="54" />
                <circle 
                  class="progress-fill" 
                  cx="60" 
                  cy="60" 
                  r="54"
                  [style.stroke-dasharray]="circumference"
                  [style.stroke-dashoffset]="progressOffset()" />
              </svg>
              <div class="progress-text">
                <span class="progress-value">{{ progressPercent() | number:'1.0-0' }}%</span>
                <span class="progress-label">abgeschlossen</span>
              </div>
            </div>
            
            <div class="progress-details">
              <div class="detail-row">
                <span class="detail-label">Erreichte ECTS</span>
                <span class="detail-value detail-value--success">{{ ectsErreicht() }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Gesamt ECTS</span>
                <span class="detail-value">{{ totalEcts() }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Offene ECTS</span>
                <span class="detail-value detail-value--warning">{{ totalEcts() - ectsErreicht() }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Bestandene Module</span>
                <span class="detail-value">{{ bestandenCount() }} / {{ totalModules() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Semester Progress -->
        <div class="semester-section">
          <h2>Fortschritt pro Semester</h2>
          
          <div class="semester-bars">
            @for (sem of semesterProgress(); track sem.semester) {
              <div class="semester-bar-container">
                <div class="semester-label">{{ sem.semester }}. Sem</div>
                <div class="semester-bar">
                  <div 
                    class="semester-bar-fill" 
                    [style.width.%]="sem.ectsGesamt > 0 ? (sem.ects / sem.ectsGesamt) * 100 : 0"
                    [class.semester-bar-fill--complete]="sem.ects >= sem.ectsGesamt">
                  </div>
                </div>
                <div class="semester-stats">
                  <span class="semester-ects">{{ sem.ects }}/{{ sem.ectsGesamt }} ECTS</span>
                  @if (sem.durchschnitt !== null) {
                    <span class="semester-avg">Durchschnitt {{ sem.durchschnitt | number:'1.1-1' }}</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Status Overview -->
        <div class="status-section">
          <h2>Modulstatus</h2>
          
          <div class="status-grid">
            <div class="status-card status-card--success">
              <div class="status-count">{{ bestandenCount() }}</div>
              <div class="status-label">Bestanden</div>
              <div class="status-bar">
                <div class="status-bar-fill" [style.width.%]="bestandenPercent()"></div>
              </div>
            </div>
            
            <div class="status-card status-card--warning">
              <div class="status-count">{{ inProgressCount() }}</div>
              <div class="status-label">In Bearbeitung</div>
              <div class="status-bar">
                <div class="status-bar-fill" [style.width.%]="inProgressPercent()"></div>
              </div>
            </div>
            
            <div class="status-card status-card--muted">
              <div class="status-count">{{ offenCount() }}</div>
              <div class="status-label">Offen</div>
              <div class="status-bar">
                <div class="status-bar-fill" [style.width.%]="offenPercent()"></div>
              </div>
            </div>
            
            <div class="status-card status-card--danger">
              <div class="status-count">{{ nichtBestandenCount() }}</div>
              <div class="status-label">Nicht bestanden</div>
              <div class="status-bar">
                <div class="status-bar-fill" [style.width.%]="nichtBestandenPercent()"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Prognose -->
        <div class="prognose-section">
          <h2>Prognose</h2>
          
          <div class="prognose-card">
            <div class="prognose-item">
              <span class="prognose-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </span>
              <div class="prognose-content">
                <span class="prognose-label">Voraussichtlicher Abschluss</span>
                <span class="prognose-value">
                  @if (semesterBisAbschluss() > 0) {
                    In {{ semesterBisAbschluss() }} Semestern
                  } @else {
                    Abschluss möglich
                  }
                </span>
              </div>
            </div>
            
            <div class="prognose-item">
              <span class="prognose-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 3v18h18"/>
                  <path d="M18 17V9"/>
                  <path d="M13 17V5"/>
                  <path d="M8 17v-3"/>
                </svg>
              </span>
              <div class="prognose-content">
                <span class="prognose-label">Erwartete Endnote</span>
                <span class="prognose-value prognose-value--{{ getGradeColor(durchschnitt()) }}">
                  {{ durchschnitt() | number:'1.2-2' }}
                </span>
              </div>
            </div>
            
            <div class="prognose-item">
              <span class="prognose-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </span>
              <div class="prognose-content">
                <span class="prognose-label">ECTS pro Semester (Durchschnitt)</span>
                <span class="prognose-value">{{ ectsProSemester() | number:'1.0-0' }}</span>
              </div>
            </div>
          </div>
        </div>
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
      font-weight: 600;
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

    /* Overview Grid */
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
    }

    .overview-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
    }

    .overview-card--primary {
      border-color: rgba(0, 242, 255, 0.3);
      background: rgba(0, 242, 255, 0.05);
    }

    .card-icon {
      color: var(--color-primary);
    }

    .card-content {
      display: flex;
      flex-direction: column;
    }

    .card-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .card-label {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    /* Progress Section */
    .progress-section,
    .semester-section,
    .status-section,
    .prognose-section {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }

    .progress-section h2,
    .semester-section h2,
    .status-section h2,
    .prognose-section h2 {
      margin: 0 0 var(--spacing-lg) 0;
      font-size: 1.1rem;
    }

    .progress-display {
      display: flex;
      align-items: center;
      gap: var(--spacing-xl);
      flex-wrap: wrap;
    }

    .progress-circle {
      position: relative;
      width: 160px;
      height: 160px;
    }

    .progress-circle svg {
      transform: rotate(-90deg);
    }

    .progress-bg {
      fill: none;
      stroke: var(--bg-deep);
      stroke-width: 8;
    }

    .progress-fill {
      fill: none;
      stroke: var(--color-primary);
      stroke-width: 8;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.5s ease;
    }

    .progress-text {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .progress-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .progress-label {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .progress-details {
      flex: 1;
      min-width: 200px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: var(--spacing-sm) 0;
      border-bottom: 1px solid var(--border-color);
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-label {
      color: var(--text-secondary);
    }

    .detail-value {
      font-weight: 600;
    }

    .detail-value--success { color: var(--color-success); }
    .detail-value--warning { color: var(--color-warning); }

    /* Semester Bars */
    .semester-bars {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .semester-bar-container {
      display: grid;
      grid-template-columns: 80px 1fr 120px;
      gap: var(--spacing-md);
      align-items: center;
    }

    .semester-label {
      font-weight: 500;
      color: var(--text-secondary);
    }

    .semester-bar {
      height: 24px;
      background: var(--bg-deep);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .semester-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--color-primary), var(--color-success));
      border-radius: var(--radius-full);
      transition: width 0.5s ease;
    }

    .semester-bar-fill--complete {
      background: var(--color-success);
    }

    .semester-stats {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: var(--font-size-sm);
    }

    .semester-ects { font-weight: 500; }
    .semester-avg { color: var(--text-muted); }

    /* Status Grid */
    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: var(--spacing-md);
    }

    .status-card {
      padding: var(--spacing-md);
      border-radius: var(--radius-lg);
      text-align: center;
    }

    .status-card--success { background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.3); }
    .status-card--warning { background: rgba(255, 184, 0, 0.1); border: 1px solid rgba(255, 184, 0, 0.3); }
    .status-card--muted { background: var(--bg-hover); border: 1px solid var(--border-color); }
    .status-card--danger { background: rgba(255, 0, 85, 0.1); border: 1px solid rgba(255, 0, 85, 0.3); }

    .status-count {
      font-size: 2rem;
      font-weight: 700;
    }

    .status-card--success .status-count { color: var(--color-success); }
    .status-card--warning .status-count { color: var(--color-warning); }
    .status-card--muted .status-count { color: var(--text-muted); }
    .status-card--danger .status-count { color: var(--color-danger); }

    .status-label {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      margin-bottom: var(--spacing-sm);
    }

    .status-bar {
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .status-bar-fill { height: 100%; border-radius: var(--radius-full); }
    .status-card--success .status-bar-fill { background: var(--color-success); }
    .status-card--warning .status-bar-fill { background: var(--color-warning); }
    .status-card--muted .status-bar-fill { background: var(--text-muted); }
    .status-card--danger .status-bar-fill { background: var(--color-danger); }

    /* Prognose */
    .prognose-card {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-lg);
    }

    .prognose-item {
      display: flex;
      gap: var(--spacing-md);
      align-items: center;
    }

    .prognose-icon {
      color: var(--color-primary);
    }

    .prognose-content {
      display: flex;
      flex-direction: column;
    }

    .prognose-label {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .prognose-value {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .prognose-value--success { color: var(--color-success); }
    .prognose-value--info { color: var(--color-primary); }
    .prognose-value--warning { color: var(--color-warning); }
    .prognose-value--danger { color: var(--color-danger); }

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
      background: var(--color-primary);
      color: var(--bg-deep);
    }

    .btn--primary:hover:not(:disabled) { filter: brightness(1.1); }
    .btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Responsive */
    @media (max-width: 768px) {
      .progress-display { flex-direction: column; }
      .semester-bar-container {
        grid-template-columns: 60px 1fr;
      }
      .semester-stats {
        grid-column: 1 / -1;
        flex-direction: row;
        justify-content: space-between;
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
  totalEcts = computed(() => this.einschreibung()?.studiengang?.gesamtEcts || 0);
  totalModules = computed(() => this.module().length);
  
  bestandenModulIds = computed(() => {
    return new Set(
      this.noten().filter(n => n.bestanden === true).map(n => String(n.modulId ?? ''))
    );
  });
  
  bestandenCount = computed(() => this.bestandenModulIds().size);
  
  ectsErreicht = computed(() => {
    const ids = this.bestandenModulIds();
    return this.module()
      .filter(m => ids.has(String(m.id ?? '')))
      .reduce((sum, m) => sum + m.ects, 0);
  });
  
  progressPercent = computed(() => {
    const total = this.totalEcts();
    if (total === 0) return 0;
    return (this.ectsErreicht() / total) * 100;
  });
  
  progressOffset = computed(() => {
    const percent = this.progressPercent();
    return this.circumference - (percent / 100) * this.circumference;
  });
  
  durchschnitt = computed(() => {
    const bewertet = this.noten().filter(n => n.noteWert !== null && n.bestanden === true);
    if (bewertet.length === 0) return 0;
    const sum = bewertet.reduce((acc, n) => acc + n.noteWert, 0);
    return sum / bewertet.length;
  });
  
  inProgressCount = computed(() => {
    return this.noten().filter(n => n.status === 'ERFASST' || n.status === 'VALIDIERT').length;
  });
  
  nichtBestandenCount = computed(() => {
    return this.noten().filter(n => n.bestanden === false).length;
  });
  
  offenCount = computed(() => {
    const modulMitNote = new Set(this.noten().map(n => String(n.modulId ?? '')));
    return this.module().filter(m => !modulMitNote.has(String(m.id ?? ''))).length;
  });
  
  bestandenPercent = computed(() => (this.bestandenCount() / Math.max(this.totalModules(), 1)) * 100);
  inProgressPercent = computed(() => (this.inProgressCount() / Math.max(this.totalModules(), 1)) * 100);
  offenPercent = computed(() => (this.offenCount() / Math.max(this.totalModules(), 1)) * 100);
  nichtBestandenPercent = computed(() => (this.nichtBestandenCount() / Math.max(this.totalModules(), 1)) * 100);
  
  semesterProgress = computed((): SemesterProgress[] => {
    const moduleList = this.module();
    const notenMap = new Map(this.noten().map(n => [String(n.modulId ?? ''), n]));
    const regelzeit = this.regelstudienzeit();
    
    const result: SemesterProgress[] = [];
    
    for (let sem = 1; sem <= regelzeit; sem++) {
      const semModule = moduleList.filter(m => {
        const semStr = m.semester.toString();
        if (semStr.includes('-')) {
          const [start] = semStr.split('-').map(Number);
          return start === sem;
        }
        return Number.parseInt(semStr, 10) === sem;
      });
      
      const semNoten = semModule
        .map(m => notenMap.get(String(m.id ?? '')))
        .filter(n => n?.bestanden === true);
      
      const ectsGesamt = semModule.reduce((sum, m) => sum + m.ects, 0);
      const ectsErreicht = semModule
        .filter(m => notenMap.get(String(m.id ?? ''))?.bestanden === true)
        .reduce((sum, m) => sum + m.ects, 0);
      
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

    const einschreibungQuery = this.apollo.query<any>({
      query: PROGRESS_EINSCHREIBUNG_QUERY,
      variables: { einschreibungId: this.selectedEinschreibung },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });

    const notenQuery = this.apollo.query<any>({
      query: PROGRESS_NOTEN_QUERY,
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
        return { data: { notenByStudent: [] }, errors: [] };
      })
    ]).then(([einschreibungResult, notenResult]) => {
      console.log('Progress Einschreibung Result:', einschreibungResult);
      console.log('Progress Noten Result:', notenResult);
      
      // Prüfe auf GraphQL-Fehler
      if (einschreibungResult.errors && einschreibungResult.errors.length > 0) {
        console.error('GraphQL Errors (Einschreibung):', einschreibungResult.errors);
        this.error.set(`Fehler beim Laden der Einschreibung: ${einschreibungResult.errors[0].message}`);
        this.loading.set(false);
        return;
      }

      if (notenResult.errors && notenResult.errors.length > 0) {
        console.warn('GraphQL Errors (Noten):', notenResult.errors);
        // Noten-Fehler sind nicht kritisch
      }

      const data = einschreibungResult?.data?.einschreibung;
      
      if (!data) {
        this.error.set('Einschreibung nicht gefunden');
        this.loading.set(false);
        return;
      }

      this.einschreibung.set(data);
      
      // Module aus Prüfungsordnung laden (kann null sein)
      const moduleList = data.pruefungsordnung?.module || [];
      console.log('Loaded modules from PO:', moduleList.length);
      this.module.set(moduleList);
      
      // Noten laden
      const notenList = notenResult?.data?.notenByStudent || [];
      console.log('Loaded noten:', notenList.length);
      this.noten.set(notenList);
      
      this.dataLoaded.set(true);
      this.loading.set(false);
    }).catch((err) => {
      console.error('Error loading progress data:', err);
      this.error.set(`Fehler beim Laden der Daten: ${err.message || 'Unbekannter Fehler'}`);
      this.loading.set(false);
    });
  }

  getGradeColor(noteWert: number | null): string {
    if (noteWert === null || noteWert === undefined || noteWert === 0) return 'muted';
    if (noteWert <= 1.5) return 'success';
    if (noteWert <= 2.5) return 'info';
    if (noteWert <= 3.5) return 'warning';
    return 'danger';
  }
}

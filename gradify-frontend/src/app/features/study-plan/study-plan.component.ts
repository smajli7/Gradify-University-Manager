import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { Modul, Note } from '../../types';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { SkeletonStateComponent } from '../../shared/components/skeleton-state/skeleton-state.component';

interface ModulMitNote extends Modul {
  note?: Note;
  status: 'offen' | 'bestanden' | 'nicht-bestanden' | 'in-bearbeitung';
}

interface SemesterRow {
  semester: string;
  module: ModulMitNote[];
  bestandenCount: number;
  totalCount: number;
  sumEcts: number;
  bestandenEcts: number;
}

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

// Query für Einschreibungen eines Studenten (Studiengang-Service)
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

// Query für Einschreibung/Studiengang (studiengang-service)
const EINSCHREIBUNG_QUERY = gql`
  query GetEinschreibung($einschreibungId: ID!) {
    einschreibung(id: $einschreibungId) {
      id
      aktuellesSemester
      studiengang {
        id
        name
        kuerzel
        gesamtEcts
      }
      pruefungsordnung {
        id
        version
        module {
          id
          modulNr
          name
          ects
          semester
          modultyp
          pruefungsform
          bewertungsart
          gewichtung
          inGesamtnote
          wahlpflichtGruppe
        }
      }
    }
  }
`;

// Query für Wahlpflicht-Wahlen
const WAHLPFLICHT_QUERY = gql`
  query GetWahlpflichtWahlen($einschreibungId: ID!) {
    wahlpflichtWahlen(einschreibungId: $einschreibungId) {
      id
      einschreibungId
      wahlpflichtGruppe
      modulId
    }
  }
`;

// Mutation für Wahlpflicht-Auswahl
const SET_WAHLPFLICHT_MUTATION = gql`
  mutation SetWahlpflichtWahl($einschreibungId: ID!, $wahlpflichtGruppe: String!, $modulId: ID!) {
    setWahlpflichtWahl(einschreibungId: $einschreibungId, wahlpflichtGruppe: $wahlpflichtGruppe, modulId: $modulId) {
      id
      einschreibungId
      wahlpflichtGruppe
      modulId
    }
  }
`;

// Query für Noten (noten-service)
const NOTEN_QUERY = gql`
  query GetNotenByStudent($einschreibungId: ID!) {
    notenByStudent(einschreibungId: $einschreibungId) {
      id
      modulId
      noteWert
      bestanden
      versuch
      status
      pruefungsdatum
      kommentar
    }
  }
`;

@Component({
  selector: 'app-study-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonStateComponent],
  template: `
    <div class="page animate-slide-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Studienverlaufsplan</h1>
          <p class="text-muted">{{ studiengangName() || 'Empfohlener Modulplan nach Prüfungsordnung' }}</p>
        </div>
        
        @if (totalEcts() > 0) {
          <div class="header-stats">
            <div class="stat-card stat-card--primary">
              <span class="stat-label">Durchschnitt</span>
              <span class="stat-value">{{ durchschnitt() !== null ? (durchschnitt() | number:'1.2-2') : '–' }}</span>
            </div>
            <div class="stat-card stat-card--success">
              <span class="stat-label">ECTS</span>
              <span class="stat-value">{{ bestandenEcts() }} / {{ totalEcts() }}</span>
            </div>
            <div class="stat-card stat-card--info">
              <span class="stat-label">Fortschritt</span>
              <span class="stat-value">{{ progressPercent() | number:'1.0-0' }}%</span>
            </div>
          </div>
        }
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
              (change)="loadStudyPlan()"
              [disabled]="!selectedStudent || einschreibungen().length === 0">
              <option value="">-- Einschreibung wählen --</option>
              @for (e of einschreibungen(); track e.id) {
                <option [value]="e.id">{{ e.studiengang }} ({{ e.kuerzel }}) - {{ e.semester }}. Sem</option>
              }
            </select>
          </div>

          <button class="btn btn--primary" (click)="loadStudyPlan()" [disabled]="!selectedEinschreibung || loading()">
            @if (loading()) {
              <span class="spinner-sm"></span>
            } @else {
              <span>Laden</span>
            }
          </button>
          
          @if (isPruefungsamt()) {
            <div class="role-badge role-badge--admin">
              Prüfungsamt-Modus
            </div>
          }
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
              (change)="loadStudyPlan()">
              @for (e of einschreibungen(); track e.id) {
                <option [value]="e.id">{{ e.studiengang }} ({{ e.kuerzel }}) - {{ e.semester }}. Sem</option>
              }
            </select>
          </div>
        </div>
      }

      <!-- Loading State -->
      @if (loading()) {
        <app-skeleton-state [lineCount]="8" />
      }

      <!-- Error State -->
      @if (error()) {
        <div class="error-state">
          <span class="error-icon" aria-hidden="true"></span>
          <p>{{ error() }}</p>
          <button class="btn btn--primary" (click)="loadStudyPlan()">Erneut versuchen</button>
        </div>
      }

      <!-- Study Plan Grid -->
      @if (!loading() && !error() && semesterRows().length > 0) {
        <div class="study-plan-container">
          <!-- Legend (klickbar = Filter) -->
          <div class="legend">
            <button type="button" class="legend-item" [class.legend-item--active]="statusFilter() === 'all'" (click)="setStatusFilter('all')">
              <span class="legend-dot legend-dot--all"></span>
              <span>Alle</span>
            </button>
            <button type="button" class="legend-item" [class.legend-item--active]="statusFilter() === 'bestanden'" (click)="setStatusFilter('bestanden')">
              <span class="legend-dot legend-dot--bestanden"></span>
              <span>Bestanden</span>
            </button>
            <button type="button" class="legend-item" [class.legend-item--active]="statusFilter() === 'offen'" (click)="setStatusFilter('offen')">
              <span class="legend-dot legend-dot--offen"></span>
              <span>{{ isStudent() ? 'Nicht angetreten' : 'Offen' }}</span>
            </button>
            @if (canSelectStudent()) {
              <button type="button" class="legend-item" [class.legend-item--active]="statusFilter() === 'in-bearbeitung'" (click)="setStatusFilter('in-bearbeitung')">
                <span class="legend-dot legend-dot--in-bearbeitung"></span>
                <span>In Bearbeitung</span>
              </button>
            }
            <button type="button" class="legend-item" [class.legend-item--active]="statusFilter() === 'nicht-bestanden'" (click)="setStatusFilter('nicht-bestanden')">
              <span class="legend-dot legend-dot--nicht-bestanden"></span>
              <span>Nicht bestanden</span>
            </button>
          </div>

          <!-- Grid -->
          <div class="semester-grid">
            @for (row of filteredSemesterRows(); track row.semester) {
              <div class="semester-row">
                <!-- Semester Label -->
                <div class="semester-label">
                  <div class="semester-info">
                    <span class="semester-ects">{{ row.sumEcts }} CP</span>
                  </div>
                  <div class="semester-number">{{ row.semester }}.</div>
                  <div class="semester-text">Semester</div>
                </div>

                <!-- Module -->
                <div class="module-container">
                  @for (modul of row.module; track modul.id) {
                    <div 
                      class="module-card module-card--{{ modul.status }}"
                      [class.module-card--nicht-angetreten]="modul.status === 'nicht-bestanden' && !modul.note"
                      [class.module-card--wahlpflicht]="modul.modultyp === 'WAHLPFLICHT'"
                      [class.module-card--current]="isCurrentSemester(row.semester)"
                      [title]="getModuleTooltip(modul)"
                      (click)="onModulCardClick(modul)">
                      
                      <div class="module-header">
                        <span class="module-ects">{{ modul.ects }} CP</span>
                        @if (modul.status === 'bestanden') {
                          <span class="module-icon-check" aria-hidden="true">✓</span>
                        }
                      </div>
                      
                      <div class="module-name">{{ modul.name }}</div>
                      
                      <div class="module-note-pill">
                        @if (modul.note?.noteWert) {
                          <span class="module-note">{{ formatNote(modul.note!.noteWert) }}</span>
                        } @else if (modul.bewertungsart === 'BESTANDEN_NICHT_BESTANDEN' && modul.note?.bestanden) {
                          <span class="module-note module-note--bestanden">✓</span>
                        } @else {
                          <span class="module-note module-note--empty">-</span>
                        }
                      </div>
                      
                      <div class="module-footer">
                        <span class="module-nr">{{ modul.modulNr }}</span>
                        @if (modul.modultyp === 'WAHLPFLICHT') {
                          <span class="module-wahlpflicht">WP</span>
                        }
                      </div>
                    </div>
                  }

                  <!-- Ungewählte Wahlpflicht-Platzhalter -->
                  @for (wp of getUngewaehlteWpGruppenForSemester(row.semester); track wp.key) {
                    <div class="module-card module-card--wp-choose" (click)="openWpAuswahl(wp.key)">
                      <div class="module-header">
                        <span class="module-ects">{{ wp.module[0].ects }} CP</span>
                      </div>
                      <div class="module-name">{{ wp.label }}</div>
                      <div class="module-note-pill">
                        <span class="module-note module-note--choose">Wählen</span>
                      </div>
                      <div class="module-footer">
                        <span class="module-wahlpflicht">WP</span>
                      </div>
                    </div>
                  }
                </div>

                <!-- Semester Summary -->
                <div class="semester-summary">
                  <span class="summary-progress">{{ row.bestandenCount }}/{{ row.totalCount }}</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-section">
          <div class="progress-header">
            <span>Gesamtfortschritt</span>
            <span>{{ bestandenEcts() }} / {{ totalEcts() }} ECTS</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progressPercent()"></div>
          </div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && !error() && semesterRows().length === 0) {
        <div class="empty-state">
          <div class="empty-icon" aria-hidden="true"></div>
          <h3>Kein Studienverlaufsplan geladen</h3>
          <p>Wählen Sie eine Einschreibung aus, um den Studienverlaufsplan anzuzeigen.</p>
        </div>
      }

      <!-- Wahlpflicht-Auswahl-Modal -->
      @if (wpAuswahlGruppe()) {
        <div class="modal-overlay" (click)="closeWpAuswahl()">
          <div class="modal-content wp-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title">
                <h2>Wahlpflichtmodul wählen</h2>
              </div>
              <button class="close-btn" (click)="closeWpAuswahl()">✕</button>
            </div>
            <div class="modal-body">
              <p class="wp-modal-hint">Wähle dein Wahlpflichtmodul. Die Auswahl wird gespeichert und kann nicht mehr geändert werden.</p>
              <div class="wp-option-list">
                @for (m of getWpOptionsForGruppe(wpAuswahlGruppe()!); track m.id) {
                  <button class="wp-option" (click)="confirmWpWahl(wpAuswahlGruppe()!, m)" [disabled]="savingWahlpflicht()">
                    <span class="wp-option-nr">{{ m.modulNr }}</span>
                    <span class="wp-option-name">{{ m.name }}</span>
                    <span class="wp-option-ects">{{ m.ects }} CP</span>
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Module Detail Modal -->
      @if (selectedModul()) {
        <div class="modal-overlay" (click)="closeModulDetail()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title">
                <span class="modal-module-nr">{{ selectedModul()!.modulNr }}</span>
                <h2>{{ selectedModul()!.name }}</h2>
              </div>
              <button class="close-btn" (click)="closeModulDetail()">✕</button>
            </div>
            
            <div class="modal-body">
              <!-- Status Display -->
              <div 
                class="status-display status-display--{{ selectedModul()!.status }}"
                [class.status-display--nicht-angetreten]="selectedModul()!.status === 'nicht-bestanden' && !selectedModul()!.note">
                @if (selectedModul()!.note?.noteWert) {
                  <span class="status-note">{{ formatNote(selectedModul()!.note!.noteWert) }}</span>
                }
                <span class="status-label">
                  @switch (selectedModul()!.status) {
                    @case ('bestanden') { Bestanden }
                    @case ('nicht-bestanden') { Nicht bestanden }
                    @case ('in-bearbeitung') { In Bearbeitung }
                    @default { {{ isStudent() ? 'Nicht angetreten' : 'Offen' }} }
                  }
                </span>
              </div>

              <!-- Module Info -->
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">ECTS</span>
                  <span class="detail-value">{{ selectedModul()!.ects }} Credit Points</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Semester</span>
                  <span class="detail-value">{{ selectedModul()!.semester }}. Semester</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Prüfungsform</span>
                  <span class="detail-value">{{ formatPruefungsform(selectedModul()!.pruefungsform) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Modultyp</span>
                  <span class="detail-value">{{ selectedModul()!.modultyp === 'WAHLPFLICHT' ? 'Wahlpflicht' : 'Pflicht' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Gewichtung</span>
                  <span class="detail-value">{{ selectedModul()!.gewichtung }}-fach</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">In Gesamtnote</span>
                  <span class="detail-value">{{ selectedModul()!.inGesamtnote ? 'Ja' : 'Nein' }}</span>
                </div>
                
                @if (selectedModul()!.note) {
                  <div class="detail-item">
                    <span class="detail-label">Versuch</span>
                    <span class="detail-value">{{ selectedModul()!.note!.versuch }}. Versuch</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Prüfungsdatum</span>
                    <span class="detail-value">{{ formatDate(selectedModul()!.note!.pruefungsdatum) }}</span>
                  </div>
                  @if (selectedModul()!.note!.kommentar) {
                    <div class="detail-item detail-item--full">
                      <span class="detail-label">Kommentar</span>
                      <span class="detail-value">{{ selectedModul()!.note!.kommentar }}</span>
                    </div>
                  }
                }
              </div>

              <!-- Prüfungsamt: Note Entry -->
              @if (isPruefungsamt() && selectedModul()!.status === 'offen') {
                <div class="note-entry-section">
                  <h4>Note eintragen</h4>
                  <div class="note-entry-form">
                    <div class="form-group">
                      <label>Note</label>
                      <input 
                        type="number" 
                        class="note-input" 
                        [(ngModel)]="newNoteValue" 
                        min="1.0" 
                        max="5.0" 
                        step="0.1"
                        placeholder="z.B. 2.3">
                    </div>
                    <div class="form-group">
                      <label>Prüfungsdatum</label>
                      <input 
                        type="date" 
                        class="note-input" 
                        [(ngModel)]="newNoteDatum">
                    </div>
                    <button class="btn btn--primary btn--full" (click)="saveNote()">
                      Note speichern
                    </button>
                  </div>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="btn btn--secondary" (click)="closeModulDetail()">Schließen</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-md) 0;
      min-height: calc(100vh - 140px);
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-lg);
      flex-wrap: wrap;
      gap: var(--spacing-md);
    }

    .header-content h1 {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: 1.75rem;
      font-weight: 600;
    }

    .header-stats {
      display: flex;
      gap: var(--spacing-md);
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
      flex: 1;
      min-width: 100px;
      min-height: 64px;
      padding: 12px 16px;
      background: var(--bg-surface);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: var(--radius-lg);
      box-sizing: border-box;
    }

    .stat-card--primary { border-color: rgba(255, 255, 255, 0.25); }
    .stat-card--primary .stat-value { color: var(--text-primary); }

    .stat-card--success { border-color: rgba(34, 197, 94, 0.5); }
    .stat-card--success .stat-value { color: #22C55E; }

    .stat-card--info { border-color: rgba(255, 255, 255, 0.25); }
    .stat-card--info .stat-value { color: var(--text-secondary); }

    .stat-label {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .stat-value {
      font-size: 1.25rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    /* Demo Controls */
    .selection-controls {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-md);
      align-items: flex-end;
      margin-bottom: var(--spacing-lg);
      padding: var(--spacing-md);
      background: var(--bg-surface);
      border: 1px solid rgba(255, 255, 255, 0.14);
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
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: 0.95rem;
    }

    .select-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .input-group {
      display: flex;
      gap: var(--spacing-sm);
    }

    .demo-input {
      padding: 10px 14px;
      background: var(--bg-deep);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: 0.95rem;
      min-width: 250px;
    }

    .demo-input:focus {
      outline: none;
      border-color: var(--text-secondary);
    }

    .role-badge {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-full);
      font-size: var(--font-size-sm);
      font-weight: 500;
    }

    .role-badge--admin {
      background: rgba(148, 163, 184, 0.15);
      color: var(--text-secondary);
      border: 1px solid rgba(148, 163, 184, 0.3);
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
      border-top-color: var(--text-secondary);
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

    .error-icon { font-size: 48px; margin-bottom: var(--spacing-md); }
    .empty-icon { font-size: 64px; margin-bottom: var(--spacing-md); }

    .empty-state h3 {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-primary);
    }

    /* Study Plan Container – kräftigere Ränder */
    .study-plan-container {
      background: var(--bg-surface);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: var(--radius-xl);
      padding: var(--spacing-lg);
      overflow-x: auto;
    }

    /* Legend (klickbar, Filter) */
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
      padding-bottom: var(--spacing-md);
      border-bottom: 1px solid rgba(255, 255, 255, 0.14);
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--text-secondary);
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .legend-item:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.2);
      color: var(--text-primary);
    }

    .legend-item--active {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.25);
      color: var(--text-primary);
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 3px;
      flex-shrink: 0;
    }

    .legend-dot--all { background: var(--text-muted); }
    .legend-dot--bestanden { background: #22C55E; box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.5); }
    .legend-dot--offen { background: #F97316; border: 1px solid rgba(249, 115, 22, 0.6); }
    .legend-dot--nicht-bestanden { background: #EF4444; box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.5); }
    .legend-dot--in-bearbeitung { background: #EAB308; box-shadow: 0 0 0 1px rgba(234, 179, 8, 0.5); }

    /* Semester Grid – klare Row-Struktur, kompaktere Abstände */
    .semester-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .semester-row {
      display: flex;
      align-items: stretch;
      gap: 12px;
      min-height: 90px;
    }

    /* Semester Label */
    .semester-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 80px;
      min-width: 80px;
      padding: var(--spacing-sm);
      background: var(--bg-elevated);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: var(--radius-md);
    }

    .semester-info {
      margin-bottom: 4px;
    }

    .semester-ects {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .semester-number {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1;
    }

    .semester-text {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    /* Module Container */
    .module-container {
      display: flex;
      gap: var(--spacing-sm);
      flex: 1;
      flex-wrap: wrap;
      align-content: flex-start;
    }

    /* Module Card – einheitliche Höhe, Status-Rand, Grün/Orange/Gelb/Rot */
    .module-card {
      position: relative;
      display: flex;
      flex-direction: column;
      min-width: 140px;
      max-width: 180px;
      min-height: 100px;
      flex: 1;
      padding: var(--spacing-sm);
      background: var(--bg-hover);
      border: 2px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .module-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
      border-color: rgba(255, 255, 255, 0.25);
    }

    .module-card--bestanden {
      background: rgba(34, 197, 94, 0.1);
      border-color: rgba(34, 197, 94, 0.6);
    }

    .module-card--nicht-bestanden {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.6);
    }

    .module-card--nicht-angetreten {
      background: rgba(128, 128, 128, 0.15);
      border-color: rgba(128, 128, 128, 0.5);
    }

    .module-card--in-bearbeitung {
      background: rgba(234, 179, 8, 0.12);
      border-color: rgba(234, 179, 8, 0.6);
    }

    .module-card--offen {
      background: var(--bg-hover);
      border-color: rgba(255, 255, 255, 0.14);
    }

    .module-card--wahlpflicht {
      border-style: dashed;
    }

    .module-card--current {
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35);
    }

    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      flex-wrap: wrap;
      gap: 2px;
    }

    .module-ects {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--text-secondary);
    }

    .module-nr {
      font-size: var(--font-size-xs);
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-muted);
    }

    .module-icon-check {
      color: #22C55E;
      font-size: 12px;
      font-weight: 700;
    }

    .module-name {
      font-size: var(--font-size-xs);
      font-weight: 500;
      color: var(--text-primary);
      line-height: 1.3;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .module-note-pill {
      padding-top: 6px;
      display: flex;
      justify-content: flex-end;
    }

    .module-footer {
      margin-top: auto;
      padding-top: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .module-note {
      font-size: var(--font-size-sm);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text-primary);
      background: rgba(0, 0, 0, 0.35);
      padding: 2px 8px;
      min-width: 2.4em;
      text-align: center;
      border-radius: 6px;
      box-sizing: border-box;
    }

    .module-note--bestanden {
      color: #22C55E;
    }

    .module-note--empty {
      color: var(--text-muted);
      font-weight: 500;
    }

    .module-wahlpflicht {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-secondary);
      background: rgba(148, 163, 184, 0.2);
      padding: 1px 4px;
      border-radius: 3px;
    }

    /* Wahlpflicht: Platzhalter-Kachel zum Wählen */
    .module-card--wp-choose {
      background: rgba(99, 102, 241, 0.06);
      border: 2px dashed rgba(99, 102, 241, 0.4);
      cursor: pointer;
    }
    .module-card--wp-choose:hover {
      border-color: rgba(99, 102, 241, 0.7);
      background: rgba(99, 102, 241, 0.12);
    }
    .module-note--choose {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: #818cf8;
      background: rgba(99, 102, 241, 0.15);
      padding: 2px 10px;
      border-radius: 6px;
    }

    /* Wahlpflicht-Auswahl-Modal */
    .wp-modal { max-width: 480px; }
    .wp-modal-hint {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      margin-bottom: var(--spacing-md);
    }
    .wp-option-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }
    .wp-option {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: var(--bg-hover);
      border: 2px solid var(--border-color);
      border-radius: var(--radius-md);
      cursor: pointer;
      color: var(--text-primary);
      transition: all 0.15s;
      text-align: left;
    }
    .wp-option:hover:not(:disabled) {
      border-color: rgba(99, 102, 241, 0.5);
      background: rgba(99, 102, 241, 0.08);
    }
    .wp-option:disabled {
      opacity: 0.5;
      cursor: wait;
    }
    .wp-option-nr {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
      min-width: 2em;
    }
    .wp-option-name {
      flex: 1;
      font-size: var(--font-size-sm);
      font-weight: 500;
    }
    .wp-option-ects {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      font-weight: 600;
      white-space: nowrap;
    }

    /* Semester Summary */
    .semester-summary {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      min-width: 60px;
      padding: var(--spacing-sm);
      background: var(--bg-elevated);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: var(--radius-md);
    }

    .summary-progress {
      font-size: var(--font-size-sm);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text-secondary);
    }

    /* Progress Section */
    .progress-section {
      margin-top: var(--spacing-lg);
      padding: var(--spacing-md);
      background: var(--bg-surface);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: var(--radius-lg);
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .progress-bar {
      height: 8px;
      background: var(--bg-deep);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #CBD5E1;
      border-radius: var(--radius-full);
      transition: width 0.5s ease;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: var(--bg-surface);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: var(--radius-xl);
      width: 100%;
      max-width: 560px;
      max-height: 90vh;
      overflow: auto;
      animation: slideUp 0.2s ease;
    }

    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(20px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: var(--spacing-lg);
      border-bottom: 1px solid rgba(255, 255, 255, 0.14);
    }

    .modal-title {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .modal-module-nr {
      font-size: var(--font-size-xs);
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-secondary);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
    }

    .close-btn {
      background: var(--bg-hover);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: var(--text-muted);
      cursor: pointer;
      padding: 8px;
      border-radius: var(--radius-md);
      font-size: 16px;
      line-height: 1;
      transition: all 0.15s ease;
    }

    .close-btn:hover {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }

    .modal-body {
      padding: var(--spacing-lg);
    }

    /* Status Display */
    .status-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
      border-radius: var(--radius-lg);
      text-align: center;
    }

    .status-display--bestanden {
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.55);
    }

    .status-display--nicht-bestanden {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.55);
    }

    .status-display--nicht-angetreten {
      background: rgba(128, 128, 128, 0.15);
      border: 1px solid rgba(128, 128, 128, 0.5);
    }

    .status-display--in-bearbeitung {
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.55);
    }

    .status-display--offen {
      background: var(--bg-elevated);
      border: 1px solid rgba(255, 255, 255, 0.14);
    }

    .status-note {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: var(--spacing-xs);
    }

    .status-label {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    /* Detail Grid */
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-md);
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item--full {
      grid-column: 1 / -1;
    }

    .detail-label {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-value {
      font-weight: 500;
    }

    /* Note Entry Section */
    .note-entry-section {
      margin-top: var(--spacing-lg);
      padding-top: var(--spacing-lg);
      border-top: 1px solid rgba(255, 255, 255, 0.14);
    }

    .note-entry-section h4 {
      margin: 0 0 var(--spacing-md) 0;
      color: var(--text-secondary);
    }

    .note-entry-form {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .form-group label {
      display: block;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      margin-bottom: var(--spacing-xs);
    }

    .note-input {
      width: 100%;
      padding: 10px 14px;
      background: var(--bg-deep);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: 1rem;
    }

    .note-input:focus {
      outline: none;
      border-color: var(--text-secondary);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-sm);
      padding: var(--spacing-lg);
      border-top: 1px solid rgba(255, 255, 255, 0.14);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-xs);
      padding: 10px 18px;
      border-radius: var(--radius-lg);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
    }

    .btn--primary {
      background: var(--text-primary);
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
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: var(--text-primary);
    }

    .btn--secondary:hover {
      background: var(--bg-hover);
    }

    .btn--full {
      width: 100%;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .module-card {
        min-width: 120px;
        max-width: 150px;
      }
    }

    @media (max-width: 768px) {
      .header-stats {
        flex-wrap: wrap;
      }

      .selection-controls {
        flex-direction: column;
      }

      .control-group {
        width: 100%;
      }

      .semester-row {
        flex-direction: column;
      }

      .semester-label {
        width: 100%;
        flex-direction: row;
        gap: var(--spacing-sm);
      }

      .semester-summary {
        width: 100%;
      }

      .module-container {
        flex-wrap: wrap;
      }

      .module-card {
        min-width: calc(50% - var(--spacing-sm));
        max-width: none;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class StudyPlanComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  
  // State
  loadingStudents = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  selectedStudent = '';
  selectedEinschreibung = '';
  currentSemester = signal(1);

  // Role-based visibility
  isStudent = computed(() => this.authService.isStudent());
  canSelectStudent = computed(() => !this.isStudent());

  // Data
  students = signal<{id: string; name: string; matrikelnummer: string}[]>([]);
  einschreibungen = signal<{id: string; studiengang: string; kuerzel: string; semester: number}[]>([]);
  module = signal<ModulMitNote[]>([]);
  noten = signal<Note[]>([]);
  einschreibung = signal<any>(null);
  
  // Wahlpflicht-Wahlen: Map<wahlpflichtGruppe, modulId>
  wahlpflichtWahlen = signal<Map<string, string>>(new Map());
  savingWahlpflicht = signal(false);

  // Filter: Legende klickbar
  statusFilter = signal<'all' | 'bestanden' | 'offen' | 'in-bearbeitung' | 'nicht-bestanden'>('all');

  setStatusFilter(filter: 'all' | 'bestanden' | 'offen' | 'in-bearbeitung' | 'nicht-bestanden'): void {
    this.statusFilter.set(filter);
  }

  // Wahlpflicht-Auswahl Modal
  wpAuswahlGruppe = signal<string | null>(null);

  // Modal
  selectedModul = signal<ModulMitNote | null>(null);
  newNoteValue = '';
  newNoteDatum = '';
  savingNote = signal(false);
  
  // HTTP Client für REST API
  private readonly http = inject(HttpClient);

  /** Wahlpflicht-Gruppen mit Optionen für das Auswahl-Dropdown */
  wahlpflichtGruppen = computed(() => {
    const moduleList = this.module();
    const groups = new Map<string, ModulMitNote[]>();
    for (const m of moduleList) {
      if (m.modultyp === 'WAHLPFLICHT' && m.wahlpflichtGruppe) {
        if (!groups.has(m.wahlpflichtGruppe)) groups.set(m.wahlpflichtGruppe, []);
        groups.get(m.wahlpflichtGruppe)!.push(m);
      }
    }
    return groups;
  });

  /** Gibt true zurück wenn für die Gruppe eine Wahl gespeichert ist */
  hatWahlpflichtWahl(gruppe: string): boolean {
    return this.wahlpflichtWahlen().has(gruppe);
  }

  /** Gibt das gewählte Modul-ID für die Gruppe zurück */
  getWahlpflichtModulId(gruppe: string): string | undefined {
    return this.wahlpflichtWahlen().get(gruppe);
  }

  // Computed values
  semesterRows = computed(() => {
    const moduleList = this.module();
    if (moduleList.length === 0) return [];

    // Wahlpflicht: Gewähltes Modul zeigen; ohne Wahl → Platzhalter-Kachel (nicht die einzelnen Optionen)
    const wahlen = this.wahlpflichtWahlen();
    const filteredModules = moduleList.filter(m => {
      if (m.modultyp !== 'WAHLPFLICHT' || !m.wahlpflichtGruppe) return true;
      const gewaehlteId = wahlen.get(m.wahlpflichtGruppe);
      if (!gewaehlteId) return false; // Noch keine Wahl → Platzhalter wird separat gerendert
      return String(m.id) === gewaehlteId;
    });

    // Group by semester
    const grouped = new Map<string, ModulMitNote[]>();
    
    for (const modul of filteredModules) {
      const sem = this.normalizeSemester(modul.semester);
      if (!grouped.has(sem)) {
        grouped.set(sem, []);
      }
      grouped.get(sem)!.push(modul);
    }

    // Semester absteigend: 7. oben, 1. unten (Anordnung 6/7 bleibt korrekt)
    const rows: SemesterRow[] = [];
    const sortedSemesters = Array.from(grouped.keys())
      .sort((a, b) => this.parseSemester(b) - this.parseSemester(a));

    for (const semester of sortedSemesters) {
      const moduleInSem = grouped.get(semester)!;
      const bestandenCount = moduleInSem.filter(m => m.status === 'bestanden').length;
      const bestandenEcts = moduleInSem
        .filter(m => m.status === 'bestanden')
        .reduce((sum, m) => sum + m.ects, 0);
      const sumEcts = moduleInSem.reduce((sum, m) => sum + m.ects, 0);

      rows.push({
        semester,
        module: [...moduleInSem].sort((a, b) => 
          Number.parseInt(a.modulNr, 10) - Number.parseInt(b.modulNr, 10) || a.modulNr.localeCompare(b.modulNr)
        ),
        bestandenCount,
        totalCount: moduleInSem.length,
        sumEcts,
        bestandenEcts
      });
    }

    return rows;
  });

  filteredSemesterRows = computed(() => {
    const rows = this.semesterRows();
    const filter = this.statusFilter();
    if (filter === 'all') return rows;
    return rows
      .map(row => {
        const moduleFiltered = row.module.filter(m => m.status === filter);
        const bestandenInFiltered = moduleFiltered.filter(m => m.status === 'bestanden').length;
        return {
          ...row,
          module: moduleFiltered,
          bestandenCount: bestandenInFiltered,
          totalCount: moduleFiltered.length
        };
      })
      .filter(row => row.module.length > 0);
  });

  /** Nur relevante Module: Pflicht + gewählte WP (keine doppelten WP-Optionen) */
  private activeModule = computed(() => {
    const wahlen = this.wahlpflichtWahlen();
    return this.module().filter(m => {
      if (m.modultyp !== 'WAHLPFLICHT' || !m.wahlpflichtGruppe) return true;
      const gewaehlteId = wahlen.get(m.wahlpflichtGruppe);
      if (!gewaehlteId) return false;
      return String(m.id) === gewaehlteId;
    });
  });

  totalEcts = computed(() => {
    return this.activeModule().reduce((sum, m) => sum + m.ects, 0);
  });

  bestandenEcts = computed(() => {
    return this.activeModule()
      .filter(m => m.status === 'bestanden')
      .reduce((sum, m) => sum + m.ects, 0);
  });

  progressPercent = computed(() => {
    const total = this.totalEcts();
    if (total === 0) return 0;
    return (this.bestandenEcts() / total) * 100;
  });

  durchschnitt = computed(() => {
    const bestandene = this.module()
      .filter(m => m.status === 'bestanden' && m.note?.noteWert && m.inGesamtnote);
    
    if (bestandene.length === 0) return null;

    const summe = bestandene.reduce((sum, m) => {
      const gewichtung = m.gewichtung || 1;
      const noteWert = m.note?.noteWert ?? 0;
      return sum + (noteWert * gewichtung);
    }, 0);
    
    const gewichtungSumme = bestandene.reduce((sum, m) => sum + (m.gewichtung || 1), 0);
    
    return summe / gewichtungSumme;
  });

  studiengangName = computed(() => {
    const e = this.einschreibung();
    return e?.studiengang?.name ? `${e.studiengang.name} (${e.studiengang.kuerzel})` : null;
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
            this.loadStudyPlan();
            return;
          }
          
          // Keine Daten vorhanden - zeige Fehler
          this.error.set(`Fehler beim Laden der Einschreibungen: ${errorMsg}`);
          this.loadingStudents.set(false);
          return;
        }

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
          this.loadStudyPlan();
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
    this.module.set([]);
    this.error.set(null);

    if (!this.selectedStudent) return;

    this.apollo.query<{ einschreibungen: any[] }>({
      query: GET_EINSCHREIBUNGEN_QUERY,
      variables: { studentId: this.selectedStudent },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    }).subscribe({
      next: (result) => {
        console.log('Einschreibungen Query Result (onStudentChange):', result);
        
        // Prüfe zuerst, ob Daten vorhanden sind (auch bei Fehlern)
        const list = result.data?.einschreibungen || [];
        
        if (result.errors && result.errors.length > 0) {
          console.error('GraphQL Errors:', result.errors);
          const errorMsg = result.errors[0].message;
          
          // Wenn Daten vorhanden sind, trotzdem verwenden
          if (list.length > 0) {
            console.warn('GraphQL Errors vorhanden, aber Daten gefunden. Verwende Daten trotzdem.');
            this.einschreibungen.set(list.map(e => ({
              id: e.id,
              studiengang: e.studiengang?.name || 'Unbekannt',
              kuerzel: e.studiengang?.kuerzel || '?',
              semester: e.aktuellesSemester
            })));
            this.selectedEinschreibung = list[0].id;
            this.loadStudyPlan();
            return;
          }
          
          this.error.set(`Fehler beim Laden der Einschreibungen: ${errorMsg}`);
          return;
        }

        this.einschreibungen.set(list.map(e => ({
          id: e.id,
          studiengang: e.studiengang?.name || 'Unbekannt',
          kuerzel: e.studiengang?.kuerzel || '?',
          semester: e.aktuellesSemester
        })));

        if (list.length > 0) {
          this.selectedEinschreibung = list[0].id;
          this.loadStudyPlan();
        } else {
          this.error.set('Keine Einschreibungen gefunden');
        }
      },
      error: (err) => {
        console.error('Error loading einschreibungen:', err);
        this.error.set(`Fehler beim Laden der Einschreibungen: ${err.message || 'Unbekannter Fehler'}`);
      }
    });
  }

  isPruefungsamt(): boolean {
    const role = this.authService.userRole();
    return role === 'PRUEFUNGSAMT' || role === 'ADMIN';
  }

  loadStudyPlan(): void {
    if (!this.selectedEinschreibung) return;

    this.loading.set(true);
    this.error.set(null);

    console.log('Loading study plan for einschreibung:', this.selectedEinschreibung);

    // Drei parallele Anfragen an verschiedene Services
    const einschreibungQuery = this.apollo.query<any>({
      query: EINSCHREIBUNG_QUERY,
      variables: { einschreibungId: this.selectedEinschreibung },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });

    const notenQuery = this.apollo.query<any>({
      query: NOTEN_QUERY,
      variables: { einschreibungId: this.selectedEinschreibung },
      context: { clientName: 'noten' },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });

    const wahlpflichtQuery = this.apollo.query<any>({
      query: WAHLPFLICHT_QUERY,
      variables: { einschreibungId: this.selectedEinschreibung },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });

    // Alle Queries parallel ausführen
    Promise.all([
      firstValueFrom(einschreibungQuery).catch(err => {
        console.error('Einschreibung Query Error:', err);
        return { data: null, errors: [{ message: err.message || 'Unbekannter Fehler' }] };
      }),
      firstValueFrom(notenQuery).catch(err => {
        console.error('Noten Query Error:', err);
        return { data: null, errors: [{ message: err.message || 'Unbekannter Fehler' }] };
      }),
      firstValueFrom(wahlpflichtQuery).catch(err => {
        console.warn('Wahlpflicht Query Error (nicht kritisch):', err);
        return { data: null, errors: [] };
      })
    ]).then(([einschreibungResult, notenResult, wahlpflichtResult]) => {
      console.log('Einschreibung Result:', einschreibungResult);
      console.log('Noten Result:', notenResult);

      const einschreibungData = einschreibungResult?.data;
      const notenData = notenResult?.data;

      // Prüfe auf kritische Fehler
      if (einschreibungResult.errors && einschreibungResult.errors.length > 0) {
        const errorMsg = einschreibungResult.errors[0].message;
        if (!einschreibungData?.einschreibung) {
          this.error.set(`Fehler beim Laden der Einschreibung: ${errorMsg}`);
          this.loading.set(false);
          return;
        }
        // Wenn Daten vorhanden sind, trotzdem verwenden
        console.warn('Einschreibung Query Errors vorhanden, aber Daten gefunden.');
      }

      if (!einschreibungData?.einschreibung) {
        this.error.set('Einschreibung nicht gefunden');
        this.loading.set(false);
        return;
      }

      this.einschreibung.set(einschreibungData.einschreibung);
      this.currentSemester.set(einschreibungData.einschreibung.aktuellesSemester || 1);

      // Wahlpflicht-Wahlen laden
      const wahlen = wahlpflichtResult?.data?.wahlpflichtWahlen || [];
      const wahlMap = new Map<string, string>();
      for (const w of wahlen) {
        wahlMap.set(w.wahlpflichtGruppe, String(w.modulId));
      }
      this.wahlpflichtWahlen.set(wahlMap);

      const noten: Note[] = notenData?.notenByStudent || [];
      this.noten.set(noten);
      console.log('Loaded noten:', noten.length);

      // Studenten sehen nur freigegebene Noten; Dozent/Prüfungsamt sieht alle
      const notenFuerStatus = this.isStudent()
        ? noten.filter(n => n.status === 'FREIGEGEBEN')
        : noten;

      // Map modules with notes (pro Modul: Note mit höchstem Versuch)
      const moduleList = einschreibungData.einschreibung.pruefungsordnung?.module || [];
      console.log('Loaded module:', moduleList.length);
      const notenMap = new Map<string, Note>();

      for (const note of notenFuerStatus) {
        const key = String(note.modulId ?? '');
        const existing = notenMap.get(key);
        if (!existing || note.versuch > existing.versuch) {
          notenMap.set(key, note);
        }
      }

      // Status: Student nur bestanden / nicht bestanden / offen; Prüfungsamt auch "In Bearbeitung"
      const nurDreiStatus = this.isStudent();

      const moduleMitNoten: ModulMitNote[] = moduleList.map((m: Modul) => {
        const note = notenMap.get(String(m.id ?? ''));
        let status: ModulMitNote['status'] = 'offen';

        if (note) {
          if (!nurDreiStatus && (note.status === 'ERFASST' || note.status === 'VALIDIERT')) {
            status = 'in-bearbeitung';
          } else if (note.bestanden === true) {
            status = 'bestanden';
          } else if (note.bestanden === false) {
            status = 'nicht-bestanden';
          }
        }

        return { ...m, note, status };
      });

      this.module.set(moduleMitNoten);
      this.loading.set(false);
    }).catch((err) => {
      console.error('Error loading study plan:', err);
      this.error.set(`Fehler beim Laden des Studienverlaufsplans: ${err.message || 'Unbekannter Fehler'}`);
      this.loading.set(false);
    });
  }

  /** Klick auf eine Modul-Kachel: WP-Auswahl oder Detail-Modal */
  onModulCardClick(modul: ModulMitNote): void {
    // Wenn WP mit Gruppe und noch nicht gewählt → Auswahl-Modal
    if (modul.modultyp === 'WAHLPFLICHT' && modul.wahlpflichtGruppe && !this.hatWahlpflichtWahl(modul.wahlpflichtGruppe)) {
      this.openWpAuswahl(modul.wahlpflichtGruppe);
    } else {
      this.openModulDetail(modul);
    }
  }

  /** Öffnet das WP-Auswahl-Modal für eine Gruppe */
  openWpAuswahl(gruppe: string): void {
    this.wpAuswahlGruppe.set(gruppe);
  }

  closeWpAuswahl(): void {
    this.wpAuswahlGruppe.set(null);
  }

  /** Gibt die Optionen für eine WP-Gruppe zurück */
  getWpOptionsForGruppe(gruppe: string): ModulMitNote[] {
    return this.module().filter(m => m.wahlpflichtGruppe === gruppe);
  }

  /** Bestätigt die WP-Wahl und speichert sie */
  confirmWpWahl(gruppe: string, modul: ModulMitNote): void {
    this.setWahlpflichtWahl(gruppe, String(modul.id));
    this.closeWpAuswahl();
  }

  /** Gibt WP-Gruppen zurück, die in einem Semester liegen aber noch ungewählt sind */
  getUngewaehlteWpGruppenForSemester(semester: string): { key: string; label: string; module: ModulMitNote[] }[] {
    const labels: Record<string, string> = {
      'FP': 'Forschungsprojekt',
      'FF': 'Forschungsfelder'
    };
    const wahlen = this.wahlpflichtWahlen();
    const result: { key: string; label: string; module: ModulMitNote[] }[] = [];
    const seen = new Set<string>();

    for (const m of this.module()) {
      if (m.modultyp !== 'WAHLPFLICHT' || !m.wahlpflichtGruppe) continue;
      const sem = this.normalizeSemester(m.semester);
      if (sem !== semester) continue;
      if (wahlen.has(m.wahlpflichtGruppe)) continue; // Schon gewählt
      if (seen.has(m.wahlpflichtGruppe)) continue;
      seen.add(m.wahlpflichtGruppe);

      const optionen = this.module().filter(x => x.wahlpflichtGruppe === m.wahlpflichtGruppe);
      result.push({
        key: m.wahlpflichtGruppe,
        label: labels[m.wahlpflichtGruppe] || `Wahlpflicht ${m.wahlpflichtGruppe}`,
        module: optionen
      });
    }
    return result;
  }

  /** Speichert die Wahlpflicht-Auswahl für eine Gruppe */
  setWahlpflichtWahl(gruppe: string, modulId: string): void {
    if (!this.selectedEinschreibung || this.savingWahlpflicht()) return;

    this.savingWahlpflicht.set(true);
    this.apollo.mutate<any>({
      mutation: SET_WAHLPFLICHT_MUTATION,
      variables: {
        einschreibungId: this.selectedEinschreibung,
        wahlpflichtGruppe: gruppe,
        modulId
      }
    }).subscribe({
      next: (result: any) => {
        const wahl = result.data?.setWahlpflichtWahl;
        if (wahl) {
          const map = new Map(this.wahlpflichtWahlen());
          map.set(wahl.wahlpflichtGruppe, String(wahl.modulId));
          this.wahlpflichtWahlen.set(map);
          this.toast.success('Wahlpflichtmodul gespeichert');
        }
        this.savingWahlpflicht.set(false);
      },
      error: (err: any) => {
        console.error('Error saving wahlpflicht:', err);
        this.toast.error('Fehler beim Speichern der Auswahl');
        this.savingWahlpflicht.set(false);
      }
    });
  }

  normalizeSemester(sem: string): string {
    // PO BVT: "6-7" = Praxisphase + Bachelor-Arbeit → Anzeige als 7. Semester (wie Original-Modultafel)
    if (sem === '6-7') return '7';
    // "1-2" etc. → erstes Semester für Gruppierung
    if (sem.includes('-')) return sem.split('-')[0];
    return sem;
  }

  parseSemester(sem: string): number {
    return Number.parseInt(sem, 10) || 0;
  }

  isCurrentSemester(semester: string): boolean {
    return Number.parseInt(semester, 10) === this.currentSemester();
  }

  getModuleTooltip(modul: ModulMitNote): string {
    const parts = [
      `${modul.modulNr} · ${modul.ects} CP`,
      modul.note?.noteWert != null ? `Note: ${this.formatNote(modul.note.noteWert)}` : null,
      modul.note?.versuch ? `${modul.note.versuch}. Versuch` : null,
      modul.note?.pruefungsdatum ? this.formatDate(modul.note.pruefungsdatum) : null,
      this.getStatusLabel(modul.status)
    ].filter(Boolean);
    return parts.join(' · ');
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'bestanden': 'Bestanden',
      'offen': 'Offen',
      'in-bearbeitung': 'In Bearbeitung',
      'nicht-bestanden': 'Nicht bestanden'
    };
    return labels[status] ?? status;
  }

  formatNote(note: number | null | undefined): string {
    if (note === null || note === undefined) return '-';
    return note.toFixed(1).replace('.', ',');
  }

  formatDate(dateString: string | null | undefined): string {
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

  formatPruefungsform(form: string): string {
    const mapping: Record<string, string> = {
      'KLAUSUR': 'Klausur',
      'HAUSARBEIT': 'Hausarbeit',
      'MUENDLICH': 'Mündliche Prüfung',
      'PROJEKT': 'Projektarbeit',
      'PORTFOLIO': 'Portfolio',
      'PRAESENTATION': 'Präsentation',
      'PRAXISBERICHT': 'Praxisbericht'
    };
    return mapping[form] || form;
  }

  openModulDetail(modul: ModulMitNote): void {
    this.selectedModul.set(modul);
    this.newNoteValue = '';
    this.newNoteDatum = new Date().toISOString().split('T')[0];
  }

  closeModulDetail(): void {
    this.selectedModul.set(null);
  }

  async saveNote(): Promise<void> {
    const modul = this.selectedModul();
    const einschreibungId = this.selectedEinschreibung;
    
    if (!modul || !einschreibungId || !this.newNoteValue) {
      return;
    }
    
    const noteWert = Number.parseFloat(this.newNoteValue);
    if (Number.isNaN(noteWert) || noteWert < 1 || noteWert > 5) {
      this.toast.warning('Bitte geben Sie eine gültige Note zwischen 1.0 und 5.0 ein.');
      return;
    }
    
    this.savingNote.set(true);
    
    try {
      const notePayload = {
        einschreibungId: einschreibungId,
        modulId: modul.id,
        noteWert: noteWert,
        bestanden: noteWert <= 4,
        versuch: 1,
        pruefungsdatum: this.newNoteDatum || new Date().toISOString().split('T')[0],
        status: 'ERFASST'
      };
      
      await firstValueFrom(
        this.http.post('/api/noten', notePayload)
      );
      
      // Daten neu laden
      this.loadStudyPlan();
      this.closeModulDetail();
      
    } catch (error: any) {
      console.error('Fehler beim Speichern der Note:', error);
      this.toast.error('Fehler beim Speichern: ' + (error.error?.message || error.message || 'Unbekannter Fehler'));
    } finally {
      this.savingNote.set(false);
    }
  }
}

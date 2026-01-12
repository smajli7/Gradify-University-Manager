import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { Modul, Note, NoteStatus } from '../../types';

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
  imports: [CommonModule, FormsModule],
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
              <span class="stat-icon">📊</span>
              <div class="stat-info">
                <span class="stat-value">{{ durchschnitt() | number:'1.2-2' }}</span>
                <span class="stat-label">Durchschnitt</span>
              </div>
            </div>
            <div class="stat-card stat-card--success">
              <span class="stat-icon">✓</span>
              <div class="stat-info">
                <span class="stat-value">{{ bestandenEcts() }} / {{ totalEcts() }}</span>
                <span class="stat-label">ECTS</span>
              </div>
            </div>
            <div class="stat-card stat-card--info">
              <span class="stat-icon">📈</span>
              <div class="stat-info">
                <span class="stat-value">{{ progressPercent() | number:'1.0-0' }}%</span>
                <span class="stat-label">Fortschritt</span>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Demo Controls -->
      <div class="demo-controls">
        <div class="control-group">
          <label>Einschreibungs-ID:</label>
          <div class="input-group">
            <select class="demo-input" [(ngModel)]="selectedEinschreibung" (change)="loadStudyPlan()">
              <option value="">-- Auswählen --</option>
              <option value="eeee1111-1111-1111-1111-111111111111">Max Mustermann (BVT)</option>
              <option value="eeee2222-2222-2222-2222-222222222222">Erika Musterfrau (BVT)</option>
              <option value="eeee3333-3333-3333-3333-333333333333">Jan Beispiel (FSA)</option>
            </select>
            <button class="btn btn--primary" (click)="loadStudyPlan()" [disabled]="loading()">
              @if (loading()) {
                <span class="spinner-sm"></span>
              } @else {
                <span>🔄</span>
              }
              Laden
            </button>
          </div>
        </div>
        
        @if (isPruefungsamt()) {
          <div class="role-badge role-badge--admin">
            <span>🔐</span> Prüfungsamt-Modus
          </div>
        }
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner-lg"></div>
          <p>Lade Studienverlaufsplan...</p>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="error-state">
          <span class="error-icon">⚠️</span>
          <p>{{ error() }}</p>
          <button class="btn btn--primary" (click)="loadStudyPlan()">Erneut versuchen</button>
        </div>
      }

      <!-- Study Plan Grid -->
      @if (!loading() && !error() && semesterRows().length > 0) {
        <div class="study-plan-container">
          <!-- Legend -->
          <div class="legend">
            <div class="legend-item">
              <span class="legend-dot legend-dot--bestanden"></span>
              <span>Bestanden</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot legend-dot--offen"></span>
              <span>Offen</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot legend-dot--nicht-bestanden"></span>
              <span>Nicht bestanden</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot legend-dot--in-bearbeitung"></span>
              <span>In Bearbeitung</span>
            </div>
          </div>

          <!-- Grid -->
          <div class="semester-grid">
            @for (row of semesterRows(); track row.semester) {
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
                      [class.module-card--wahlpflicht]="modul.modultyp === 'WAHLPFLICHT'"
                      [class.module-card--current]="isCurrentSemester(row.semester)"
                      (click)="openModulDetail(modul)">
                      
                      <div class="module-header">
                        <span class="module-ects">{{ modul.ects }} CP</span>
                        <span class="module-nr">{{ modul.modulNr }}</span>
                      </div>
                      
                      <div class="module-name">{{ modul.name }}</div>
                      
                      @if (modul.note?.noteWert) {
                        <div class="module-note">{{ formatNote(modul.note!.noteWert) }}</div>
                      } @else if (modul.bewertungsart === 'BESTANDEN_NICHT_BESTANDEN' && modul.note?.bestanden) {
                        <div class="module-note module-note--bestanden">✓</div>
                      }
                      
                      @if (modul.modultyp === 'WAHLPFLICHT' && !modul.note) {
                        <div class="module-wahlpflicht">WP</div>
                      }
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
          <div class="empty-icon">📚</div>
          <h3>Kein Studienverlaufsplan geladen</h3>
          <p>Wählen Sie eine Einschreibung aus, um den Studienverlaufsplan anzuzeigen.</p>
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
              <div class="status-display status-display--{{ selectedModul()!.status }}">
                @if (selectedModul()!.note?.noteWert) {
                  <span class="status-note">{{ formatNote(selectedModul()!.note!.noteWert) }}</span>
                }
                <span class="status-label">
                  @switch (selectedModul()!.status) {
                    @case ('bestanden') { Bestanden }
                    @case ('nicht-bestanden') { Nicht bestanden }
                    @case ('in-bearbeitung') { In Bearbeitung }
                    @default { Offen }
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
      gap: var(--spacing-sm);
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
    }

    .stat-card--primary { border-color: rgba(0, 242, 255, 0.3); }
    .stat-card--primary .stat-icon,
    .stat-card--primary .stat-value { color: var(--color-primary); }

    .stat-card--success { border-color: rgba(0, 255, 136, 0.3); }
    .stat-card--success .stat-icon,
    .stat-card--success .stat-value { color: var(--color-success); }

    .stat-card--info { border-color: rgba(112, 0, 255, 0.3); }
    .stat-card--info .stat-icon,
    .stat-card--info .stat-value { color: var(--color-secondary); }

    .stat-icon { font-size: 1.25rem; }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .stat-label {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    /* Demo Controls */
    .demo-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
      padding: var(--spacing-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
    }

    .control-group label {
      display: block;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      margin-bottom: var(--spacing-xs);
    }

    .input-group {
      display: flex;
      gap: var(--spacing-sm);
    }

    .demo-input {
      padding: 10px 14px;
      background: var(--bg-deep);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: 0.95rem;
      min-width: 250px;
    }

    .demo-input:focus {
      outline: none;
      border-color: var(--color-primary);
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
      background: rgba(112, 0, 255, 0.15);
      color: var(--color-secondary);
      border: 1px solid rgba(112, 0, 255, 0.3);
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

    .error-icon { font-size: 48px; margin-bottom: var(--spacing-md); }
    .empty-icon { font-size: 64px; margin-bottom: var(--spacing-md); }

    .empty-state h3 {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-primary);
    }

    /* Study Plan Container */
    .study-plan-container {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: var(--spacing-lg);
      overflow-x: auto;
    }

    /* Legend */
    .legend {
      display: flex;
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
      padding-bottom: var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    .legend-dot--bestanden { background: var(--color-success); }
    .legend-dot--offen { background: var(--bg-hover); border: 1px solid var(--border-color); }
    .legend-dot--nicht-bestanden { background: var(--color-danger); }
    .legend-dot--in-bearbeitung { background: var(--color-warning); }

    /* Semester Grid */
    .semester-grid {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .semester-row {
      display: flex;
      align-items: stretch;
      gap: var(--spacing-sm);
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
      border: 1px solid var(--border-color);
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
      color: var(--color-primary);
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

    /* Module Card */
    .module-card {
      position: relative;
      display: flex;
      flex-direction: column;
      min-width: 140px;
      max-width: 180px;
      flex: 1;
      padding: var(--spacing-sm);
      background: var(--bg-hover);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .module-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
      border-color: var(--color-primary);
    }

    .module-card--bestanden {
      background: rgba(0, 255, 136, 0.08);
      border-color: rgba(0, 255, 136, 0.3);
    }

    .module-card--nicht-bestanden {
      background: rgba(255, 0, 85, 0.08);
      border-color: rgba(255, 0, 85, 0.3);
    }

    .module-card--in-bearbeitung {
      background: rgba(255, 184, 0, 0.08);
      border-color: rgba(255, 184, 0, 0.3);
    }

    .module-card--offen {
      background: var(--bg-hover);
      border-color: var(--border-color);
    }

    .module-card--wahlpflicht {
      border-style: dashed;
    }

    .module-card--current {
      box-shadow: 0 0 0 2px rgba(0, 242, 255, 0.3);
    }

    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .module-ects {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--color-primary);
    }

    .module-nr {
      font-size: var(--font-size-xs);
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-muted);
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

    .module-note {
      position: absolute;
      bottom: var(--spacing-xs);
      right: var(--spacing-xs);
      font-size: var(--font-size-sm);
      font-weight: 700;
      color: var(--text-primary);
      background: rgba(0, 0, 0, 0.4);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
    }

    .module-note--bestanden {
      color: var(--color-success);
    }

    .module-wahlpflicht {
      position: absolute;
      bottom: var(--spacing-xs);
      right: var(--spacing-xs);
      font-size: 10px;
      font-weight: 700;
      color: var(--color-secondary);
      background: rgba(112, 0, 255, 0.2);
      padding: 1px 4px;
      border-radius: 3px;
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
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }

    .summary-progress {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-secondary);
    }

    /* Progress Section */
    .progress-section {
      margin-top: var(--spacing-lg);
      padding: var(--spacing-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
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
      background: linear-gradient(90deg, var(--color-primary), var(--color-success));
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
      border: 1px solid var(--border-color);
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
      border-bottom: 1px solid var(--border-color);
    }

    .modal-title {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .modal-module-nr {
      font-size: var(--font-size-xs);
      font-family: 'JetBrains Mono', monospace;
      color: var(--color-primary);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
    }

    .close-btn {
      background: var(--bg-hover);
      border: 1px solid var(--border-color);
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
      background: rgba(0, 255, 136, 0.1);
      border: 1px solid rgba(0, 255, 136, 0.3);
    }

    .status-display--nicht-bestanden {
      background: rgba(255, 0, 85, 0.1);
      border: 1px solid rgba(255, 0, 85, 0.3);
    }

    .status-display--in-bearbeitung {
      background: rgba(255, 184, 0, 0.1);
      border: 1px solid rgba(255, 184, 0, 0.3);
    }

    .status-display--offen {
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
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
      border-top: 1px solid var(--border-color);
    }

    .note-entry-section h4 {
      margin: 0 0 var(--spacing-md) 0;
      color: var(--color-secondary);
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
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: 1rem;
    }

    .note-input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-sm);
      padding: var(--spacing-lg);
      border-top: 1px solid var(--border-color);
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

      .demo-controls {
        flex-direction: column;
        align-items: flex-start;
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
  // State
  loading = signal(false);
  error = signal<string | null>(null);
  selectedEinschreibung = '';
  currentSemester = signal(1);
  
  // Data
  module = signal<ModulMitNote[]>([]);
  noten = signal<Note[]>([]);
  einschreibung = signal<any>(null);
  
  // Modal
  selectedModul = signal<ModulMitNote | null>(null);
  newNoteValue = '';
  newNoteDatum = '';
  
  // Demo: isPruefungsamt toggle
  _isPruefungsamt = signal(true);

  // Computed values
  semesterRows = computed(() => {
    const moduleList = this.module();
    if (moduleList.length === 0) return [];

    // Group by semester
    const grouped = new Map<string, ModulMitNote[]>();
    
    for (const modul of moduleList) {
      const sem = this.normalizeSemester(modul.semester);
      if (!grouped.has(sem)) {
        grouped.set(sem, []);
      }
      grouped.get(sem)!.push(modul);
    }

    // Create rows sorted descending (7 -> 1)
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
        module: moduleInSem.sort((a, b) => 
          parseInt(a.modulNr) - parseInt(b.modulNr) || a.modulNr.localeCompare(b.modulNr)
        ),
        bestandenCount,
        totalCount: moduleInSem.length,
        sumEcts,
        bestandenEcts
      });
    }

    return rows;
  });

  totalEcts = computed(() => {
    return this.module().reduce((sum, m) => sum + m.ects, 0);
  });

  bestandenEcts = computed(() => {
    return this.module()
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

  constructor(private apollo: Apollo) {}

  ngOnInit(): void {
    // Auto-load first student
    this.selectedEinschreibung = 'eeee1111-1111-1111-1111-111111111111';
    this.loadStudyPlan();
  }

  isPruefungsamt(): boolean {
    return this._isPruefungsamt();
  }

  loadStudyPlan(): void {
    if (!this.selectedEinschreibung) return;

    this.loading.set(true);
    this.error.set(null);

    // Zwei parallele Anfragen an verschiedene Services
    const einschreibungQuery = this.apollo.query<any>({
      query: EINSCHREIBUNG_QUERY,
      variables: { einschreibungId: this.selectedEinschreibung },
      fetchPolicy: 'network-only'
      // Default: geht an studiengang-service
    });

    const notenQuery = this.apollo.query<any>({
      query: NOTEN_QUERY,
      variables: { einschreibungId: this.selectedEinschreibung },
      context: { clientName: 'noten' }, // Wichtig: an noten-service routen
      fetchPolicy: 'network-only'
    });

    // Beide Queries parallel ausführen
    Promise.all([
      einschreibungQuery.toPromise(),
      notenQuery.toPromise()
    ]).then(([einschreibungResult, notenResult]) => {
      const einschreibungData = einschreibungResult?.data;
      const notenData = notenResult?.data;

      if (!einschreibungData?.einschreibung) {
        this.error.set('Einschreibung nicht gefunden');
        this.loading.set(false);
        return;
      }

      this.einschreibung.set(einschreibungData.einschreibung);
      this.currentSemester.set(einschreibungData.einschreibung.aktuellesSemester || 1);

      const noten: Note[] = notenData?.notenByStudent || [];
      this.noten.set(noten);

      // Map modules with notes
      const moduleList = einschreibungData.einschreibung.pruefungsordnung?.module || [];
      const notenMap = new Map<string, Note>();

      for (const note of noten) {
        // Keep only the latest (highest versuch) per module
        const existing = notenMap.get(note.modulId);
        if (!existing || note.versuch > existing.versuch) {
          notenMap.set(note.modulId, note);
        }
      }

      const moduleMitNoten: ModulMitNote[] = moduleList.map((m: Modul) => {
        const note = notenMap.get(m.id);
        let status: ModulMitNote['status'] = 'offen';

        if (note) {
          if (note.status === 'ERFASST' || note.status === 'VALIDIERT') {
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
      this.error.set('Fehler beim Laden des Studienverlaufsplans');
      this.loading.set(false);
    });
  }

  normalizeSemester(sem: string): string {
    // Handle "1-2", "6-7" etc. - use the first semester
    if (sem.includes('-')) {
      return sem.split('-')[0];
    }
    return sem;
  }

  parseSemester(sem: string): number {
    return parseInt(sem) || 0;
  }

  isCurrentSemester(semester: string): boolean {
    return parseInt(semester) === this.currentSemester();
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

  saveNote(): void {
    // TODO: Implement GraphQL mutation to save note
    console.log('Saving note:', {
      modulId: this.selectedModul()?.id,
      note: this.newNoteValue,
      datum: this.newNoteDatum
    });
    
    alert('Note speichern (GraphQL-Mutation noch nicht implementiert)');
    this.closeModulDetail();
  }
}

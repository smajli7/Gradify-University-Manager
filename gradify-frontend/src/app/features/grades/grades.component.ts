import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GradeService } from '../../core/services/grade.service';
import { ModuleService } from '../../core/services/module.service';
import { Note, NoteStatus, Modul } from '../../types';

@Component({
  selector: 'app-grades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page animate-slide-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Notenübersicht</h1>
          <p class="text-muted">Alle erfassten Prüfungsleistungen</p>
        </div>
        
        @if (gradeService.durchschnitt()) {
          <div class="header-stats">
            <div class="stat-card stat-card--primary">
              <span class="stat-icon material-icons-outlined">trending_up</span>
              <div class="stat-info">
                <span class="stat-value">{{ gradeService.durchschnitt() | number:'1.2-2' }}</span>
                <span class="stat-label">Durchschnitt</span>
              </div>
            </div>
            <div class="stat-card stat-card--success">
              <span class="stat-icon material-icons-outlined">check_circle</span>
              <div class="stat-info">
                <span class="stat-value">{{ gradeService.bestandenCount() }}</span>
                <span class="stat-label">Bestanden</span>
              </div>
            </div>
            <div class="stat-card stat-card--warning">
              <span class="stat-icon material-icons-outlined">schedule</span>
              <div class="stat-info">
                <span class="stat-value">{{ gradeService.offenCount() }}</span>
                <span class="stat-label">Offen</span>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Info Banner (Demo-Modus) -->
      <div class="info-banner">
        <span class="material-icons-outlined">info</span>
        <p>
          <strong>Demo-Modus:</strong> Wählen Sie eine Einschreibung, um Noten zu laden.
          Im Produktivbetrieb werden Ihre Noten automatisch angezeigt.
        </p>
      </div>

      <!-- Demo Controls -->
      <div class="demo-controls">
        <div class="control-group">
          <label>Einschreibungs-ID (Demo):</label>
          <div class="input-group">
            <input 
              type="text" 
              class="demo-input"
              [(ngModel)]="demoEinschreibungId"
              placeholder="z.B. 1">
            <button class="btn btn--primary" (click)="loadDemoData()" [disabled]="gradeService.loading()">
              @if (gradeService.loading()) {
                <span class="spinner-sm"></span>
              } @else {
                <span class="material-icons-outlined">download</span>
              }
              Laden
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      @if (gradeService.loading()) {
        <div class="loading-state">
          <div class="spinner-lg"></div>
          <p>Lade Noten...</p>
        </div>
      }

      <!-- Error State -->
      @if (gradeService.error()) {
        <div class="error-state">
          <span class="material-icons-outlined">error</span>
          <p>{{ gradeService.error() }}</p>
          <button class="btn btn--primary" (click)="loadDemoData()">Erneut versuchen</button>
        </div>
      }

      <!-- Grades Table -->
      @if (!gradeService.loading() && !gradeService.error() && gradeService.noten().length > 0) {
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-modul">Modul</th>
                <th class="col-note">Note</th>
                <th class="col-versuch">Versuch</th>
                <th class="col-datum">Prüfungsdatum</th>
                <th class="col-status">Status</th>
              </tr>
            </thead>
            <tbody>
              @for (note of filteredNoten(); track note.id) {
                <tr class="table-row" (click)="openDetail(note)">
                  <td class="col-modul">
                    <div class="modul-cell">
                      <span class="modul-nr">{{ moduleService.getModulNr(note.modulId) || note.modulId }}</span>
                      <span class="modul-name">{{ moduleService.getModulName(note.modulId) }}</span>
                    </div>
                  </td>
                  <td class="col-note">
                    <span class="note-badge note-badge--{{ gradeService.getNoteColor(note.noteWert) }}">
                      {{ gradeService.formatNote(note.noteWert) }}
                    </span>
                  </td>
                  <td class="col-versuch">
                    <span class="versuch-badge">{{ note.versuch }}. Versuch</span>
                  </td>
                  <td class="col-datum">{{ formatDate(note.pruefungsdatum) }}</td>
                  <td class="col-status">
                    <span class="status-badge status-badge--{{ gradeService.getStatusColor(note.status) }}">
                      {{ gradeService.getStatusLabel(note.status) }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="empty-state">
                    <span class="material-icons-outlined">school</span>
                    <p>Keine Noten vorhanden</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Table Footer -->
        <div class="table-footer">
          <span class="result-count">{{ filteredNoten().length }} Prüfungsleistungen</span>
        </div>
      }

      <!-- Empty State (no data loaded) -->
      @if (!gradeService.loading() && !gradeService.error() && gradeService.noten().length === 0) {
        <div class="empty-initial-state">
          <div class="empty-icon">
            <span class="material-icons-outlined">grade</span>
          </div>
          <h3>Keine Noten geladen</h3>
          <p>Geben Sie eine Einschreibungs-ID ein und klicken Sie auf "Laden", um Noten anzuzeigen.</p>
        </div>
      }

      <!-- Detail Modal -->
      @if (selectedNote()) {
        <div class="modal-overlay" (click)="closeDetail()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Notendetails</h2>
              <button class="close-btn" (click)="closeDetail()">
                <span class="material-icons-outlined">close</span>
              </button>
            </div>
            <div class="modal-body">
              <div class="note-display">
                <span class="note-large note-large--{{ gradeService.getNoteColor(selectedNote()!.noteWert) }}">
                  {{ gradeService.formatNote(selectedNote()!.noteWert) }}
                </span>
                @if (selectedNote()!.bestanden !== null && selectedNote()!.bestanden !== undefined) {
                  <span class="bestanden-badge" [class.bestanden-badge--success]="selectedNote()!.bestanden">
                    {{ selectedNote()!.bestanden ? 'Bestanden' : 'Nicht bestanden' }}
                  </span>
                }
              </div>
              
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Modul</span>
                  <span class="detail-value">{{ moduleService.getModulName(selectedNote()!.modulId) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Modul-Nr.</span>
                  <span class="detail-value">{{ moduleService.getModulNr(selectedNote()!.modulId) || selectedNote()!.modulId }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Versuch</span>
                  <span class="detail-value">{{ selectedNote()!.versuch }}. Versuch</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Prüfungsdatum</span>
                  <span class="detail-value">{{ formatDate(selectedNote()!.pruefungsdatum) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Status</span>
                  <span class="status-badge status-badge--{{ gradeService.getStatusColor(selectedNote()!.status) }}">
                    {{ gradeService.getStatusLabel(selectedNote()!.status) }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Erfasst am</span>
                  <span class="detail-value">{{ formatDate(selectedNote()!.erfasstAm) }}</span>
                </div>
                @if (selectedNote()!.validiertAm) {
                  <div class="detail-item">
                    <span class="detail-label">Validiert am</span>
                    <span class="detail-value">{{ formatDate(selectedNote()!.validiertAm!) }}</span>
                  </div>
                }
                @if (selectedNote()!.kommentar) {
                  <div class="detail-item detail-item--full">
                    <span class="detail-label">Kommentar</span>
                    <span class="detail-value">{{ selectedNote()!.kommentar }}</span>
                  </div>
                }
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn--secondary" (click)="closeDetail()">Schließen</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-md) 0;
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

    .stat-card--primary {
      border-color: rgba(0, 242, 255, 0.3);
    }

    .stat-card--primary .stat-icon,
    .stat-card--primary .stat-value {
      color: var(--color-primary);
    }

    .stat-card--success {
      border-color: rgba(16, 185, 129, 0.3);
    }

    .stat-card--success .stat-icon,
    .stat-card--success .stat-value {
      color: var(--color-success);
    }

    .stat-card--warning {
      border-color: rgba(245, 158, 11, 0.3);
    }

    .stat-card--warning .stat-icon,
    .stat-card--warning .stat-value {
      color: var(--color-warning);
    }

    .stat-icon {
      font-size: 24px;
    }

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

    /* Info Banner */
    .info-banner {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: rgba(0, 242, 255, 0.05);
      border: 1px solid rgba(0, 242, 255, 0.2);
      border-radius: var(--radius-lg);
      margin-bottom: var(--spacing-lg);
    }

    .info-banner .material-icons-outlined {
      color: var(--color-primary);
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .info-banner p {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    /* Demo Controls */
    .demo-controls {
      display: flex;
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
      width: 200px;
    }

    .demo-input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    /* Loading & Error States */
    .loading-state,
    .error-state,
    .empty-initial-state {
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
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-state .material-icons-outlined {
      font-size: 48px;
      color: var(--color-danger);
      margin-bottom: var(--spacing-md);
    }

    .empty-initial-state .empty-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--spacing-md);
    }

    .empty-initial-state .empty-icon .material-icons-outlined {
      font-size: 36px;
      color: var(--text-muted);
    }

    .empty-initial-state h3 {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-primary);
    }

    /* Table */
    .table-container {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      overflow: hidden;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th {
      padding: var(--spacing-md);
      text-align: left;
      font-weight: 500;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--border-color);
    }

    .data-table td {
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
    }

    .table-row {
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .table-row:hover {
      background: var(--bg-hover);
    }

    .table-row:last-child td {
      border-bottom: none;
    }

    /* Column widths */
    .col-modul { width: auto; }
    .col-note { width: 100px; text-align: center; }
    .col-versuch { width: 120px; }
    .col-datum { width: 140px; }
    .col-status { width: 130px; }

    /* Cell styles */
    .modul-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .modul-nr {
      font-family: 'JetBrains Mono', monospace;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .modul-name {
      font-weight: 500;
    }

    .note-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 1rem;
    }

    .note-badge--success { background: rgba(16, 185, 129, 0.15); color: var(--color-success); }
    .note-badge--info { background: rgba(0, 242, 255, 0.15); color: var(--color-primary); }
    .note-badge--warning { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
    .note-badge--caution { background: rgba(251, 146, 60, 0.15); color: #fb923c; }
    .note-badge--danger { background: rgba(239, 68, 68, 0.15); color: var(--color-danger); }
    .note-badge--muted { background: var(--bg-hover); color: var(--text-muted); }

    .versuch-badge {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: 500;
    }

    .status-badge--warning { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
    .status-badge--info { background: rgba(0, 242, 255, 0.15); color: var(--color-primary); }
    .status-badge--success { background: rgba(16, 185, 129, 0.15); color: var(--color-success); }

    .empty-state {
      text-align: center;
      padding: var(--spacing-2xl) !important;
      color: var(--text-muted);
    }

    .empty-state .material-icons-outlined {
      font-size: 48px;
      margin-bottom: var(--spacing-sm);
      opacity: 0.5;
    }

    /* Table Footer */
    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md);
      color: var(--text-muted);
      font-size: var(--font-size-sm);
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
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
      max-width: 520px;
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
      align-items: center;
      padding: var(--spacing-lg);
      border-bottom: 1px solid var(--border-color);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: var(--radius-md);
      transition: all 0.15s ease;
    }

    .close-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .modal-body {
      padding: var(--spacing-lg);
    }

    .note-display {
      text-align: center;
      margin-bottom: var(--spacing-lg);
    }

    .note-large {
      display: inline-block;
      font-size: 3rem;
      font-weight: 700;
      padding: var(--spacing-md) var(--spacing-xl);
      border-radius: var(--radius-xl);
      margin-bottom: var(--spacing-sm);
    }

    .note-large--success { background: rgba(16, 185, 129, 0.15); color: var(--color-success); }
    .note-large--info { background: rgba(0, 242, 255, 0.15); color: var(--color-primary); }
    .note-large--warning { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
    .note-large--caution { background: rgba(251, 146, 60, 0.15); color: #fb923c; }
    .note-large--danger { background: rgba(239, 68, 68, 0.15); color: var(--color-danger); }
    .note-large--muted { background: var(--bg-hover); color: var(--text-muted); }

    .bestanden-badge {
      display: block;
      font-size: var(--font-size-sm);
      color: var(--color-danger);
      margin-top: var(--spacing-xs);
    }

    .bestanden-badge--success {
      color: var(--color-success);
    }

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
      gap: var(--spacing-xs);
      padding: 10px 18px;
      border-radius: var(--radius-lg);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn--primary {
      background: var(--color-primary);
      border: none;
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

    .btn .material-icons-outlined {
      font-size: 18px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header-stats {
        flex-wrap: wrap;
      }

      .col-versuch,
      .col-datum {
        display: none;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class GradesComponent implements OnInit {
  demoEinschreibungId = '';
  selectedNote = signal<Note | null>(null);

  filteredNoten = computed(() => {
    return this.gradeService.noten();
  });

  constructor(
    public gradeService: GradeService,
    public moduleService: ModuleService
  ) {}

  ngOnInit(): void {
    // Optional: Load modules for name resolution
    this.moduleService.loadModule().subscribe();
  }

  loadDemoData(): void {
    if (!this.demoEinschreibungId.trim()) return;
    this.gradeService.loadNotenByStudent(this.demoEinschreibungId).subscribe();
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

  openDetail(note: Note): void {
    this.selectedNote.set(note);
  }

  closeDetail(): void {
    this.selectedNote.set(null);
  }
}

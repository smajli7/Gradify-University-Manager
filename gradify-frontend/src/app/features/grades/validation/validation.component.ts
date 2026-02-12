import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Apollo, gql } from 'apollo-angular';
import { AuthService } from '../../../core/services/auth.service';
import { SkeletonStateComponent } from '../../../shared/components/skeleton-state/skeleton-state.component';

const LOAD_TIMEOUT_MS = 15000;

// GraphQL Queries
const GET_ALL_STUDENTS = gql`
  query GetAllStudents {
    students {
      id
      vorname
      nachname
      matrikelnummer
    }
  }
`;

const GET_ALL_EINSCHREIBUNGEN = gql`
  query GetAllEinschreibungen {
    einschreibungen {
      id
      studentId
    }
  }
`;

const GET_ALL_MODULE = gql`
  query GetAllModule {
    module {
      id
      name
      modulNr
    }
  }
`;

const GET_ALL_USERS = gql`
  query GetAllUsers {
    users {
      id
      vorname
      nachname
      benutzername
    }
  }
`;

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface Note {
  id: string;
  modulId: string;
  einschreibungId: string;
  noteWert: number | null;
  bestanden: boolean;
  status: string;
  pruefungsdatum: string;
  versuch: number;
  kommentar: string | null;
  erfasstAm: string;
  erfasstVon: string;
  validiertAm: string | null;
  validiertVon: string | null;
  // Extended fields
  studentName?: string;
  studentMatrikel?: string;
  modulName?: string;
  modulNr?: string;
  erfasstVonName?: string;
  validiertVonName?: string;
  selected?: boolean;
}

interface StudentInfo {
  id: string;
  vorname: string;
  nachname: string;
  matrikelnummer: string;
}

interface EinschreibungInfo {
  id: string;
  studentId: string;
}

interface ModulInfo {
  id: string;
  name: string;
  modulNr: string;
}

interface UserInfo {
  id: string;
  vorname: string;
  nachname: string;
  benutzername: string;
}

@Component({
  selector: 'app-validation',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonStateComponent],
  template: `
    <div class="page animate-slide-up" [class.drawer-open]="selectedNote()">
      <!-- Kompakter Titel -->
      <div class="page-header page-header--compact">
        <h1>Notenvalidierung</h1>
        <p class="page-subtitle">1. Validieren → 2. Freigeben. Zuerst ausstehende Noten prüfen.</p>
      </div>

      <!-- Sticky Arbeitsleiste: Filter + Status-Chips + Suche + Batch-Actions -->
      <div class="toolbar toolbar--sticky">
        <div class="toolbar-left">
          <div class="filter-bar">
            <select class="filter-select" [ngModel]="statusFilter()" (ngModelChange)="setStatusFilter($event)">
              <option value="ERFASST">Ausstehend (zu prüfen)</option>
              <option value="VALIDIERT">Validiert (wartet auf Freigabe)</option>
              <option value="FREIGEGEBEN">Freigegeben</option>
              <option value="all">Alle Status</option>
            </select>
            <span class="filter-sep"></span>
            <div class="search-wrapper">
              <span class="search-icon material-icons-outlined">search</span>
              <input type="text" class="search-input" placeholder="Suche nach Student, Modul…"
                [ngModel]="searchTerm()" (ngModelChange)="setSearchTerm($event)">
            </div>
          </div>
          <div class="status-chips">
            <button type="button" class="chip" [class.chip--active]="statusFilter() === 'ERFASST'" (click)="setStatusFilter('ERFASST')">
              Ausstehend {{ pendingCount() }}
            </button>
            <button type="button" class="chip" [class.chip--active]="statusFilter() === 'VALIDIERT'" (click)="setStatusFilter('VALIDIERT')">
              Validiert {{ validatedCount() }}
            </button>
            <button type="button" class="chip" [class.chip--active]="statusFilter() === 'FREIGEGEBEN'" (click)="setStatusFilter('FREIGEGEBEN')">
              Freigegeben {{ releasedCount() }}
            </button>
          </div>
        </div>
        <div class="toolbar-right">
          <div class="batch-actions">
            <button class="btn btn--primary btn--sm" (click)="batchValidate()" [disabled]="selectedValidatable() === 0 || processing()" [title]="selectedValidatable() === 0 ? 'Keine ausstehenden Noten ausgewählt' : selectedValidatable() + ' Note(n) validieren'">
              <span class="material-icons-outlined">check</span>
              {{ selectedValidatable() }} validieren
            </button>
            <button class="btn btn--success btn--sm" (click)="batchRelease()" [disabled]="selectedReleasable() === 0 || processing()" [title]="selectedReleasable() === 0 ? 'Keine validierten Noten ausgewählt' : selectedReleasable() + ' Note(n) freigeben'">
              <span class="material-icons-outlined">verified</span>
              {{ selectedReleasable() }} freigeben
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <app-skeleton-state [lineCount]="8" />
      }

      <!-- Error State -->
      @if (error()) {
        <div class="error-state">
          <span class="material-icons-outlined">error</span>
          <p>{{ error() }}</p>
          <button class="btn btn--primary" (click)="loadData()">Erneut versuchen</button>
        </div>
      }

      <!-- Layout: Tabelle + rechter Drawer -->
      @if (!loading() && !error()) {
        <div class="validation-layout">
          <div class="table-wrap">
            <div class="table-container table-container--sticky">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="col-flag"></th>
                    <th class="col-checkbox">
                      <input type="checkbox" [checked]="allSelected()" (change)="toggleSelectAll($event)">
                    </th>
                    <th class="col-student">Student</th>
                    <th class="col-modul">Modul</th>
                    <th class="col-note">Note</th>
                    <th class="col-status">Status</th>
                    <th class="col-datum">Prüfungsdatum</th>
                    <th class="col-versuch">Versuch</th>
                    <th class="col-actions">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  @for (note of filteredNoten(); track note.id; let i = $index) {
                    <tr
                      [class.row-zebra]="i % 2 === 1"
                      [class.selected]="note.selected"
                      [class.row-selected]="note.selected"
                      (click)="showDetails(note)">
                      <td class="col-flag">
                        @if (hasConflict(note)) {
                          <div class="conflict-indicator" [title]="getConflictReason(note)">
                            <span class="flag-warning material-icons-outlined">warning</span>
                            <span class="conflict-hint">Prüfen</span>
                          </div>
                        } @else if (hasComment(note)) {
                          <div class="comment-indicator" [title]="note.kommentar">
                            <span class="flag-comment material-icons-outlined">comment</span>
                          </div>
                        }
                      </td>
                      <td class="col-checkbox" (click)="$event.stopPropagation()">
                        <input type="checkbox" [checked]="note.selected" (change)="toggleSelect(note)">
                      </td>
                      <td class="col-student">
                        <div class="cell-student">
                          <span class="cell-student-name">{{ note.studentName || (note.einschreibungId | slice:0:8) + '…' }}</span>
                          <span class="cell-student-meta">{{ note.studentMatrikel || '–' }}</span>
                        </div>
                      </td>
                      <td class="col-modul">
                        <div class="cell-modul">
                          @if (note.modulNr) {
                            <span class="modul-badge">{{ note.modulNr }}</span>
                            <span class="modul-name">{{ getModulDisplayName(note) }}</span>
                          } @else {
                            <span class="modul-name">{{ note.modulName || (note.modulId | slice:0:8) + '…' }}</span>
                          }
                        </div>
                      </td>
                      <td class="col-note" (click)="$event.stopPropagation(); quickEditNote(note)">
                        <div class="note-cell-editable" title="Klicken zum Bearbeiten">
                          @if (note.noteWert !== null) {
                            <span class="note-value" [class]="getNoteClass(note.noteWert)">{{ note.noteWert | number:'1.1-1' }}</span>
                          } @else {
                            <span class="note-value note-value--bestanden">{{ note.bestanden ? 'Bestanden' : '–' }}</span>
                          }
                          <span class="note-edit-icon material-icons-outlined">edit</span>
                        </div>
                      </td>
                      <td class="col-status">
                        <span class="status-badge" [class]="'status-badge--' + note.status.toLowerCase()">{{ getStatusLabel(note.status) }}</span>
                      </td>
                      <td class="col-datum">{{ formatDate(note.pruefungsdatum) }}</td>
                      <td class="col-versuch">{{ note.versuch }}</td>
                      <td class="col-actions" (click)="$event.stopPropagation()">
                        <div class="action-buttons">
                          <button type="button" class="action-btn" title="Details anzeigen" (click)="showDetails(note)">
                            <span class="material-icons-outlined">visibility</span>
                          </button>
                          <button type="button" class="action-btn action-btn--edit" title="Note bearbeiten" (click)="quickEditNote(note)">
                            <span class="material-icons-outlined">edit</span>
                          </button>
                          @if (note.status === 'ERFASST') {
                            <button type="button" class="action-btn action-btn--validate" title="Validieren" (click)="validateNote(note)" [disabled]="processing()">
                              <span class="material-icons-outlined">check</span>
                            </button>
                          }
                          @if (note.status === 'VALIDIERT') {
                            <button type="button" class="action-btn action-btn--release" title="Freigeben" (click)="releaseNote(note)" [disabled]="processing()">
                              <span class="material-icons-outlined">verified</span>
                            </button>
                          }
                          @if (note.status === 'FREIGEGEBEN') {
                            <button type="button" class="action-btn action-btn--reject" title="Freigabe zurücknehmen" (click)="rejectNote(note)" [disabled]="processing()">
                              <span class="material-icons-outlined">undo</span>
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="9" class="empty-cell">
                        @if (statusFilter() === 'all' && !searchTerm()) {
                          Keine Noten vorhanden
                        } @else {
                          Keine Noten gefunden für die ausgewählten Filter
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="summary-bar">
              <span>{{ filteredNoten().length }} von {{ noten().length }} Noten angezeigt</span>
            </div>
          </div>

          <!-- Rechter Drawer (Detail) -->
          @if (selectedNote(); as note) {
            <aside class="detail-drawer" (click)="$event.stopPropagation()">
              <div class="drawer-header">
                <h2 class="drawer-title">{{ editingNote()?.id === note.id ? 'Note bearbeiten' : 'Notendetails' }}</h2>
                <button type="button" class="drawer-close" (click)="closeDetails(); cancelEdit(); dismissEditConfirm()">
                  <span class="material-icons-outlined">close</span>
                </button>
              </div>
              <div class="drawer-body">
                @if (confirmEditNote()?.id === note.id) {
                  <div class="drawer-warning">
                    <span class="material-icons-outlined">warning</span>
                    <p>Diese Note ist bereits {{ note.status === 'FREIGEGEBEN' ? 'freigegeben' : 'validiert' }}. Änderungen werden protokolliert.</p>
                    <p class="drawer-warning-question">Trotzdem bearbeiten?</p>
                    <div class="drawer-warning-actions">
                      <button type="button" class="btn btn--primary" (click)="confirmEditAndOpen()">Ja, bearbeiten</button>
                      <button type="button" class="btn btn--secondary" (click)="dismissEditConfirm()">Abbrechen</button>
                    </div>
                  </div>
                } @else if (editingNote()?.id === note.id) {
                  <div class="drawer-edit-form">
                    <div class="drawer-block">
                      <span class="drawer-label">Note</span>
                      <select class="drawer-input drawer-select" [(ngModel)]="editFormData.noteWert" (ngModelChange)="onNoteWertChange($event)">
                        <option value="">– Bestanden –</option>
                        <option value="1.0">1,0 (sehr gut)</option>
                        <option value="1.3">1,3</option>
                        <option value="1.7">1,7</option>
                        <option value="2.0">2,0 (gut)</option>
                        <option value="2.3">2,3</option>
                        <option value="2.7">2,7</option>
                        <option value="3.0">3,0 (befriedigend)</option>
                        <option value="3.3">3,3</option>
                        <option value="3.7">3,7</option>
                        <option value="4.0">4,0 (ausreichend)</option>
                        <option value="5.0">5,0 (nicht bestanden)</option>
                      </select>
                    </div>
                    <div class="drawer-block">
                      <label class="drawer-check" [class.disabled]="editFormData.noteWert !== ''">
                        <input type="checkbox" [(ngModel)]="editFormData.bestanden" [disabled]="editFormData.noteWert !== ''" />
                        <span>Bestanden</span>
                        @if (editFormData.noteWert === '5.0') {
                          <span class="drawer-hint">5,0 = nicht bestanden</span>
                        } @else if (editFormData.noteWert !== '') {
                          <span class="drawer-hint">automatisch (≤ 4,0)</span>
                        }
                      </label>
                    </div>
                    <div class="drawer-block">
                      <span class="drawer-label">Prüfungsdatum</span>
                      <input type="date" class="drawer-input" [(ngModel)]="editFormData.pruefungsdatum" />
                    </div>
                    <div class="drawer-block">
                      <span class="drawer-label">Kommentar</span>
                      <textarea class="drawer-textarea" [(ngModel)]="editFormData.kommentar" rows="3" placeholder="Optional"></textarea>
                    </div>
                    <div class="drawer-edit-actions">
                      <button class="btn btn--primary" (click)="saveEditNote(note)" [disabled]="processing()">Speichern</button>
                      <button class="btn btn--secondary" (click)="cancelEdit()">Abbrechen</button>
                    </div>
                  </div>
                } @else {
                  <div class="drawer-block">
                    <span class="drawer-label">Student</span>
                    <span class="drawer-value">{{ note.studentName || note.einschreibungId }}</span>
                    @if (note.studentMatrikel) {
                      <span class="drawer-meta">{{ note.studentMatrikel }}</span>
                    }
                  </div>
                  <div class="drawer-block">
                    <span class="drawer-label">Modul</span>
                    <span class="drawer-value">{{ note.modulNr ? note.modulNr + ' ' + getModulDisplayName(note) : (note.modulName || note.modulId) }}</span>
                  </div>
                  <div class="drawer-block">
                    <span class="drawer-label">Status</span>
                    <span class="status-badge" [class]="'status-badge--' + note.status.toLowerCase()">{{ getStatusLabel(note.status) }}</span>
                  </div>
                  <div class="drawer-block">
                    <span class="drawer-label">Note</span>
                    <span class="drawer-value">
                      {{ note.noteWert !== null ? (note.noteWert | number:'1.1-1') : (note.bestanden ? 'Bestanden' : '–') }}
                    </span>
                  </div>
                  <div class="drawer-block">
                    <span class="drawer-label">Prüfungsdatum</span>
                    <span class="drawer-value">{{ formatDate(note.pruefungsdatum) }}</span>
                  </div>
                  <div class="drawer-block">
                    <span class="drawer-label">Versuch</span>
                    <span class="drawer-value">{{ note.versuch }}</span>
                  </div>
                  <div class="drawer-block">
                    <span class="drawer-label">Erfasst am / von</span>
                    <span class="drawer-value">{{ formatDate(note.erfasstAm) }} · {{ note.erfasstVonName || note.erfasstVon || '–' }}</span>
                  </div>
                  @if (note.validiertAm) {
                    <div class="drawer-block">
                      <span class="drawer-label">Validiert am / von</span>
                      <span class="drawer-value">{{ formatDate(note.validiertAm) }} · {{ note.validiertVonName || note.validiertVon || '–' }}</span>
                    </div>
                  }
                  @if (note.kommentar) {
                    <div class="drawer-block drawer-block--full">
                      <span class="drawer-label">Kommentar</span>
                      <span class="drawer-value">{{ note.kommentar }}</span>
                    </div>
                  }
                }
              </div>
              <div class="drawer-footer">
                @if (editingNote()?.id === note.id) {
                  <!-- Buttons sind im Formular direkt unter Kommentar -->
                } @else if (confirmEditNote()?.id !== note.id) {
                  @if (note.status === 'ERFASST') {
                    <button class="btn btn--primary" (click)="validateNote(note); closeDetails()" [disabled]="processing()">Validieren</button>
                  }
                  @if (note.status === 'VALIDIERT') {
                    <button class="btn btn--success" (click)="releaseNote(note); closeDetails()" [disabled]="processing()">Freigeben</button>
                  }
                  @if (note.status === 'FREIGEGEBEN') {
                    <button type="button" class="btn btn--secondary" (click)="rejectNote(note); closeDetails()" [disabled]="processing()">Freigabe zurücknehmen</button>
                  }
                  <button type="button" class="btn btn--secondary" (click)="requestEditNote(note)">Bearbeiten</button>
                  <button class="btn btn--secondary" (click)="closeDetails()">Schließen</button>
                }
              </div>
            </aside>
          }
        </div>
      }

      <!-- Success Message -->
      @if (successMessage()) {
        <div class="toast toast--success animate-slide-up">
          <span class="material-icons-outlined">check_circle</span>
          {{ successMessage() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-md) 0;
      width: 100%;
    }

    .page-header--compact {
      margin-bottom: var(--spacing-sm);
    }

    .page-header--compact h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .page-subtitle {
      margin: 2px 0 0 0;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-md);
    }

    .toolbar--sticky {
      position: sticky;
      top: 0;
      z-index: 20;
      background: var(--bg-deep);
      padding: var(--spacing-sm) 0;
      margin-left: calc(-1 * var(--spacing-lg));
      margin-right: calc(-1 * var(--spacing-lg));
      padding-left: var(--spacing-lg);
      padding-right: var(--spacing-lg);
      border-bottom: 1px solid var(--border-color);
      margin-bottom: var(--spacing-md);
    }

    .toolbar-left {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--spacing-md);
    }

    .toolbar-right {
      margin-left: auto;
    }

    .filter-bar {
      display: flex;
      align-items: center;
      height: 42px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-color-light);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .filter-select {
      height: 100%;
      min-width: 200px;
      padding: 0 36px 0 14px;
      background: var(--bg-elevated);
      border: none;
      color: var(--text-primary);
      font-size: var(--font-size-sm);
      font-weight: 500;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
    }

    .filter-select:hover {
      background-color: var(--bg-hover);
    }

    .filter-select:focus {
      outline: none;
    }

    .filter-select option {
      background: var(--bg-surface);
      color: var(--text-primary);
      padding: 10px 12px;
    }

    .filter-sep {
      width: 1px;
      height: 24px;
      background: var(--border-color-light);
      flex-shrink: 0;
    }

    .search-wrapper {
      position: relative;
      width: 260px;
      height: 100%;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 18px;
    }

    .search-input {
      width: 100%;
      height: 100%;
      padding: 0 12px 0 36px;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }

    .search-input::placeholder {
      color: var(--text-muted);
      opacity: 0.9;
    }

    .search-input:focus {
      outline: none;
    }

    .status-chips {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .chip {
      display: inline-flex;
      align-items: center;
      height: 32px;
      padding: 0 var(--spacing-sm);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }

    .chip:hover {
      background: var(--bg-hover);
    }

    .chip--active {
      border-color: var(--text-secondary);
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .batch-actions {
      display: flex;
      gap: var(--spacing-xs);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-md);
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn--sm {
      padding: 6px 12px;
      font-size: var(--font-size-xs);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn--primary {
      background: var(--bg-elevated);
      color: var(--text-primary);
      border: 1px solid var(--border-color-light);
    }

    .btn--primary:hover:not(:disabled) {
      background: var(--bg-hover);
      border-color: var(--text-muted);
    }

    .btn--success {
      background: rgba(var(--color-success-rgb), 0.25);
      color: #86efac;
      border: 1px solid rgba(var(--color-success-rgb), 0.4);
    }

    .btn--success:hover:not(:disabled) {
      background: rgba(var(--color-success-rgb), 0.35);
    }

    .btn--secondary {
      background: var(--bg-surface);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }

    .btn .material-icons-outlined {
      font-size: 1rem;
    }

    .loading-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-2xl);
      color: var(--text-muted);
    }

    .error-state .material-icons-outlined {
      font-size: 48px;
      color: var(--color-danger);
      margin-bottom: var(--spacing-md);
    }

    .validation-layout {
      display: flex;
      gap: 0;
      width: 100%;
      min-width: 0;
    }

    .page.drawer-open .table-wrap {
      flex: 1;
      min-width: 0;
    }

    .table-wrap {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .table-container {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      overflow: auto;
      flex: 1;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    }

    .table-container--sticky {
      overflow: auto;
    }

    .data-table {
      width: 100%;
      min-width: 800px;
      border-collapse: collapse;
    }

    /* Header: klare Trennung, eine Stufe dunkler */
    .data-table thead {
      position: sticky;
      top: 0;
      z-index: 5;
    }

    .data-table th {
      padding: 12px 14px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-muted);
      background: var(--bg-deep);
      border-bottom: 2px solid var(--border-color-light);
      white-space: nowrap;
    }

    .data-table thead th {
      background: var(--bg-deep);
    }

    /* Körper: einheitliche Zeilen, dezente Trennlinien */
    .data-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
      font-size: var(--font-size-sm);
      background: var(--bg-surface);
    }

    .data-table tbody tr {
      transition: background 0.12s ease;
      cursor: pointer;
    }

    .data-table tbody tr td {
      border-bottom: 1px solid var(--border-color);
    }

    .data-table tbody tr.row-zebra td {
      background: rgba(255, 255, 255, 0.02);
    }

    .data-table tbody tr:hover td {
      background: rgba(255, 255, 255, 0.04);
    }

    .data-table tbody tr.row-zebra:hover td {
      background: rgba(255, 255, 255, 0.04);
    }

    .data-table tbody tr.row-selected td,
    .data-table tbody tr.selected td {
      background: rgba(255, 255, 255, 0.05);
    }

    .data-table tbody tr.row-selected,
    .data-table tbody tr.selected {
      border-left: 3px solid var(--text-secondary);
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .col-flag { width: 4%; min-width: 36px; text-align: center; }
    .col-checkbox { width: 3%; min-width: 44px; text-align: center; }
    .col-student { width: 20%; min-width: 140px; }
    .col-modul { width: 28%; min-width: 180px; }
    .col-note { width: 8%; min-width: 64px; }
    .col-status { width: 12%; min-width: 100px; }
    .col-datum { width: 12%; min-width: 90px; }
    .col-versuch { width: 8%; min-width: 80px; }
    .col-actions { width: 9%; min-width: 160px; white-space: nowrap; }

    .data-table th.col-flag,
    .data-table th.col-checkbox,
    .data-table td.col-flag,
    .data-table td.col-checkbox {
      position: sticky;
      left: 0;
      z-index: 2;
    }

    .data-table thead th.col-flag { left: 0; background: var(--bg-deep); }
    .data-table thead th.col-checkbox { left: 36px; background: var(--bg-deep); }
    .data-table thead th.col-student { left: 80px; background: var(--bg-deep); }

    .data-table th.col-student,
    .data-table td.col-student {
      position: sticky;
      left: 80px;
      z-index: 2;
    }

    .data-table tbody td.col-flag,
    .data-table tbody td.col-checkbox,
    .data-table tbody td.col-student {
      background: var(--bg-surface);
    }

    .data-table tbody tr.row-zebra td.col-flag,
    .data-table tbody tr.row-zebra td.col-checkbox,
    .data-table tbody tr.row-zebra td.col-student {
      background: rgba(255, 255, 255, 0.02);
    }

    .data-table tbody tr:hover td.col-flag,
    .data-table tbody tr:hover td.col-checkbox,
    .data-table tbody tr:hover td.col-student {
      background: rgba(255, 255, 255, 0.04);
    }

    .data-table tbody tr.row-selected td.col-flag,
    .data-table tbody tr.row-selected td.col-checkbox,
    .data-table tbody tr.row-selected td.col-student {
      background: rgba(255, 255, 255, 0.05);
    }

    .flag-warning {
      color: var(--color-warning);
      font-size: 18px;
    }

    .conflict-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: help;
    }

    .conflict-hint {
      font-size: 0.7rem;
      color: var(--color-warning);
      opacity: 0.9;
      white-space: nowrap;
    }

    .comment-indicator {
      display: flex;
      align-items: center;
      cursor: help;
    }

    .flag-comment {
      color: var(--text-muted);
      font-size: 16px;
      opacity: 0.7;
    }

    .flag-comment:hover {
      opacity: 1;
      color: var(--accent-primary);
    }

    .cell-student {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .cell-student-name {
      font-weight: 600;
      font-size: var(--font-size-sm);
    }

    .cell-student-meta {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .cell-modul {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      flex-wrap: wrap;
    }

    .modul-badge {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      background: var(--bg-hover);
      color: var(--text-muted);
      font-weight: 500;
      flex-shrink: 0;
    }

    .modul-name {
      font-size: var(--font-size-sm);
    }

    .note-value {
      font-weight: 600;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
    }

    .note-value--muted {
      background: var(--bg-elevated);
      color: var(--text-secondary);
    }

    .note-value--success {
      background: var(--bg-elevated);
      color: var(--color-success);
    }

    .note-value--info {
      background: var(--bg-elevated);
      color: var(--color-info);
    }

    .note-value--warning {
      background: var(--bg-elevated);
      color: var(--color-warning);
    }

    .note-value--danger {
      background: var(--bg-elevated);
      color: var(--color-danger);
    }

    /* Klickbare Note-Zelle */
    .note-cell-editable {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: var(--radius-sm);
      transition: background 0.15s ease;
    }

    .note-cell-editable:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .note-edit-icon {
      font-size: 14px;
      color: var(--text-muted);
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .note-cell-editable:hover .note-edit-icon {
      opacity: 1;
    }

    .action-btn--edit {
      color: var(--text-secondary);
    }

    .action-btn--edit:hover {
      color: var(--color-info);
      background: rgba(96, 165, 250, 0.1);
    }

    .note-value--bestanden {
      background: var(--bg-elevated);
      color: var(--color-success);
    }

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 500;
    }

    .status-badge--erfasst {
      background: var(--bg-elevated);
      color: var(--text-secondary);
      border: 1px solid var(--border-color-light);
    }

    .status-badge--validiert {
      background: var(--bg-elevated);
      color: var(--text-secondary);
      border: 1px solid var(--border-color-light);
    }

    .status-badge--freigegeben {
      background: var(--bg-elevated);
      color: var(--text-secondary);
      border: 1px solid var(--border-color-light);
    }

    .action-buttons {
      display: inline-flex;
      flex-wrap: nowrap;
      align-items: center;
      gap: 2px;
    }

    .action-btn {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      transition: all 0.15s ease;
    }

    .action-btn .material-icons-outlined {
      font-size: 18px;
    }

    .action-btn:hover:not(:disabled) {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .action-btn--validate:hover:not(:disabled) { color: var(--color-primary); }
    .action-btn--release:hover:not(:disabled) { color: var(--color-success); }
    .action-btn--reject:hover:not(:disabled) { color: var(--color-warning); }

    .empty-cell {
      text-align: center;
      padding: var(--spacing-2xl) !important;
      color: var(--text-muted);
    }

    .summary-bar {
      padding: var(--spacing-sm) var(--spacing-md);
      background: rgba(0, 0, 0, 0.1);
      border: 1px solid var(--border-color);
      border-top: none;
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .detail-drawer {
      width: 35%;
      min-width: 320px;
      max-width: 420px;
      flex-shrink: 0;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      margin-left: var(--spacing-md);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md) var(--spacing-lg);
      border-bottom: 1px solid var(--border-color);
    }

    .drawer-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .drawer-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--text-muted);
      border-radius: var(--radius-md);
    }

    .drawer-close:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .drawer-body {
      padding: var(--spacing-lg);
      overflow-y: auto;
      flex: 1;
    }

    .drawer-block {
      margin-bottom: var(--spacing-md);
    }

    .drawer-block--full {
      grid-column: 1 / -1;
    }

    .drawer-label {
      display: block;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .drawer-value {
      font-size: 0.9375rem;
      color: var(--text-primary);
    }

    .drawer-meta {
      display: block;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      margin-top: 2px;
    }

    .drawer-warning {
      padding: var(--spacing-md);
      background: rgba(var(--color-warning-rgb), 0.1);
      border: 1px solid rgba(var(--color-warning-rgb), 0.3);
      border-radius: var(--radius-md);
    }

    .drawer-warning .material-icons-outlined {
      color: #fcd34d;
      font-size: 24px;
      margin-bottom: var(--spacing-sm);
    }

    .drawer-warning p {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .drawer-warning-question {
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: var(--spacing-md) !important;
    }

    .drawer-warning-actions {
      display: flex;
      gap: var(--spacing-sm);
    }

    .drawer-edit-form .drawer-block {
      margin-bottom: var(--spacing-md);
    }

    .drawer-edit-actions {
      display: flex;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-sm);
    }

    .drawer-input,
    .drawer-textarea {
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-deep);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }

    .drawer-textarea {
      resize: vertical;
      min-height: 60px;
    }

    .drawer-select {
      appearance: none;
      cursor: pointer;
      padding-right: 36px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
    }

    .drawer-select option {
      background: var(--bg-surface);
      color: var(--text-primary);
      padding: 8px 12px;
    }

    .drawer-check {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-size: var(--font-size-sm);
      color: var(--text-primary);
      cursor: pointer;
    }

    .drawer-check input {
      width: 18px;
      height: 18px;
    }

    .drawer-check.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .drawer-check.disabled input {
      cursor: not-allowed;
    }

    .drawer-hint {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      margin-left: 4px;
    }

    .drawer-footer {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
      padding: var(--spacing-md) var(--spacing-lg);
      border-top: 1px solid var(--border-color);
      background: rgba(0, 0, 0, 0.1);
    }

    .toast {
      position: fixed;
      bottom: var(--spacing-lg);
      right: var(--spacing-lg);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: 1001;
    }

    .toast--success {
      background: var(--color-success);
      color: white;
    }

    @media (max-width: 900px) {
      .validation-layout {
        flex-direction: column;
      }

      .detail-drawer {
        width: 100%;
        max-width: none;
        margin-left: 0;
        margin-top: var(--spacing-md);
      }

      .toolbar {
        flex-direction: column;
        align-items: stretch;
      }

      .toolbar-left {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-bar {
        flex-direction: column;
        height: auto;
      }

      .search-wrapper {
        width: 100%;
        height: 40px;
      }

      .status-chips {
        flex-wrap: wrap;
      }
    }
  `]
})
export class ValidationComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly apollo = inject(Apollo);
  
  // Lookup maps for names
  private readonly studentenMap = new Map<string, StudentInfo>();
  private readonly einschreibungToStudentMap = new Map<string, string>();
  private readonly moduleMap = new Map<string, ModulInfo>();
  private readonly usersMap = new Map<string, UserInfo>();

  // State
  loading = signal(true);
  error = signal<string | null>(null);
  processing = signal(false);
  successMessage = signal<string | null>(null);

  noten = signal<Note[]>([]);
  
  statusFilter = signal<string>('ERFASST');
  searchTerm = signal<string>('');
  
  selectedNote = signal<Note | null>(null);
  /** Bestätigung vor Bearbeitung (validierte/freigegebene Note) */
  confirmEditNote = signal<Note | null>(null);
  /** Note, die gerade bearbeitet wird */
  editingNote = signal<Note | null>(null);
  /** Formulardaten für Bearbeitung */
  editFormData: { noteWert: string; bestanden: boolean; pruefungsdatum: string; kommentar: string } = {
    noteWert: '', bestanden: false, pruefungsdatum: '', kommentar: ''
  };

  // Computed
  filteredNoten = computed(() => {
    let result = this.noten();
    
    // Status filter
    if (this.statusFilter() !== 'all') {
      result = result.filter(n => n.status === this.statusFilter());
    }
    
    // Search filter
    const search = this.searchTerm().toLowerCase();
    if (search) {
      const safeStr = (v: unknown) => (v != null ? String(v) : '');
      result = result.filter(n => 
        (n.studentName?.toLowerCase().includes(search)) ||
        (n.modulName?.toLowerCase().includes(search)) ||
        safeStr(n.einschreibungId).toLowerCase().includes(search) ||
        safeStr(n.modulId).toLowerCase().includes(search)
      );
    }
    
    return result;
  });

  pendingCount = computed(() => this.noten().filter(n => n.status === 'ERFASST').length);
  validatedCount = computed(() => this.noten().filter(n => n.status === 'VALIDIERT').length);
  releasedCount = computed(() => this.noten().filter(n => n.status === 'FREIGEGEBEN').length);
  
  selectedCount = computed(() => this.filteredNoten().filter(n => n.selected).length);
  /** Anzahl ausgewählter Noten, die validiert werden können (nur ERFASST) */
  selectedValidatable = computed(() => this.filteredNoten().filter(n => n.selected && n.status === 'ERFASST').length);
  /** Anzahl ausgewählter Noten, die freigegeben werden können (nur VALIDIERT) */
  selectedReleasable = computed(() => this.filteredNoten().filter(n => n.selected && n.status === 'VALIDIERT').length);
  allSelected = computed(() => {
    const filtered = this.filteredNoten();
    return filtered.length > 0 && filtered.every(n => n.selected);
  });

  private pendingNoteId = signal<string | null>(null);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['student']) this.searchTerm.set(params['student']);
      else if (params['matrikel']) this.searchTerm.set(params['matrikel']);
      if (params['status']) this.statusFilter.set(params['status']);
      if (params['noteId']) this.pendingNoteId.set(params['noteId']);
    });
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const withTimeout = <T>(p: Promise<T>, label: string): Promise<T> =>
      Promise.race([
        p,
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error(`${label} Zeitüberschreitung (${LOAD_TIMEOUT_MS / 1000}s)`)), LOAD_TIMEOUT_MS)
        )
      ]);

    try {
      // Lade Noten zuerst (Hauptdaten) – Rest sind Lookups
      const notenResponse = await withTimeout(
        firstValueFrom(this.http.get<ApiResponse<Note[]>>('/api/noten')),
        'Noten'
      );
      const rawNoten = notenResponse?.data ?? [];

      // Lookups parallel, einzeln abfangen – bei Fehler leere Listen
      const [studentsResult, einschreibungenResult, moduleResult, usersResult] = await Promise.all([
        withTimeout(
          firstValueFrom(this.apollo.query<{ students: StudentInfo[] }>({
            query: GET_ALL_STUDENTS,
            context: { clientName: 'user' },
            fetchPolicy: 'network-only'
          })),
          'Studenten'
        ).catch(() => ({ data: { students: [] } })),
        withTimeout(
          firstValueFrom(this.apollo.query<{ einschreibungen: EinschreibungInfo[] }>({
            query: GET_ALL_EINSCHREIBUNGEN,
            fetchPolicy: 'network-only'
          })),
          'Einschreibungen'
        ).catch(() => ({ data: { einschreibungen: [] } })),
        withTimeout(
          firstValueFrom(this.apollo.query<{ module: ModulInfo[] }>({
            query: GET_ALL_MODULE,
            fetchPolicy: 'network-only'
          })),
          'Module'
        ).catch(() => ({ data: { module: [] } })),
        withTimeout(
          firstValueFrom(this.apollo.query<{ users: UserInfo[] }>({
            query: GET_ALL_USERS,
            context: { clientName: 'user' },
            fetchPolicy: 'network-only'
          })),
          'Benutzer'
        ).catch(() => ({ data: { users: [] } }))
      ]);

      // Lookup-Maps aufbauen (IDs als String für einheitlichen Zugriff)
      this.studentenMap.clear();
      (studentsResult.data?.students || []).forEach(s => this.studentenMap.set(String(s.id), s));
      this.einschreibungToStudentMap.clear();
      (einschreibungenResult.data?.einschreibungen || []).forEach(e => {
        this.einschreibungToStudentMap.set(String(e.id), String(e.studentId));
      });
      this.moduleMap.clear();
      (moduleResult.data?.module || []).forEach(m => this.moduleMap.set(String(m.id), m));
      this.usersMap.clear();
      (usersResult.data?.users || []).forEach(u => this.usersMap.set(String(u.id), u));

      let enrichedNoten = rawNoten.map(n => this.enrichNote(n));
      const noteId = this.pendingNoteId();
      if (noteId) {
        this.pendingNoteId.set(null);
        enrichedNoten = enrichedNoten.map(n => (String(n.id) === String(noteId) ? { ...n, selected: true } : n));
      }
      this.noten.set(enrichedNoten);
    } catch (err: unknown) {
      const e = err as { error?: { message?: string }; message?: string };
      console.error('Error loading validation data:', err);
      this.error.set('Fehler beim Laden: ' + (e?.error?.message ?? e?.message ?? 'Unbekannter Fehler'));
    } finally {
      this.loading.set(false);
    }
  }

  private enrichNote(n: Note): Note {
    const eid = String(n.einschreibungId ?? '');
    const mid = String(n.modulId ?? '');
    const studentId = this.einschreibungToStudentMap.get(eid);
    const student = studentId ? this.studentenMap.get(String(studentId)) : null;
    const modul = this.moduleMap.get(mid);
    const erfasstVonUser = n.erfasstVon ? this.usersMap.get(String(n.erfasstVon)) : null;
    const validiertVonUser = n.validiertVon ? this.usersMap.get(String(n.validiertVon)) : null;
    return {
      ...n,
      id: String(n.id),
      einschreibungId: eid,
      modulId: mid,
      erfasstVon: String(n.erfasstVon ?? ''),
      validiertVon: n.validiertVon != null ? String(n.validiertVon) : null,
      selected: false,
      studentName: student ? `${student.vorname} ${student.nachname}` : undefined,
      studentMatrikel: student?.matrikelnummer,
      modulName: modul ? `${modul.modulNr} - ${modul.name}` : undefined,
      modulNr: modul?.modulNr,
      erfasstVonName: erfasstVonUser ? `${erfasstVonUser.vorname} ${erfasstVonUser.nachname}` : undefined,
      validiertVonName: validiertVonUser ? `${validiertVonUser.vorname} ${validiertVonUser.nachname}` : undefined
    };
  }

  setStatusFilter(value: string): void {
    this.statusFilter.set(value);
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  applyFilters(): void {
    // Filters are applied via computed signal
  }

  hasConflict(note: Note): boolean {
    // Nur echte Probleme sind Konflikte - Kommentar ist keine Fehler
    return note.noteWert == null && !note.bestanden;
  }

  hasComment(note: Note): boolean {
    return !!(note.kommentar?.trim());
  }

  getConflictReason(note: Note): string {
    if (note.noteWert == null && !note.bestanden) {
      return 'Keine Note eingetragen und nicht als bestanden markiert';
    }
    return '';
  }

  getModulDisplayName(note: Note): string {
    if (!note.modulName) return '';
    if (note.modulNr && note.modulName.startsWith(note.modulNr + ' - '))
      return note.modulName.slice(note.modulNr.length + 3);
    return note.modulName;
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const filtered = this.filteredNoten();
    const notenList = this.noten();
    
    const updatedNoten = notenList.map(n => {
      if (filtered.some(f => f.id === n.id)) {
        return { ...n, selected: checked };
      }
      return n;
    });
    
    this.noten.set(updatedNoten);
  }

  toggleSelect(note: Note): void {
    const notenList = this.noten();
    const updatedNoten = notenList.map(n => 
      n.id === note.id ? { ...n, selected: !n.selected } : n
    );
    this.noten.set(updatedNoten);
  }

  async validateNote(note: Note): Promise<void> {
    this.processing.set(true);
    try {
      await firstValueFrom(
        this.http.post(`/api/noten/${note.id}/validate`, null)
      );
      this.showSuccess('Note validiert');
      await this.loadData();
    } catch (err: any) {
      console.error('Error validating note:', err);
      this.error.set('Fehler beim Validieren: ' + (err.error?.message || err.message || 'Unbekannter Fehler'));
    } finally {
      this.processing.set(false);
    }
  }

  async releaseNote(note: Note): Promise<void> {
    if (note.status !== 'VALIDIERT') {
      this.error.set('Nur validierte Noten können freigegeben werden. Bitte zuerst validieren.');
      return;
    }
    this.processing.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.http.post(`/api/noten/${note.id}/release`, null)
      );
      this.showSuccess('Note freigegeben');
      await this.loadData();
    } catch (err: unknown) {
      const e = err as { error?: { message?: string }; message?: string };
      console.error('Error releasing note:', err);
      const msg = e?.error?.message ?? e?.message ?? 'Unbekannter Fehler';
      this.error.set(msg.includes('VALIDIERT') ? msg : 'Nur validierte Noten können freigegeben werden. Bitte zuerst validieren.');
    } finally {
      this.processing.set(false);
    }
  }

  async rejectNote(note: Note): Promise<void> {
    if (note.status !== 'FREIGEGEBEN') return;
    this.processing.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.http.post(`/api/noten/${note.id}/reject`, null)
      );
      this.showSuccess('Freigabe zurückgenommen');
      await this.loadData();
    } catch (err: unknown) {
      const e = err as { error?: { message?: string }; message?: string; status?: number };
      console.error('Error rejecting note:', err);
      const status = (e as { status?: number }).status;
      const msg = e?.error?.message ?? e?.message ?? '';
      if (status === 403 || msg.toLowerCase().includes('forbidden')) {
        this.error.set('Keine Berechtigung: Nur Prüfungsamt, Admin oder Hochschul-Verwalter können die Freigabe zurücknehmen.');
      } else {
        this.error.set(msg ? 'Fehler beim Zurückweisen: ' + msg : 'Fehler beim Zurückweisen.');
      }
    } finally {
      this.processing.set(false);
    }
  }

  async batchValidate(): Promise<void> {
    const selected = this.filteredNoten().filter(n => n.selected && n.status === 'ERFASST');
    this.processing.set(true);
    
    try {
      for (const note of selected) {
        await firstValueFrom(
          this.http.post(`/api/noten/${note.id}/validate`, null)
        );
      }
      this.showSuccess(`${selected.length} Noten validiert`);
      await this.loadData();
    } catch (err: any) {
      console.error('Error batch validating:', err);
      this.error.set('Fehler beim Batch-Validieren: ' + (err.error?.message || err.message || 'Unbekannter Fehler'));
    } finally {
      this.processing.set(false);
    }
  }

  async batchRelease(): Promise<void> {
    const selected = this.filteredNoten().filter(n => n.selected && n.status === 'VALIDIERT');
    const ausstehendSelected = this.filteredNoten().filter(n => n.selected && n.status === 'ERFASST');
    if (selected.length === 0) {
      this.error.set(ausstehendSelected.length > 0
        ? 'Nur validierte Noten können freigegeben werden. Bitte zuerst validieren.'
        : 'Keine Noten ausgewählt.');
      return;
    }
    this.processing.set(true);
    this.error.set(null);
    try {
      for (const note of selected) {
        await firstValueFrom(
          this.http.post(`/api/noten/${note.id}/release`, null)
        );
      }
      const msg = ausstehendSelected.length > 0
        ? `${selected.length} Noten freigegeben. ${ausstehendSelected.length} ausstehende übersprungen (zuerst validieren).`
        : `${selected.length} Noten freigegeben`;
      this.showSuccess(msg);
      await this.loadData();
    } catch (err: unknown) {
      const e = err as { error?: { message?: string }; message?: string };
      console.error('Error batch releasing:', err);
      const msg = e?.error?.message ?? e?.message ?? 'Unbekannter Fehler';
      this.error.set(msg.includes('VALIDIERT') ? msg : 'Nur validierte Noten können freigegeben werden. Bitte zuerst validieren.');
    } finally {
      this.processing.set(false);
    }
  }

  showDetails(note: Note): void {
    this.selectedNote.set(note);
  }

  closeDetails(): void {
    this.selectedNote.set(null);
  }

  /** Schnell-Bearbeitung: direkt vom Tabellenklick oder Edit-Button */
  quickEditNote(note: Note): void {
    this.selectedNote.set(note);
    this.requestEditNote(note);
  }

  requestEditNote(note: Note): void {
    if (note.status === 'VALIDIERT' || note.status === 'FREIGEGEBEN') {
      this.confirmEditNote.set(note);
    } else {
      this.openEditForm(note);
    }
  }

  confirmEditAndOpen(): void {
    const note = this.confirmEditNote();
    if (note) {
      this.dismissEditConfirm();
      this.openEditForm(note);
    }
  }

  dismissEditConfirm(): void {
    this.confirmEditNote.set(null);
  }

  private openEditForm(note: Note): void {
    this.editFormData = {
      noteWert: note.noteWert != null ? String(note.noteWert) : '',
      bestanden: note.bestanden ?? false,
      pruefungsdatum: note.pruefungsdatum ? note.pruefungsdatum.substring(0, 10) : '',
      kommentar: note.kommentar ?? ''
    };
    this.editingNote.set(note);
  }

  /** Bestanden-Status automatisch setzen wenn Notenwert gewählt wird */
  onNoteWertChange(value: string): void {
    if (value === '') {
      // Keine Note → Bestanden-Checkbox manuell steuerbar (bleibt wie sie ist)
      return;
    }
    const num = parseFloat(value);
    this.editFormData.bestanden = !isNaN(num) && num <= 4.0;
  }

  cancelEdit(): void {
    this.editingNote.set(null);
  }

  async saveEditNote(note: Note): Promise<void> {
    this.processing.set(true);
    try {
      const v = this.editFormData.noteWert.trim();
      const payload: { noteWert?: number; bestanden: boolean; pruefungsdatum?: string; kommentar?: string } = {
        bestanden: this.editFormData.bestanden,
        kommentar: this.editFormData.kommentar.trim() || undefined
      };
      if (v) {
        const num = Number.parseFloat(v.replace(',', '.'));
        if (!Number.isNaN(num)) payload.noteWert = num;
      }
      if (this.editFormData.pruefungsdatum) payload.pruefungsdatum = this.editFormData.pruefungsdatum;
      await firstValueFrom(this.http.put<ApiResponse<Note>>(`/api/noten/${note.id}`, payload));
      this.showSuccess('Note wurde geändert');
      this.cancelEdit();
      await this.loadData();
    } catch (err: unknown) {
      const e = err as { error?: { message?: string }; message?: string };
      this.error.set('Fehler beim Speichern: ' + (e?.error?.message ?? e?.message ?? 'Unbekannter Fehler'));
    } finally {
      this.processing.set(false);
    }
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  formatDate(dateString: string | null): string {
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

  getNoteClass(_noteWert: number): string {
    return 'note-value--muted';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'ERFASST': 'Ausstehend',
      'VALIDIERT': 'Validiert',
      'FREIGEGEBEN': 'Freigegeben'
    };
    return labels[status] || status;
  }
}

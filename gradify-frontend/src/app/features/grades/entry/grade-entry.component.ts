import { Component, OnInit, inject, signal, computed, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { SkeletonCardComponent } from '../../../shared/components/skeleton-card/skeleton-card.component';
import { firstValueFrom } from 'rxjs';

// GraphQL Queries
const GET_DOZENTEN_MODULE = gql`
  query GetDozentenModule($dozentId: ID!) {
    dozentenModule(dozentId: $dozentId) {
      id
      modulNr
      name
      ects
      semester
      pruefungsform
    }
  }
`;

const GET_ALL_EINSCHREIBUNGEN = gql`
  query GetAllEinschreibungen {
    einschreibungen {
      id
      studentId
      aktuellesSemester
      studiengang {
        id
        name
      }
    }
  }
`;

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

interface ModulInfo {
  id: string;
  modulNr: string;
  name: string;
  ects: number;
  semester: string;
  pruefungsform: string;
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
  aktuellesSemester: number;
  studiengang: {
    id: string;
    name: string;
  };
}

interface Note {
  id?: string;
  modulId: string;
  einschreibungId: string;
  studentId?: string;
  studentName?: string;
  matrikelnummer?: string;
  noteWert: number | null;
  bestanden: boolean;
  status: string;
  versuch: number;
  pruefungsdatum: string;
  bemerkung?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface StudentWithGrade extends StudentInfo {
  einschreibungId: string;
  semester: number;
  noteId?: string;
  noteWert: number | null;
  noteText?: string;
  bestanden: boolean;
  versuch: number;
  pruefungsdatum: string;
  bemerkung: string;
  bemerkungOffen?: boolean;
  status: string;
  modulId: string;
  saving?: boolean;
  changed?: boolean;
}

@Component({
  selector: 'app-grade-entry',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonCardComponent],
  template: `
    <div class="grade-entry-page">
      <header class="page-header">
        <div class="header-content">
          <h1>Notenerfassung</h1>
          <p class="subtitle">Noten für Ihre Module eingeben und bearbeiten</p>
        </div>
      </header>

      @if (loading()) {
        <app-skeleton-card [lines]="5" />
      }

      @if (error()) {
        <div class="error-card card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{{ error() }}</p>
        </div>
      }

      @if (!loading() && !error() && module().length === 0) {
        <div class="empty-card card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>Ihnen sind keine Module zugewiesen</p>
          <small>Kontaktieren Sie die Administration</small>
        </div>
      }

      <!-- Modul-Auswahl (kompakt) -->
      @if (module().length > 0) {
        <div class="modul-picker card">
          <label class="modul-picker-label">Modul</label>
          <div class="modul-picker-row">
            <select class="modul-select" [ngModel]="selectedModul()?.id" (ngModelChange)="onModulSelect($event)">
              <option [ngValue]="null">-- Modul wählen --</option>
              @for (modul of module(); track modul.id) {
                <option [ngValue]="modul.id">{{ modul.modulNr }} – {{ modul.name }}</option>
              }
            </select>
            <button type="button" class="btn btn-ghost btn-icon-only" (click)="refreshCurrentModul()" title="Aktualisieren">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
          </div>
        </div>
      }

      @if (selectedModul(); as modul) {
        <!-- Zeile A: Kontext (Modul • Meta | Datum) -->
        <div class="context-bar">
          <div class="context-left">
            <span class="context-modul">{{ modul.modulNr }} – {{ modul.name }}</span>
            <span class="context-sep">·</span>
            <span class="context-meta">{{ modul.pruefungsform }}</span>
            <span class="context-sep">·</span>
            <span class="context-meta">{{ modul.ects }} ECTS</span>
            <span class="context-sep">·</span>
            <span class="context-meta">Semester {{ modul.semester }}</span>
          </div>
          <div class="context-right">
            <label class="context-date-label" title="Standard-Prüfungsdatum für neue/geänderte Noten beim Einreichen">Prüfungsdatum</label>
            <input type="date" class="context-date" [ngModel]="globalPruefungsdatum()" (ngModelChange)="setGlobalPruefungsdatum($event)" title="Wird beim Einreichen für alle Zeilen ohne eigenes Datum verwendet">
          </div>
        </div>

        @if (loadingStudents()) {
          <div class="loading-small"><div class="spinner"></div><span>Lade Studierende...</span></div>
        }

        @if (!loadingStudents() && students().length === 0) {
          <p class="text-muted">Keine Studierenden in diesem Modul eingeschrieben</p>
        }

        @if (!loadingStudents() && students().length > 0) {
          <!-- Zeile B: Sticky Action Bar -->
          <div class="action-bar">
            <div class="action-chips">
              <span class="chip" title="Bereits gespeicherte gültige Noten">Erfasst {{ erfasstCount() }}/{{ students().length }}</span>
              <span class="chip chip--muted" title="Noch ohne Note">Fehlen {{ fehlenCount() }}</span>
            </div>
            <div class="action-middle">
              <input type="text" class="filter-search" placeholder="Matrikel / Name" [ngModel]="filterSuche()" (ngModelChange)="setFilterSuche($event)">
              <label class="filter-toggle"><input type="checkbox" [ngModel]="filterNurOffen()" (ngModelChange)="setFilterNurOffen($event)"> Nur offen</label>
            </div>
            <div class="action-right action-save-group">
              <span class="action-save-label">Einreichen</span>
              @if (changedCount() > 0) {
                <span class="action-changes">({{ changedCount() }} ungespeichert)</span>
              }
              <button type="button" class="btn btn-primary" (click)="saveAllGrades()" [disabled]="savingAll() || changedCount() === 0">
                @if (savingAll()) { <span class="spinner-inline"></span> }
                Alle einreichen
              </button>
              @if (changedCount() === 0 && !savingAll()) {
                <span class="action-saved">Alles eingereicht</span>
              }
              <span class="action-sep"></span>
              <button type="button" class="btn btn-secondary" (click)="openReviewDialog()" [disabled]="fehlerCount() > 0 || fehlenCount() > 0" title="Erst wenn alle Noten erfasst und keine Fehler mehr vorhanden sind">Einreichen</button>
            </div>
          </div>
          <p class="grade-entry-hint">
            <span class="grade-entry-hint-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 6v6m0 4h.01M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z"/></svg></span>
            Bis zum Einreichen änderbar - danach nur noch über das Prüfungsamt.
          </p>

          <div class="table-wrap">
            <table class="flat-table">
              <thead>
                <tr>
                  <th class="col-dot"></th>
                  <th class="col-matrikel">Matrikel</th>
                  <th class="col-name">Name</th>
                  <th class="col-note">Note</th>
                  <th class="col-versuch">Versuch</th>
                  <th class="col-bemerkung">Bemerkung</th>
                  <th class="col-save"></th>
                </tr>
              </thead>
              <tbody>
                @for (student of filteredStudents(); track student.id; let i = $index) {
                  <tr class="flat-row" [class.flat-row--even]="i % 2 === 0" [class.flat-row--odd]="i % 2 === 1">
                    <td class="col-dot">
                      <span class="status-dot" [class.status-dot--open]="rowStatus(student) === 'open'" [class.status-dot--unsaved]="rowStatus(student) === 'unsaved'" [class.status-dot--saved]="rowStatus(student) === 'saved'" [class.status-dot--error]="rowStatus(student) === 'error'" [class.status-dot--saving]="rowStatus(student) === 'saving'" [title]="statusTooltip(student)"></span>
                    </td>
                    <td class="col-matrikel">{{ student.matrikelnummer }}</td>
                    <td class="col-name">{{ student.vorname }} {{ student.nachname }}</td>
                    <td class="col-note">
                      @if (canEditNote(student)) {
                        <select #noteSelect class="note-select" [ngModel]="student.noteWert" (ngModelChange)="onNoteSelectChange(student, $event, i)" (keydown)="onNoteKeydown($event, i)">
                          <option [ngValue]="null">-</option>
                          @for (v of notenOptions(); track v) {
                            <option [ngValue]="v">{{ formatNoteOption(v) }}</option>
                          }
                        </select>
                      } @else {
                        <span class="note-readonly">{{ student.noteWert != null ? formatNoteOption(student.noteWert) : '-' }}</span>
                      }
                    </td>
                    <td class="col-versuch">
                      @if (canEditNote(student)) {
                        <select class="versuch-select" [ngModel]="student.versuch" (ngModelChange)="onVersuchChange(student, $event)">
                          <option [value]="1">1</option>
                          <option [value]="2">2</option>
                          <option [value]="3">3</option>
                        </select>
                      } @else {
                        <span class="note-readonly">{{ student.versuch ?? '-' }}</span>
                      }
                    </td>
                    <td class="col-bemerkung">
                      @if (canEditNote(student)) {
                        <button type="button" class="btn-bemerkung" (click)="openBemerkungPopup(student)" [class.btn-bemerkung--has]="student.bemerkung?.trim()" title="Bemerkung hinzufügen oder bearbeiten">
                          Bemerkung
                          @if (student.bemerkung?.trim()) {
                            <span class="btn-bemerkung-dot" aria-hidden="true"></span>
                          }
                        </button>
                      } @else {
                        <span class="note-readonly">{{ student.bemerkung || '-' }}</span>
                      }
                    </td>
                    <td class="col-save">
                      @if (canEditNote(student)) {
                      <button type="button" class="btn-row-save" (click)="saveGrade(student)" [disabled]="student.saving || student.noteWert == null || hasRowError(student)" title="Diese Note einreichen">
                        @if (student.saving) {
                          <span class="spinner-tiny"></span>
                        } @else {
                          Einreichen
                        }
                      </button>
                      } @else {
                        <span class="note-readonly" [title]="noteLockedTooltip(student)">Nur Prüfungsamt</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (filteredStudents().length === 0) {
            <p class="text-muted filter-empty">Keine Einträge für aktuelle Filter.</p>
          }
        }
      }

      <!-- Bemerkung-Popup -->
      @if (bemerkungPopupStudent(); as popupStudent) {
        <div class="dialog-backdrop" (click)="closeBemerkungPopup()">
          <div class="dialog-card card bemerkung-dialog" (click)="$event.stopPropagation()">
            <h3 class="dialog-title">Bemerkung – {{ popupStudent.vorname }} {{ popupStudent.nachname }}</h3>
            <p class="bemerkung-dialog-hint">Die Bemerkung wird erst beim Klick auf „Einreichen“ (Zeile oder „Alle einreichen“) mit übermittelt.</p>
            <textarea class="bemerkung-textarea" [(ngModel)]="popupStudent.bemerkung" (ngModelChange)="onGradeChange(popupStudent)" placeholder="Optionale Bemerkung …" rows="4"></textarea>
            <div class="dialog-actions">
              <button type="button" class="btn btn-primary" (click)="closeBemerkungPopup()">Schließen</button>
            </div>
          </div>
        </div>
      }

      <!-- Review-Dialog für Einreichen -->
      @if (showReviewDialog()) {
        <div class="dialog-backdrop" (click)="closeReviewDialog()">
          <div class="dialog-card card" (click)="$event.stopPropagation()">
            <h3 class="dialog-title">Einreichen – Überprüfung</h3>
            <div class="dialog-summary">
              <span>{{ erfasstCount() }}/{{ students().length }} erfasst</span>
              <span>·</span>
              <span [class.has-errors]="fehlerCount() > 0">{{ fehlerCount() }} Fehler</span>
            </div>
            @if (fehlenCount() > 0 || fehlerCount() > 0) {
              <p class="dialog-warn">Bitte alle fehlenden Noten erfassen und Fehler beheben, bevor Sie einreichen.</p>
            } @else {
              <p class="dialog-hint">Nach Einreichen ist die Erfassung nur noch nach Rückgabe durch das Prüfungsamt änderbar.</p>
              <div class="dialog-actions">
                <button type="button" class="btn btn-ghost" (click)="closeReviewDialog()">Abbrechen</button>
                <button type="button" class="btn btn-primary" (click)="submitForValidation()">Einreichen</button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .grade-entry-page {
      padding: var(--spacing-lg);
      width: 100%;
      max-width: 1400px;
      margin: 0 auto;
      box-sizing: border-box;
    }

    .page-header {
      margin-bottom: var(--spacing-xl);
    }

    .header-content h1 {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .subtitle {
      color: var(--text-muted);
      margin: var(--spacing-xs) 0 0 0;
    }

    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }

    .loading-card, .error-card, .empty-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-2xl);
      text-align: center;
    }

    .loading-card svg, .error-card svg, .empty-card svg {
      width: 64px;
      height: 64px;
      margin-bottom: var(--spacing-md);
      color: var(--text-muted);
    }

    .error-card svg {
      color: var(--color-danger);
    }

    .spinner-large {
      width: 48px;
      height: 48px;
      border: 4px solid var(--border-color);
      border-top-color: var(--text-secondary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .modul-card {
      margin-bottom: var(--spacing-lg);
    }

    .modul-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-lg);
      padding-bottom: var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
    }

    .modul-info h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: var(--spacing-xs) 0;
    }

    .modul-nr {
      display: inline-block;
      padding: 4px 8px;
      background: var(--text-secondary);
      color: white;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .modul-meta {
      display: flex;
      gap: var(--spacing-md);
      margin-top: var(--spacing-sm);
    }

    .meta-item {
      font-size: 0.875rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .students-section {
      margin-top: var(--spacing-lg);
    }

    .loading-small {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
      justify-content: center;
    }

    .spinner, .spinner-small {
      border: 2px solid var(--border-color);
      border-top-color: var(--text-secondary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner {
      width: 20px;
      height: 20px;
    }

    .spinner-small {
      width: 16px;
      height: 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .table-container {
      overflow-x: auto;
      margin-bottom: var(--spacing-md);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th,
    .data-table td {
      padding: var(--spacing-sm) var(--spacing-md);
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    .data-table th {
      font-weight: 600;
      color: var(--text-muted);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--bg-hover);
    }

    .data-table tbody tr:hover {
      background: var(--bg-hover);
    }

    .col-center {
      text-align: center;
    }

    .grade-input, .versuch-select, .date-input, .bemerkung-input {
      width: 100%;
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--bg-deep);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .grade-input {
      width: 80px;
      text-align: center;
      font-weight: 600;
    }

    .grade-input:focus, .versuch-select:focus, .date-input:focus, .bemerkung-input:focus {
      outline: none;
      border-color: var(--text-secondary);
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
    }

    .versuch-select {
      width: 60px;
      text-align: center;
    }

    .date-input {
      width: 140px;
    }

    .bemerkung-input {
      min-width: 150px;
    }

    .checkbox {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-md);
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--text-primary);
      color: var(--bg-surface);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--text-secondary);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-icon {
      padding: var(--spacing-xs);
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-icon svg {
      width: 18px;
      height: 18px;
    }

    .btn-icon.btn-success {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .btn-icon.btn-success:hover:not(:disabled) {
      background: rgba(16, 185, 129, 0.25);
    }

    .btn-icon.btn-primary {
      background: rgba(255, 255, 255, 0.15);
      color: var(--text-primary);
    }

    .btn-icon.btn-primary:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.25);
    }

    .modul-picker { padding: var(--spacing-md); }
    .modul-picker-label { display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px; }
    .modul-picker-row { display: flex; gap: var(--spacing-sm); align-items: center; }
    .modul-select { flex: 1; max-width: 400px; padding: var(--spacing-sm) var(--spacing-md); background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); }
    .btn-ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color); }
    .btn-sm { padding: 4px 8px; font-size: 0.8rem; }
    .btn-icon-only { padding: 8px; width: 36px; height: 36px; }
    .btn-icon-only svg { width: 18px; height: 18px; }
    .btn-secondary { background: var(--bg-elevated); color: var(--text-primary); border: 1px solid var(--border-color); }
    .spinner-inline { display: inline-block; width: 14px; height: 14px; border: 2px solid transparent; border-top-color: currentColor; border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: middle; margin-right: 6px; }

    .context-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; margin-bottom: 8px; }
    .context-left, .context-right { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .context-modul { font-weight: 600; color: var(--text-primary); font-size: 0.95rem; }
    .context-meta { font-size: 0.8rem; color: var(--text-muted); }
    .context-sep { color: var(--text-muted); font-size: 0.8rem; }
    .context-date-label { font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; }
    .context-date { padding: 6px 10px; background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.85rem; }

    .action-bar { position: sticky; top: 0; z-index: 12; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; margin-bottom: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); }
    .action-chips { display: flex; align-items: center; gap: 8px; }
    .chip { font-size: 0.8rem; color: var(--text-secondary); padding: 5px 10px; border-radius: var(--radius-sm); background: var(--bg-elevated); }
    .chip--muted { color: var(--text-muted); }
    .chip--warn { color: var(--color-warning, #b45309); font-weight: 500; }
    .action-middle { display: flex; align-items: center; gap: 12px; }
    .action-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .action-save-group { padding-left: 12px; border-left: 1px solid var(--border-color); }
    .action-save-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
    .action-changes { font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; }
    .action-saved { font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; }
    .action-sep { width: 1px; height: 20px; background: var(--border-color); }
    .filter-search { padding: 6px 10px; min-width: 160px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.85rem; }
    .filter-toggle { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer; }
    .filter-empty { padding: var(--spacing-lg); text-align: center; }
    .grade-entry-hint { display: flex; align-items: center; gap: 8px; margin: 0 0 12px 0; padding: 8px 12px; font-size: 0.8rem; color: var(--color-danger, #dc2626); line-height: 1.4; background: rgba(220, 38, 38, 0.08); border-radius: var(--radius-sm); border-left: 3px solid var(--color-danger, #dc2626); }
    .grade-entry-hint-icon { display: inline-flex; flex-shrink: 0; color: var(--color-danger, #dc2626); }
    .note-readonly { font-size: 0.875rem; color: var(--text-muted); }

    .table-wrap { overflow: auto; max-height: 60vh; border: 1px solid var(--border-color); border-radius: var(--radius-md); }
    .flat-table { width: 100%; border-collapse: collapse; }
    .flat-table th, .flat-table td { padding: 8px 12px; font-size: 0.875rem; text-align: left; vertical-align: middle; border: none; border-bottom: 1px solid transparent; }
    .flat-table thead th { font-weight: 600; color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; background: var(--bg-elevated); border-bottom: 1px solid var(--border-color); position: sticky; top: 0; z-index: 5; }
    .flat-row { transition: background 0.12s ease; }
    .flat-row--odd { background: rgba(255,255,255,0.02); }
    .flat-row:hover { background: var(--bg-hover); }
    .flat-row:hover td { border-bottom-color: rgba(255,255,255,0.06); }
    .col-dot { width: 24px; padding-left: 12px; }
    .col-matrikel { width: 88px; }
    .col-name { min-width: 140px; }
    .col-note { width: 100px; }
    .col-versuch { width: 72px; }
    .col-bemerkung { min-width: 140px; }
    .col-save { width: 90px; }

    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .status-dot--open { background: var(--text-muted); opacity: 0.9; }
    .status-dot--unsaved { background: var(--color-warning, #b45309); opacity: 0.95; }
    .status-dot--saved { background: var(--color-success, #0d9488); opacity: 0.9; }
    .status-dot--error { background: var(--color-danger, #dc2626); opacity: 0.9; }
    .status-dot--saving { background: var(--text-muted); animation: pulse 1s ease infinite; }
    @keyframes pulse { 50% { opacity: 0.5; } }

    .note-select { width: 100%; min-width: 72px; padding: 6px 8px; font-size: 0.875rem; font-weight: 500; color: var(--text-primary); background: var(--bg-deep); border: none; border-radius: var(--radius-sm); cursor: pointer; appearance: auto; }
    .note-select:focus { outline: none; box-shadow: 0 0 0 2px rgba(255,255,255,0.12); }
    .versuch-select { width: 100%; min-width: 52px; padding: 6px 8px; font-size: 0.85rem; color: var(--text-primary); background: var(--bg-deep); border: none; border-radius: var(--radius-sm); cursor: pointer; }
    .versuch-select:focus { outline: none; box-shadow: 0 0 0 2px rgba(255,255,255,0.08); }
    .btn-row-save { padding: 4px 8px; font-size: 0.8rem; font-weight: 500; color: var(--text-secondary); background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer; }
    .btn-row-save:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-primary); }
    .btn-row-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-row-save .spinner-tiny { display: inline-block; width: 12px; height: 12px; border: 2px solid var(--border-color); border-top-color: currentColor; border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: middle; margin-right: 4px; }

    .btn-bemerkung { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; font-size: 0.8rem; color: var(--text-secondary); background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer; }
    .btn-bemerkung:hover { background: var(--bg-hover); color: var(--text-primary); }
    .btn-bemerkung--has { color: var(--text-primary); }
    .btn-bemerkung-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-success, #0d9488); flex-shrink: 0; }
    .bemerkung-dialog { max-width: 400px; }
    .bemerkung-dialog-hint { font-size: 0.8rem; color: var(--text-muted); margin: 0 0 var(--spacing-md) 0; }
    .bemerkung-textarea { width: 100%; padding: 10px 12px; font-size: 0.9rem; background: var(--bg-deep); border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-primary); resize: vertical; min-height: 80px; box-sizing: border-box; }
    .bemerkung-textarea::placeholder { color: var(--text-muted); }
    .bemerkung-textarea:focus { outline: none; border-color: var(--text-muted); }

    .status-badge { font-size: 0.7rem; padding: 2px 6px; border-radius: var(--radius-sm); font-weight: 500; }
    .status-badge--error { background: rgba(220, 38, 38, 0.12); color: var(--color-danger, #dc2626); }
    .status-badge--submitted { background: rgba(59, 130, 246, 0.12); color: var(--text-secondary); }
    .status-badge--released { background: rgba(13, 148, 136, 0.12); color: var(--color-success, #0d9488); }

    .dialog-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: var(--spacing-lg); }
    .dialog-card { max-width: 420px; padding: var(--spacing-lg); }
    .dialog-title { margin: 0 0 var(--spacing-md) 0; font-size: 1.1rem; color: var(--text-primary); }
    .dialog-summary { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: var(--spacing-md); }
    .dialog-warn { color: var(--color-warning, #b45309); font-size: 0.9rem; margin: 0; }
    .dialog-hint { font-size: 0.9rem; color: var(--text-muted); margin: 0 0 var(--spacing-md) 0; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: var(--spacing-sm); }
  `]
})
export class GradeEntryComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apollo = inject(Apollo);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  @ViewChildren('noteSelect') noteSelects!: QueryList<ElementRef<HTMLSelectElement>>;

  // State
  loading = signal(false);
  loadingStudents = signal(false);
  savingAll = signal(false);
  error = signal<string | null>(null);

  module = signal<ModulInfo[]>([]);
  selectedModul = signal<ModulInfo | null>(null);
  students = signal<StudentWithGrade[]>([]);
  changedCount = signal(0);
  globalPruefungsdatum = signal('');
  defaultVersuch = signal(1);
  filterNurOffen = signal(true);
  filterSuche = signal('');
  showReviewDialog = signal(false);
  bemerkungPopupStudent = signal<StudentWithGrade | null>(null);

  notenOptions = computed(() => [1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 5.0]);

  erfasstCount = computed(() =>
    this.students().filter(s => s.noteWert != null && !this.hasRowError(s) && !s.changed).length
  );
  fehlenCount = computed(() => this.students().filter(s => s.noteWert == null).length);
  fehlerCount = computed(() => this.students().filter(s => this.hasRowError(s)).length);

  filteredStudents = computed(() => {
    let list = this.students();
    const q = (this.filterSuche() || '').trim().toLowerCase();
    if (q) {
      list = list.filter(s =>
        (String(s.matrikelnummer ?? '') + ' ' + (s.vorname ?? '') + ' ' + (s.nachname ?? '')).toLowerCase().includes(q)
      );
    }
    if (this.filterNurOffen()) list = list.filter(s => s.noteWert == null);
    const sorted = [...list];
    sorted.sort((a, b) => {
      const aOpen = a.noteWert == null;
      const bOpen = b.noteWert == null;
      if (aOpen !== bOpen) return aOpen ? -1 : 1;
      const last = (a.nachname ?? '').localeCompare(b.nachname ?? '');
      if (last !== 0) return last;
      return (a.vorname ?? '').localeCompare(b.vorname ?? '');
    });
    return sorted;
  });

  // Data maps
  private readonly einschreibungenMap = new Map<string, EinschreibungInfo>();
  private readonly allStudents = new Map<string, StudentInfo>();
  private readonly existingNotes = new Map<string, Note>(); // key: einschreibungId-modulId

  ngOnInit(): void {
    this.loadDozentenModule();
  }

  private async loadDozentenModule(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const dozentId = this.authService.currentUser()?.id;
      if (!dozentId) {
        this.error.set('Benutzer-ID nicht gefunden');
        return;
      }

      const result = await firstValueFrom(this.apollo.query<{ dozentenModule: ModulInfo[] }>({
        query: GET_DOZENTEN_MODULE,
        variables: { dozentId },
        fetchPolicy: 'network-only'
      }));

      const raw = result.data?.dozentenModule || [];
      const seen = new Set<string>();
      const unique = raw.filter((m: any) => {
        const id = String(m?.id ?? '');
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      this.module.set(unique);

      if (this.module().length === 0) {
        this.error.set('Ihnen sind keine Module zugewiesen');
      } else {
        const modulId = this.route.snapshot.queryParams['modulId'];
        if (modulId) {
          const modul = this.module().find(m => String(m.id) === String(modulId));
          if (modul) await this.loadStudentsForModul(modul);
        }
      }

    } catch (err: any) {
      console.error('Error loading dozenten module:', err);
      this.error.set('Fehler beim Laden der Module: ' + (err.message || 'Unbekannter Fehler'));
    } finally {
      this.loading.set(false);
    }
  }

  async loadStudentsForModul(modul: ModulInfo): Promise<void> {
    this.selectedModul.set(modul);
    this.loadingStudents.set(true);
    this.students.set([]);

    try {
      // Parallel: Alle Studenten, Einschreibungen und bestehende Noten laden
      const [studentsResult, einschreibungenResult, notenResponse] = await Promise.all([
        firstValueFrom(this.apollo.query<{ students: StudentInfo[] }>({
          query: GET_ALL_STUDENTS,
          context: { clientName: 'user' },
          fetchPolicy: 'network-only'
        })),
        firstValueFrom(this.apollo.query<{ einschreibungen: EinschreibungInfo[] }>({
          query: GET_ALL_EINSCHREIBUNGEN,
          fetchPolicy: 'network-only'
        })),
        firstValueFrom(this.http.get<ApiResponse<Note[]>>('/api/noten', {
          params: { modulId: modul.id }
        }))
      ]);

      const allStudents = studentsResult.data?.students || [];
      const einschreibungen = einschreibungenResult.data?.einschreibungen || [];
      const existingNotes = notenResponse?.data || [];

      // Maps erstellen (String-Keys für GraphQL/REST-Kompatibilität)
      allStudents.forEach(s => this.allStudents.set(String(s.id), s));
      einschreibungen.forEach(e => this.einschreibungenMap.set(String(e.id), e));
      existingNotes.forEach(n => this.existingNotes.set(`${String(n.einschreibungId ?? '')}-${String(n.modulId ?? '')}`, n));

      // Studierende mit Einschreibungen für dieses Modul
      const studentsWithGrades: StudentWithGrade[] = [];
      
      for (const e of einschreibungen) {
        if (!e.studentId) continue;
        
        const student = this.allStudents.get(String(e.studentId));
        if (!student) continue;

        const noteKey = `${String(e.id ?? '')}-${String(modul.id ?? '')}`;
        const existingNote = this.existingNotes.get(noteKey);

        studentsWithGrades.push({
          ...student,
          einschreibungId: e.id,
          semester: e.aktuellesSemester,
          noteId: existingNote?.id,
          noteWert: existingNote?.noteWert || null,
          noteText: existingNote?.noteWert != null ? this.formatNoteOption(existingNote.noteWert) : '',
          bestanden: existingNote?.bestanden || false,
          versuch: existingNote?.versuch ?? this.defaultVersuch(),
          pruefungsdatum: existingNote?.pruefungsdatum || this.getTodayString(),
          bemerkung: existingNote?.bemerkung || '',
          bemerkungOffen: Boolean(existingNote?.bemerkung),
          status: existingNote?.status || 'ERFASST',
          modulId: modul.id,
          saving: false,
          changed: false
        });
      }

      this.students.set(studentsWithGrades);
      const firstDate = studentsWithGrades.find(s => s.pruefungsdatum)?.pruefungsdatum || this.getTodayString();
      this.globalPruefungsdatum.set(firstDate);
      setTimeout(() => this.focusFirstOpen(), 100);

    } catch (err: any) {
      console.error('Error loading students for modul:', err);
      this.error.set('Fehler beim Laden der Studierenden: ' + (err.message || 'Unbekannter Fehler'));
    } finally {
      this.loadingStudents.set(false);
    }
  }

  onModulSelect(modulId: string | null): void {
    if (!modulId) { this.selectedModul.set(null); this.students.set([]); return; }
    const m = this.module().find(x => String(x.id) === String(modulId));
    if (m) this.loadStudentsForModul(m);
  }

  refreshCurrentModul(): void {
    const m = this.selectedModul();
    if (m) this.loadStudentsForModul(m);
  }

  setGlobalPruefungsdatum(v: string): void { this.globalPruefungsdatum.set(v || this.getTodayString()); }
  setDefaultVersuch(v: number): void { this.defaultVersuch.set(v); }
  setFilterSuche(v: string): void { this.filterSuche.set(v); }
  setFilterNurOffen(v: boolean): void { this.filterNurOffen.set(v); }

  /** Nur im Status ERFASST darf der Dozent die Note bearbeiten; nach Validierung/Freigabe nur Prüfungsamt. */
  canEditNote(s: StudentWithGrade): boolean {
    const status = String(s.status ?? '').toUpperCase();
    return status === 'ERFASST' || status === '';
  }

  noteLockedTooltip(s: StudentWithGrade): string {
    const status = String(s.status ?? '').toUpperCase();
    if (status === 'VALIDIERT') return 'Bereits validiert; Änderung nur über das Prüfungsamt möglich.';
    if (status === 'FREIGEGEBEN') return 'Bereits freigegeben; nicht mehr änderbar.';
    return 'Diese Note kann nur noch vom Prüfungsamt geändert werden.';
  }

  hasRowError(s: StudentWithGrade): boolean {
    if (s.noteWert != null) {
      const n = Number(s.noteWert);
      if (Number.isNaN(n) || n < 1 || n > 5) return true;
    }
    return false;
  }

  getRowError(s: StudentWithGrade): string {
    if (s.noteWert != null) {
      const n = Number(s.noteWert);
      if (Number.isNaN(n)) return 'Ungültige Note';
      if (n < 1 || n > 5) return 'Note muss zwischen 1,0 und 5,0 liegen';
    }
    return '';
  }

  rowStatus(student: any): 'open' | 'unsaved' | 'saving' | 'saved' | 'error' | 'submitted' | 'released' {
    if (student.saving) return 'saving';
    if (this.hasRowError(student)) return 'error';
    if (student.changed) return 'unsaved';
    if (student.noteWert == null) return 'open';
    if (String(student.status || '').toUpperCase() === 'EINGEREICHT') return 'submitted';
    if (String(student.status || '').toUpperCase() === 'FREIGEGEBEN') return 'released';
    return 'saved';
  }

  statusTooltip(student: any): string {
    const status = this.rowStatus(student);
    if (status === 'error') return this.getRowError(student);
    const labels: Record<string, string> = { open: 'Offen', unsaved: 'Ungespeichert', saving: 'Wird eingereicht…', saved: 'Eingereicht', submitted: 'Beim Prüfungsamt', released: 'Freigegeben' };
    return labels[status] ?? '';
  }

  formatNoteOption(v: number): string {
    return v === 5 ? '5,0' : v.toFixed(1).replace('.', ',');
  }

  onNoteSelectChange(student: any, value: number | null, index: number): void {
    student.noteWert = value;
    student.bestanden = value != null ? value <= 4.0 : false;
    this.onGradeChange(student);
    setTimeout(() => this.focusNextNote(index), 0);
  }

  openBemerkungPopup(student: StudentWithGrade): void { this.bemerkungPopupStudent.set(student); }
  closeBemerkungPopup(): void { this.bemerkungPopupStudent.set(null); }

  openReviewDialog(): void { this.showReviewDialog.set(true); }
  closeReviewDialog(): void { this.showReviewDialog.set(false); }

  submitForValidation(): void {
    this.closeReviewDialog();
    this.toast.info('Einreichen ist in dieser Version noch nicht angebunden.');
  }

  onGradeChange(student: any): void {
    student.changed = true;
    this.updateChangedCount();
  }

  onVersuchChange(student: any, value: number): void {
    student.versuch = Number(value);
    this.onGradeChange(student);
  }

  focusNextNote(index: number): void {
    const selects = this.noteSelects?.toArray() ?? [];
    const next = selects[index + 1];
    if (next?.nativeElement) next.nativeElement.focus();
  }

  private static readonly VALID_NOTEN = [1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 5.0];

  /** Normalisiert Eingaben wie 3 → 3.0, 1 → 1.0 für Anzeige und Backend-Kompatibilität */
  normalizeNoteValue(student: any): void {
    if (student.noteWert == null) return;
    const n = Number(student.noteWert);
    if (Number.isNaN(n)) return;
    const match = GradeEntryComponent.VALID_NOTEN.find(v => Math.abs(v - n) < 0.01);
    if (match !== undefined) {
      student.noteWert = match;
    } else {
      const rounded = Math.round(n * 10) / 10;
      student.noteWert = (rounded >= 1 && rounded <= 5) ? rounded : n;
    }
  }

  /** Liefert einen gültigen Notenwert (3 → 3.0) für das Backend */
  private toValidNoteValue(val: number | null): number | null {
    if (val == null) return null;
    const n = Number(val);
    const match = GradeEntryComponent.VALID_NOTEN.find(v => Math.abs(v - n) < 0.01);
    return match ?? (n >= 1 && n <= 5 ? Math.round(n * 10) / 10 : n);
  }

  private updateChangedCount(): void {
    const count = this.students().filter(s => s.changed).length;
    this.changedCount.set(count);
  }

  async saveGrade(student: any): Promise<void> {
    if (student.noteWert == null || this.hasRowError(student)) return;

    this.normalizeNoteValue(student);

    student.saving = true;

    try {
      const datum = student.pruefungsdatum || this.globalPruefungsdatum() || this.getTodayString();
      const bestanden = student.noteWert != null ? student.noteWert <= 4.0 : false;
      const payload = {
        einschreibungId: student.einschreibungId,
        modulId: student.modulId,
        noteWert: this.toValidNoteValue(student.noteWert),
        bestanden,
        versuch: student.versuch ?? this.defaultVersuch(),
        pruefungsdatum: datum,
        bemerkung: student.bemerkung || null
      };

      if (student.noteId) {
        // Update bestehende Note
        await firstValueFrom(
          this.http.put<ApiResponse<Note>>(`/api/noten/${student.noteId}`, payload)
        );
      } else {
        // Neue Note erstellen
        const response = await firstValueFrom(
          this.http.post<ApiResponse<Note>>('/api/noten', payload)
        );
        student.noteId = response.data.id;
      }

      student.changed = false;
      this.updateChangedCount();

    } catch (err: any) {
      console.error('Error saving grade:', err);
      this.toast.error('Fehler beim Einreichen: ' + (err.error?.message || err.message || 'Unbekannter Fehler'));
    } finally {
      student.saving = false;
    }
  }

  async saveAllGrades(): Promise<void> {
    const changedStudents = this.students().filter(s => s.changed && s.noteWert != null && !this.hasRowError(s));
    if (changedStudents.length === 0) return;

    this.savingAll.set(true);

    for (const student of changedStudents) {
      await this.saveGrade(student);
    }

    this.savingAll.set(false);
  }

  private getTodayString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  private focusFirstOpen(): void {
    const selects = this.noteSelects?.toArray() ?? [];
    const list = this.filteredStudents();
    const firstOpenIndex = list.findIndex(s => s.noteWert == null);
    if (firstOpenIndex >= 0 && selects[firstOpenIndex]?.nativeElement) {
      selects[firstOpenIndex].nativeElement.focus();
    }
  }

  onNoteKeydown(event: KeyboardEvent, index: number): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.focusNextNote(index);
  }
}

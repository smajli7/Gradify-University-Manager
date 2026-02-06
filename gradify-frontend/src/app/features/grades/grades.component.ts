import { Component, OnInit, OnDestroy, signal, computed, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { GradeService } from '../../core/services/grade.service';
import { ModuleService } from '../../core/services/module.service';
import { AuthService } from '../../core/services/auth.service';
import { OverlayService } from '../../core/services/overlay.service';
import { ToastService } from '../../core/services/toast.service';
import { SkeletonStateComponent } from '../../shared/components/skeleton-state/skeleton-state.component';
import { Note, NoteStatus } from '../../types';
import jsPDF from 'jspdf';

// Query für Einschreibungen eines Studenten
const GET_EINSCHREIBUNGEN_QUERY = gql`
  query GetEinschreibungen($studentId: ID!) {
    einschreibungen(studentId: $studentId) {
      id
      aktuellesSemester
      poId
      studiengang {
        id
        name
        kuerzel
        gesamtEcts
      }
    }
  }
`;

const GET_STUDENT_QUERY = gql`
  query GetStudent($id: ID!) {
    student(id: $id) {
      id
      matrikelnummer
    }
  }
`;

interface EinschreibungOption {
  id: string;
  studiengang: string;
  studiengangId?: string;
  kuerzel: string;
  semester: number;
  poId?: string;
  gesamtEcts?: number;
}

@Component({
  selector: 'app-grades',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SkeletonStateComponent],
  template: `
    <div class="page animate-slide-up">
      <!-- A) Sticky Top-Bar: bleibt beim Scrollen oben (Notenübersicht | Suche | Filter + Sort) -->
      @if (!gradeService.loading() && !gradeService.error() && gradeService.noten().length > 0) {
        <div class="grades-sticky-bar-wrap">
          <header class="grades-sticky-bar">
          <span class="grades-sticky-title">Notenübersicht</span>
          <div class="grades-search-wrap">
            <input type="text" class="grades-search" placeholder="Modul suchen…" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)">
          </div>
          <div class="grades-filters">
            <button type="button" class="filter-chip" [class.filter-chip--active]="filterChip() === 'alle'" (click)="filterChip.set('alle')">Alle</button>
            <button type="button" class="filter-chip" [class.filter-chip--active]="filterChip() === 'bestanden'" (click)="filterChip.set('bestanden')">Bestanden</button>
            <button type="button" class="filter-chip" [class.filter-chip--active]="filterChip() === 'offen'" (click)="filterChip.set('offen')">Offen</button>
            <button type="button" class="filter-chip" [class.filter-chip--active]="filterChip() === 'wiederholung'" (click)="filterChip.set('wiederholung')">Wiederholung</button>
            <select class="grades-sort" [ngModel]="sortBy()" (ngModelChange)="setSortBy($event)">
              <option value="datum">Sort: Datum</option>
              <option value="note">Sort: Note</option>
              <option value="name">Sort: Name</option>
            </select>
            @if (isStudent() && filteredNoten().length > 0) {
              <button type="button" class="btn btn--secondary btn--sm" (click)="exportCsv()">CSV</button>
              <button type="button" class="btn btn--secondary btn--sm" (click)="showTranscript()">Notenbescheinigung</button>
            }
          </div>
        </header>
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
              (change)="loadNoten()">
              @for (einschreibung of einschreibungen(); track einschreibung.id) {
                <option [value]="einschreibung.id">
                  {{ einschreibung.studiengang }} ({{ einschreibung.kuerzel }}) - {{ einschreibung.semester }}. Sem
                </option>
              }
            </select>
          </div>
        </div>
      }

      <!-- Loading State -->
      @if (gradeService.loading()) {
        <app-skeleton-state [lineCount]="8" />
      }

      <!-- Error State -->
      @if (gradeService.error()) {
        <div class="error-state">
          <span class="material-icons-outlined">error</span>
          <p>{{ gradeService.error() }}</p>
          @if (isStudent()) {
            <button class="btn btn--primary" (click)="loadOwnData()">Erneut versuchen</button>
          }
        </div>
      }

      <!-- B) Insights-Zeile: 4 Mini-KPIs + Sparkline -->
      @if (!gradeService.loading() && !gradeService.error() && gradeService.noten().length > 0) {
        <div class="grades-insights-row">
          <div class="insight-mini"><span class="insight-mini-label">Ø Note</span><span class="insight-mini-value">{{ (gradeService.durchschnitt() ?? 0) | number:'1.2-2' }}</span></div>
          <div class="insight-mini"><span class="insight-mini-label">Bestanden</span><span class="insight-mini-value">{{ gradeService.bestandenCount() }}</span></div>
          <div class="insight-mini"><span class="insight-mini-label">Offen</span><span class="insight-mini-value">{{ gradeService.offenCount() }}</span></div>
          <div class="insight-mini"><span class="insight-mini-label">Letzte Änderung</span><span class="insight-mini-value">{{ lastChangeDate() }}</span></div>
          @if (noteTrendData().length > 0) {
            <div class="insight-sparkline">
              @for (v of noteTrendData(); track $index) {
                <span class="sparkline-bar" [style.height.%]="(5 - v) / 4 * 100"></span>
              }
            </div>
          }
        </div>

        <!-- Schnellfilter-Chips + View-Toggle -->
        <div class="grades-quick-filters">
          <button type="button" class="quick-chip" [class.quick-chip--active]="quickFilter() === 'le2'" (click)="toggleQuickFilter('le2')">≤ 2.0</button>
          <button type="button" class="quick-chip" [class.quick-chip--active]="quickFilter() === 'ge3'" (click)="toggleQuickFilter('ge3')">≥ 3.0</button>
          <button type="button" class="quick-chip" [class.quick-chip--active]="quickFilter() === 'zweitversuch'" (click)="toggleQuickFilter('zweitversuch')">Zweitversuch</button>
          <button type="button" class="quick-chip" [class.quick-chip--active]="quickFilter() === 'letzte90'" (click)="toggleQuickFilter('letzte90')">Letzte 90 Tage</button>
          <button type="button" class="quick-chip" [class.quick-chip--active]="quickFilter() === 'ohneNote'" (click)="toggleQuickFilter('ohneNote')">Ohne Note / Offen</button>
          <label class="impact-toggle"><input type="checkbox" [ngModel]="showImpact()" (ngModelChange)="showImpact.set($event)"> Impact anzeigen</label>
        </div>

        <!-- C) 2-Spalten: Tabelle links, Detail-Panel rechts -->
        <div class="grades-body-grid" [class.grades-body-grid--with-panel]="selectedNote()">
          <div class="grades-table-column">
            <div class="table-view-toggle">
              <button type="button" class="toggle-btn" [class.toggle-btn--active]="viewGroup() === 'semester'" (click)="viewGroup.set('semester')">Nach Semester</button>
              <button type="button" class="toggle-btn" [class.toggle-btn--active]="viewGroup() === 'flat'" (click)="viewGroup.set('flat')">Alle</button>
            </div>
            @if (viewGroup() === 'flat') {
              <div class="smart-table">
                @for (note of filteredNoten(); track note.id) {
                  <div class="smart-row" (click)="selectedNote.set(note)">
                    <div class="smart-row-left">
                      <span class="smart-modul-name">{{ moduleService.getModulName(note.modulId) }}</span>
                      <span class="smart-modul-nr">{{ moduleService.getModulNr(note.modulId) || note.modulId }}</span>
                    </div>
                    <div class="smart-row-right">
                      <span class="note-pill note-pill--{{ gradeService.getNoteColor(note.noteWert) }}">{{ gradeService.formatNote(note.noteWert) }}</span>
                      <span class="smart-versuch">{{ note.versuch }}. Versuch</span>
                      <span class="smart-datum">{{ formatDate(note.pruefungsdatum) }}</span>
                      <span class="status-pill status-pill--{{ gradeService.getStatusColor(note.status) }}">{{ gradeService.getStatusLabel(note.status) }}</span>
                      @if (showImpact()) {
                        <span class="impact-badge impact-badge--{{ getImpactLevel(note) }}">{{ getImpactLevel(note) }}</span>
                      }
                      <span class="smart-chevron">›</span>
                    </div>
                  </div>
                } @empty {
                  <div class="grades-empty-filters">
                    <p>Keine Einträge passen zu den gewählten Filtern.</p>
                    <button type="button" class="btn btn--secondary btn--sm" (click)="clearAllFilters()">Filter zurücksetzen</button>
                  </div>
                }
              </div>
            } @else {
              <div class="semester-accordion">
                @if (notenBySemester().length === 0) {
                  <div class="grades-empty-filters">
                    <p>Keine Einträge passen zu den gewählten Filtern.</p>
                    <button type="button" class="btn btn--secondary btn--sm" (click)="clearAllFilters()">Filter zurücksetzen</button>
                  </div>
                }
                @for (group of notenBySemester(); track group.semester) {
                  <div class="semester-group">
                    <div class="semester-group-head">{{ group.semester === 0 ? 'Überblick' : group.semester + '. Semester' }}</div>
                    @for (note of group.noten; track note.id) {
                      <div class="smart-row" (click)="selectedNote.set(note)">
                        <div class="smart-row-left">
                          <span class="smart-modul-name">{{ moduleService.getModulName(note.modulId) }}</span>
                          <span class="smart-modul-nr">{{ moduleService.getModulNr(note.modulId) || note.modulId }}</span>
                        </div>
                        <div class="smart-row-right">
                          <span class="note-pill note-pill--{{ gradeService.getNoteColor(note.noteWert) }}">{{ gradeService.formatNote(note.noteWert) }}</span>
                          <span class="smart-versuch">{{ note.versuch }}. Versuch</span>
                          <span class="smart-datum">{{ formatDate(note.pruefungsdatum) }}</span>
                          <span class="status-pill status-pill--{{ gradeService.getStatusColor(note.status) }}">{{ gradeService.getStatusLabel(note.status) }}</span>
                          @if (showImpact()) {
                            <span class="impact-badge impact-badge--{{ getImpactLevel(note) }}">{{ getImpactLevel(note) }}</span>
                          }
                          <span class="smart-chevron">›</span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
            <div class="table-footer">
              <span class="result-count">{{ filteredNoten().length }} Prüfungsleistungen</span>
            </div>
          </div>

          <!-- Detail-Sidepanel (rechts) -->
          @if (selectedNote(); as note) {
            <aside class="grades-detail-panel">
              <div class="detail-panel-header">
                <h3>{{ moduleService.getModulName(note.modulId) }}</h3>
                <button type="button" class="detail-panel-close" (click)="selectedNote.set(null)">✕</button>
              </div>
              <div class="detail-panel-body">
                <p class="detail-panel-meta">{{ moduleService.getModulNr(note.modulId) }} · {{ getEctsForNote(note) }} ECTS</p>
                <div class="detail-panel-row">
                  <span class="detail-label">Note</span>
                  <span class="note-pill note-pill--{{ gradeService.getNoteColor(note.noteWert) }}">{{ gradeService.formatNote(note.noteWert) }}</span>
                </div>
                <div class="detail-panel-row">
                  <span class="detail-label">Versuch</span>
                  <span>{{ note.versuch }}. Versuch</span>
                </div>
                <div class="detail-panel-row">
                  <span class="detail-label">Prüfungsdatum</span>
                  <span>{{ formatDate(note.pruefungsdatum) }}</span>
                </div>
                <div class="detail-panel-row">
                  <span class="detail-label">Status</span>
                  <span class="status-pill status-pill--{{ gradeService.getStatusColor(note.status) }}">{{ gradeService.getStatusLabel(note.status) }}</span>
                </div>
              </div>
            </aside>
          }
        </div>
      }

      <!-- Empty State (no data loaded) -->
      @if (!gradeService.loading() && !gradeService.error() && gradeService.noten().length === 0 && !loadingEinschreibungen()) {
        <div class="empty-initial-state">
          <div class="empty-icon">
            <span class="material-icons-outlined">grade</span>
          </div>
          <h3>Keine Noten vorhanden</h3>
          <p>Für die ausgewählte Einschreibung sind noch keine Noten erfasst.</p>
        </div>
      }

      <!-- Transcript Modal (Notenbescheinigung) -->
      @if (showTranscriptModal()) {
        <div class="modal-overlay transcript-overlay" (click)="closeTranscript()">
          <div class="transcript-modal" (click)="$event.stopPropagation()">
            <div class="transcript-actions no-print">
              <button class="btn btn--primary" (click)="exportPdf()" [disabled]="generatingPdf()">
                @if (generatingPdf()) {
                  <span class="spinner-btn"></span>
                  PDF wird erstellt...
                } @else {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                  Als PDF speichern
                }
              </button>
              <button class="btn btn--secondary" (click)="printTranscript()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Drucken
              </button>
              <button class="btn btn--ghost" (click)="closeTranscript()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div class="transcript-document" #transcriptDocument>
              <!-- Test-Hinweis oben -->
              <div class="test-banner">
                TEST – Dieses Dokument hat keine gesetzliche Wirkung.
              </div>
              <!-- Offizieller Header mit Wappen-Style -->
              <header class="transcript-header">
                <div class="header-top">
                  <div class="uni-emblem">
                    <div class="emblem-icon">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="1.5">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                      </svg>
                    </div>
                    <div class="uni-text">
                      <h1>{{ getUniversityName() }}</h1>
                      <span class="uni-type">University of Applied Sciences</span>
                    </div>
                  </div>
                  <div class="document-id">
                    <span class="doc-label">Dokument-Nr.</span>
                    <span class="doc-number">{{ getDocumentNumber() }}</span>
                  </div>
                </div>
                <div class="document-title-bar">
                  <h2>NOTENBESCHEINIGUNG</h2>
                  <p>Transcript of Records</p>
                </div>
              </header>

              <!-- Student Info Box -->
              <section class="student-info-box">
                <div class="info-row">
                  <div class="info-cell">
                    <label>Name, Vorname</label>
                    <span>{{ getStudentNameReverse() }}</span>
                  </div>
                  <div class="info-cell">
                    <label>Matrikelnummer</label>
                    <span>{{ getMatrikelnummer() }}</span>
                  </div>
                </div>
                <div class="info-row">
                  <div class="info-cell">
                    <label>Studiengang</label>
                    <span>{{ getCurrentStudiengangFull() }}</span>
                  </div>
                  <div class="info-cell info-cell--small">
                    <label>Fachsemester</label>
                    <span>{{ getCurrentSemesterNumber() }}</span>
                  </div>
                  <div class="info-cell info-cell--small">
                    <label>Abschluss</label>
                    <span>Bachelor of Science</span>
                  </div>
                </div>
              </section>

              <!-- Grades Table -->
              <section class="grades-section">
                <table class="transcript-table">
                  <thead>
                    <tr>
                      <th class="col-nr">#</th>
                      <th class="col-code">Modul-Nr.</th>
                      <th class="col-modul">Modulbezeichnung</th>
                      <th class="col-sem">Sem.</th>
                      <th class="col-ects">ECTS</th>
                      <th class="col-note">Note</th>
                      <th class="col-status">Ergebnis</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (note of filteredNoten(); track note.id; let i = $index) {
                      <tr [class.row-failed]="note.bestanden === false">
                        <td class="col-nr">{{ i + 1 }}</td>
                        <td class="col-code">{{ moduleService.getModulNr(note.modulId) || '-' }}</td>
                        <td class="col-modul">{{ moduleService.getModulName(note.modulId) || 'Unbekanntes Modul' }}</td>
                        <td class="col-sem">{{ getSemesterForNote(note) }}</td>
                        <td class="col-ects">{{ getEctsForNote(note) }}</td>
                        <td class="col-note" [class.note-excellent]="isExcellent(note.noteWert)" [class.note-failed]="note.bestanden === false">
                          {{ gradeService.formatNote(note.noteWert) }}
                        </td>
                        <td class="col-status">
                          @if (note.bestanden === true) {
                            <span class="status-pass">BE</span>
                          } @else if (note.bestanden === false) {
                            <span class="status-fail">NB</span>
                          } @else {
                            <span class="status-pending">-</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
                <div class="table-legend">
                  <span>BE = Bestanden</span>
                  <span>NB = Nicht bestanden</span>
                </div>
              </section>

              <!-- Summary Box -->
              <section class="summary-box">
                <div class="summary-row">
                  <div class="summary-cell summary-cell--highlight">
                    <label>Gesamtdurchschnitt</label>
                    <span class="big-number">{{ (gradeService.durchschnitt() ?? 0) | number:'1.2-2' }}</span>
                  </div>
                  <div class="summary-cell">
                    <label>Erreichte ECTS</label>
                    <span>{{ calculateTotalEcts() }} von {{ getTotalRequiredEcts() }}</span>
                  </div>
                  <div class="summary-cell">
                    <label>Bestandene Prüfungen</label>
                    <span>{{ gradeService.bestandenCount() }}</span>
                  </div>
                  <div class="summary-cell">
                    <label>Offene Prüfungen</label>
                    <span>{{ gradeService.offenCount() }}</span>
                  </div>
                </div>
              </section>

              <!-- Footer -->
              <footer class="transcript-footer">
                <div class="footer-left">
                  <p class="issue-info">
                    <strong>Ausstellungsdatum:</strong> {{ getCurrentDateFull() }}<br>
                    <strong>Ausstellungsort:</strong> {{ getUniversityCity() }}
                  </p>
                  <p class="legal-notice">
                    Diese Bescheinigung wurde maschinell erstellt.<br>
                    Sie ist ohne Unterschrift und Siegel gültig.
                  </p>
                </div>
                <div class="footer-right">
                  <div class="stamp-area">
                    <div class="stamp-placeholder">
                      <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="0.5" opacity="0.3">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      </svg>
                    </div>
                  </div>
                  <div class="signature-block">
                    <div class="signature-line"></div>
                    <span>Prüfungsamt</span>
                  </div>
                </div>
              </footer>

              <!-- Page Footer -->
              <div class="page-footer">
                <span>Seite 1 von 1</span>
                <span>{{ getUniversityName() }} • Prüfungsamt</span>
                <span>{{ getCurrentDate() }}</span>
              </div>

              <!-- Test Notice -->
              <div class="test-notice">
                Hinweis: Dies ist ein Testdokument ohne rechtliche Gültigkeit.
              </div>
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

    /* A) Sticky Top-Bar – bleibt beim Scrollen oben, läuft nicht mit */
    .grades-sticky-bar-wrap {
      position: sticky;
      top: 0;
      z-index: 50;
      margin-bottom: var(--spacing-sm);
      background: var(--bg-page);
    }
    .grades-sticky-bar {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      background: var(--bg-surface);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    .grades-sticky-title { font-weight: 600; font-size: 1.1rem; white-space: nowrap; color: var(--text-primary); }
    .grades-search-wrap { flex: 1; min-width: 0; max-width: 320px; }
    .grades-search {
      width: 100%;
      padding: 8px 12px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }
    .grades-search::placeholder { color: var(--text-muted); }
    .grades-filters { display: flex; align-items: center; gap: var(--spacing-xs); flex-wrap: wrap; }
    .filter-chip {
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid var(--border-color);
      background: var(--bg-elevated);
      color: var(--text-primary);
      font-size: 0.875rem;
      cursor: pointer;
    }
    .filter-chip--active { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-color-light); }
    .grades-sort {
      padding: 6px 10px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      background: var(--bg-elevated);
      color: var(--text-primary);
      font-size: 0.875rem;
    }

    /* B) Insights-Zeile */
    .grades-insights-row {
      display: flex;
      align-items: center;
      gap: var(--spacing-lg);
      padding: var(--spacing-sm) 0;
      margin-bottom: var(--spacing-md);
      font-variant-numeric: tabular-nums;
    }
    .insight-mini { display: flex; flex-direction: column; gap: 2px; }
    .insight-mini-label { font-size: 0.75rem; color: var(--text-muted); }
    .insight-mini-value { font-weight: 600; font-size: 0.95rem; color: var(--text-primary); }
    .insight-sparkline {
      display: flex; align-items: flex-end; gap: 2px; height: 24px;
    }
    .sparkline-bar {
      width: 4px; min-height: 2px; background: var(--color-primary); opacity: 0.8; border-radius: 1px;
    }

    /* Schnellfilter + Impact-Toggle */
    .grades-quick-filters {
      display: flex; align-items: center; gap: var(--spacing-xs); flex-wrap: wrap; margin-bottom: var(--spacing-md);
    }
    .quick-chip {
      padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border-color);
      background: var(--bg-surface); color: var(--text-primary); font-size: 0.8rem; cursor: pointer;
    }
    .quick-chip--active { background: var(--bg-hover); color: var(--text-primary); }
    .impact-toggle { font-size: 0.8rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 6px; margin-left: auto; }

    /* C) 2-Spalten */
    .grades-body-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--spacing-lg);
      align-items: start;
    }
    .grades-body-grid--with-panel {
      grid-template-columns: 1fr 320px;
    }
    .grades-table-column { min-width: 0; }
    .table-view-toggle { display: flex; gap: 4px; margin-bottom: var(--spacing-sm); }
    .toggle-btn {
      padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color);
      background: var(--bg-surface); color: var(--text-primary); font-size: 0.875rem; cursor: pointer;
    }
    .toggle-btn--active { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-color-light); }

    .smart-table, .semester-accordion {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .smart-row {
      display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md);
      padding: 10px 12px;
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      font-variant-numeric: tabular-nums;
    }
    .smart-row:last-child { border-bottom: none; }
    .smart-row:hover { background: var(--bg-hover); }
    .semester-accordion .smart-row {
      background: var(--bg-surface);
    }
    .semester-accordion .smart-row:hover {
      background: var(--bg-elevated);
    }
    .smart-row-left { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .smart-modul-name { font-weight: 500; color: var(--text-primary); }
    .smart-modul-nr { font-size: 0.8rem; color: var(--text-muted); }
    .smart-row-right { display: flex; align-items: center; gap: var(--spacing-sm); flex-shrink: 0; }
    .note-pill {
      padding: 4px 10px; border-radius: 999px; font-size: 0.9rem; font-weight: 600;
      border: none; outline: none; font-variant-numeric: tabular-nums;
      background: rgba(255, 255, 255, 0.08); color: var(--text-primary);
    }
    .note-pill--success, .note-pill--info, .note-pill--warning, .note-pill--caution, .note-pill--danger,
    .note-pill--neutral, .note-pill--muted {
      background: rgba(255, 255, 255, 0.08); color: var(--text-primary);
    }
    .status-pill {
      padding: 2px 8px; border-radius: 999px; font-size: 0.75rem;
      border: none; outline: none;
      background: transparent; color: var(--text-secondary);
    }
    .status-pill--success {
      background: rgba(22, 101, 52, 0.25); color: #86efac;
    }
    .status-pill--warning, .status-pill--danger, .status-pill--neutral {
      background: transparent; color: var(--text-secondary);
    }
    .impact-badge { font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); }
    .impact-badge--hoch { color: var(--color-primary); }
    .smart-versuch, .smart-datum { font-size: 0.85rem; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
    .smart-chevron { color: var(--text-secondary); font-size: 1rem; }

    .semester-group { border-bottom: 1px solid var(--border-color); }
    .semester-group:last-child { border-bottom: none; }
    .semester-group-head {
      padding: 8px 12px;
      background: var(--bg-hover);
      color: var(--text-primary);
      font-weight: 600;
      font-size: 0.9rem;
    }

    .table-footer { padding: var(--spacing-sm) 0; font-size: 0.875rem; color: var(--text-secondary); }
    .result-count { font-variant-numeric: tabular-nums; }

    .grades-empty-filters {
      padding: var(--spacing-xl);
      text-align: center;
      color: var(--text-secondary);
    }
    .grades-empty-filters p { margin-bottom: var(--spacing-md); }

    .grades-detail-panel {
      position: sticky; top: 80px;
      border: 1px solid var(--border-color); border-radius: var(--radius-md);
      background: var(--bg-surface); padding: var(--spacing-md); min-height: 120px;
    }
    .detail-panel-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-md); }
    .detail-panel-header h3 { margin: 0; font-size: 1rem; }
    .detail-panel-close { background: none; border: none; cursor: pointer; font-size: 1.1rem; color: var(--text-muted); padding: 4px; }
    .detail-panel-meta { font-size: 0.8rem; color: var(--text-muted); margin-bottom: var(--spacing-sm); }
    .detail-panel-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xs); font-variant-numeric: tabular-nums; }
    .detail-label { font-size: 0.85rem; color: var(--text-muted); }

    @media (max-width: 900px) {
      .grades-body-grid { grid-template-columns: 1fr; }
      .grades-detail-panel { position: static; }
    }

    /* Header (fallback/empty state) */
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

    .header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: var(--spacing-md);
    }

    .header-stats {
      display: flex;
      gap: var(--spacing-sm);
    }

    .export-buttons {
      display: flex;
      gap: var(--spacing-sm);
    }

    .btn-export {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    /* Transcript Modal Styles - Full Viewport, vorne über allem (über Dock 9999) */
    .transcript-overlay {
      position: fixed !important;
      inset: 0;
      z-index: 99999 !important;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow: hidden;
    }

    .transcript-modal {
      background: #f8fafc;
      width: 100%;
      max-width: min(800px, calc(100vw - 32px));
      max-height: calc(100vh - 32px);
      margin: auto;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      flex: 0 1 auto;
    }

    .transcript-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md) var(--spacing-lg);
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }

    .btn--ghost {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 8px;
      cursor: pointer;
      border-radius: var(--radius-md);
    }

    .btn--ghost:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .spinner-btn {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(0,0,0,0.2);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 6px;
    }

    .transcript-document {
      padding: 40px 48px;
      background: #fff;
      color: #1e293b;
      font-family: 'Segoe UI', 'Source Sans Pro', system-ui, sans-serif;
      position: relative;
      box-shadow: inset 0 0 0 1px rgba(30, 58, 95, 0.08);
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }

    /* Header */
    .transcript-header {
      margin-bottom: 30px;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 25px;
    }

    .uni-emblem {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .emblem-icon {
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .uni-text h1 {
      font-size: 1.05rem;
      font-weight: 600;
      margin: 0;
      color: #1e3a5f;
      letter-spacing: 0.3px;
    }

    .uni-type {
      font-size: 0.68rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1.2px;
    }

    .document-id {
      text-align: right;
      font-size: 0.75rem;
    }

    .doc-label {
      display: block;
      color: #888;
      text-transform: uppercase;
      font-size: 0.65rem;
      letter-spacing: 0.5px;
    }

    .doc-number {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: #333;
    }

    .document-title-bar {
      text-align: center;
      padding: 16px 0;
      border-top: 3px solid #1e3a5f;
      border-bottom: 1px solid #cbd5e1;
      margin-bottom: 24px;
    }

    .document-title-bar h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
      color: #1e3a5f;
      letter-spacing: 2px;
    }

    .document-title-bar p {
      font-size: 0.75rem;
      color: #64748b;
      margin: 4px 0 0 0;
      font-style: italic;
    }

    /* Student Info Box */
    .student-info-box {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      margin-bottom: 24px;
      overflow: hidden;
    }

    .info-row {
      display: flex;
      border-bottom: 1px solid #e2e8f0;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-cell {
      flex: 1;
      padding: 10px 16px;
      border-right: 1px solid #e2e8f0;
    }

    .info-cell:last-child {
      border-right: none;
    }

    .info-cell--small {
      flex: 0.5;
    }

    .info-cell label {
      display: block;
      font-size: 0.6rem;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.6px;
      margin-bottom: 2px;
    }

    .info-cell span {
      font-size: 0.9rem;
      font-weight: 600;
      color: #1e293b;
    }

    /* Grades Table */
    .grades-section {
      margin-bottom: 20px;
    }

    .transcript-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      overflow: hidden;
    }

    .transcript-table th {
      background: #1e3a5f;
      color: white;
      padding: 10px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .transcript-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    .transcript-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    .transcript-table tbody tr:hover {
      background: #f1f5f9;
    }

    .transcript-table .row-failed {
      background: #fef2f2 !important;
    }

    .transcript-table .col-nr { width: 30px; text-align: center; color: #888; }
    .transcript-table .col-code { width: 70px; font-family: 'Courier New', monospace; font-size: 0.75rem; }
    .transcript-table .col-modul { width: auto; }
    .transcript-table .col-sem { width: 40px; text-align: center; }
    .transcript-table .col-ects { width: 45px; text-align: center; }
    .transcript-table .col-note { width: 50px; text-align: center; font-weight: 700; }
    .transcript-table .col-status { width: 55px; text-align: center; }

    .transcript-table .note-excellent {
      color: #166534;
    }

    .transcript-table .note-failed {
      color: #dc2626;
    }

    .status-pass { 
      color: white;
      background: #16a34a;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.65rem;
      font-weight: 600;
    }
    
    .status-fail { 
      color: white;
      background: #dc2626;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.65rem;
      font-weight: 600;
    }
    
    .status-pending { 
      color: #888;
      font-style: italic;
    }

    .table-legend {
      display: flex;
      gap: 20px;
      padding: 8px 0;
      font-size: 0.7rem;
      color: #888;
    }

    /* Summary Box */
    .summary-box {
      border: 2px solid #1e3a5f;
      margin-bottom: 30px;
    }

    .summary-row {
      display: flex;
    }

    .summary-cell {
      flex: 1;
      padding: 15px;
      text-align: center;
      border-right: 1px solid #ddd;
    }

    .summary-cell:last-child {
      border-right: none;
    }

    .summary-cell--highlight {
      background: #1e3a5f;
      color: white;
    }

    .summary-cell--highlight label {
      color: rgba(255,255,255,0.8);
    }

    .summary-cell label {
      display: block;
      font-size: 0.65rem;
      text-transform: uppercase;
      color: #888;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }

    .summary-cell span {
      font-size: 1rem;
      font-weight: 600;
    }

    .summary-cell .big-number {
      font-size: 1.8rem;
      font-weight: 700;
    }

    /* Footer */
    .transcript-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }

    .footer-left {
      max-width: 60%;
    }

    .issue-info {
      font-size: 0.8rem;
      margin: 0 0 10px 0;
      line-height: 1.6;
    }

    .legal-notice {
      font-size: 0.7rem;
      color: #888;
      font-style: italic;
      margin: 0;
      line-height: 1.5;
    }

    .footer-right {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
    }

    .stamp-area {
      opacity: 0.5;
    }

    .signature-block {
      text-align: center;
    }

    .signature-line {
      width: 150px;
      height: 1px;
      background: #1a1a1a;
      margin-bottom: 5px;
    }

    .signature-block span {
      font-size: 0.7rem;
      color: #666;
    }

    .page-footer {
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      font-size: 0.65rem;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
    }

    .test-banner {
      text-align: center;
      padding: 8px 16px;
      margin: 0 0 24px 0;
      font-size: 0.85rem;
      font-weight: 600;
      color: #dc2626;
      background: rgba(220, 38, 38, 0.08);
      border: 1px solid rgba(220, 38, 38, 0.3);
      border-radius: 6px;
    }

    .test-notice {
      margin-top: 16px;
      display: inline-block;
      font-size: 0.65rem;
      color: #dc2626;
      font-style: italic;
      background: #f8fafc;
      padding: 4px 8px;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }

    /* Print Styles */
    @media print {
      .no-print {
        display: none !important;
      }

      .transcript-overlay {
        position: static;
        background: none;
        padding: 0;
      }

      .transcript-modal {
        box-shadow: none;
        border-radius: 0;
        background: white;
      }

      .transcript-document {
        padding: 30px;
        min-height: auto;
      }

      .transcript-table {
        page-break-inside: avoid;
      }
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
      border-color: rgba(255, 255, 255, 0.3);
    }

    .stat-card--primary .stat-icon,
    .stat-card--primary .stat-value {
      color: var(--text-primary);
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
      border-color: var(--text-secondary);
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
      border-top-color: var(--text-secondary);
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
    .note-badge--info { background: rgba(255, 255, 255, 0.08); color: var(--text-secondary); }
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
    .status-badge--info { background: rgba(255, 255, 255, 0.08); color: var(--text-secondary); }
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
    .note-large--info { background: rgba(255, 255, 255, 0.08); color: var(--text-secondary); }
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
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: var(--text-primary);
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
export class GradesComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly apollo = inject(Apollo);
  private readonly http = inject(HttpClient);
  
  selectedNote = signal<Note | null>(null);
  selectedEinschreibung = '';
  loadingEinschreibungen = signal(false);
  showTranscriptModal = signal(false);
  generatingPdf = signal(false);

  searchQuery = signal('');
  filterChip = signal<'alle' | 'bestanden' | 'offen' | 'wiederholung'>('alle');
  sortBy = signal<'datum' | 'note' | 'name'>('datum');
  viewGroup = signal<'semester' | 'flat'>('semester');
  showImpact = signal(false);
  quickFilter = signal<string | null>(null);
  
  @ViewChild('transcriptDocument') transcriptDocument!: ElementRef;
  
  // Role-based visibility
  isStudent = computed(() => this.authService.isStudent());
  
  // Data
  einschreibungen = signal<EinschreibungOption[]>([]);

  filteredNoten = computed(() => {
    let list = this.gradeService.noten();
    // Studenten sehen nur freigegebene Noten; Erfasst/Validiert sind interne Workflow-Zustände
    if (this.isStudent()) {
      list = list.filter(n => n.status === NoteStatus.FREIGEGEBEN);
    }
    const q = (this.searchQuery() || '').trim().toLowerCase();
    const chip = this.filterChip();
    const sort = this.sortBy();
    const qf = this.quickFilter();

    if (q) {
      list = list.filter(n => {
        const name = this.moduleService.getModulName(n.modulId).toLowerCase();
        const nr = (this.moduleService.getModulNr(n.modulId) || '').toLowerCase();
        return name.includes(q) || nr.includes(q);
      });
    }
    if (chip === 'bestanden') list = list.filter(n => n.bestanden === true);
    else if (chip === 'offen') list = list.filter(n => this.isOffen(n));
    else if (chip === 'wiederholung') list = list.filter(n => (n.versuch ?? 1) > 1);

    if (qf === 'le2') list = list.filter(n => n.noteWert != null && n.noteWert <= 2.0);
    else if (qf === 'ge3') list = list.filter(n => n.noteWert != null && n.noteWert >= 3.0);
    else if (qf === 'zweitversuch') list = list.filter(n => (n.versuch ?? 1) >= 2);
    else if (qf === 'letzte90') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      list = list.filter(n => {
        const d = n.pruefungsdatum || n.erfasstAm;
        if (!d) return false;
        const t = new Date(d).getTime();
        return !Number.isNaN(t) && t >= cutoff.getTime();
      });
    } else if (qf === 'ohneNote') list = list.filter(n => n.noteWert == null || n.bestanden !== true);

    const arr = list.slice();
    if (sort === 'datum') {
      arr.sort((a, b) => {
        const ta = new Date(a.pruefungsdatum || a.erfasstAm || 0).getTime();
        const tb = new Date(b.pruefungsdatum || b.erfasstAm || 0).getTime();
        return tb - ta;
      });
    } else if (sort === 'note') {
      arr.sort((a, b) => (a.noteWert ?? 5) - (b.noteWert ?? 5));
    } else if (sort === 'name') {
      arr.sort((a, b) => this.moduleService.getModulName(a.modulId).localeCompare(this.moduleService.getModulName(b.modulId)));
    }
    return arr;
  });

  notenBySemester = computed(() => {
    const noten = this.filteredNoten();
    const map = this.moduleService.moduleMap();
    const groups = new Map<number, Note[]>();
    for (const n of noten) {
      const modul = map.get(String(n.modulId));
      const sem = modul?.semester != null ? Number.parseInt(String(modul.semester), 10) : 0;
      const key = Number.isNaN(sem) ? 0 : sem;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(n);
    }
    const semesters = Array.from(groups.keys()).sort((a, b) => a - b);
    return semesters.map(semester => ({ semester, noten: groups.get(semester)! }));
  });

  lastChangeDate = computed(() => {
    const noten = this.gradeService.noten();
    if (noten.length === 0) return '-';
    let latest = 0;
    for (const n of noten) {
      const t = new Date(n.pruefungsdatum || n.erfasstAm || 0).getTime();
      if (t > latest) latest = t;
    }
    return latest ? new Date(latest).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
  });

  noteTrendData = computed(() => {
    const noten = this.gradeService.noten().filter(n => n.noteWert != null);
    const sorted = noten.slice().sort((a, b) =>
      new Date(b.pruefungsdatum || 0).getTime() - new Date(a.pruefungsdatum || 0).getTime());
    return sorted.slice(0, 12).map(n => n.noteWert!);
  });

  constructor(
    public gradeService: GradeService,
    public moduleService: ModuleService
  ) {}

  ngOnInit(): void {
    if (this.isStudent()) {
      // Studenten sehen nur ihre eigenen Noten
      this.loadOwnData();
    } else {
      // Für Nicht-Studenten: Hier könnte später eine Auswahl implementiert werden
      this.gradeService.setError('Diese Ansicht ist nur für Studenten verfügbar.');
    }
    
    // Load modules for name resolution
    this.moduleService.loadModule().subscribe();
  }

  ngOnDestroy(): void {
    if (this.showTranscriptModal()) {
      this.overlayService.setOverlayOpen(false);
    }
  }

  loadOwnData(): void {
    const studentId = this.authService.getStudentId();
    if (!studentId) {
      this.loadingEinschreibungen.set(false);
      this.gradeService.setError('Keine Student-ID gefunden. Bitte erneut einloggen.');
      return;
    }

    this.loadingEinschreibungen.set(true);
    this.gradeService.setError(null);
    this.matrikelnummer.set('-');

    // Matrikelnummer laden (User-Service)
    this.apollo.query<{ student: { matrikelnummer: string } }>({
      query: GET_STUDENT_QUERY,
      variables: { id: studentId },
      context: { clientName: 'user' },
      fetchPolicy: 'network-only'
    }).subscribe({
      next: (r) => {
        if (r.data?.student?.matrikelnummer) {
          this.matrikelnummer.set(r.data.student.matrikelnummer);
        }
      }
    });

    // Lade Einschreibungen für den eingeloggten Studenten
    this.apollo.query<{ einschreibungen: any[] }>({
      query: GET_EINSCHREIBUNGEN_QUERY,
      variables: { studentId },
      context: { clientName: 'studiengang' },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    }).subscribe({
      next: (result) => {
        if (result.errors && result.errors.length > 0) {
          console.error('GraphQL Errors:', result.errors);
          this.gradeService.setError(`Fehler beim Laden der Einschreibungen: ${result.errors[0].message}`);
          this.loadingEinschreibungen.set(false);
          return;
        }

        const einschreibungList = result.data?.einschreibungen || [];
        this.einschreibungen.set(einschreibungList.map(e => ({
          id: e.id,
          studiengang: e.studiengang?.name || 'Unbekannt',
          studiengangId: e.studiengang?.id,
          kuerzel: e.studiengang?.kuerzel || '?',
          semester: e.aktuellesSemester,
          poId: e.poId,
          gesamtEcts: e.studiengang?.gesamtEcts
        })));
        this.loadingEinschreibungen.set(false);

        // Automatisch erste Einschreibung auswählen und Noten laden
        if (einschreibungList.length > 0) {
          this.selectedEinschreibung = einschreibungList[0].id;
          const first = einschreibungList[0];
          const sg = first.studiengang;
          if (first.poId) {
            this.moduleService.loadModule(undefined, first.poId).subscribe();
          } else if (sg?.id) {
            this.moduleService.loadModule(sg.id).subscribe();
          }
          this.loadNoten();
        } else {
          this.gradeService.setError('Keine Einschreibungen gefunden');
        }
      },
      error: (err) => {
        console.error('Error loading einschreibungen:', err);
        this.gradeService.setError(`Fehler beim Laden der Einschreibungen: ${err.message || 'Unbekannter Fehler'}`);
        this.loadingEinschreibungen.set(false);
      }
    });
  }

  loadNoten(): void {
    if (!this.selectedEinschreibung) return;
    const e = this.getSelectedEinschreibung();
    if (e?.poId) {
      this.moduleService.loadModule(undefined, e.poId).subscribe();
    } else if (e?.studiengangId) {
      this.moduleService.loadModule(e.studiengangId).subscribe();
    }
    this.gradeService.loadNotenByStudent(this.selectedEinschreibung).subscribe();
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

  getImpactLevel(note: Note): 'hoch' | 'mittel' | 'gering' {
    const ectsNum = parseInt(this.getEctsForNote(note), 10) || 0;
    if (ectsNum >= 6) return 'hoch';
    if (ectsNum >= 3) return 'mittel';
    return 'gering';
  }

  toggleQuickFilter(key: string): void {
    this.quickFilter.set(this.quickFilter() === key ? null : key);
  }

  setSortBy(value: string): void {
    if (value === 'datum' || value === 'note' || value === 'name') {
      this.sortBy.set(value);
    }
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.filterChip.set('alle');
    this.quickFilter.set(null);
  }

  /** Eine Note gilt als „offen“, wenn kein Status (bestanden null/undefined) oder keine Note eingetragen ist. */
  private isOffen(n: Note): boolean {
    const statusOffen = n.bestanden !== true && n.bestanden !== false;
    const keineNote = n.noteWert == null;
    return statusOffen || keineNote;
  }

  // ========== TRANSCRIPT ==========
  private readonly overlayService = inject(OverlayService);
  private readonly toast = inject(ToastService);

  showTranscript(): void {
    this.showTranscriptModal.set(true);
    this.overlayService.setOverlayOpen(true);
  }

  closeTranscript(): void {
    this.showTranscriptModal.set(false);
    this.overlayService.setOverlayOpen(false);
  }

  printTranscript(): void {
    globalThis.print();
  }

  async exportPdf(): Promise<void> {
    this.generatingPdf.set(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const margin = 18;
      let y = 20;

      const drawLine = (yy: number) => {
        pdf.setDrawColor(30, 58, 95);
        pdf.setLineWidth(0.3);
        pdf.line(margin, yy, pageW - margin, yy);
      };

      // Test-Hinweis oben (rot)
      pdf.setFillColor(255, 230, 230);
      pdf.rect(0, 0, pageW, 10, 'F');
      pdf.setTextColor(220, 38, 38);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TEST – Dieses Dokument hat keine gesetzliche Wirkung.', pageW / 2, 7, { align: 'center' });
      pdf.setTextColor(0, 0, 0);

      // Header
      pdf.setFillColor(30, 58, 95);
      pdf.rect(0, 10, pageW, 28, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(this.getUniversityName(), margin, 24);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('University of Applied Sciences', margin, 31);
      pdf.text(this.getDocumentNumber(), pageW - margin, 24, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
      y = 48;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('NOTENBESCHEINIGUNG', margin, y);
      y += 6;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Transcript of Records', margin, y);
      y += 10;
      drawLine(y);
      y += 12;

      // Student Info
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Name, Vorname', margin, y);
      pdf.text('Matrikelnummer', margin + 70, y);
      y += 5;
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(this.getStudentNameReverse(), margin, y);
      pdf.text(this.getMatrikelnummer(), margin + 70, y);
      y += 8;
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Studiengang', margin, y);
      pdf.text('Fachsemester', margin + 70, y);
      pdf.text('Abschluss', margin + 110, y);
      y += 5;
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(this.getCurrentStudiengangFull(), margin, y);
      pdf.text(this.getCurrentSemesterNumber(), margin + 70, y);
      pdf.text('Bachelor of Science', margin + 110, y);
      y += 14;

      // Table Header
      const colW = [8, 22, 75, 15, 18, 18, 22];
      const headers = ['#', 'Modul-Nr.', 'Modulbezeichnung', 'Sem.', 'ECTS', 'Note', 'Erg.'];
      pdf.setFillColor(30, 58, 95);
      pdf.rect(margin, y - 5, pageW - 2 * margin, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      let x = margin + 2;
      headers.forEach((h, i) => {
        pdf.text(h, x, y);
        x += colW[i];
      });
      pdf.setTextColor(0, 0, 0);
      y += 6;

      // Table Rows
      const noten = this.filteredNoten();
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      noten.forEach((note, i) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        const modulNr = this.moduleService.getModulNr(note.modulId) || '-';
        const modulName = (this.moduleService.getModulName(note.modulId) || 'Unbekanntes Modul').substring(0, 45);
        const ects = this.getEctsForNote(note);
        const noteStr = note.noteWert != null ? this.gradeService.formatNote(note.noteWert) : 'BE';
        const erg = note.bestanden === true ? 'BE' : note.bestanden === false ? 'NB' : '-';
        if (i % 2 === 1) {
          pdf.setFillColor(248, 249, 250);
          pdf.rect(margin, y - 4, pageW - 2 * margin, 6, 'F');
        }
        x = margin + 2;
        pdf.text(String(i + 1), x, y);
        x += colW[0];
        pdf.text(modulNr, x, y);
        x += colW[1];
        pdf.text(modulName, x, y);
        x += colW[2];
        pdf.text(this.getSemesterForNote(note), x, y);
        x += colW[3];
        pdf.text(ects, x, y);
        x += colW[4];
        pdf.text(noteStr, x, y);
        x += colW[5];
        pdf.text(erg, x, y);
        y += 6;
      });
      y += 6;

      // Summary
      drawLine(y);
      y += 8;
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Gesamtdurchschnitt', margin, y);
      pdf.text('Erreichte ECTS', margin + 50, y);
      pdf.text('Bestanden', margin + 100, y);
      pdf.text('Offen', margin + 130, y);
      y += 5;
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(String((this.gradeService.durchschnitt() ?? 0).toFixed(2)), margin, y);
      pdf.text(`${this.calculateTotalEcts()} von ${this.getTotalRequiredEcts()}`, margin + 50, y);
      pdf.text(String(this.gradeService.bestandenCount()), margin + 100, y);
      pdf.text(String(this.gradeService.offenCount()), margin + 130, y);
      y += 12;

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`BE = Bestanden, NB = Nicht bestanden`, margin, y);
      y += 8;
      pdf.text(`Ausstellungsdatum: ${this.getCurrentDateFull()} | Ausstellungsort: ${this.getUniversityCity()}`, margin, y);
      y += 6;
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text('Diese Bescheinigung wurde maschinell erstellt. Sie ist ohne Unterschrift und Siegel gültig.', margin, y);

      const einschreibung = this.getSelectedEinschreibung();
      const kuerzel = einschreibung?.kuerzel || 'Noten';
      const datum = new Date().toISOString().split('T')[0];
      pdf.save(`Notenbescheinigung_${kuerzel}_${datum}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      this.toast.error('PDF-Erstellung fehlgeschlagen');
    } finally {
      this.generatingPdf.set(false);
    }
  }

  getUniversityName(): string {
    return 'Hochschule für Technik und Wirtschaft';
  }

  getUniversityCity(): string {
    return 'Berlin';
  }

  getDocumentNumber(): string {
    const user = this.authService.currentUser();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const sid = (user as { studentId?: string | number })?.studentId;
    const id = sid != null ? String(sid).substring(0, 4).toUpperCase() : 'XXXX';
    return `NB-${year}${month}-${id}`;
  }

  getStudentName(): string {
    const user = this.authService.currentUser();
    return user ? `${user.vorname} ${user.nachname}` : '-';
  }

  getStudentNameReverse(): string {
    const user = this.authService.currentUser();
    return user ? `${user.nachname}, ${user.vorname}` : '-';
  }

  matrikelnummer = signal<string>('-');

  getMatrikelnummer(): string {
    return this.matrikelnummer() || '-';
  }

  private getSelectedEinschreibung() {
    return this.einschreibungen().find(e => String(e.id) === String(this.selectedEinschreibung));
  }

  getCurrentStudiengang(): string {
    const e = this.getSelectedEinschreibung();
    return e ? `${e.studiengang} (${e.kuerzel})` : '-';
  }

  getCurrentStudiengangFull(): string {
    const e = this.getSelectedEinschreibung();
    return e ? e.studiengang : '-';
  }

  getCurrentSemester(): string {
    const e = this.getSelectedEinschreibung();
    return e ? `${e.semester}. Semester` : '-';
  }

  getCurrentSemesterNumber(): string {
    const e = this.getSelectedEinschreibung();
    return e ? String(e.semester) : '-';
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getCurrentDateFull(): string {
    return new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  calculateTotalEcts(): number {
    return this.filteredNoten()
      .filter(n => n.bestanden === true)
      .reduce((sum, n) => {
        const ects = n.ects ?? this.moduleService.moduleMap().get(this.toStr(n.modulId))?.ects ?? 5;
        return sum + ects;
      }, 0);
  }

  getTotalRequiredEcts(): number {
    const e = this.getSelectedEinschreibung();
    return e?.gesamtEcts ?? 180;
  }

  getSemesterForNote(note: Note): string {
    const modul = this.moduleService.moduleMap().get(String(note.modulId));
    return modul?.semester != null ? String(modul.semester) : '-';
  }

  toStr(val: any): string {
    return val != null ? String(val) : '';
  }

  getEctsForNote(note: Note): string {
    if (note.ects != null) return String(note.ects);
    const modul = this.moduleService.moduleMap().get(this.toStr(note.modulId));
    return modul?.ects != null ? String(modul.ects) : '5';
  }

  isExcellent(noteWert: number | undefined): boolean {
    return noteWert !== undefined && noteWert <= 1.5;
  }

  async exportCsv(): Promise<void> {
    if (!this.selectedEinschreibung) {
      this.toast.warning('Keine Einschreibung ausgewählt');
      return;
    }

    try {
      // Lade die Noten und baue eine bessere CSV mit Modulnamen
      const noten = this.filteredNoten();
      
      // BOM für UTF-8 in Excel + Header
      const bom = '\uFEFF';
      let csv = bom + 'Modul_Nr;Modul_Name;Note;Versuch;Pruefungsdatum;Status;Bestanden;Kommentar\n';
      
      // Daten mit aufgelösten Modulnamen
      for (const note of noten) {
        const modulNr = this.moduleService.getModulNr(note.modulId) || '-';
        const modulName = this.moduleService.getModulName(note.modulId) || '-';
        // Note als Text formatieren, damit Excel es nicht als Datum interpretiert
        // Verwende Punkt als Dezimaltrenner mit führendem Gleichheitszeichen
        const noteWert = note.noteWert != null ? `="${note.noteWert.toFixed(1)}"` : '-';
        const versuch = note.versuch;
        const datum = this.formatDate(note.pruefungsdatum);
        const status = this.gradeService.getStatusLabel(note.status);
        let bestanden = '-';
        if (note.bestanden === true) {
          bestanden = 'Ja';
        } else if (note.bestanden === false) {
          bestanden = 'Nein';
        }
        const kommentar = (note.kommentar || '').replaceAll(';', ',');
        
        csv += `${modulNr};${modulName};${noteWert};${versuch};${datum};${status};${bestanden};${kommentar}\n`;
      }
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = globalThis.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Dateiname mit Studiengang-Info
      const einschreibung = this.getSelectedEinschreibung();
      const kuerzel = einschreibung?.kuerzel || 'noten';
      link.download = `noten_${kuerzel}_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.click();
      globalThis.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      this.toast.error('Export fehlgeschlagen');
    }
  }
}

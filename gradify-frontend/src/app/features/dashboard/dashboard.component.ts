import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CalculationService, BerechnungDto, FortschrittDto } from '../../core/services/calculation.service';
import { SystemStatusService } from '../../core/services/system-status.service';
import { ToastService } from '../../core/services/toast.service';
import { SkeletonStateComponent } from '../../shared/components/skeleton-state/skeleton-state.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';

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
          semester
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

const GET_DOZENTEN_MODULE = gql`
  query GetDozentenModule($dozentId: ID!) {
    dozentenModule(dozentId: $dozentId) {
      id
      modulNr
      name
      ects
      semester
      pruefungsform
      pruefungsdauer
      vorleistung
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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, SkeletonStateComponent, SkeletonCardComponent],
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

      <!-- Dozenten Dashboard: Work Queue + Modul-Tabelle -->
      @if (isDozent()) {
        <div class="dozent-dashboard animate-slide-up">
          <!-- Work-Queue-Header: KPI-Leiste + CTA -->
          <header class="work-queue">
            <div class="work-queue-kpis">
              <div class="kpi-tile">
                <span class="kpi-value" style="font-variant-numeric: tabular-nums;">{{ dozentKpiOffen() }}</span>
                <span class="kpi-label">Offen zur Eingabe</span>
              </div>
              <div class="kpi-tile">
                <span class="kpi-value" style="font-variant-numeric: tabular-nums;">{{ dozentKpiEntwurf() }}</span>
                <span class="kpi-label">Entwürfe</span>
              </div>
              <div class="kpi-tile">
                <span class="kpi-value" style="font-variant-numeric: tabular-nums;">{{ dozentKpiEingereicht() }}</span>
                <span class="kpi-label">Eingereicht / wartet Validierung</span>
              </div>
              <div class="kpi-tile">
                <span class="kpi-value" style="font-variant-numeric: tabular-nums;">{{ dozentKpiVeroeffentlicht() }}</span>
                <span class="kpi-label">Freigegeben (30 Tage)</span>
              </div>
            </div>
            <div class="work-queue-cta">
              <a [routerLink]="['/grades/entry']" class="btn btn--primary">Noten erfassen</a>
            </div>
          </header>

          @if (loadingDozentenModule()) {
            <app-skeleton-card [lines]="5" />
          }

          @if (!loadingDozentenModule() && dozentenModule().length > 0) {
            <div class="module-filters">
              <input type="text" class="module-search" placeholder="Modul / Code / Termin suchen…" [ngModel]="dozentModulFilter()" (ngModelChange)="setDozentModulFilter($event)">
              <div class="module-filter-chips">
                <button type="button" class="chip" [class.chip--active]="dozentStatusFilter() === 'all'" (click)="setDozentStatusFilter('all')">Alle</button>
                <button type="button" class="chip" [class.chip--active]="dozentStatusFilter() === 'offen'" (click)="setDozentStatusFilter('offen')">Offen</button>
                <button type="button" class="chip" [class.chip--active]="dozentStatusFilter() === 'entwurf'" (click)="setDozentStatusFilter('entwurf')">Entwurf</button>
                <button type="button" class="chip" [class.chip--active]="dozentStatusFilter() === 'eingereicht'" (click)="setDozentStatusFilter('eingereicht')">Eingereicht</button>
                <button type="button" class="chip" [class.chip--active]="dozentStatusFilter() === 'zurueckgewiesen'" (click)="setDozentStatusFilter('zurueckgewiesen')">Zurückgewiesen</button>
                <button type="button" class="chip" [class.chip--active]="dozentStatusFilter() === 'freigegeben'" (click)="setDozentStatusFilter('freigegeben')">Freigegeben</button>
              </div>
            </div>
            <div class="module-table-wrap card">
              <table class="module-table">
                <thead>
                  <tr>
                    <th>Modul</th>
                    <th>Semester / ECTS / Prüfungsform</th>
                    <th>Status Notenerfassung</th>
                    <th>Letzte Änderung</th>
                    <th class="module-table-actions">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  @for (modul of dozentFilteredModule(); track modul.id) {
                    <tr>
                      <td>
                        <span class="modul-code">{{ modul.modulNr }}</span>
                        <span class="modul-name">{{ modul.name }}</span>
                      </td>
                      <td class="modul-meta-cell">
                        <span>{{ modul.semester }}. Sem</span>
                        <span>·</span>
                        <span>{{ modul.ects }} ECTS</span>
                        <span>·</span>
                        <span>{{ modul.pruefungsform || '–' }}</span>
                      </td>
                      <td>
                        <span class="status-badge status-badge--{{ getModulStatusClass(modul) }}">{{ getModulStatusLabel(modul) }}</span>
                      </td>
                      <td class="modul-date-cell">{{ getModulLastChange(modul) }}</td>
                      <td class="module-table-actions">
                        <a [routerLink]="['/grades/entry']" [queryParams]="{ modulId: modul.id }" class="btn btn--primary btn--sm">Noten erfassen</a>
                        <a [routerLink]="['/grades/entry']" [queryParams]="{ modulId: modul.id }" class="btn btn--ghost btn--sm">Details</a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          @if (!loadingDozentenModule() && dozentenModule().length === 0) {
            <div class="empty-state card">
              <p>Ihnen sind aktuell keine Module zugewiesen.</p>
              <a [routerLink]="['/grades/entry']" class="btn btn--primary" style="margin-top: 1rem;">Noten erfassen</a>
            </div>
          }
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
        <app-skeleton-state [lineCount]="6" />
      }

      <!-- Loading Dashboard -->
      @if (loading() && !loadingStudents()) {
        <app-skeleton-state [lineCount]="6" />
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
        <!-- Hero (Studienfortschritt) + kleinere KPIs -->
        <div class="dashboard-top animate-slide-up">
          <div class="hero-card">
            <div class="hero-accent"></div>
            <div class="hero-main">
              <div class="hero-progress-ring" [style.--progress]="progressPercent()">
                <svg viewBox="0 0 36 36">
                  <path class="ring-bg" d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"/>
                  <path class="ring-fill" stroke-dasharray="97.4" [attr.stroke-dashoffset]="97.4 - (97.4 * progressPercent()) / 100" d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"/>
                </svg>
                <span class="hero-percent">{{ progressPercent() | number:'1.0-0' }}%</span>
              </div>
              <div class="hero-content">
                <h2 class="hero-title">Studienfortschritt</h2>
                <p class="hero-remaining">Noch <span class="hero-remaining-value">{{ ectsOffen() }}</span> ECTS offen</p>
                <p class="hero-detail">{{ ectsErreicht() }} / {{ totalEcts() }} ECTS</p>
                <div class="hero-mini">
                  <span class="hero-mini-item">Gesamtnote: {{ gesamtnote() !== null ? (gesamtnote() | number:'1.1-1') : '–' }}</span>
                  <span class="hero-mini-item">Offen: {{ offeneModule() }} Module</span>
                </div>
              </div>
              <div class="hero-right">
                <p class="hero-goal">{{ nextGoalText() }}</p>
                @if (topOpenModulesWithMeta().length > 0) {
                  <p class="hero-list-label">Top offene Module</p>
                  <ul class="hero-module-list">
                    @for (m of topOpenModulesWithMeta(); track m.name) {
                      <li class="hero-module-line"><span class="hero-module-marker" aria-hidden="true"></span><div class="hero-module-block"><span class="hero-module-name">{{ m.name }}</span><span class="hero-module-meta">{{ m.ects }} ECTS · {{ m.semester > 0 ? m.semester + '. Sem' : 'k.A.' }}</span></div></li>
                    }
                  </ul>
                }
              </div>
            </div>
          </div>
          <div class="kpi-single">
            <div class="kpi-row kpi-row--highlight">
              <span class="kpi-label">Offene Module</span>
              <span class="kpi-value">{{ offeneModule() }}</span>
            </div>
            <div class="kpi-row">
              <span class="kpi-label">Gesamtnote</span>
              <span class="kpi-value">{{ gesamtnote() !== null ? (gesamtnote() | number:'1.1-1') : '–' }}</span>
            </div>
            <div class="kpi-row">
              <span class="kpi-label">Bestanden</span>
              <span class="kpi-value">{{ bestandenCount() }}</span>
            </div>
          </div>
        </div>

        @if (offeneModule() > 0 || pendingValidierung() > 0 || lastValidatedNote() || gesamtnote() !== null) {
          <section class="section section--next animate-slide-up" style="animation-delay: 100ms">
            <h2 class="section-title">Als Nächstes</h2>
            <ul class="next-task-list">
              @if (offeneModule() > 0) {
                <li>
                  <a routerLink="/study-plan" class="next-task next-task--open">
                    <span class="next-task-badge" aria-hidden="true"></span>
                    <span class="next-task-text">{{ offeneModule() }} offene Module – priorisiert nach ECTS / Semester</span>
                    <span class="next-task-cta">Zum Studienplan</span>
                    <span class="next-task-chevron" aria-hidden="true">›</span>
                  </a>
                </li>
              }
              @if (pendingValidierung() > 0) {
                <li>
                  <a routerLink="/grades/validation" class="next-task next-task--action">
                    <span class="next-task-badge next-task-badge--orange" aria-hidden="true"></span>
                    <span class="next-task-text">Zuletzt eingetragene Note prüfen ({{ pendingValidierung() }} ausstehend)</span>
                    <span class="next-task-cta">Zur Validierung</span>
                    <span class="next-task-chevron" aria-hidden="true">›</span>
                  </a>
                </li>
              }
              @if (lastValidatedNote(); as last) {
                <li>
                  <a routerLink="/grades" class="next-task next-task--validated">
                    <span class="next-task-badge next-task-badge--blue" aria-hidden="true"></span>
                    <span class="next-task-text">Zuletzt validiert: {{ last.modulName }}</span>
                    <span class="next-task-cta">Eintrag öffnen</span>
                    <span class="next-task-chevron" aria-hidden="true">›</span>
                  </a>
                </li>
              }
              @if (gesamtnote() !== null) {
                <li>
                  <a routerLink="/grades" class="next-task next-task--info">
                    <span class="next-task-badge next-task-badge--neutral" aria-hidden="true"></span>
                    <span class="next-task-heading"><span class="next-task-title">Ø Note aktuell</span><span class="next-task-value">{{ gesamtnote() | number:'1.1-1' }}</span></span>
                    <span class="next-task-cta">Notenverlauf</span>
                    <span class="next-task-chevron" aria-hidden="true">›</span>
                  </a>
                </li>
              }
            </ul>
          </section>
        }

        <!-- Recent Grades -->
        <section class="section section--grades animate-slide-up" style="animation-delay: 150ms">
          <div class="section-header">
            <h2 class="section-title">Letzte Noten</h2>
            <a routerLink="/grades" class="btn btn--secondary btn--sm">Alle Noten</a>
          </div>

          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Modul</th>
                  <th>Datum</th>
                  <th class="th-note">Note</th>
                  <th>Status</th>
                  <th class="th-action"></th>
                </tr>
              </thead>
              <tbody>
                @for (note of recentNoten(); track note.id) {
                  <tr class="table-row-clickable" (click)="navigateToGrades()">
                    <td>
                      <div class="module-info">
                        <span class="module-name">{{ getModulName(note.modulId) }}</span>
                        <span class="module-code">{{ getModulNr(note.modulId) }}</span>
                      </div>
                    </td>
                    <td class="td-date">{{ formatDate(note.pruefungsdatum) }}</td>
                    <td class="td-note">
                      <span class="grade grade--{{ getNoteColor(note.noteWert) }}">
                        {{ formatNote(note.noteWert) }}
                      </span>
                    </td>
                    <td>
                      <span class="badge badge--{{ getStatusColor(note.status) }}">
                        {{ getStatusLabel(note.status) }}
                      </span>
                    </td>
                    <td class="td-action">
                      <span class="table-row-arrow" aria-hidden="true">→</span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="empty-cell">Noch keine Noten vorhanden</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
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
      margin-bottom: 24px;
    }

    .page-header h1 {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: 2rem;
      font-weight: 700;
    }

    .page-subtitle {
      color: var(--text-muted);
      margin: 0;
      font-size: var(--font-size-sm);
    }

    /* Spacing-Rhythmus: 8/12/16/24/32 */
    .dashboard-top {
      display: grid;
      grid-template-columns: 1fr 200px;
      gap: 24px;
      align-items: stretch;
      margin-bottom: 16px;
    }
    @media (max-width: 900px) {
      .dashboard-top {
        grid-template-columns: 1fr;
      }
      .kpi-single {
        flex-direction: row;
        flex-wrap: wrap;
      }
      .kpi-row {
        flex: 1;
        min-width: 100px;
      }
      .kpi-row--highlight {
        border-left: none;
        border-top: 3px solid rgba(249, 115, 22, 0.5);
      }
    }
    @media (max-width: 640px) {
      .hero-main {
        flex-wrap: wrap;
      }
      .hero-right {
        width: 100%;
        padding-left: 0;
        padding-top: 16px;
        margin-top: 16px;
        border-left: none;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
    }

    .hero-card {
      position: relative;
      background: var(--bg-surface);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: none;
    }
    .hero-accent {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, rgba(249, 115, 22, 0.08), rgba(234, 88, 12, 0.04));
      opacity: 1;
    }
    .hero-main {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 12px 20px;
    }
    .hero-progress-ring {
      position: relative;
      width: 100px;
      height: 100px;
      flex-shrink: 0;
    }
    .hero-progress-ring svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .hero-progress-ring .ring-bg {
      fill: none;
      stroke: rgba(255, 255, 255, 0.08);
      stroke-width: 3;
    }
    .hero-progress-ring .ring-fill {
      fill: none;
      stroke: rgba(249, 115, 22, 0.85);
      stroke-width: 3;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.5s ease;
    }
    .hero-percent {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text-primary);
    }
    .hero-content {
      flex: 1;
      min-width: 0;
    }
    .hero-title {
      font-size: 1.2rem;
      font-weight: 600;
      margin: 0 0 2px 0;
      color: var(--text-primary);
    }
    .hero-remaining {
      font-size: var(--font-size-md);
      color: var(--text-muted);
      margin: 0 0 2px 0;
    }
    .hero-remaining-value {
      font-weight: 700;
      font-size: 1.2rem;
      font-variant-numeric: tabular-nums;
      color: var(--text-primary);
    }
    .hero-detail {
      font-size: var(--font-size-sm);
      font-variant-numeric: tabular-nums;
      color: var(--text-muted);
      margin: 0 0 6px 0;
    }
    .hero-mini {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }
    .hero-mini-item {
      padding-right: var(--spacing-sm);
      border-right: 1px solid rgba(255, 255, 255, 0.1);
    }
    .hero-mini-item:last-child {
      border-right: none;
      padding-right: 0;
    }
    .hero-right {
      min-width: 0;
      width: 200px;
      padding: 16px 16px 16px 20px;
      margin-left: 20px;
      background: rgba(0, 0, 0, 0.18);
      border-radius: 0 14px 14px 0;
    }
    .hero-goal {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--text-secondary);
      margin: 0 0 12px 0;
      line-height: 1.4;
    }
    .hero-list-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-primary);
      margin: 0 0 8px 0;
    }
    .hero-module-list {
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: var(--font-size-sm);
      line-height: 1.6;
    }
    .hero-module-line {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 10px;
    }
    .hero-module-line:last-child {
      margin-bottom: 0;
    }
    .hero-module-marker {
      flex-shrink: 0;
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
      margin-top: 7px;
    }
    .hero-module-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .hero-module-name {
      font-weight: 700;
      font-size: var(--font-size-sm);
      color: var(--text-primary);
      line-height: 1.3;
    }
    .hero-module-meta {
      display: block;
      color: var(--text-muted);
      font-size: 11px;
      line-height: 1.3;
    }

    /* KPI: eine Card, gleiche Höhe wie Hero, drei Zeilen teilen sich die Höhe gleichmäßig */
    .kpi-single {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 160px;
      background: var(--bg-surface);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: none;
    }
    .kpi-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex: 1;
      min-height: 52px;
      padding: 12px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      box-sizing: border-box;
    }
    .kpi-row:last-child {
      border-bottom: none;
    }
    .kpi-row--highlight {
      background: rgba(249, 115, 22, 0.06);
      border-left: 3px solid rgba(249, 115, 22, 0.5);
    }
    .kpi-single .kpi-label {
      font-size: 10px;
      margin: 0;
      white-space: nowrap;
    }
    .kpi-row--highlight .kpi-label {
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .kpi-row:not(.kpi-row--highlight) .kpi-label {
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .kpi-single .kpi-value {
      font-size: 1.3rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      text-align: right;
      min-width: 3ch;
      flex-shrink: 0;
      margin-left: auto;
    }
    .kpi-row:not(.kpi-row--highlight) .kpi-value {
      color: var(--text-secondary);
    }

    /* Als Nächstes – ganze Zeile klickbar, Buttons sekundär */
    .section--next {
      margin-bottom: 24px;
    }
    .section--next .section-title {
      margin-bottom: 6px;
    }
    .next-task-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .next-task {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      text-decoration: none;
      color: inherit;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
    }
    .next-task:focus-visible {
      outline: 2px solid rgba(249, 115, 22, 0.5);
      outline-offset: 2px;
    }
    .next-task:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(249, 115, 22, 0.35);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }
    .next-task-chevron {
      flex-shrink: 0;
      font-size: 1.15rem;
      font-weight: 600;
      color: rgba(249, 115, 22, 0.9);
      opacity: 0;
      transform: translateX(-6px);
      transition: opacity 0.2s, transform 0.2s;
    }
    .next-task:hover .next-task-chevron {
      opacity: 1;
      transform: translateX(0);
    }
    .next-task-badge {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--text-muted);
    }
    .next-task-badge--orange {
      background: #F97316;
    }
    .next-task-badge--blue {
      background: #3B82F6;
    }
    .next-task-badge--neutral {
      background: var(--text-secondary);
    }
    .next-task--open .next-task-badge:not([class*="--"]) {
      background: #F97316;
    }
    .next-task-text {
      flex: 1;
      min-width: 0;
      font-size: var(--font-size-sm);
      color: var(--text-primary);
    }
    .next-task-heading {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: baseline;
      gap: 12px;
    }
    .next-task-title {
      font-weight: 600;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }
    .next-task-value {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text-primary);
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      font-size: var(--font-size-sm);
    }
    .next-task-cta {
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-secondary);
      padding: 5px 12px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.18);
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .next-task:hover .next-task-cta {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(249, 115, 22, 0.5);
    }

    /* Dozent: Work Queue + Module-Tabelle */
    .dozent-dashboard {
      max-width: 100%;
      margin: 0 auto;
    }

    .work-queue {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-xl);
      padding-bottom: var(--spacing-lg);
      border-bottom: 1px solid var(--border-color);
    }

    .work-queue-kpis {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-md);
    }

    .kpi-tile {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      min-width: 120px;
    }

    .kpi-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .kpi-label {
      font-size: 0.7rem;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .work-queue-cta .btn { flex-shrink: 0; }

    .module-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-md);
    }
    .module-search {
      flex: 1;
      min-width: 200px;
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: 0.9rem;
    }
    .module-search::placeholder { color: var(--text-muted); }
    .module-filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }
    .module-filter-chips .chip {
      padding: 6px 12px;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }
    .module-filter-chips .chip:hover { background: var(--bg-hover); color: var(--text-primary); }
    .module-filter-chips .chip--active {
      background: rgba(249, 115, 22, 0.15);
      border-color: rgba(249, 115, 22, 0.4);
      color: #F97316;
    }

    .module-table-wrap {
      overflow-x: auto;
      padding: 0;
    }

    .module-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    .module-table th {
      text-align: left;
      padding: var(--spacing-sm) var(--spacing-md);
      font-weight: 600;
      color: var(--text-muted);
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid var(--border-color);
    }

    .module-table td {
      padding: var(--spacing-sm) var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
    }

    .module-table tbody tr:hover {
      background: var(--bg-hover);
    }

    .module-table-actions {
      white-space: nowrap;
    }

    .module-table-actions .btn { margin-right: var(--spacing-xs); }

    .modul-code {
      display: block;
      font-weight: 600;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }

    .modul-name {
      display: block;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .modul-meta-cell {
      font-variant-numeric: tabular-nums;
      color: var(--text-secondary);
    }

    .modul-meta-cell span + span { margin-left: 6px; }

    .modul-date-cell { font-variant-numeric: tabular-nums; color: var(--text-muted); }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 0.7rem;
      font-weight: 500;
    }

    .status-badge--entwurf {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-secondary);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .status-badge--validiert {
      background: rgba(59, 130, 246, 0.15);
      color: #3B82F6;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .status-badge--freigegeben {
      background: rgba(34, 197, 94, 0.15);
      color: #22C55E;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .btn--ghost {
      background: transparent;
      border-color: transparent;
      color: var(--text-secondary);
    }

    .btn--ghost:hover { color: var(--text-primary); background: var(--bg-hover); }

    .btn--sm { padding: 6px 12px; font-size: 0.8rem; }

    .empty-state {
      text-align: center;
      padding: var(--spacing-2xl);
      color: var(--text-muted);
    }

    .detail-row {
      display: flex;
      gap: var(--spacing-sm);
      font-size: 0.9375rem;
    }

    .detail-label {
      color: var(--text-muted);
      min-width: 120px;
    }

    .detail-value {
      color: var(--text-primary);
    }

    .detail-value-muted {
      color: var(--text-muted);
    }

    .modul-header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);
    }

    .btn-toggle {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-hover);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-toggle:hover {
      background: var(--bg-elevated);
      border-color: var(--text-secondary);
      color: var(--text-primary);
    }

    .btn-toggle svg {
      width: 16px;
      height: 16px;
      transition: transform 0.3s;
    }

    .modul-meta {
      display: flex;
      gap: var(--spacing-sm);
      flex-wrap: wrap;
      margin-bottom: var(--spacing-md);
      padding-bottom: var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
    }

    .meta-badge {
      padding: 4px 8px;
      background: var(--bg-elevated);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .meta-text {
      padding: 4px 8px;
      color: var(--text-muted);
      font-size: 0.75rem;
    }

    .notenerfassung-section {
      margin-top: var(--spacing-lg);
      padding-top: var(--spacing-lg);
    }

    .loading-students {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      justify-content: center;
      padding: var(--spacing-xl);
    }

    .spinner, .spinner-tiny {
      border: 2px solid var(--border-color);
      border-top-color: var(--text-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner {
      width: 20px;
      height: 20px;
    }

    .spinner-tiny {
      width: 14px;
      height: 14px;
    }

    .noten-table-container {
      overflow-x: auto;
      background: rgba(11, 14, 20, 0.5);
      border-radius: var(--radius-md);
      padding: var(--spacing-sm);
    }

    .noten-table {
      width: 100%;
      border-collapse: collapse;
    }

    .noten-table th,
    .noten-table td {
      padding: var(--spacing-sm) var(--spacing-md);
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    .noten-table th {
      font-weight: 600;
      color: var(--text-muted);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--bg-hover);
    }

    .noten-table tbody tr:hover {
      background: var(--bg-hover);
    }

    .note-input, .versuch-select, .date-input {
      padding: 4px 8px;
      background: var(--bg-deep);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 0.875rem;
    }

    .note-input {
      width: 70px;
      text-align: center;
      font-weight: 600;
    }

    .note-input:focus, .versuch-select:focus, .date-input:focus {
      outline: none;
      border-color: var(--text-secondary);
    }

    .versuch-select {
      width: 50px;
    }

    .date-input {
      width: 130px;
    }

    .checkbox {
      width: 18px;
      height: 18px;
    }

    .btn-save {
      padding: 6px;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-save:hover:not(:disabled) {
      border-color: var(--text-secondary);
      color: var(--text-primary);
    }

    .btn-save.has-changes {
      border-color: #22C55E;
      color: #22C55E;
      background: rgba(34, 197, 94, 0.05);
    }

    .btn-save:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-save svg {
      width: 16px;
      height: 16px;
    }

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
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
    }

    .stat-icon--success {
      background: rgba(34, 197, 94, 0.15);
      color: #22C55E;
    }

    .stat-icon--secondary {
      background: rgba(148, 163, 184, 0.15);
      color: #94A3B8;
    }

    .stat-icon--warning {
      background: rgba(234, 88, 12, 0.25);
      color: #F97316;
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
      opacity: 0.7;
      cursor: help;
      transition: opacity 0.2s ease;
    }

    .stat-verified-icon:hover {
      opacity: 1;
    }

    .stat-verified-icon--service {
      color: #22C55E;
    }

    .stat-verified-icon--fallback {
      color: var(--color-warning);
    }

    .stat-verified-icon--pending {
      color: var(--text-secondary);
    }

    /* Tooltip */
    .tooltip-container {
      position: relative;
    }

    .tooltip-text {
      visibility: hidden;
      opacity: 0;
      position: absolute;
      bottom: 130%;
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-deep);
      color: var(--text-primary);
      padding: 8px 12px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      font-size: var(--font-size-xs);
      font-weight: 400;
      white-space: nowrap;
      z-index: 100;
      transition: opacity 0.2s ease, visibility 0.2s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .tooltip-text::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-width: 6px;
      border-style: solid;
      border-color: var(--border-color) transparent transparent transparent;
    }

    .tooltip-container:hover .tooltip-text {
      visibility: visible;
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
      background: linear-gradient(90deg, #CBD5E1, #E2E8F0);
      border-radius: var(--radius-full);
      transition: width 0.5s ease;
    }

    /* Section – einheitlicher Abstand 24px */
    .section {
      margin-bottom: 24px;
    }
    .section:last-child {
      margin-bottom: 0;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-header h2 {
      font-size: var(--font-size-lg);
      margin: 0;
    }

    /* Table */
    .table-container {
      background: var(--bg-surface);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      overflow: hidden;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
    }

    .table th {
      padding: 12px 16px;
      text-align: left;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      font-size: var(--font-size-xs);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-primary);
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border-color);
    }

    .table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .table tr:last-child td {
      border-bottom: none;
    }
    .table th.th-note,
    .table td.td-note {
      text-align: right;
    }
    .table .td-date {
      font-variant-numeric: tabular-nums;
    }
    .table-row-clickable {
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .table-row-clickable:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .table tr:hover {
      background: var(--bg-hover);
    }
    .th-action, .td-action {
      width: 40px;
      text-align: right;
      padding-right: 16px;
    }
    .table-row-arrow {
      opacity: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
      transition: opacity 0.15s, transform 0.15s;
    }
    .table-row-clickable:hover .table-row-arrow {
      opacity: 1;
      transform: translateX(2px);
      color: rgba(249, 115, 22, 0.9);
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
      min-width: 2.8em;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
      font-size: var(--font-size-xs);
      font-variant-numeric: tabular-nums;
      text-align: center;
    }

    .grade--success { background: rgba(34, 197, 94, 0.15); color: #22C55E; }
    .grade--info { background: rgba(255, 255, 255, 0.1); color: var(--text-primary); }
    .grade--warning { background: rgba(255, 184, 0, 0.15); color: var(--color-warning); }
    .grade--danger { background: rgba(255, 0, 85, 0.15); color: var(--color-danger); }
    .grade--muted { background: var(--bg-hover); color: var(--text-muted); }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 500;
    }
    .th-sort {
      white-space: nowrap;
    }
    .sort-icon {
      opacity: 0.25;
      font-size: 10px;
      margin-left: 4px;
      font-weight: normal;
    }
    .th-sort--active .sort-icon {
      opacity: 0.7;
      color: rgba(249, 115, 22, 0.9);
    }

    .badge--success { background: rgba(34, 197, 94, 0.15); color: #22C55E; }
    .badge--warning { background: rgba(255, 184, 0, 0.15); color: var(--color-warning); }
    .badge--info { background: rgba(59, 130, 246, 0.15); color: #3B82F6; }
    .badge--open { background: rgba(249, 115, 22, 0.15); color: #F97316; }
    .badge--muted { background: rgba(255, 255, 255, 0.08); color: var(--text-muted); }

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
      border-color: var(--text-secondary);
      transform: translateY(-2px);
    }

    .quick-icon {
      color: var(--text-secondary);
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
  protected readonly authService = inject(AuthService);
  
  selectedStudent = '';
  selectedEinschreibung = '';
  
  loadingStudents = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  dataLoaded = signal(false);
  
  // Role-based visibility
  isStudent = computed(() => this.authService.isStudent());
  isDozent = computed(() => this.authService.isDozent());
  canSelectStudent = computed(() => !this.isStudent() && !this.isDozent());
  
  // Data
  students = signal<StudentOption[]>([]);
  einschreibungen = signal<EinschreibungOption[]>([]);
  einschreibung = signal<any>(null);
  noten = signal<any[]>([]);
  module = signal<any[]>([]);
  berechnung = signal<BerechnungDto | null>(null);
  fortschritt = signal<FortschrittDto | null>(null);
  
  // Dozenten Data
  dozentenModule = signal<any[]>([]);
  loadingDozentenModule = signal(false);
  expandedModul = signal<string | null>(null);
  studentsForModul = signal<any[]>([]);
  loadingStudentsForModul = signal(false);
  dozentModulFilter = signal('');
  dozentStatusFilter = signal<'all' | 'offen' | 'entwurf' | 'eingereicht' | 'zurueckgewiesen' | 'freigegeben'>('all');

  /** Gefilterte Modulliste für Dozent (Suche + Status-Chip) */
  dozentFilteredModule = computed(() => {
    const list = this.dozentenModule();
    const q = (this.dozentModulFilter() || '').trim().toLowerCase();
    const status = this.dozentStatusFilter();
    let out = list;
    if (q) {
      out = out.filter(m =>
        (String(m.modulNr ?? '') + String(m.name ?? '')).toLowerCase().includes(q)
      );
    }
    if (status !== 'all') {
      const modulStatus = (m: any) => this.getModulStatusClass(m);
      out = out.filter(m => modulStatus(m) === status || (status === 'offen' && modulStatus(m) === 'entwurf'));
    }
    return out;
  });

  /** Work-Queue KPIs für Dozent (Platzhalter bis Backend-Aggregation) */
  dozentKpiOffen = computed(() => this.dozentenModule().length > 0 ? this.dozentenModule().length : 0);
  dozentKpiEntwurf = computed(() => 0);
  dozentKpiEingereicht = computed(() => 0);
  dozentKpiVeroeffentlicht = computed(() => 0);

  setDozentModulFilter(v: string): void { this.dozentModulFilter.set(v); }
  setDozentStatusFilter(v: 'all' | 'offen' | 'entwurf' | 'eingereicht' | 'zurueckgewiesen' | 'freigegeben'): void { this.dozentStatusFilter.set(v); }
  
  // Computed
  studiengangName = computed(() => {
    const e = this.einschreibung();
    return e?.studiengang?.name ? `${e.studiengang.name} (${e.studiengang.kuerzel})` : null;
  });
  
  currentSemester = computed(() => this.einschreibung()?.aktuellesSemester || 1);
  totalEcts = computed(() => this.einschreibung()?.studiengang?.gesamtEcts || 0);
  
  // Berechnungsdaten vom Service oder Fallback-Berechnung
  gesamtnote = computed(() => {
    // Versuche zuerst vom Berechnungsservice
    const berechnung = this.berechnung();
    
    if (berechnung?.gesamtnote !== null && berechnung?.gesamtnote !== undefined) {
      return berechnung.gesamtnote;
    }
    
    // Fallback: Durchschnitt aus bestandenen Noten berechnen
    const bestandeneNoten = this.noten().filter(n => 
      (n.bestanden === true || n.status === 'FREIGEGEBEN' || n.status === 'VALIDIERT') &&
      n.noteWert !== null && n.noteWert !== undefined
    );
    
    if (bestandeneNoten.length === 0) {
      return null;
    }
    
    const summe = bestandeneNoten.reduce((sum, n) => sum + n.noteWert, 0);
    const durchschnitt = summe / bestandeneNoten.length;
    return Math.round(durchschnitt * 10) / 10; // Auf 1 Dezimalstelle runden
  });
  
  // Flag ob Service erreichbar war (unabhängig davon ob Gesamtnote berechnet wurde)
  berechnungServiceErreichbar = computed(() => {
    const berechnung = this.berechnung();
    // Service ist erreichbar wenn wir ein Berechnung-Objekt haben
    return berechnung !== null;
  });

  // Flag ob Gesamtnote vom Service kommt (nicht vom Fallback)
  gesamtnoteVomService = computed(() => {
    const berechnung = this.berechnung();
    const vomService = berechnung?.gesamtnote !== null && berechnung?.gesamtnote !== undefined;
    return vomService;
  });

  // gRPC für Berechnung OK (Noten + Studiengang) – zeigt grünen Haken wenn Gesamtnote existiert
  grpcBerechnungOk = signal(false);
  
  bestandenCount = computed(() => {
    const f = this.fortschritt();
    if (f && f.moduleBestanden > 0) return f.moduleBestanden;
    // Fallback: aus Noten berechnen
    const bestandeneNoten = this.noten().filter(n => {
      return n.bestanden === true || n.status === 'FREIGEGEBEN' || n.status === 'VALIDIERT';
    });
    return bestandeneNoten.length;
  });
  
  ectsErreicht = computed(() => {
    const f = this.fortschritt();
    if (f && f.ectsErreicht > 0) return f.ectsErreicht;
    // Fallback: aus Noten berechnen
    const bestandeneNoten = this.noten().filter(n => 
      n.bestanden === true || n.status === 'FREIGEGEBEN' || n.status === 'VALIDIERT'
    );
    const bestandeneModulIds = new Set(
      bestandeneNoten.map(n => String(n.modulId))
    );
    const moduleList = this.module();
    const ects = moduleList
      .filter(m => bestandeneModulIds.has(String(m.id)))
      .reduce((sum, m) => sum + (m.ects || 0), 0);
    return ects;
  });
  
  offeneModule = computed(() => {
    // Immer aus Modulen berechnen, da Service-Daten oft unvollständig
    const moduleList = this.module();
    if (moduleList.length === 0) {
      // Kein Fallback möglich, prüfe Service
      const f = this.fortschritt();
      if (f && f.moduleOffen > 0) return f.moduleOffen;
      return 0;
    }
    
    const bestandeneNoten = this.noten().filter(n => 
      n.bestanden === true || n.status === 'FREIGEGEBEN' || n.status === 'VALIDIERT'
    );
    const bestandeneModulIds = new Set(
      bestandeneNoten.map(n => String(n.modulId))
    );
    return moduleList.filter(m => !bestandeneModulIds.has(String(m.id))).length;
  });
  
  progressPercent = computed(() => {
    // Immer aus ECTS berechnen für konsistente Anzeige
    const total = this.totalEcts();
    const erreicht = this.ectsErreicht();
    if (total === 0) return 0;
    return (erreicht / total) * 100;
  });

  ectsOffen = computed(() => Math.max(0, this.totalEcts() - this.ectsErreicht()));

  pendingValidierung = computed(() =>
    this.noten().filter(n => n.status === 'ERFASST' || n.status === 'EINGEREICHT').length
  );
  
  recentNoten = computed(() => {
    return [...this.noten()]
      .sort((a, b) => new Date(b.pruefungsdatum).getTime() - new Date(a.pruefungsdatum).getTime())
      .slice(0, 5);
  });

  /** Zuletzt validierte Note (für „Als Nächstes“) */
  lastValidatedNote = computed(() => {
    const list = [...this.noten()]
      .filter(n => n.status === 'VALIDIERT' || n.status === 'FREIGEGEBEN')
      .sort((a, b) => new Date(b.pruefungsdatum).getTime() - new Date(a.pruefungsdatum).getTime());
    if (list.length === 0) return null;
    const n = list[0];
    return { modulName: this.getModulName(n.modulId) };
  });

  /** Top 2 offene Module mit ECTS/Semester für Hero-Mini-Liste */
  topOpenModulesWithMeta = computed(() => {
    const bestandeneModulIds = new Set(
      this.noten()
        .filter(n => n.bestanden === true || n.status === 'FREIGEGEBEN' || n.status === 'VALIDIERT')
        .map(n => String(n.modulId))
    );
    return this.module()
      .filter(m => !bestandeneModulIds.has(String(m.id)))
      .filter(m => {
        const raw = ((m.bezeichnung || m.name || m.modulNr) as string) || '';
        const t = raw.trim();
        return t.length > 0 && t !== '|';
      })
      .sort((a, b) => (a.semester || 99) - (b.semester || 99) || (b.ects || 0) - (a.ects || 0))
      .slice(0, 2)
      .map(m => {
        const name = (m.bezeichnung || m.name || m.modulNr || 'Modul') as string;
        return {
          name: name.length > 24 ? name.substring(0, 24) + '…' : name,
          ects: m.ects ?? 0,
          semester: m.semester ?? 0
        };
      });
  });

  /** Nächstes Ziel: z. B. „6. Semester abschließen“ */
  nextGoalText = computed(() => {
    const sem = this.currentSemester();
    const next = sem + 1;
    return `Nächstes Ziel: ${next}. Semester abschließen`;
  });

  private readonly calculationService = inject(CalculationService);
  private readonly systemStatusService = inject(SystemStatusService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  
  constructor(private readonly apollo: Apollo) {}

  ngOnInit(): void {
    if (this.isStudent()) {
      // Studenten sehen nur ihre eigenen Daten
      this.loadOwnData();
    } else if (this.isDozent()) {
      // Dozenten sehen ihre Module
      this.loadDozentenModuleData();
    } else {
      // Admins/Prüfungsamt können Studenten auswählen
      this.loadStudents();
    }
  }

  async loadDozentenModuleData(): Promise<void> {
    this.loadingDozentenModule.set(true);
    
    try {
      const dozentId = this.authService.currentUser()?.id;
      if (!dozentId) return;

      const result = await firstValueFrom(this.apollo.query<{ dozentenModule: any[] }>({
        query: GET_DOZENTEN_MODULE,
        variables: { dozentId },
        fetchPolicy: 'network-only'
      }));

      this.dozentenModule.set(result.data?.dozentenModule || []);

    } catch (error) {
      console.error('Error loading dozenten module:', error);
    } finally {
      this.loadingDozentenModule.set(false);
    }
  }

  /** Status-Badge-Klasse pro Modul (Entwurf / Validiert / Freigegeben) – erweiterbar mit Backend */
  getModulStatusClass(modul: any): string {
    return (modul?.noteStatus as string)?.toLowerCase() === 'freigegeben' ? 'freigegeben' :
      (modul?.noteStatus as string)?.toLowerCase() === 'validiert' ? 'validiert' : 'entwurf';
  }

  getModulStatusLabel(modul: any): string {
    const s = (modul?.noteStatus as string)?.toUpperCase();
    if (s === 'FREIGEGEBEN') return 'Freigegeben';
    if (s === 'VALIDIERT') return 'Validiert';
    if (s === 'ERFASST') return 'Entwurf';
    return 'Entwurf';
  }

  getModulLastChange(modul: any): string {
    return modul?.lastChangeDate ? new Date(modul.lastChangeDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
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

    // Lade Hauptdaten (Einschreibung und Noten)
    Promise.all([
      firstValueFrom(einschreibungQuery).catch(err => {
        console.error('Einschreibung Query Error:', err);
        return { data: null, errors: [{ message: err.message || 'Unbekannter Fehler' }] };
      }),
      firstValueFrom(notenQuery).catch(err => {
        console.error('Noten Query Error:', err);
        return { data: { notenByStudent: [], durchschnittsnote: null }, errors: [] };
      })
    ]).then(([einschreibungResult, notenResult]) => {
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
      
      // Module aus Prüfungsordnung laden
      const moduleList = einschreibungData.pruefungsordnung?.module || [];
      this.module.set(moduleList);
      
      // Noten laden
      const notenList = notenResult?.data?.notenByStudent || [];
      this.noten.set(notenList);
      
      // Lade Berechnungsdaten vom Berechnungs-Service (optional - im Hintergrund)
      this.loadBerechnungsdaten(einschreibungData);
      // gRPC-Status prüfen (für grünen Haken bei Gesamtnote)
      this.systemStatusService.getBerechnungGrpcStatus().subscribe(res => {
        this.grpcBerechnungOk.set(res?.data?.allAvailable ?? false);
      });
      
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

  navigateToGrades(): void {
    this.router.navigate(['/grades']);
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
      'EINGEREICHT': 'Eingereicht',
      'VALIDIERT': 'Validiert',
      'FREIGEGEBEN': 'Bestanden'
    };
    return labels[status] || status;
  }

  /** Status-System: Grün = bestanden, Blau = validiert, Orange = offen/Handlungsbedarf */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'ERFASST': 'open',
      'EINGEREICHT': 'open',
      'VALIDIERT': 'info',
      'FREIGEGEBEN': 'success'
    };
    return colors[status] || 'info';
  }

  /**
   * Lädt Berechnungsdaten vom Berechnungs-Service (optional, im Hintergrund).
   * Das Dashboard funktioniert auch ohne diese Daten.
   */
  private loadBerechnungsdaten(einschreibungData: any): void {
    // poId aus Einschreibung oder Prüfungsordnung – erforderlich für gRPC-Berechnung
    const poId = String(einschreibungData.poId ?? einschreibungData.pruefungsordnung?.id ?? '');
    const ectsGesamt = einschreibungData.studiengang?.gesamtEcts || 180;
    
    console.log('loadBerechnungsdaten - poId:', poId, 'ectsGesamt:', ectsGesamt);
    
    // POST berechnen ist nur für PRUEFUNGSAMT und ADMIN erlaubt
    const canTriggerBerechnung = this.authService.hasRole('PRUEFUNGSAMT') || this.authService.hasRole('ADMIN');
    
    if (poId && canTriggerBerechnung) {
      this.triggerNeuberechnung(poId, ectsGesamt);
    } else {
      // Ohne poId oder ohne Berechtigung: nur vorhandene Berechnung laden (GET)
      this.calculationService.getGesamtnote(this.selectedEinschreibung).subscribe({
        next: (result) => {
          if (result.success && result.data) {
            this.berechnung.set(result.data);
          }
        },
        error: () => {}
      });
    }

    // Lade Fortschritt
    this.calculationService.getFortschritt(this.selectedEinschreibung).subscribe({
      next: (result) => {
        if (result.success && result.data) {
          console.log('Loaded fortschritt:', result.data);
          this.fortschritt.set(result.data);
        }
      },
      error: (err) => {
        console.warn('Fortschritt Service nicht verfügbar:', err);
        // Nicht kritisch, Dashboard funktioniert auch ohne
      }
    });
  }

  /**
   * Triggert eine Neuberechnung der Gesamtnote.
   */
  private triggerNeuberechnung(poId: string, ectsGesamt: number): void {
    console.log('=== TRIGGER NEUBERECHNUNG ===');
    console.log('Einschreibung:', this.selectedEinschreibung);
    console.log('PO-ID:', poId);
    console.log('ECTS Gesamt:', ectsGesamt);
    
    this.calculationService.berechneGesamtnote(this.selectedEinschreibung, poId, ectsGesamt)
      .subscribe({
        next: (result) => {
          console.log('Neuberechnung Response:', result);
          if (result.success && result.data) {
            console.log('Neuberechnung erfolgreich - Gesamtnote:', result.data.gesamtnote);
            this.berechnung.set(result.data);
            // Lade auch Fortschritt neu
            this.calculationService.getFortschritt(this.selectedEinschreibung).subscribe({
              next: (fortschrittResult) => {
                if (fortschrittResult.success && fortschrittResult.data) {
                  console.log('Fortschritt aktualisiert:', fortschrittResult.data);
                  this.fortschritt.set(fortschrittResult.data);
                }
              },
              error: (err) => console.warn('Fortschritt nach Neuberechnung nicht verfügbar:', err)
            });
          } else {
            console.warn('Neuberechnung: Kein Ergebnis in Response', result);
          }
        },
        error: (err) => {
          console.error('Neuberechnung FEHLER:', err);
          console.error('Status:', err.status, 'Message:', err.message);
          // Dashboard funktioniert trotzdem mit Fallback-Berechnung
        }
      });
  }

  // ==================== DOZENTEN: NOTENERFASSUNG ====================

  toggleModul(modulId: string): void {
    if (this.expandedModul() === modulId) {
      this.expandedModul.set(null);
      this.studentsForModul.set([]);
    } else {
      this.expandedModul.set(modulId);
      this.loadStudentsForModulData(modulId);
    }
  }

  async loadStudentsForModulData(modulId: string): Promise<void> {
    this.loadingStudentsForModul.set(true);

    try {
      // Query für alle Einschreibungen
      const ALL_EINSCHREIBUNGEN = gql`
        query GetAllEinschreibungenForModul {
          einschreibungen {
            id
            studentId
            aktuellesSemester
          }
        }
      `;

      // Parallel laden
      const [studentsResult, einschreibungenResult, notenResponse] = await Promise.all([
        firstValueFrom(this.apollo.query<{ students: any[] }>({
          query: GET_STUDENTS_QUERY,
          context: { clientName: 'user' },
          fetchPolicy: 'network-only'
        })),
        firstValueFrom(this.apollo.query<{ einschreibungen: any[] }>({
          query: ALL_EINSCHREIBUNGEN,
          fetchPolicy: 'network-only'
        })),
        firstValueFrom(this.http.get<any>('/api/noten', {
          params: { modulId }
        }))
      ]);

      const allStudents = studentsResult.data?.students || [];
      const allEinschreibungen = einschreibungenResult.data?.einschreibungen || [];
      const existingNotes = notenResponse?.data || [];

      // Maps erstellen (String-Keys für GraphQL/REST-Kompatibilität)
      const studentMap = new Map(allStudents.map((s: any) => [String(s.id), s]));
      const einschreibungMap = new Map(allEinschreibungen.map((e: any) => [String(e.id), e]));
      const noteMap = new Map(existingNotes.map((n: any) => [String(n.einschreibungId ?? ''), n]));

      // Alle Einschreibungen durchgehen
      const studentsWithGrades = allEinschreibungen
        .filter((e: any) => e.studentId)
        .map((e: any) => {
          const student = studentMap.get(String(e.studentId ?? ''));
          if (!student) return null;

          const existingNote: any = noteMap.get(String(e.id ?? ''));

          return {
            ...student,
            einschreibungId: e.id,
            semester: e.aktuellesSemester,
            noteId: existingNote?.id,
            noteWert: existingNote?.noteWert || null,
            bestanden: existingNote?.bestanden || false,
            versuch: existingNote?.versuch || 1,
            pruefungsdatum: existingNote?.pruefungsdatum || this.getTodayString(),
            bemerkung: existingNote?.bemerkung || '',
            status: existingNote?.status || 'ERFASST',
            modulId,
            saving: false,
            changed: false
          };
        })
        .filter((s: any) => s !== null);

      this.studentsForModul.set(studentsWithGrades);

    } catch (error) {
      console.error('Error loading students for modul:', error);
    } finally {
      this.loadingStudentsForModul.set(false);
    }
  }

  markChanged(student: any): void {
    student.changed = true;
    // Re-assign array to trigger change detection
    this.studentsForModul.set([...this.studentsForModul()]);
  }

  private static readonly VALID_NOTEN = [1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 5.0];

  normalizeNoteValue(student: any): void {
    if (student.noteWert == null) return;
    const n = Number(student.noteWert);
    if (Number.isNaN(n)) return;
    const match = DashboardComponent.VALID_NOTEN.find((v: number) => Math.abs(v - n) < 0.01);
    if (match !== undefined) {
      student.noteWert = match;
    } else {
      const rounded = Math.round(n * 10) / 10;
      student.noteWert = (rounded >= 1 && rounded <= 5) ? rounded : n;
    }
  }

  private toValidNoteValue(val: number | null): number | null {
    if (val == null) return null;
    const n = Number(val);
    const match = DashboardComponent.VALID_NOTEN.find((v: number) => Math.abs(v - n) < 0.01);
    return match ?? (n >= 1 && n <= 5 ? Math.round(n * 10) / 10 : n);
  }

  async saveGradeForStudent(student: any): Promise<void> {
    if (!student.noteWert) return;

    this.normalizeNoteValue(student);

    student.saving = true;
    this.studentsForModul.set([...this.studentsForModul()]);

    try {
      const payload = {
        einschreibungId: student.einschreibungId,
        modulId: student.modulId,
        noteWert: this.toValidNoteValue(student.noteWert),
        bestanden: student.bestanden,
        versuch: student.versuch,
        pruefungsdatum: student.pruefungsdatum,
        bemerkung: student.bemerkung || null
      };

      if (student.noteId) {
        // Update
        await firstValueFrom(
          this.http.put<any>(`/api/noten/${student.noteId}`, payload)
        );
      } else {
        // Create
        const response = await firstValueFrom(
          this.http.post<any>('/api/noten', payload)
        );
        student.noteId = response.data.id;
      }

      student.changed = false;

    } catch (err: any) {
      console.error('Error saving grade:', err);
      this.toast.error('Fehler beim Speichern: ' + (err.error?.message || err.message));
    } finally {
      student.saving = false;
      this.studentsForModul.set([...this.studentsForModul()]);
    }
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }
}

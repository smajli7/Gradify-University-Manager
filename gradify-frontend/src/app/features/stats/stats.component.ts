import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Apollo, gql } from 'apollo-angular';
import { Chart, registerables } from 'chart.js';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

// Chart.js registrieren
Chart.register(...registerables);

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
      aktuellesSemester
      studiengang {
        id
        name
        kuerzel
      }
    }
  }
`;

const GET_ALL_MODULE = gql`
  query GetAllModule {
    module {
      id
      modulNr
      name
      ects
      gewichtung
      inGesamtnote
      bewertungsart
      studiengangKuerzel
    }
  }
`;

const GET_DOZENTEN_MODULE = gql`
  query GetDozentenModule($dozentId: ID!) {
    dozentenModule(dozentId: $dozentId) {
      id
      modulNr
      name
      ects
      gewichtung
      inGesamtnote
      bewertungsart
      studiengangKuerzel
    }
  }
`;

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
    kuerzel: string;
  };
}

interface ModulInfo {
  id: string;
  modulNr: string;
  name: string;
  ects: number;
  gewichtung?: number;
  inGesamtnote?: boolean;
  bewertungsart?: string;
  studiengangKuerzel?: string;
}

interface Note {
  id: string;
  modulId: string;
  einschreibungId: string;
  noteWert: number;
  bestanden: boolean;
  status: string;
  erfasstVon?: string;
  validiertVon?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface StudiengangStats {
  name: string;
  kuerzel: string;
  studentCount: number;
  avgSemester: number;
}

interface ModulStats {
  modulId?: string;
  modulNr: string;
  name: string;
  totalGrades: number;
  passed: number;
  failed: number;
  passRate: number;
  avgGrade: number;
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="stats-page">
      <!-- Header + Filter -->
      <header class="page-header">
        <div class="header-content">
          <h1>Statistik</h1>
          <p class="subtitle">
            @if (isDozent()) {
              Was muss ich tun? Auswertungen für Ihre zugewiesenen Module
            } @else {
              Auswertungen und Diagramme
            }
          </p>
        </div>
        <div class="header-actions">
          @if (lastUpdate()) {
            <span class="last-update">Letztes Update: {{ lastUpdate() }}</span>
          }
          <div class="export-dropdown">
            <button type="button" class="btn btn-ghost btn-export" (click)="exportCsv()" [disabled]="loading() || totalGrades() === 0" title="Als CSV exportieren">CSV</button>
          </div>
          <button class="btn btn-primary" (click)="refreshData()" [disabled]="loading()">
            <span *ngIf="loading()" class="spinner"></span>
            {{ loading() ? 'Lädt...' : 'Aktualisieren' }}
          </button>
        </div>
      </header>

      <!-- Filter-Leiste -->
      <div class="filter-bar card">
        <div class="filter-row">
          <label class="filter-label">Studiengang</label>
          <select class="filter-select" [ngModel]="filterStudiengang()" (ngModelChange)="setFilterStudiengang($event)">
            <option value="">Alle</option>
            @for (sg of studiengangOptions(); track sg.kuerzel) {
              <option [value]="sg.kuerzel">{{ sg.name }} ({{ sg.kuerzel }})</option>
            }
          </select>
          <label class="filter-label">Modul</label>
          <select class="filter-select" [ngModel]="filterModul()" (ngModelChange)="setFilterModul($event)">
            <option value="">Alle</option>
            @for (m of moduleListFilteredByStudiengang(); track m.id) {
              <option [value]="m.id">{{ m.modulNr }} - {{ m.name }}</option>
            }
          </select>
        </div>
      </div>

      @if (isDozent() && !loading()) {
        <div class="info-banner">
          <span>Sie sehen nur Statistiken für Ihre zugewiesenen Module</span>
        </div>
      }

      <!-- Aktionsbedarf (Dozent: Was muss ich tun?) -->
      @if (isDozent() && !loading()) {
        <section class="action-demand section">
          <h2 class="section-title">Aktionsbedarf</h2>
          <div class="action-cards">
            <a routerLink="/grades/entry" class="action-card action-card--primary">
              <span class="action-card-value">{{ erfasstCount() }}</span>
              <span class="action-card-label">Zur Validierung bereit (Erfasst)</span>
              <span class="action-card-cta">Eintragen / Einreichen</span>
            </a>
            <a routerLink="/grades/validation" class="action-card action-card--secondary">
              <span class="action-card-value">{{ validiertCount() }}</span>
              <span class="action-card-label">Validiert (noch nicht freigegeben)</span>
              <span class="action-card-cta">Prüfungsamt</span>
            </a>
            <div class="action-card action-card--muted">
              <span class="action-card-value">{{ freigegebenCount() }}</span>
              <span class="action-card-label">Freigegeben</span>
              <span class="action-card-cta">Nur Info</span>
            </div>
          </div>
        </section>
      }

      <!-- KPI-Karten (mit Untertiteln, klickbar) -->
      <section class="kpi-section">
        <div class="kpi-grid">
          <button type="button" class="kpi-card" [class.kpi-card--active]="kpiFilter() === 'students'" (click)="setKpiFilter('students')">
            <span class="kpi-value">{{ totalStudents() }}</span>
            <span class="kpi-label">Studierende mit Note</span>
            <span class="kpi-sublabel">in gefilterten Modulen</span>
          </button>
          <button type="button" class="kpi-card" [class.kpi-card--active]="kpiFilter() === 'grades'" (click)="setKpiFilter('grades')">
            <span class="kpi-value">{{ totalGrades() }}</span>
            <span class="kpi-label">Noten erfasst</span>
            <span class="kpi-sublabel">Gesamt (Erfasst/Validiert/Freigegeben)</span>
          </button>
          <button type="button" class="kpi-card" [class.kpi-card--active]="kpiFilter() === 'avg'" (click)="setKpiFilter('avg')">
            <span class="kpi-value">{{ averageGrade() | number:'1.2-2' }}</span>
            <span class="kpi-label">Ø-Note (nach PO gewichtet)</span>
            <span class="kpi-sublabel">nur Module in Gesamtnote, gewichtet</span>
          </button>
          <button type="button" class="kpi-card" [class.kpi-card--active]="kpiFilter() === 'pass'" (click)="setKpiFilter('pass')">
            <span class="kpi-value">{{ overallPassRate() | number:'1.1-1' }}%</span>
            <span class="kpi-label">Bestehensquote</span>
            <span class="kpi-sublabel">bezogen auf erfasste Noten</span>
          </button>
        </div>
      </section>

      <!-- Validierung als Stepper -->
      <section class="validation-section card">
        <h2>Validierungspipeline</h2>
        <p class="section-subtitle">Erfasst → Validiert → Freigegeben</p>
        <div class="validation-stepper">
          <div class="stepper-step">
            <span class="stepper-dot stepper-dot--erfasst"></span>
            <span class="stepper-label">Erfasst</span>
            <span class="stepper-count">{{ erfasstCount() }} ({{ totalGrades() > 0 ? (erfasstPercent() | number:'1.0-0') : 0 }}%)</span>
          </div>
          <div class="stepper-connector"></div>
          <div class="stepper-step">
            <span class="stepper-dot stepper-dot--validiert"></span>
            <span class="stepper-label">Validiert</span>
            <span class="stepper-count">{{ validiertCount() }} ({{ totalGrades() > 0 ? (validiertPercent() | number:'1.0-0') : 0 }}%)</span>
          </div>
          <div class="stepper-connector"></div>
          <div class="stepper-step">
            <span class="stepper-dot stepper-dot--freigegeben"></span>
            <span class="stepper-label">Freigegeben</span>
            <span class="stepper-count">{{ freigegebenCount() }} ({{ totalGrades() > 0 ? (freigegebenPercent() | number:'1.0-0') : 0 }}%)</span>
          </div>
        </div>
      </section>

      <!-- Charts (max 2 nebeneinander) -->
      @if (!loading() && totalGrades() > 0) {
        <section class="charts-section">
          <div class="charts-grid">
            <div class="chart-card card">
              <h2>Notenverteilung</h2>
              <p class="section-subtitle">Bins 1,0–5,0, Grenze Bestanden bei 4,0</p>
              <div class="chart-container">
                <canvas #gradeDistributionChart></canvas>
              </div>
            </div>
            <div class="chart-card card chart-card--pie">
              <h2>Bestanden / Nicht bestanden</h2>
              <div class="chart-container chart-container-pie">
                <canvas #passFailChart></canvas>
              </div>
            </div>
            <div class="chart-card card full-width">
              <h2>Durchschnittsnoten nach Studiengang</h2>
              <p class="section-subtitle">Skala 1,0–5,0, Ø nach PO gewichtet, sortiert nach Ø-Note</p>
              <div class="chart-container">
                <canvas #avgByProgramChart></canvas>
              </div>
            </div>
          </div>
        </section>
      }

      @if (!loading() && totalGrades() === 0) {
        <section class="empty-state card">
          <p class="empty-state-text">Noch keine Noten für diesen Zeitraum / diese Filter.</p>
          @if (isDozent()) {
            <a routerLink="/grades/entry" class="btn btn-primary">Noten erfassen</a>
          }
        </section>
      }

      <!-- Studiengänge Übersicht (sticky header) -->
      <section class="programs-section card">
        <h2>Studiengänge Übersicht</h2>
        <div class="table-wrap">
          <table class="data-table data-table--sticky">
            <thead>
              <tr>
                <th (click)="sortProgramsBy('name')" class="th-sort">Studiengang</th>
                <th class="col-center">Kürzel</th>
                <th class="col-center" (click)="sortProgramsBy('studentCount')">Studierende</th>
                <th class="col-center">Ø Semester</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sg of sortedStudiengangStats()" (click)="selectStudiengang(sg.kuerzel)">
                <td>{{ sg.name }}</td>
                <td class="col-center"><span class="badge">{{ sg.kuerzel }}</span></td>
                <td class="col-center">{{ sg.studentCount }}</td>
                <td class="col-center">{{ sg.avgSemester | number:'1.1-1' }}</td>
              </tr>
              <tr *ngIf="sortedStudiengangStats().length === 0">
                <td colspan="4" class="empty-row">Keine Daten verfügbar</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Module nach Bestehensquote (Mini-Progress, Badges) -->
      <section class="modules-section card">
        <h2>Module nach Bestehensquote</h2>
        <p class="section-subtitle">Ø-Note pro Modul (arithmetisch). Klick auf Zeile für Details.</p>
        <div class="table-wrap">
          <table class="data-table data-table--sticky">
            <thead>
              <tr>
                <th>Modul</th>
                <th class="col-center">Noten</th>
                <th class="col-center">Bestanden</th>
                <th class="col-center">Nicht bestanden</th>
                <th class="col-center">Quote</th>
                <th class="col-center" title="Ø-Note (arithmetisch pro Modul)">Ø Note</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of sortedModulStats()" (click)="selectModul(m)">
                <td>
                  <span class="modul-nr">{{ m.modulNr }}</span>
                  {{ m.name }}
                  @if (m.passRate < 50 && m.totalGrades > 0) {
                    <span class="cell-badge cell-badge--warn">Fehlende Noten</span>
                  }
                </td>
                <td class="col-center">{{ m.totalGrades }}</td>
                <td class="col-center text-success">{{ m.passed }}</td>
                <td class="col-center text-danger">{{ m.failed }}</td>
                <td class="col-center">
                  <div class="mini-progress-wrap" title="Bestehensquote {{ m.passRate | number:'1.1-1' }}%">
                    <div class="mini-progress" [class.low]="m.passRate < 50" [class.medium]="m.passRate >= 50 && m.passRate < 80" [class.high]="m.passRate >= 80">
                      <div class="mini-progress-fill" [style.width.%]="m.passRate"></div>
                    </div>
                    <span class="mini-progress-value">{{ m.passRate | number:'1.0-0' }}%</span>
                  </div>
                </td>
                <td class="col-center">
                  <span class="grade-badge" [class.good]="m.avgGrade <= 2.0" [class.ok]="m.avgGrade > 2.0 && m.avgGrade <= 3.0" [class.bad]="m.avgGrade > 3.0" title="Ø-Note (arithmetisch)">{{ m.avgGrade | number:'1.2-2' }}</span>
                </td>
              </tr>
              <tr *ngIf="sortedModulStats().length === 0">
                <td colspan="6" class="empty-row">Keine Daten verfügbar</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .stats-page {
      padding: var(--spacing-lg);
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
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

    .header-actions { display: flex; align-items: center; gap: var(--spacing-md); flex-wrap: wrap; }
    .last-update { font-size: 0.75rem; color: var(--text-muted); }
    .btn-export { font-size: 0.875rem; }
    .filter-bar { margin-bottom: var(--spacing-lg); }
    .filter-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-md); }
    .filter-label { font-size: 0.8rem; color: var(--text-muted); margin-right: 4px; }
    .filter-select { padding: 6px 10px; background: var(--bg-deep); border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.875rem; min-width: 160px; }
    .section-title { font-size: 1rem; font-weight: 600; color: var(--text-primary); margin: 0 0 var(--spacing-md) 0; }
    .action-demand { margin-bottom: var(--spacing-xl); }
    .action-cards { display: flex; flex-wrap: wrap; gap: var(--spacing-md); }
    .action-card { display: flex; flex-direction: column; padding: var(--spacing-md) var(--spacing-lg); border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); text-decoration: none; color: inherit; min-width: 180px; transition: background 0.2s, border-color 0.2s; }
    .action-card:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); }
    .action-card--primary { border-left: 4px solid rgba(16, 185, 129, 0.9); }
    .action-card--secondary { border-left: 4px solid rgba(99, 102, 241, 0.7); }
    .action-card--muted { border-left: 4px solid rgba(255,255,255,0.25); opacity: 0.9; cursor: default; }
    .action-card-value { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }
    .action-card-label { font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; }
    .action-card-cta { font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px; }
    .validation-stepper { display: flex; align-items: center; justify-content: center; gap: 0; flex-wrap: wrap; padding: var(--spacing-md) 0; }
    .stepper-step { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0 var(--spacing-md); }
    .stepper-dot { width: 12px; height: 12px; border-radius: 50%; }
    .stepper-dot--erfasst { background: linear-gradient(135deg, #6366f1, #818cf8); }
    .stepper-dot--validiert { background: linear-gradient(135deg, #10b981, #34d399); }
    .stepper-dot--freigegeben { background: linear-gradient(135deg, #22c55e, #4ade80); }
    .stepper-label { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); }
    .stepper-count { font-size: 0.75rem; color: var(--text-muted); }
    .stepper-connector { width: 40px; height: 2px; background: var(--border-color); }
    .chart-stack-wrap { margin-bottom: var(--spacing-md); }
    .chart-stack-bar { display: flex; height: 24px; border-radius: var(--radius-sm); overflow: hidden; background: var(--bg-hover); }
    .chart-stack-fill { transition: width 0.3s; }
    .chart-stack--passed { background: rgba(16, 185, 129, 0.8); }
    .chart-stack--failed { background: rgba(239, 68, 68, 0.8); }
    .chart-stack-legend { display: flex; gap: var(--spacing-lg); margin-top: 8px; font-size: 0.8rem; color: var(--text-muted); }
    .mini-progress-wrap { display: flex; align-items: center; gap: 8px; }
    .mini-progress { flex: 1; min-width: 60px; max-width: 100px; height: 8px; background: var(--bg-hover); border-radius: var(--radius-full); overflow: hidden; }
    .mini-progress-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.3s; }
    .mini-progress.low .mini-progress-fill { background: #ef4444; }
    .mini-progress.medium .mini-progress-fill { background: #f59e0b; }
    .mini-progress.high .mini-progress-fill { background: #10b981; }
    .mini-progress-value { font-size: 0.75rem; color: var(--text-muted); min-width: 28px; }
    .cell-badge { font-size: 0.65rem; padding: 2px 6px; border-radius: var(--radius-sm); margin-left: 6px; }
    .cell-badge--warn { background: rgba(245, 158, 11, 0.2); color: var(--color-warning, #f59e0b); }
    .table-wrap { overflow: auto; max-height: 50vh; }
    .data-table--sticky thead th { position: sticky; top: 0; z-index: 2; background: var(--bg-elevated); }
    .th-sort { cursor: pointer; user-select: none; }
    .th-sort:hover { color: var(--text-primary); }
    .empty-state { text-align: center; padding: var(--spacing-xl); }
    .empty-state-text { color: var(--text-muted); margin: 0 0 var(--spacing-md) 0; }

    .info-banner {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      margin-bottom: var(--spacing-lg);
    }

    .info-banner svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
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
      background: rgba(255,255,255,0.12);
      color: var(--text-primary);
      border: 1px solid rgba(255,255,255,0.2);
    }

    .btn-primary:hover:not(:disabled) {
      background: rgba(255,255,255,0.18);
      border-color: rgba(255,255,255,0.28);
    }

    .btn-ghost {
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid rgba(255,255,255,0.15);
    }
    .btn-ghost:hover:not(:disabled) {
      background: rgba(255,255,255,0.06);
      border-color: rgba(255,255,255,0.22);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* KPI Section */
    .kpi-section {
      margin-bottom: var(--spacing-xl);
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--spacing-md);
    }

    .kpi-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: var(--spacing-lg);
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      transition: background 0.2s, border-color 0.2s;
      cursor: pointer;
      text-align: left;
      min-height: 90px;
    }

    .kpi-card:hover {
      background: var(--bg-hover);
      border-color: rgba(255,255,255,0.15);
    }

    .kpi-card--active {
      border-color: var(--color-success, #10b981);
      background: rgba(16, 185, 129, 0.06);
    }

    .kpi-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .kpi-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .kpi-sublabel {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Card */
    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }

    .card h2 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }

    .section-subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin: -0.5rem 0 var(--spacing-md) 0;
    }

    /* Validation Section */
    .validation-bars {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .validation-item {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .validation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .validation-label {
      font-weight: 500;
      color: var(--text-primary);
    }

    .validation-count {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .progress-bar {
      height: 12px;
      background: var(--bg-hover);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width 0.5s ease;
    }

    .progress-fill.erfasst {
      background: linear-gradient(90deg, #6366f1, #818cf8);
    }

    .progress-fill.validiert {
      background: linear-gradient(90deg, #10b981, #34d399);
    }

    .progress-fill.freigegeben {
      background: linear-gradient(90deg, #22c55e, #4ade80);
    }

    /* Charts Section */
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-lg);
    }

    .chart-card {
      margin-bottom: 0;
    }

    .chart-card.full-width {
      grid-column: 1 / -1;
    }

    .chart-container {
      height: 300px;
      position: relative;
    }

    .chart-card--pie {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .chart-card--pie h2 {
      margin-bottom: var(--spacing-sm);
    }
    .chart-container-pie {
      height: 260px;
      width: 260px;
      margin: 0 auto;
    }

    /* Tables */
    .table-container {
      overflow-x: auto;
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

    .empty-row {
      text-align: center;
      color: var(--text-muted);
      padding: var(--spacing-xl) !important;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: var(--text-secondary);
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .modul-nr {
      display: inline-block;
      padding: 2px 6px;
      background: var(--bg-hover);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-right: var(--spacing-xs);
    }

    .text-success {
      color: #10b981;
    }

    .text-danger {
      color: #ef4444;
    }

    .pass-rate {
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
    }

    .pass-rate.low {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .pass-rate.medium {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }

    .pass-rate.high {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }

    .grade-badge {
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
    }

    .grade-badge.good {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }

    .grade-badge.ok {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }

    .grade-badge.bad {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    @media (max-width: 768px) {
      .stats-page {
        padding: var(--spacing-md);
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-md);
      }

      .charts-grid {
        grid-template-columns: 1fr;
      }

      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class StatsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gradeDistributionChart') gradeDistributionCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('passFailChart') passFailCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('avgByProgramChart') avgByProgramCanvas!: ElementRef<HTMLCanvasElement>;

  private readonly http = inject(HttpClient);
  private readonly apollo = inject(Apollo);
  private readonly authService = inject(AuthService);

  // State
  loading = signal(false);
  isDozent = signal(false);
  // KPIs aus gefilterten Noten (reagieren auf Filter)
  totalStudents = computed(() => {
    const n = this.filteredNoten();
    return new Set(n.map(x => String(x.einschreibungId ?? ''))).size;
  });
  totalGrades = computed(() => this.filteredNoten().length);
  averageGrade = computed(() => {
    const gradesForPO = this.filteredNoten().filter(n => this.noteZaehltInGesamtnote(n));
    if (gradesForPO.length === 0) return 0;
    const sumWeight = gradesForPO.reduce((acc, n) => acc + this.getGewichtungForNote(n), 0);
    if (sumWeight <= 0) return gradesForPO.reduce((s, n) => s + (n.noteWert ?? 0), 0) / gradesForPO.length;
    const sumNoteWeight = gradesForPO.reduce((acc, n) => acc + (n.noteWert ?? 0) * this.getGewichtungForNote(n), 0);
    return sumNoteWeight / sumWeight;
  });
  overallPassRate = computed(() => {
    const n = this.filteredNoten();
    if (n.length === 0) return 0;
    return (n.filter(x => x.bestanden).length / n.length) * 100;
  });

  // Validation status aus gefilterten Noten
  erfasstCount = computed(() => this.filteredNoten().filter(n => n.status === 'ERFASST').length);
  validiertCount = computed(() => this.filteredNoten().filter(n => n.status === 'VALIDIERT').length);
  freigegebenCount = computed(() => this.filteredNoten().filter(n => n.status === 'FREIGEGEBEN').length);
  erfasstPercent = computed(() => {
    const t = this.filteredNoten().length;
    return t === 0 ? 0 : (this.erfasstCount() / t) * 100;
  });
  validiertPercent = computed(() => {
    const t = this.filteredNoten().length;
    return t === 0 ? 0 : (this.validiertCount() / t) * 100;
  });
  freigegebenPercent = computed(() => {
    const t = this.filteredNoten().length;
    return t === 0 ? 0 : (this.freigegebenCount() / t) * 100;
  });

  // Data
  studiengangStats = signal<StudiengangStats[]>([]);
  passCount = computed(() => this.filteredNoten().filter(n => n.bestanden).length);
  failCount = computed(() => this.filteredNoten().length - this.passCount());
  modulStats = computed(() => {
    const list = this.filteredNoten();
    const moduleMap = new Map(this.moduleList().map(m => [String(m.id), m]));
    const statsMap = new Map<string, ModulStats>();
    for (const note of list) {
      const key = String(note.modulId ?? '');
      const modul = moduleMap.get(key);
      const existing = statsMap.get(key);
      if (existing) {
        existing.totalGrades++;
        if (note.bestanden) existing.passed++; else existing.failed++;
        const allGrades = list.filter(n => String(n.modulId ?? '') === key && (n.noteWert ?? 0) > 0);
        existing.avgGrade = allGrades.length > 0 ? allGrades.reduce((s, n) => s + (n.noteWert ?? 0), 0) / allGrades.length : existing.avgGrade;
        existing.passRate = (existing.passed / existing.totalGrades) * 100;
      } else {
        statsMap.set(key, {
          modulId: key,
          modulNr: modul?.modulNr || '?',
          name: modul?.name || 'Unbekanntes Modul',
          totalGrades: 1,
          passed: note.bestanden ? 1 : 0,
          failed: note.bestanden ? 0 : 1,
          passRate: note.bestanden ? 100 : 0,
          avgGrade: note.noteWert ?? 0
        });
      }
    }
    return Array.from(statsMap.values()).filter(m => m.totalGrades > 0).sort((a, b) => a.passRate - b.passRate);
  });
  moduleList = signal<ModulInfo[]>([]);
  lastUpdate = signal<string | null>(null);
  filterStudiengang = signal('');
  filterModul = signal('');
  kpiFilter = signal<string | null>(null);
  programSort = signal<{ key: string; dir: number }>({ key: 'name', dir: 1 });
  modulSort = signal<{ key: string; dir: number }>({ key: 'passRate', dir: 1 });

  studiengangOptions = computed(() => this.studiengangStats());

  /** Module für das Modul-Dropdown: nur solche des gewählten Studiengangs (wenn einer gewählt). */
  moduleListFilteredByStudiengang = computed(() => {
    const list = this.moduleList();
    const sg = this.filterStudiengang();
    if (!sg) return list;
    return list.filter(m => (m.studiengangKuerzel ?? '') === sg);
  });

  /** Noten gefiltert nach Studiengang und Modul (für KPIs, Charts, Tabellen). */
  filteredNoten = computed(() => {
    const list = this.noten();
    const sg = this.filterStudiengang();
    const modulId = this.filterModul();
    const einschreibungenList = this.einschreibungen();
    const einschreibungByKuerzel = new Map<string, Set<string>>();
    for (const e of einschreibungenList) {
      const k = e.studiengang?.kuerzel ?? '';
      if (!einschreibungByKuerzel.has(k)) einschreibungByKuerzel.set(k, new Set());
      einschreibungByKuerzel.get(k)!.add(String(e.id ?? ''));
    }
    return list.filter(n => {
      if (modulId && String(n.modulId ?? '') !== String(modulId)) return false;
      if (sg) {
        const ids = einschreibungByKuerzel.get(sg);
        if (!ids || !ids.has(String(n.einschreibungId ?? ''))) return false;
      }
      return true;
    });
  });

  sortedStudiengangStats = computed(() => {
    const list = this.studiengangStats();
    const sg = this.filterStudiengang();
    const filtered = sg ? list.filter(s => s.kuerzel === sg) : list;
    const { key, dir } = this.programSort();
    return [...filtered].sort((a, b) => {
      let v = 0;
      if (key === 'name') v = (a.name || '').localeCompare(b.name || '');
      else if (key === 'studentCount') v = a.studentCount - b.studentCount;
      return dir * v;
    });
  });

  sortedModulStats = computed(() => {
    const list = this.modulStats();
    const modulId = this.filterModul();
    const filtered = modulId ? list.filter(m => String(m.modulId) === String(modulId)) : list;
    const { key, dir } = this.modulSort();
    return [...filtered].sort((a, b) => {
      let v = 0;
      if (key === 'passRate') v = a.passRate - b.passRate;
      else if (key === 'avgGrade') v = a.avgGrade - b.avgGrade;
      else if (key === 'totalGrades') v = a.totalGrades - b.totalGrades;
      return dir * v;
    });
  });

  passFailPassPercent = computed(() => {
    const t = this.passCount() + this.failCount();
    return t === 0 ? 0 : (this.passCount() / t) * 100;
  });
  passFailFailPercent = computed(() => {
    const t = this.passCount() + this.failCount();
    return t === 0 ? 0 : (this.failCount() / t) * 100;
  });

  // Charts
  private gradeDistributionChart: Chart | null = null;
  private passFailChart: Chart | null = null;
  private avgByProgramChart: Chart | null = null;

  // Raw data (noten + einschreibungen als Signale für reaktive Filter)
  private students: StudentInfo[] = [];
  noten = signal<Note[]>([]);
  einschreibungen = signal<EinschreibungInfo[]>([]);
  private module: ModulInfo[] = [];

  private readonly chartUpdateEffect = effect(() => {
    this.filteredNoten();
    this.filterStudiengang();
    this.filterModul();
    if (this.loading() || this.noten().length === 0) return;
    setTimeout(() => this.initCharts(), 80);
  });

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    // Charts werden per effect bei Filter-/Datenänderung aktualisiert
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  async refreshData(): Promise<void> {
    await this.loadData();
  }

  private async loadData(): Promise<void> {
    this.loading.set(true);

    try {
      const isDozent = this.authService.isDozent();
      this.isDozent.set(isDozent);
      const userId = this.authService.currentUser()?.id;

      // Module laden - für Dozenten nur ihre zugewiesenen Module
      let modulePromise;
      if (isDozent && userId) {
        modulePromise = firstValueFrom(this.apollo.query<{ dozentenModule: ModulInfo[] }>({
          query: GET_DOZENTEN_MODULE,
          variables: { dozentId: userId },
          fetchPolicy: 'network-only'
        }));
      } else {
        modulePromise = firstValueFrom(this.apollo.query<{ module: ModulInfo[] }>({
          query: GET_ALL_MODULE,
          fetchPolicy: 'network-only'
        }));
      }

      // Parallel alle Daten laden
      const [studentsResult, einschreibungenResult, moduleResult, notenResponse] = await Promise.all([
        firstValueFrom(this.apollo.query<{ students: StudentInfo[] }>({
          query: GET_ALL_STUDENTS,
          context: { clientName: 'user' },
          fetchPolicy: 'network-only'
        })),
        firstValueFrom(this.apollo.query<{ einschreibungen: EinschreibungInfo[] }>({
          query: GET_ALL_EINSCHREIBUNGEN,
          fetchPolicy: 'network-only'
        })),
        modulePromise,
        firstValueFrom(this.http.get<ApiResponse<Note[]>>('/api/noten'))
      ]);

      this.students = studentsResult.data?.students || [];
      this.einschreibungen.set(einschreibungenResult.data?.einschreibungen || []);
      
      // Module aus der richtigen Query extrahieren (Backend kann pro Zuweisung Duplikate liefern → nach ID deduplizieren)
      let rawModule: ModulInfo[] = isDozent
        ? (moduleResult.data as any)?.dozentenModule || []
        : (moduleResult.data as any)?.module || [];
      const seenIds = new Set<string>();
      this.module = rawModule.filter(m => {
        const id = String(m?.id ?? '');
        if (seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      });

      const allNoten = notenResponse?.data || [];
      
      // Für Dozenten: Nur Noten zu ihren Modulen
      if (isDozent && this.module.length > 0) {
        const myModulIds = new Set(this.module.map(m => String(m.id)));
        this.noten.set(allNoten.filter(n => myModulIds.has(String(n.modulId ?? ''))));
      } else {
        this.noten.set(allNoten);
      }

      this.moduleList.set(this.module);
      this.lastUpdate.set(new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }));

      this.calculateStudiengangStats();

      setTimeout(() => this.initCharts(), 100);

    } catch (error) {
      console.error('Error loading stats data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Prüft, ob eine Note gemäß PO in die Gesamtnote zählt.
   * Validierungsregeln laut PO:
   *  1. Nur bestandene Module (Note ≤ 4.0) – 5.0 zählt NIEMALS, auch wenn bestanden=true (Dateninkonsistenz)
   *  2. Module mit Gewichtung 0 werden ausgeschlossen
   *  3. "Bestanden/nicht bestanden" Module werden ausgeschlossen (bewertungsart ≠ NOTE)
   *  4. inGesamtnote muss true sein
   */
  private noteZaehltInGesamtnote(note: Note): boolean {
    const modul = this.module.find(m => String(m.id) === String(note.modulId));
    if (!modul) return false;
    // PO-Regel 4: inGesamtnote
    if (modul.inGesamtnote === false) return false;
    // PO-Regel 3: nur NOTE-Module (keine BESTANDEN_NICHT_BESTANDEN)
    if ((modul.bewertungsart ?? 'NOTE') !== 'NOTE') return false;
    // PO-Regel 2: Gewichtung > 0
    const g = typeof modul.gewichtung === 'number' ? modul.gewichtung : 1;
    if (g <= 0) return false;
    // noteWert muss vorhanden und > 0 sein
    if ((note.noteWert ?? 0) <= 0) return false;
    // PO-Regel 1: Note muss <= 4.0 sein (5.0 = nicht bestanden, zählt NIE in Gesamtnote)
    if (note.noteWert > 4.0) return false;
    // Zusätzlich: explizit als nicht bestanden markiert
    if (!note.bestanden) return false;
    return true;
  }

  /** Gewichtung eines Moduls für PO-Berechnung. */
  private getGewichtungForNote(note: Note): number {
    const modul = this.module.find(m => String(m.id) === String(note.modulId));
    if (!modul || !this.noteZaehltInGesamtnote(note)) return 0;
    const g = modul.gewichtung;
    return typeof g === 'number' && g > 0 ? g : 0;
  }

  private calculateStudiengangStats(): void {
    const statsMap = new Map<string, StudiengangStats>();
    const list = this.einschreibungen();

    for (const e of list) {
      const key = e.studiengang.id;
      const existing = statsMap.get(key);

      if (existing) {
        existing.studentCount++;
        existing.avgSemester = (existing.avgSemester * (existing.studentCount - 1) + e.aktuellesSemester) / existing.studentCount;
      } else {
        statsMap.set(key, {
          name: e.studiengang.name,
          kuerzel: e.studiengang.kuerzel,
          studentCount: 1,
          avgSemester: e.aktuellesSemester
        });
      }
    }
    this.studiengangStats.set(Array.from(statsMap.values()));
  }

  setFilterStudiengang(v: string): void {
    this.filterStudiengang.set(v ?? '');
    const kuerzel = v ?? '';
    const allowed = this.moduleList().filter(m => (m.studiengangKuerzel ?? '') === kuerzel);
    const current = this.filterModul();
    if (current && kuerzel && !allowed.some(m => String(m.id) === String(current))) {
      this.filterModul.set('');
    }
  }
  setFilterModul(v: string): void { this.filterModul.set(v ?? ''); }
  setKpiFilter(v: string | null): void { this.kpiFilter.set(v); }

  sortProgramsBy(key: string): void {
    const prev = this.programSort();
    this.programSort.set({ key, dir: prev.key === key ? -prev.dir : 1 });
  }

  selectStudiengang(kuerzel: string): void {
    this.setFilterStudiengang(this.filterStudiengang() === kuerzel ? '' : kuerzel);
  }

  selectModul(m: ModulStats): void {
    const id = m.modulId ?? '';
    this.setFilterModul(this.filterModul() === id ? '' : id);
  }

  exportCsv(): void {
    const rows: string[] = ['Modul_Nr;Modul_Name;EinschreibungId;Note;Bestanden;Status'];
    for (const n of this.filteredNoten()) {
      const modul = this.module.find(m => String(m.id) === String(n.modulId));
      rows.push([
        modul?.modulNr ?? '',
        modul?.name ?? '',
        n.einschreibungId ?? '',
        n.noteWert ?? '',
        n.bestanden ? 'ja' : 'nein',
        n.status ?? ''
      ].join(';'));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `noten_statistik_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  private initCharts(): void {
    this.destroyCharts();
    this.initGradeDistributionChart();
    this.initPassFailChart();
    this.initAvgByProgramChart();
  }

  private destroyCharts(): void {
    if (this.gradeDistributionChart) {
      this.gradeDistributionChart.destroy();
      this.gradeDistributionChart = null;
    }
    if (this.passFailChart) {
      this.passFailChart.destroy();
      this.passFailChart = null;
    }
    if (this.avgByProgramChart) {
      this.avgByProgramChart.destroy();
      this.avgByProgramChart = null;
    }
  }

  private initGradeDistributionChart(): void {
    if (!this.gradeDistributionCanvas) return;

    const ctx = this.gradeDistributionCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Notenverteilung berechnen
    const gradeLabels = ['1.0', '1.3', '1.7', '2.0', '2.3', '2.7', '3.0', '3.3', '3.7', '4.0', '5.0'];
    const noten = this.filteredNoten();
    const gradeCounts = gradeLabels.map(label => {
      const value = parseFloat(label);
      return noten.filter(n => Math.abs((n.noteWert ?? 0) - value) < 0.05).length;
    });

    this.gradeDistributionChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: gradeLabels,
        datasets: [{
          label: 'Anzahl',
          data: gradeCounts,
          backgroundColor: gradeLabels.map((_, i) => {
            const value = parseFloat(gradeLabels[i]);
            if (value >= 4.0) return 'rgba(239, 68, 68, 0.85)';
            return 'rgba(99, 102, 241, 0.7)';
          }),
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { afterLabel: (ctx: any) => `Anzahl: ${ctx.raw}` } }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: 'rgba(255,255,255,0.6)' },
            grid: { color: 'rgba(255,255,255,0.06)' }
          }
        }
      }
    });
  }

  private initPassFailChart(): void {
    if (!this.passFailCanvas) return;

    const ctx = this.passFailCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const noten = this.filteredNoten();
    const passed = noten.filter(n => n.bestanden).length;
    const failed = noten.filter(n => !n.bestanden).length;

    const centerPlugin = {
      id: 'centerNumbers',
      afterDraw: (chart: Chart) => {
        if ((chart as any).config?.type !== 'doughnut' || !chart.data.datasets?.[0]?.data?.length) return;
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const cx = (chartArea.left + chartArea.right) / 2;
        const cy = (chartArea.top + chartArea.bottom) / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = 'bold 1.25rem sans-serif';
        ctx.fillText(String(passed), cx, cy - 10);
        ctx.font = '0.75rem sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('Bestanden', cx, cy + 8);
        ctx.fillText(String(failed), cx, cy + 28);
        ctx.fillText('Nicht bestanden', cx, cy + 46);
        ctx.restore();
      }
    };

    this.passFailChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Bestanden', 'Nicht bestanden'],
        datasets: [{
          data: [passed, failed],
          backgroundColor: ['rgba(16, 185, 129, 0.85)', 'rgba(239, 68, 68, 0.85)'],
          borderWidth: 0
        }]
      },
      options: {
        cutout: '55%',
        responsive: true,
        maintainAspectRatio: true,
        layout: { padding: 8 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (ctx: any) => {
                const total = passed + failed;
                const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : '0';
                return `${ctx.raw} (${pct} %)`;
              }
            }
          }
        }
      } as any,
      plugins: [centerPlugin]
    });
  }

  private initAvgByProgramChart(): void {
    if (!this.avgByProgramCanvas) return;

    const ctx = this.avgByProgramCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const stats = this.studiengangStats();
    const noten = this.filteredNoten();
    const einschreibungenList = this.einschreibungen();
    const dataWithAvg: { kuerzel: string; name: string; avg: number; n: number }[] = stats.map(sg => {
      const einschreibungIds = new Set(
        einschreibungenList
          .filter(e => e.studiengang.kuerzel === sg.kuerzel)
          .map(e => String(e.id ?? ''))
      );
      const grades = noten.filter(n =>
        einschreibungIds.has(String(n.einschreibungId ?? '')) && (n.noteWert ?? 0) > 0
      );
      // PO-konform: gewichteter Durchschnitt (nur Module mit inGesamtnote + NOTE)
      let avg = 0;
      const forPO = grades.filter(n => this.noteZaehltInGesamtnote(n));
      if (forPO.length > 0) {
        const sumWeight = forPO.reduce((acc, n) => acc + this.getGewichtungForNote(n), 0);
        if (sumWeight > 0) {
          const sumNoteWeight = forPO.reduce(
            (acc, n) => acc + (n.noteWert ?? 0) * this.getGewichtungForNote(n),
            0
          );
          avg = sumNoteWeight / sumWeight;
        } else {
          avg = forPO.reduce((s, n) => s + (n.noteWert ?? 0), 0) / forPO.length;
        }
      }
      return { kuerzel: sg.kuerzel, name: sg.name, avg, n: grades.length };
    });
    dataWithAvg.sort((a, b) => a.avg - b.avg);

    this.avgByProgramChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dataWithAvg.map(d => `${d.kuerzel} (n=${d.n})`),
        datasets: [{
          label: 'Ø-Note',
          data: dataWithAvg.map(d => d.avg),
          backgroundColor: dataWithAvg.map(d => {
            if (d.avg === 0) return 'rgba(156, 163, 175, 0.5)';
            if (d.avg <= 2.0) return 'rgba(16, 185, 129, 0.8)';
            if (d.avg <= 3.0) return 'rgba(245, 158, 11, 0.8)';
            return 'rgba(239, 68, 68, 0.8)';
          }),
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { afterLabel: (ctx: any) => `Ø ${ctx.raw?.toFixed(2)} (n=${dataWithAvg[ctx.dataIndex]?.n ?? 0})` } }
        },
        scales: {
          x: {
            min: 1,
            max: 5,
            ticks: { color: 'rgba(255,255,255,0.6)' },
            grid: { color: 'rgba(255,255,255,0.06)' }
          },
          y: {
            ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } },
            grid: { display: false }
          }
        }
      }
    });
  }
}

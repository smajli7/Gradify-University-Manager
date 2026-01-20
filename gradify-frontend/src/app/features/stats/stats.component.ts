import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Apollo, gql } from 'apollo-angular';
import { Chart, registerables } from 'chart.js';
import { firstValueFrom } from 'rxjs';
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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="stats-page">
      <header class="page-header">
        <div class="header-content">
          <h1>Statistik</h1>
          <p class="subtitle">
            @if (isDozent()) {
              Auswertungen für Ihre zugewiesenen Module
            } @else {
              Auswertungen und Diagramme
            }
          </p>
        </div>
        <button class="btn btn-primary" (click)="refreshData()" [disabled]="loading()">
          <span *ngIf="loading()" class="spinner"></span>
          {{ loading() ? 'Lädt...' : 'Aktualisieren' }}
        </button>
      </header>

      @if (isDozent() && !loading()) {
        <div class="info-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>Sie sehen nur Statistiken für Ihre zugewiesenen Module</span>
        </div>
      }

      <!-- Kennzahlen-Karten -->
      <section class="kpi-section">
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon students-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div class="kpi-content">
              <span class="kpi-value">{{ totalStudents() }}</span>
              <span class="kpi-label">Studierende</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon grades-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div class="kpi-content">
              <span class="kpi-value">{{ totalGrades() }}</span>
              <span class="kpi-label">Erfasste Noten</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon avg-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <div class="kpi-content">
              <span class="kpi-value">{{ averageGrade() | number:'1.2-2' }}</span>
              <span class="kpi-label">Ø Gesamtnote</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon pass-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div class="kpi-content">
              <span class="kpi-value">{{ overallPassRate() | number:'1.1-1' }}%</span>
              <span class="kpi-label">Bestehensquote</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Validierungsstatus -->
      <section class="validation-section card">
        <h2>Validierungsstatus</h2>
        <div class="validation-bars">
          <div class="validation-item">
            <div class="validation-header">
              <span class="validation-label">Erfasst</span>
              <span class="validation-count">{{ erfasstCount() }} Noten</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill erfasst" [style.width.%]="erfasstPercent()"></div>
            </div>
          </div>
          <div class="validation-item">
            <div class="validation-header">
              <span class="validation-label">Validiert</span>
              <span class="validation-count">{{ validiertCount() }} Noten</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill validiert" [style.width.%]="validiertPercent()"></div>
            </div>
          </div>
          <div class="validation-item">
            <div class="validation-header">
              <span class="validation-label">Freigegeben</span>
              <span class="validation-count">{{ freigegebenCount() }} Noten</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill freigegeben" [style.width.%]="freigegebenPercent()"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Charts Grid -->
      <section class="charts-section">
        <div class="charts-grid">
          <!-- Notenverteilung -->
          <div class="chart-card card">
            <h2>Notenverteilung</h2>
            <div class="chart-container">
              <canvas #gradeDistributionChart></canvas>
            </div>
          </div>

          <!-- Bestehensquote -->
          <div class="chart-card card">
            <h2>Bestanden / Nicht bestanden</h2>
            <div class="chart-container chart-container-pie">
              <canvas #passFailChart></canvas>
            </div>
          </div>

          <!-- Durchschnittsnoten pro Studiengang -->
          <div class="chart-card card full-width">
            <h2>Durchschnittsnoten nach Studiengang</h2>
            <div class="chart-container">
              <canvas #avgByProgramChart></canvas>
            </div>
          </div>
        </div>
      </section>

      <!-- Studiengänge Übersicht -->
      <section class="programs-section card">
        <h2>Studiengänge Übersicht</h2>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Studiengang</th>
                <th class="col-center">Kürzel</th>
                <th class="col-center">Studierende</th>
                <th class="col-center">Ø Semester</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sg of studiengangStats()">
                <td>{{ sg.name }}</td>
                <td class="col-center"><span class="badge">{{ sg.kuerzel }}</span></td>
                <td class="col-center">{{ sg.studentCount }}</td>
                <td class="col-center">{{ sg.avgSemester | number:'1.1-1' }}</td>
              </tr>
              <tr *ngIf="studiengangStats().length === 0">
                <td colspan="4" class="empty-row">Keine Daten verfügbar</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Module mit niedrigster Bestehensquote -->
      <section class="modules-section card">
        <h2>Module nach Bestehensquote</h2>
        <p class="section-subtitle">Sortiert nach Bestehensquote (aufsteigend)</p>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Modul</th>
                <th class="col-center">Anzahl Noten</th>
                <th class="col-center">Bestanden</th>
                <th class="col-center">Nicht bestanden</th>
                <th class="col-center">Quote</th>
                <th class="col-center">Ø Note</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of modulStats()">
                <td>
                  <span class="modul-nr">{{ m.modulNr }}</span>
                  {{ m.name }}
                </td>
                <td class="col-center">{{ m.totalGrades }}</td>
                <td class="col-center text-success">{{ m.passed }}</td>
                <td class="col-center text-danger">{{ m.failed }}</td>
                <td class="col-center">
                  <span class="pass-rate" [class.low]="m.passRate < 50" [class.medium]="m.passRate >= 50 && m.passRate < 80" [class.high]="m.passRate >= 80">
                    {{ m.passRate | number:'1.1-1' }}%
                  </span>
                </td>
                <td class="col-center">
                  <span class="grade-badge" [class.good]="m.avgGrade <= 2.0" [class.ok]="m.avgGrade > 2.0 && m.avgGrade <= 3.0" [class.bad]="m.avgGrade > 3.0">
                    {{ m.avgGrade | number:'1.2-2' }}
                  </span>
                </td>
              </tr>
              <tr *ngIf="modulStats().length === 0">
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

    .info-banner {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: rgba(0, 242, 255, 0.1);
      border: 1px solid rgba(0, 242, 255, 0.3);
      border-radius: var(--radius-md);
      color: var(--color-primary);
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
      background: var(--color-primary);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--color-primary-dark);
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
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .kpi-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .kpi-icon svg {
      width: 24px;
      height: 24px;
    }

    .students-icon {
      background: rgba(99, 102, 241, 0.1);
      color: #6366f1;
    }

    .grades-icon {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }

    .avg-icon {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }

    .pass-icon {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .kpi-content {
      display: flex;
      flex-direction: column;
    }

    .kpi-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .kpi-label {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: var(--spacing-xs);
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

    .chart-container-pie {
      height: 280px;
      max-width: 280px;
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
      background: var(--color-primary);
      color: white;
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
  totalStudents = signal(0);
  totalGrades = signal(0);
  averageGrade = signal(0);
  overallPassRate = signal(0);

  // Validation status
  erfasstCount = signal(0);
  validiertCount = signal(0);
  freigegebenCount = signal(0);
  erfasstPercent = signal(0);
  validiertPercent = signal(0);
  freigegebenPercent = signal(0);

  // Data
  studiengangStats = signal<StudiengangStats[]>([]);
  modulStats = signal<ModulStats[]>([]);

  // Charts
  private gradeDistributionChart: Chart | null = null;
  private passFailChart: Chart | null = null;
  private avgByProgramChart: Chart | null = null;

  // Raw data
  private students: StudentInfo[] = [];
  private einschreibungen: EinschreibungInfo[] = [];
  private module: ModulInfo[] = [];
  private noten: Note[] = [];

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    // Charts werden nach Datenladung initialisiert
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
      this.einschreibungen = einschreibungenResult.data?.einschreibungen || [];
      
      // Module aus der richtigen Query extrahieren
      if (isDozent) {
        this.module = (moduleResult.data as any)?.dozentenModule || [];
      } else {
        this.module = (moduleResult.data as any)?.module || [];
      }
      
      const allNoten = notenResponse?.data || [];
      
      // Für Dozenten: Nur Noten zu ihren Modulen
      if (isDozent && this.module.length > 0) {
        const myModulIds = this.module.map(m => m.id);
        this.noten = allNoten.filter(n => myModulIds.includes(n.modulId));
      } else {
        this.noten = allNoten;
      }

      // Statistiken berechnen
      this.calculateKPIs();
      this.calculateValidationStatus();
      this.calculateStudiengangStats();
      this.calculateModulStats();

      // Charts aktualisieren
      setTimeout(() => {
        this.initCharts();
      }, 100);

    } catch (error) {
      console.error('Error loading stats data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private calculateKPIs(): void {
    this.totalStudents.set(this.students.length);
    this.totalGrades.set(this.noten.length);

    // Durchschnittsnote
    const gradesWithValue = this.noten.filter(n => n.noteWert > 0);
    if (gradesWithValue.length > 0) {
      const sum = gradesWithValue.reduce((acc, n) => acc + n.noteWert, 0);
      this.averageGrade.set(sum / gradesWithValue.length);
    } else {
      this.averageGrade.set(0);
    }

    // Bestehensquote
    if (this.noten.length > 0) {
      const passed = this.noten.filter(n => n.bestanden).length;
      this.overallPassRate.set((passed / this.noten.length) * 100);
    } else {
      this.overallPassRate.set(0);
    }
  }

  private calculateValidationStatus(): void {
    const total = this.noten.length;
    
    // Status: ERFASST -> VALIDIERT -> FREIGEGEBEN
    const erfasst = this.noten.filter(n => n.status === 'ERFASST').length;
    const validiert = this.noten.filter(n => n.status === 'VALIDIERT').length;
    const freigegeben = this.noten.filter(n => n.status === 'FREIGEGEBEN').length;

    // Anzeige: Erfasst (noch nicht validiert), Validiert (noch nicht freigegeben), Freigegeben
    this.erfasstCount.set(erfasst);
    this.validiertCount.set(validiert);
    this.freigegebenCount.set(freigegeben);

    if (total > 0) {
      this.erfasstPercent.set((erfasst / total) * 100);
      this.validiertPercent.set((validiert / total) * 100);
      this.freigegebenPercent.set((freigegeben / total) * 100);
    }
  }

  private calculateStudiengangStats(): void {
    const statsMap = new Map<string, StudiengangStats>();

    for (const e of this.einschreibungen) {
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

  private calculateModulStats(): void {
    const statsMap = new Map<string, ModulStats>();
    const moduleMap = new Map(this.module.map(m => [m.id, m]));

    for (const note of this.noten) {
      const modul = moduleMap.get(note.modulId);
      const key = note.modulId;
      const existing = statsMap.get(key);

      if (existing) {
        existing.totalGrades++;
        if (note.bestanden) {
          existing.passed++;
        } else {
          existing.failed++;
        }
        // Recalculate average
        const allGrades = this.noten.filter(n => n.modulId === key && n.noteWert > 0);
        if (allGrades.length > 0) {
          existing.avgGrade = allGrades.reduce((sum, n) => sum + n.noteWert, 0) / allGrades.length;
        }
        existing.passRate = (existing.passed / existing.totalGrades) * 100;
      } else {
        statsMap.set(key, {
          modulNr: modul?.modulNr || '?',
          name: modul?.name || 'Unbekanntes Modul',
          totalGrades: 1,
          passed: note.bestanden ? 1 : 0,
          failed: note.bestanden ? 0 : 1,
          passRate: note.bestanden ? 100 : 0,
          avgGrade: note.noteWert || 0
        });
      }
    }

    // Sort by pass rate (ascending - worst first)
    const sorted = Array.from(statsMap.values())
      .filter(m => m.totalGrades > 0)
      .sort((a, b) => a.passRate - b.passRate);

    this.modulStats.set(sorted);
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
    const gradeCounts = gradeLabels.map(label => {
      const value = parseFloat(label);
      return this.noten.filter(n => Math.abs(n.noteWert - value) < 0.05).length;
    });

    this.gradeDistributionChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: gradeLabels,
        datasets: [{
          label: 'Anzahl Noten',
          data: gradeCounts,
          backgroundColor: gradeCounts.map((_, i) => {
            const value = parseFloat(gradeLabels[i]);
            if (value <= 2.0) return 'rgba(16, 185, 129, 0.8)';
            if (value <= 3.0) return 'rgba(245, 158, 11, 0.8)';
            if (value <= 4.0) return 'rgba(249, 115, 22, 0.8)';
            return 'rgba(239, 68, 68, 0.8)';
          }),
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }

  private initPassFailChart(): void {
    if (!this.passFailCanvas) return;

    const ctx = this.passFailCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const passed = this.noten.filter(n => n.bestanden).length;
    const failed = this.noten.filter(n => !n.bestanden).length;

    this.passFailChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Bestanden', 'Nicht bestanden'],
        datasets: [{
          data: [passed, failed],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true
            }
          }
        }
      }
    });
  }

  private initAvgByProgramChart(): void {
    if (!this.avgByProgramCanvas) return;

    const ctx = this.avgByProgramCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const stats = this.studiengangStats();
    
    // Durchschnittsnote pro Studiengang berechnen
    const avgByProgram = stats.map(sg => {
      // Finde alle Einschreibungen für diesen Studiengang
      const einschreibungIds = this.einschreibungen
        .filter(e => e.studiengang.kuerzel === sg.kuerzel)
        .map(e => e.id);
      
      // Finde alle Noten für diese Einschreibungen
      const grades = this.noten.filter(n => 
        einschreibungIds.includes(n.einschreibungId) && n.noteWert > 0
      );

      if (grades.length === 0) return 0;
      return grades.reduce((sum, n) => sum + n.noteWert, 0) / grades.length;
    });

    this.avgByProgramChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: stats.map(sg => sg.kuerzel),
        datasets: [{
          label: 'Durchschnittsnote',
          data: avgByProgram,
          backgroundColor: avgByProgram.map(avg => {
            if (avg === 0) return 'rgba(156, 163, 175, 0.5)';
            if (avg <= 2.0) return 'rgba(16, 185, 129, 0.8)';
            if (avg <= 3.0) return 'rgba(245, 158, 11, 0.8)';
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
          legend: { display: false }
        },
        scales: {
          x: {
            min: 1,
            max: 5,
            reverse: true // Bessere Noten (1.0) rechts
          }
        }
      }
    });
  }
}

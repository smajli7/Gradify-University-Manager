import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { SkeletonStateComponent } from '../../shared/components/skeleton-state/skeleton-state.component';

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

// Query für Berechnungsdaten (Studiengang-Service)
const CALCULATION_EINSCHREIBUNG_QUERY = gql`
  query GetCalculationData($einschreibungId: ID!) {
    einschreibung(id: $einschreibungId) {
      id
      studiengang {
        id
        name
        kuerzel
        gesamtEcts
      }
      pruefungsordnung {
        id
        version
        berechnungsart
        module {
          id
          modulNr
          name
          ects
          gewichtung
          inGesamtnote
        }
      }
    }
  }
`;

// Query für Noten (Noten-Service)
const CALCULATION_NOTEN_QUERY = gql`
  query GetCalculationNoten($einschreibungId: ID!) {
    notenByStudent(einschreibungId: $einschreibungId) {
      id
      modulId
      noteWert
      bestanden
      status
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

interface ModulMitNote {
  id: string;
  modulNr: string;
  name: string;
  ects: number;
  gewichtung: number;
  inGesamtnote: boolean;
  noteWert: number | null;
  bestanden: boolean | null;
}

@Component({
  selector: 'app-calculation',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonStateComponent],
  template: `
    <div class="page animate-slide-up">
      <div class="page-header">
        <div class="header-content">
          <h1>Notenberechnung</h1>
          <p class="text-muted">Gesamtnote nach Prüfungsordnung berechnen</p>
        </div>
      </div>

      <!-- Auswahl -->
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
            <span>Berechnen</span>
          }
        </button>
      </div>

      <!-- Loading -->
      @if (loadingStudents() || loading()) {
        <app-skeleton-state [lineCount]="6" />
      }

      <!-- Error -->
      @if (error()) {
        <div class="error-state">
          <span class="error-icon">!</span>
          <p>{{ error() }}</p>
        </div>
      }

      <!-- Results -->
      @if (!loading() && !error() && dataLoaded()) {
        <!-- Result Card -->
        <div class="result-card">
          <div class="result-header">
            <h2>Berechnete Gesamtnote</h2>
            <span class="po-info">{{ berechnungsart() }} nach PO {{ poVersion() }}</span>
          </div>
          
          <div class="result-display">
            <div class="result-grade result-grade--{{ getGradeColor(gesamtnote()) }}">
              {{ gesamtnote() | number:'1.2-2' }}
            </div>
            <div class="result-label">
              @if (gesamtnote() <= 1.5) {
                Sehr gut
              } @else if (gesamtnote() <= 2.5) {
                Gut
              } @else if (gesamtnote() <= 3.5) {
                Befriedigend
              } @else if (gesamtnote() <= 4.0) {
                Ausreichend
              } @else {
                Nicht bestanden
              }
            </div>
          </div>

          <div class="result-stats">
            <div class="stat-item">
              <span class="stat-value">{{ bewertetCount() }}</span>
              <span class="stat-label">Module bewertet</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ gewichtungsSumme() | number:'1.1-1' }}</span>
              <span class="stat-label">Gewichtung gesamt</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ ectsInNote() }}</span>
              <span class="stat-label">ECTS in Note</span>
            </div>
          </div>
        </div>

        <!-- Calculation Details -->
        <div class="details-card">
          <h3>Berechnungsdetails</h3>
          <p class="formula-info">
            Formel: <code>Summe(Note x Gewichtung) / Summe(Gewichtung)</code>
          </p>

          <div class="table-container">
            <table class="calc-table">
              <thead>
                <tr>
                  <th>Modul</th>
                  <th class="col-center">Note</th>
                  <th class="col-center">Gewichtung</th>
                  <th class="col-center">In Gesamtnote</th>
                  <th class="col-right">Beitrag</th>
                </tr>
              </thead>
              <tbody>
                @for (modul of moduleMitNoten(); track modul.id) {
                  <tr [class.row-excluded]="!modul.inGesamtnote || modul.noteWert === null">
                    <td>
                      <div class="modul-info">
                        <span class="modul-nr">{{ modul.modulNr }}</span>
                        <span class="modul-name">{{ modul.name }}</span>
                      </div>
                    </td>
                    <td class="col-center">
                      @if (modul.noteWert !== null) {
                        <span class="note-badge note-badge--{{ getGradeColor(modul.noteWert) }}">
                          {{ modul.noteWert | number:'1.1-1' }}
                        </span>
                      } @else {
                        <span class="note-badge note-badge--muted">-</span>
                      }
                    </td>
                    <td class="col-center">
                      <span class="weight-badge">{{ modul.gewichtung }}x</span>
                    </td>
                    <td class="col-center">
                      @if (modul.inGesamtnote) {
                        <span class="check-icon">Ja</span>
                      } @else {
                        <span class="x-icon">Nein</span>
                      }
                    </td>
                    <td class="col-right">
                      @if (modul.inGesamtnote && modul.noteWert !== null) {
                        <span class="contribution">
                          {{ modul.noteWert * modul.gewichtung | number:'1.2-2' }}
                        </span>
                      } @else {
                        <span class="contribution contribution--excluded">-</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="2"><strong>Summe</strong></td>
                  <td class="col-center"><strong>{{ gewichtungsSumme() | number:'1.1-1' }}</strong></td>
                  <td></td>
                  <td class="col-right"><strong>{{ notenSumme() | number:'1.2-2' }}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Info Box -->
        <div class="info-box">
          <span class="info-icon">i</span>
          <div class="info-content">
            <strong>Hinweis zur Berechnung</strong>
            <p>
              Die Gesamtnote wird nach der Prüfungsordnung {{ poVersion() }} berechnet. 
              Module ohne Note oder ohne Einfluss auf die Gesamtnote (z.B. unbenotete Praktika) 
              werden nicht berücksichtigt.
            </p>
          </div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && !loadingStudents() && !error() && !dataLoaded() && students().length > 0) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="4" y="2" width="16" height="20" rx="2"/>
              <line x1="8" y1="6" x2="16" y2="6"/>
              <line x1="8" y1="10" x2="16" y2="10"/>
              <line x1="8" y1="14" x2="12" y2="14"/>
            </svg>
          </div>
          <h3>Notenberechnung</h3>
          <p>Wählen Sie einen Studenten und eine Einschreibung, um die Gesamtnote zu berechnen.</p>
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
      background: rgba(239, 68, 68, 0.15);
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

    /* Result Card */
    .result-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: var(--spacing-xl);
      margin-bottom: var(--spacing-lg);
      text-align: center;
    }

    .result-header {
      margin-bottom: var(--spacing-lg);
    }

    .result-header h2 {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: 1.25rem;
    }

    .po-info {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .result-display {
      margin-bottom: var(--spacing-lg);
    }

    .result-grade {
      font-size: 4rem;
      font-weight: 700;
      line-height: 1;
      margin-bottom: var(--spacing-sm);
    }

    .result-grade--success { color: var(--color-success); }
    .result-grade--info { color: var(--text-primary); }
    .result-grade--warning { color: var(--color-warning); }
    .result-grade--danger { color: var(--color-danger); }

    .result-label {
      font-size: 1.25rem;
      color: var(--text-secondary);
    }

    .result-stats {
      display: flex;
      justify-content: center;
      gap: var(--spacing-xl);
      padding-top: var(--spacing-lg);
      border-top: 1px solid var(--border-color);
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .stat-item .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .stat-item .stat-label {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    /* Details Card */
    .details-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }

    .details-card h3 {
      margin: 0 0 var(--spacing-sm) 0;
    }

    .formula-info {
      color: var(--text-muted);
      margin-bottom: var(--spacing-md);
    }

    .formula-info code {
      background: var(--bg-deep);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-family: 'JetBrains Mono', monospace;
    }

    /* Table */
    .table-container {
      overflow-x: auto;
    }

    .calc-table {
      width: 100%;
      border-collapse: collapse;
    }

    .calc-table th {
      padding: var(--spacing-sm) var(--spacing-md);
      text-align: left;
      font-weight: 500;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
    }

    .calc-table td {
      padding: var(--spacing-sm) var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
    }

    .calc-table .col-center { text-align: center; }
    .calc-table .col-right { text-align: right; }

    .row-excluded { opacity: 0.5; }

    .modul-info {
      display: flex;
      flex-direction: column;
    }

    .modul-nr {
      font-family: 'JetBrains Mono', monospace;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .modul-name { font-weight: 500; }

    .note-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: var(--radius-md);
      font-weight: 600;
    }

    .note-badge--success { background: rgba(34, 197, 94, 0.15); color: var(--color-success); }
    .note-badge--info { background: rgba(255, 255, 255, 0.15); color: var(--text-primary); }
    .note-badge--warning { background: rgba(255, 184, 0, 0.15); color: var(--color-warning); }
    .note-badge--danger { background: rgba(239, 68, 68, 0.15); color: var(--color-danger); }
    .note-badge--muted { background: var(--bg-hover); color: var(--text-muted); }

    .weight-badge {
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-secondary);
    }

    .check-icon { color: var(--color-success); }
    .x-icon { color: var(--text-muted); }

    .contribution { font-family: 'JetBrains Mono', monospace; font-weight: 500; }
    .contribution--excluded { color: var(--text-muted); }

    .total-row { background: rgba(0, 0, 0, 0.2); }
    .total-row td { border-bottom: none; }

    /* Info Box */
    .info-box {
      display: flex;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: var(--radius-lg);
    }

    .info-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.2);
      color: var(--text-primary);
      border-radius: 50%;
      font-weight: bold;
      flex-shrink: 0;
    }

    .info-content strong { display: block; margin-bottom: var(--spacing-xs); }
    .info-content p { margin: 0; font-size: var(--font-size-sm); color: var(--text-secondary); }

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
      background: var(--text-primary);
      color: var(--bg-deep);
    }

    .btn--primary:hover:not(:disabled) { filter: brightness(1.1); }
    .btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Responsive */
    @media (max-width: 768px) {
      .result-stats { flex-direction: column; gap: var(--spacing-md); }
      .selection-controls { flex-direction: column; }
      .control-group { width: 100%; }
    }
  `]
})
export class CalculationComponent implements OnInit {
  selectedStudent = '';
  selectedEinschreibung = '';
  
  loadingStudents = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  dataLoaded = signal(false);
  
  students = signal<StudentOption[]>([]);
  einschreibungen = signal<EinschreibungOption[]>([]);
  einschreibung = signal<any>(null);
  module = signal<any[]>([]);
  noten = signal<any[]>([]);
  
  poVersion = computed(() => this.einschreibung()?.pruefungsordnung?.version || '');
  
  berechnungsart = computed(() => {
    const art = this.einschreibung()?.pruefungsordnung?.berechnungsart;
    return art === 'GEWICHTET' ? 'Gewichtet' : 'Arithmetisch';
  });
  
  moduleMitNoten = computed((): ModulMitNote[] => {
    const moduleList = this.module();
    const notenList = this.noten();
    const notenMap = new Map(notenList.map(n => [String(n.modulId ?? ''), n]));
    
    return moduleList.map(m => ({
      ...m,
      noteWert: notenMap.get(String(m.id ?? ''))?.noteWert ?? null,
      bestanden: notenMap.get(String(m.id ?? ''))?.bestanden ?? null
    }));
  });
  
  /** Nur bestandene Module (Note ≤ 4.0) in die Berechnung */
  private bestandeneInNote = () =>
    this.moduleMitNoten().filter(m =>
      m.inGesamtnote && m.noteWert != null &&
      (m.bestanden === true || (m.bestanden !== false && m.noteWert <= 4.0))
    );

  bewertetCount = computed(() => this.bestandeneInNote().length);

  gewichtungsSumme = computed(() =>
    this.bestandeneInNote().reduce((sum, m) => sum + m.gewichtung, 0)
  );

  notenSumme = computed(() =>
    this.bestandeneInNote().reduce((sum, m) => sum + (m.noteWert! * m.gewichtung), 0)
  );

  ectsInNote = computed(() =>
    this.bestandeneInNote().reduce((sum, m) => sum + m.ects, 0)
  );
  
  gesamtnote = computed(() => {
    const gewichtung = this.gewichtungsSumme();
    if (gewichtung === 0) return 0;
    return this.notenSumme() / gewichtung;
  });

  constructor(private readonly apollo: Apollo) {}

  ngOnInit(): void {
    this.loadStudents();
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
        const message = err.graphQLErrors?.[0]?.message || err.message || 'Unbekannter Fehler';
        this.error.set('Fehler beim Laden der Einschreibungen: ' + message);
      }
    });
  }

  loadData(): void {
    if (!this.selectedEinschreibung) return;

    this.loading.set(true);
    this.error.set(null);
    this.dataLoaded.set(false);

    const einschreibungQuery = this.apollo.query<any>({
      query: CALCULATION_EINSCHREIBUNG_QUERY,
      variables: { einschreibungId: this.selectedEinschreibung },
      fetchPolicy: 'network-only'
    });

    const notenQuery = this.apollo.query<any>({
      query: CALCULATION_NOTEN_QUERY,
      variables: { einschreibungId: this.selectedEinschreibung },
      context: { clientName: 'noten' },
      fetchPolicy: 'network-only'
    });

    Promise.all([
      einschreibungQuery.toPromise(),
      notenQuery.toPromise()
    ]).then(([einschreibungResult, notenResult]) => {
      const data = einschreibungResult?.data?.einschreibung;
      
      if (!data) {
        this.error.set('Einschreibung nicht gefunden');
        this.loading.set(false);
        return;
      }

      this.einschreibung.set(data);
      this.module.set(data.pruefungsordnung?.module || []);
      this.noten.set(notenResult?.data?.notenByStudent || []);
      
      this.dataLoaded.set(true);
      this.loading.set(false);
    }).catch((err) => {
      console.error('Error loading calculation data:', err);
      this.error.set('Fehler beim Laden der Daten');
      this.loading.set(false);
    });
  }

  getGradeColor(_noteWert: number | null): string {
    return 'muted';
  }
}

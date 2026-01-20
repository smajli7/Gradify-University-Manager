import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Apollo, gql } from 'apollo-angular';
import { AuthService } from '../../../core/services/auth.service';
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
  bestanden: boolean;
  versuch: number;
  pruefungsdatum: string;
  bemerkung: string;
  status: string;
  modulId: string;
  saving?: boolean;
  changed?: boolean;
}

@Component({
  selector: 'app-grade-entry',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="grade-entry-page">
      <header class="page-header">
        <div class="header-content">
          <h1>Notenerfassung</h1>
          <p class="subtitle">Noten für Ihre Module eingeben und bearbeiten</p>
        </div>
      </header>

      @if (loading()) {
        <div class="loading-card card">
          <div class="spinner-large"></div>
          <p>Lade Ihre Module...</p>
        </div>
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

      <!-- Modul-Karten -->
      @for (modul of module(); track modul.id) {
        <div class="modul-card card">
          <div class="modul-header">
            <div class="modul-info">
              <span class="modul-nr">{{ modul.modulNr }}</span>
              <h2>{{ modul.name }}</h2>
              <div class="modul-meta">
                <span class="meta-item">{{ modul.ects }} ECTS</span>
                <span class="meta-item">Semester {{ modul.semester }}</span>
                <span class="meta-item">{{ modul.pruefungsform }}</span>
              </div>
            </div>
            <button class="btn btn-primary" (click)="loadStudentsForModul(modul)">
              {{ selectedModul()?.id === modul.id ? 'Aktualisieren' : 'Studierende laden' }}
            </button>
          </div>

          @if (selectedModul()?.id === modul.id) {
            <div class="students-section">
              @if (loadingStudents()) {
                <div class="loading-small">
                  <div class="spinner"></div>
                  <span>Lade Studierende...</span>
                </div>
              }

              @if (!loadingStudents() && students().length === 0) {
                <p class="text-muted">Keine Studierenden in diesem Modul eingeschrieben</p>
              }

              @if (!loadingStudents() && students().length > 0) {
                <div class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Matrikelnummer</th>
                        <th>Name</th>
                        <th>Semester</th>
                        <th class="col-center">Note</th>
                        <th class="col-center">Bestanden</th>
                        <th class="col-center">Versuch</th>
                        <th>Prüfungsdatum</th>
                        <th>Bemerkung</th>
                        <th class="col-center">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (student of students(); track student.id) {
                        <tr>
                          <td>{{ student.matrikelnummer }}</td>
                          <td>{{ student.vorname }} {{ student.nachname }}</td>
                          <td class="col-center">{{ student.semester }}</td>
                          <td class="col-center">
                            <input 
                              type="number" 
                              class="grade-input"
                              step="0.1"
                              min="1.0"
                              max="5.0"
                              [(ngModel)]="student.noteWert"
                              (change)="onGradeChange(student)"
                              placeholder="--">
                          </td>
                          <td class="col-center">
                            <input 
                              type="checkbox" 
                              class="checkbox"
                              [(ngModel)]="student.bestanden"
                              (change)="onGradeChange(student)">
                          </td>
                          <td class="col-center">
                            <select class="versuch-select" [(ngModel)]="student.versuch" (change)="onGradeChange(student)">
                              <option [value]="1">1</option>
                              <option [value]="2">2</option>
                              <option [value]="3">3</option>
                            </select>
                          </td>
                          <td>
                            <input 
                              type="date" 
                              class="date-input"
                              [(ngModel)]="student.pruefungsdatum"
                              (change)="onGradeChange(student)">
                          </td>
                          <td>
                            <input 
                              type="text" 
                              class="bemerkung-input"
                              [(ngModel)]="student.bemerkung"
                              (change)="onGradeChange(student)"
                              placeholder="Optional">
                          </td>
                          <td class="col-center">
                            @if (student.noteId) {
                              <button class="btn-icon btn-success" (click)="saveGrade(student)" [disabled]="student.saving">
                                @if (student.saving) {
                                  <div class="spinner-small"></div>
                                } @else {
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                }
                              </button>
                            } @else {
                              <button class="btn-icon btn-primary" (click)="saveGrade(student)" [disabled]="student.saving || !student.noteWert">
                                @if (student.saving) {
                                  <div class="spinner-small"></div>
                                } @else {
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                    <polyline points="17 21 17 13 7 13 7 21"/>
                                    <polyline points="7 3 7 8 15 8"/>
                                  </svg>
                                }
                              </button>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div class="action-bar">
                  <button class="btn btn-primary" (click)="saveAllGrades()" [disabled]="savingAll()">
                    @if (savingAll()) {
                      <div class="spinner"></div>
                    }
                    Alle speichern
                  </button>
                  <span class="text-muted">{{ changedCount() }} Änderungen</span>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .grade-entry-page {
      padding: var(--spacing-lg);
      max-width: 1400px;
      margin: 0 auto;
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
      border-top-color: var(--color-primary);
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
      background: var(--color-primary);
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
      border-top-color: var(--color-primary);
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
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(0, 242, 255, 0.1);
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
      background: var(--color-primary);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--color-primary);
      filter: brightness(1.1);
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
      background: rgba(0, 242, 255, 0.15);
      color: var(--color-primary);
    }

    .btn-icon.btn-primary:hover:not(:disabled) {
      background: rgba(0, 242, 255, 0.25);
    }

    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md);
      background: var(--bg-hover);
      border-radius: var(--radius-md);
    }
  `]
})
export class GradeEntryComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apollo = inject(Apollo);
  private readonly authService = inject(AuthService);

  // State
  loading = signal(false);
  loadingStudents = signal(false);
  savingAll = signal(false);
  error = signal<string | null>(null);

  module = signal<ModulInfo[]>([]);
  selectedModul = signal<ModulInfo | null>(null);
  students = signal<StudentWithGrade[]>([]);
  changedCount = signal(0);

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

      this.module.set(result.data?.dozentenModule || []);

      if (this.module().length === 0) {
        this.error.set('Ihnen sind keine Module zugewiesen');
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

      // Maps erstellen
      allStudents.forEach(s => this.allStudents.set(s.id, s));
      einschreibungen.forEach(e => this.einschreibungenMap.set(e.id, e));
      existingNotes.forEach(n => this.existingNotes.set(`${n.einschreibungId}-${n.modulId}`, n));

      // Studierende mit Einschreibungen für dieses Modul
      const studentsWithGrades: StudentWithGrade[] = [];
      
      for (const e of einschreibungen) {
        if (!e.studentId) continue;
        
        const student = this.allStudents.get(e.studentId);
        if (!student) continue;

        const noteKey = `${e.id}-${modul.id}`;
        const existingNote = this.existingNotes.get(noteKey);

        studentsWithGrades.push({
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
          modulId: modul.id,
          saving: false,
          changed: false
        });
      }

      this.students.set(studentsWithGrades);

    } catch (err: any) {
      console.error('Error loading students for modul:', err);
      this.error.set('Fehler beim Laden der Studierenden: ' + (err.message || 'Unbekannter Fehler'));
    } finally {
      this.loadingStudents.set(false);
    }
  }

  onGradeChange(student: any): void {
    student.changed = true;
    this.updateChangedCount();
  }

  private updateChangedCount(): void {
    const count = this.students().filter(s => s.changed).length;
    this.changedCount.set(count);
  }

  async saveGrade(student: any): Promise<void> {
    if (!student.noteWert) return;

    student.saving = true;

    try {
      const payload = {
        einschreibungId: student.einschreibungId,
        modulId: student.modulId,
        noteWert: student.noteWert,
        bestanden: student.bestanden,
        versuch: student.versuch,
        pruefungsdatum: student.pruefungsdatum,
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
      alert('Fehler beim Speichern: ' + (err.error?.message || err.message || 'Unbekannter Fehler'));
    } finally {
      student.saving = false;
    }
  }

  async saveAllGrades(): Promise<void> {
    const changedStudents = this.students().filter(s => s.changed && s.noteWert);
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
}

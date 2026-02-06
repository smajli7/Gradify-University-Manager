import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SkeletonStateComponent } from '../../shared/components/skeleton-state/skeleton-state.component';

// Query für Studentendaten (User-Service)
const GET_STUDENT_QUERY = gql`
  query GetStudent($id: ID!) {
    student(id: $id) {
      id
      matrikelnummer
      vorname
      nachname
      email
      geburtsdatum
      status
      benutzer {
        id
        benutzername
        email
        aktiv
        rollen {
          id
          name
        }
        letzterLogin
        erstelltAm
      }
    }
  }
`;

// Query für Einschreibungen (Studiengang-Service)
const GET_EINSCHREIBUNGEN_QUERY = gql`
  query GetEinschreibungen($studentId: ID!) {
    einschreibungen(studentId: $studentId) {
      id
      aktuellesSemester
      immatrikuliertAm
      status
      studiengang {
        id
        name
        kuerzel
        gesamtEcts
        regelstudienzeit
      }
      pruefungsordnung {
        id
        version
      }
    }
  }
`;

interface StudentData {
  id: string;
  matrikelnummer: string;
  vorname: string;
  nachname: string;
  email: string;
  geburtsdatum?: string;
  status: string;
  benutzer?: {
    id: string;
    benutzername: string;
    email: string;
    aktiv: boolean;
    rollen: Array<{ id: string; name: string }>;
    letzterLogin?: string;
    erstelltAm?: string;
  };
}

interface EinschreibungData {
  id: string;
  aktuellesSemester: number;
  immatrikuliertAm?: string;
  status: string;
  studiengang: {
    id: string;
    name: string;
    kuerzel: string;
    gesamtEcts: number;
    regelstudienzeit: number;
  };
  pruefungsordnung?: {
    id: string;
    version: string;
  };
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonStateComponent],
  template: `
    <div class="page animate-slide-up">
      <div class="page-header">
        <div class="header-content">
          <h1>Mein Profil</h1>
          <p class="text-muted">Persönliche Daten und Einstellungen</p>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <app-skeleton-state [lineCount]="6" />
      }

      <!-- Error State -->
      @if (error()) {
        <div class="error-state">
          <span class="error-icon">⚠️</span>
          <p>{{ error() }}</p>
          <button class="btn btn--primary" (click)="loadProfile()">Erneut versuchen</button>
        </div>
      }

      <!-- Profile Content -->
      @if (!loading() && !error()) {
        <div class="profile-content">
          <!-- Benutzerdaten -->
          <div class="card">
            <div class="card-header">
              <h2>Benutzerdaten</h2>
            </div>
            <div class="card-body">
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Benutzername</span>
                  <span class="info-value">{{ authService.currentUser()?.username || '-' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Vorname</span>
                  <span class="info-value">{{ authService.currentUser()?.vorname || '-' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Nachname</span>
                  <span class="info-value">{{ authService.currentUser()?.nachname || '-' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Rollen</span>
                  <span class="info-value">
                    @for (role of authService.currentUser()?.roles || []; track role) {
                      <span class="role-badge" [ngClass]="getRoleBadgeClass(role)">{{ formatRole(role) }}</span>
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Studentendaten (nur für Studenten) -->
          @if (authService.isStudent() && studentData()) {
            <div class="card">
              <div class="card-header">
                <h2>Studentendaten</h2>
              </div>
              <div class="card-body">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Matrikelnummer</span>
                    <span class="info-value">{{ studentData()!.matrikelnummer || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">E-Mail</span>
                    <span class="info-value">{{ studentData()!.email || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Geburtsdatum</span>
                    <span class="info-value">{{ formatDate(studentData()!.geburtsdatum) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Status</span>
                    <span class="info-value">
                      <span class="status-badge status-badge--{{ studentData()!.status.toLowerCase() }}">
                        {{ formatStatus(studentData()!.status) }}
                      </span>
                    </span>
                  </div>
                  @if (studentData()!.benutzer?.letzterLogin) {
                    <div class="info-item">
                      <span class="info-label">Letzter Login</span>
                      <span class="info-value">{{ formatDateTime(studentData()!.benutzer!.letzterLogin) }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          <!-- Einschreibungen (nur für Studenten) -->
          @if (authService.isStudent() && einschreibungen().length > 0) {
            <div class="card">
              <div class="card-header">
                <h2>Einschreibungen</h2>
              </div>
              <div class="card-body">
                <div class="einschreibungen-list">
                  @for (e of einschreibungen(); track e.id) {
                    <div class="einschreibung-item">
                      <div class="einschreibung-header">
                        <div>
                          <h3>{{ e.studiengang.name }} ({{ e.studiengang.kuerzel }})</h3>
                          <p class="text-muted">Prüfungsordnung {{ e.pruefungsordnung?.version || 'N/A' }}</p>
                        </div>
                        <span class="status-badge status-badge--{{ e.status.toLowerCase() }}">
                          {{ formatStatus(e.status) }}
                        </span>
                      </div>
                      <div class="einschreibung-details">
                        <div class="detail-item">
                          <span class="detail-label">Aktuelles Semester</span>
                          <span class="detail-value">{{ e.aktuellesSemester }}. Semester</span>
                        </div>
                        <div class="detail-item">
                          <span class="detail-label">Regelstudienzeit</span>
                          <span class="detail-value">{{ e.studiengang.regelstudienzeit }} Semester</span>
                        </div>
                        <div class="detail-item">
                          <span class="detail-label">Gesamt ECTS</span>
                          <span class="detail-value">{{ e.studiengang.gesamtEcts }} CP</span>
                        </div>
                        @if (e.immatrikuliertAm) {
                          <div class="detail-item">
                            <span class="detail-label">Immatrikuliert am</span>
                            <span class="detail-value">{{ formatDate(e.immatrikuliertAm) }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          <!-- Empty State für Einschreibungen -->
          @if (authService.isStudent() && einschreibungen().length === 0 && !loading()) {
            <div class="card">
              <div class="card-body">
                <div class="empty-state">
                  <span class="empty-icon">📚</span>
                  <p>Keine Einschreibungen gefunden</p>
                </div>
              </div>
            </div>
          }
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

    /* Loading & Error States */
    .loading-state,
    .error-state {
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

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-icon {
      font-size: 48px;
      margin-bottom: var(--spacing-md);
    }

    /* Profile Content */
    .profile-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    /* Card */
    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      overflow: hidden;
    }

    .card-header {
      padding: var(--spacing-lg);
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-elevated);
    }

    .card-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .card-body {
      padding: var(--spacing-lg);
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: var(--spacing-md);
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .info-label {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-value {
      font-weight: 500;
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
      align-items: center;
    }

    /* Role Badge */
    .role-badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-secondary);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: 500;
    }

    .role-badge--admin {
      background: rgba(220, 38, 38, 0.15);
      color: #DC2626;
      border-color: rgba(220, 38, 38, 0.3);
    }

    .role-badge--hv {
      background: rgba(22, 163, 74, 0.15);
      color: #16A34A;
      border-color: rgba(22, 163, 74, 0.3);
    }

    .role-badge--dozent {
      background: rgba(147, 51, 234, 0.15);
      color: #9333EA;
      border-color: rgba(147, 51, 234, 0.3);
    }

    .role-badge--pa {
      background: rgba(202, 138, 4, 0.15);
      color: #CA8A04;
      border-color: rgba(202, 138, 4, 0.3);
    }

    .role-badge--student {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-secondary);
      border-color: rgba(255, 255, 255, 0.2);
    }

    /* Status Badge */
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: 500;
    }

    .status-badge--aktiv {
      background: rgba(34, 197, 94, 0.15);
      color: #22C55E;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .status-badge--beurlaubt {
      background: rgba(255, 184, 0, 0.15);
      color: var(--color-warning);
      border: 1px solid rgba(255, 184, 0, 0.3);
    }

    .status-badge--exmatrikuliert {
      background: rgba(239, 68, 68, 0.15);
      color: #EF4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    /* Einschreibungen */
    .einschreibungen-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .einschreibung-item {
      padding: var(--spacing-md);
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
    }

    .einschreibung-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-md);
    }

    .einschreibung-header h3 {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .einschreibung-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-md);
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-label {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .detail-value {
      font-weight: 500;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-xl);
      color: var(--text-muted);
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: var(--spacing-md);
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
      border: 1px solid var(--border-color);
      background: var(--bg-elevated);
      color: var(--text-primary);
    }

    .btn--primary {
      background: var(--text-primary);
      color: var(--bg-deep);
      border-color: var(--text-primary);
    }

    .btn--primary:hover:not(:disabled) {
      opacity: 0.9;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .info-grid {
        grid-template-columns: 1fr;
      }

      .einschreibung-header {
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .einschreibung-details {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  private readonly apollo = inject(Apollo);
  readonly authService = inject(AuthService);

  // State
  loading = signal(false);
  error = signal<string | null>(null);
  studentData = signal<StudentData | null>(null);
  einschreibungen = signal<EinschreibungData[]>([]);

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    if (this.authService.isStudent()) {
      this.loadStudentProfile();
    } else {
      // Für Nicht-Studenten zeigen wir nur die Benutzerdaten
      this.loading.set(false);
    }
  }

  loadStudentProfile(): void {
    const studentId = this.authService.getStudentId();
    if (!studentId) {
      this.error.set('Keine Student-ID gefunden. Bitte erneut einloggen.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Lade Studentendaten und Einschreibungen parallel
    const studentQuery = this.apollo.query<{ student: StudentData }>({
      query: GET_STUDENT_QUERY,
      variables: { id: studentId },
      context: { clientName: 'user' },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });

    const einschreibungenQuery = this.apollo.query<{ einschreibungen: EinschreibungData[] }>({
      query: GET_EINSCHREIBUNGEN_QUERY,
      variables: { studentId },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });

    Promise.all([
      firstValueFrom(studentQuery).catch(err => {
        console.error('Student Query Error:', err);
        return { data: null, errors: [{ message: err.message || 'Unbekannter Fehler' }] };
      }),
      firstValueFrom(einschreibungenQuery).catch(err => {
        console.error('Einschreibungen Query Error:', err);
        return { data: null, errors: [{ message: err.message || 'Unbekannter Fehler' }] };
      })
    ]).then(([studentResult, einschreibungenResult]) => {
      console.log('Student Result:', studentResult);
      console.log('Einschreibungen Result:', einschreibungenResult);

      // Studentendaten
      if (studentResult.data?.student) {
        this.studentData.set(studentResult.data.student);
      } else if (studentResult.errors && studentResult.errors.length > 0) {
        console.warn('Student Query Errors:', studentResult.errors);
        // Wenn keine Daten vorhanden sind, zeige Fehler
        if (!studentResult.data) {
          this.error.set(`Fehler beim Laden der Studentendaten: ${studentResult.errors[0].message}`);
          this.loading.set(false);
          return;
        }
      }

      // Einschreibungen
      const einschreibungenList = einschreibungenResult.data?.einschreibungen || [];
      if (einschreibungenList.length > 0) {
        this.einschreibungen.set(einschreibungenList);
      } else if (einschreibungenResult.errors && einschreibungenResult.errors.length > 0) {
        console.warn('Einschreibungen Query Errors:', einschreibungenResult.errors);
        // Wenn keine Daten vorhanden sind, zeige Fehler
        if (!einschreibungenResult.data) {
          this.error.set(`Fehler beim Laden der Einschreibungen: ${einschreibungenResult.errors[0].message}`);
        }
      }

      this.loading.set(false);
    }).catch((err) => {
      console.error('Error loading profile:', err);
      this.error.set(`Fehler beim Laden des Profils: ${err.message || 'Unbekannter Fehler'}`);
      this.loading.set(false);
    });
  }

  formatRole(role: string): string {
    return role.replace('ROLE_', '');
  }

  getRoleBadgeClass(role: string): string {
    const r = role.replace('ROLE_', '').toLowerCase();
    const classMap: Record<string, string> = {
      'admin': 'role-badge--admin',
      'hv': 'role-badge--hv',
      'dozent': 'role-badge--dozent',
      'pa': 'role-badge--pa',
      'student': 'role-badge--student'
    };
    return classMap[r] || '';
  }

  formatStatus(status: string): string {
    const mapping: Record<string, string> = {
      'AKTIV': 'Aktiv',
      'BEURLAUBT': 'Beurlaubt',
      'EXMATRIKULIERT': 'Exmatrikuliert',
      'ABGESCHLOSSEN': 'Abgeschlossen',
      'ABGEBROCHEN': 'Abgebrochen'
    };
    return mapping[status] || status;
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

  formatDateTime(dateString: string | null | undefined): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }
}

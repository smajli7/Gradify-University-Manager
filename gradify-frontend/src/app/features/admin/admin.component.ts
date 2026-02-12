import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';

// GraphQL Queries
const GET_ALL_USERS = gql`
  query GetAllUsers {
    users {
      id
      benutzername
      vorname
      nachname
      email
      aktiv
    }
  }
`;

const GET_ALL_MANDANTEN = gql`
  query GetAllMandanten {
    mandanten {
      id
      name
      kuerzel
      aktiv
    }
  }
`;

const GET_ALL_STUDIENGAENGE = gql`
  query GetAllStudiengaenge {
    studiengaenge {
      id
      name
      kuerzel
    }
  }
`;

const GET_DOZENTEN_MODULE = gql`
  query GetDozentenModule($dozentId: ID!) {
    dozentenModule(dozentId: $dozentId) {
      id
      modulNr
      name
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

interface User {
  id: string;
  benutzername: string;
  vorname: string;
  nachname: string;
  email: string;
  aktiv: boolean;
  rolle?: string;
}

interface Student {
  id: string;
  matrikelnummer: string;
  vorname: string;
  nachname: string;
}

interface Modul {
  id: string;
  modulNr: string;
  name: string;
  ects?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>System-Übersicht</h1>
        <p class="page-subtitle">{{ totalUsers() }} Benutzer an {{ totalMandanten() }} Hochschulen</p>
      </header>

      <!-- KPI strip -->
      <div class="kpi-strip">
        <div class="kpi" *ngFor="let k of kpis()">
          <span class="kpi-val">{{ k.value }}</span>
          <span class="kpi-lbl">{{ k.label }}</span>
        </div>
      </div>

      <!-- Two-column grid: Verwaltung + Auswertung -->
      <div class="cols">
        <!-- Verwaltung -->
        <section class="section-card">
          <h2 class="section-title">Verwaltung</h2>
          <nav class="nav-list">
            <a routerLink="/admin/mandanten" class="nav-item">
              <div class="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div class="nav-text">
                <span class="nav-label">Hochschulen</span>
                <span class="nav-desc">Mandanten, Studiengaenge, Import</span>
              </div>
              <svg class="nav-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </a>
            <a routerLink="/admin/users" class="nav-item">
              <div class="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <div class="nav-text">
                <span class="nav-label">Benutzer</span>
                <span class="nav-desc">Konten, Rollen, Import/Export</span>
              </div>
              <svg class="nav-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </a>
            <a routerLink="/admin/assignments" class="nav-item">
              <div class="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M17.5 14v7m-3.5-3.5h7"/></svg>
              </div>
              <div class="nav-text">
                <span class="nav-label">Zuweisungen</span>
                <span class="nav-desc">Dozenten-Modul-Zuordnung</span>
              </div>
              <svg class="nav-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </a>
          </nav>
        </section>

        <!-- Auswertung -->
        <section class="section-card">
          <h2 class="section-title">Auswertung</h2>
          <nav class="nav-list">
            <a routerLink="/students" class="nav-item">
              <div class="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div class="nav-text">
                <span class="nav-label">Studenten</span>
                <span class="nav-desc">Einschreibungen und Daten</span>
              </div>
              <svg class="nav-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </a>
            <a routerLink="/grades/validation" class="nav-item">
              <div class="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </div>
              <div class="nav-text">
                <span class="nav-label">Validierung</span>
                <span class="nav-desc">Noten pruefen und freigeben</span>
              </div>
              <svg class="nav-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </a>
            <a routerLink="/stats" class="nav-item">
              <div class="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <div class="nav-text">
                <span class="nav-label">Statistik</span>
                <span class="nav-desc">Notenverteilung und Trends</span>
              </div>
              <svg class="nav-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </a>
            <a routerLink="/grades/audit" class="nav-item">
              <div class="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div class="nav-text">
                <span class="nav-label">Protokoll</span>
                <span class="nav-desc">Aenderungshistorie einsehen</span>
              </div>
              <svg class="nav-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </a>
          </nav>
        </section>
      </div>
    </div>
  `,
  styles: [`
    /* Page */
    .page { padding: 0; }
    .page-header { margin-bottom: var(--spacing-xl); }
    .page-header h1 {
      font-size: 1.625rem; font-weight: 700; margin: 0;
      color: var(--text-primary); letter-spacing: -0.02em;
    }
    .page-subtitle {
      font-size: 0.875rem; color: var(--text-muted); margin: 6px 0 0;
    }

    /* KPI strip — single horizontal row, no cards */
    .kpi-strip {
      display: flex; gap: 1px; margin-bottom: var(--spacing-xl);
      background: var(--border-color); border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .kpi {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      padding: 20px 12px; background: var(--bg-surface);
      min-width: 0;
    }
    .kpi-val {
      font-size: 1.5rem; font-weight: 700; color: var(--text-primary);
      line-height: 1; font-variant-numeric: tabular-nums;
    }
    .kpi-lbl {
      font-size: 0.6875rem; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.06em;
      margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      max-width: 100%;
    }

    /* Two-column grid */
    .cols {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: var(--spacing-lg); align-items: start;
    }

    /* Section card */
    .section-card {
      background: var(--bg-surface); border: 1px solid var(--border-color);
      border-radius: var(--radius-lg); overflow: hidden;
    }
    .section-title {
      font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-muted);
      padding: 16px 20px 8px; margin: 0;
    }

    /* Navigation list items */
    .nav-list { display: flex; flex-direction: column; }
    .nav-item {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 20px; color: var(--text-primary);
      text-decoration: none; transition: background 0.15s;
      border-top: 1px solid var(--border-color);
    }
    .nav-item:first-child { border-top: none; }
    .nav-item:hover { background: var(--bg-hover); }

    .nav-icon {
      width: 36px; height: 36px; border-radius: var(--radius-md);
      background: var(--bg-elevated); display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
    }
    .nav-icon svg { width: 18px; height: 18px; color: var(--text-secondary); }
    .nav-item:hover .nav-icon { background: var(--bg-hover); }
    .nav-item:hover .nav-icon svg { color: var(--text-primary); }

    .nav-text { flex: 1; min-width: 0; }
    .nav-label {
      display: block; font-size: 0.875rem; font-weight: 500;
      color: var(--text-primary); line-height: 1.3;
    }
    .nav-desc {
      display: block; font-size: 0.75rem; color: var(--text-muted);
      margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .nav-arrow {
      width: 16px; height: 16px; color: var(--text-disabled);
      flex-shrink: 0; transition: color 0.15s, transform 0.15s;
    }
    .nav-item:hover .nav-arrow {
      color: var(--text-muted); transform: translateX(2px);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .kpi-strip { flex-wrap: wrap; }
      .kpi { flex: 1 1 calc(50% - 1px); }
      .cols { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apollo = inject(Apollo);

  // State
  loadingUsers = signal(false);
  loadingAssignments = signal(false);

  // Data
  users = signal<User[]>([]);
  
  // KPIs
  totalUsers = signal(0);
  totalMandanten = signal(0);
  totalStudiengaenge = signal(0);
  totalGrades = signal(0);
  totalModules = signal(0);

  kpis = computed(() => [
    { value: this.totalUsers(), label: 'Benutzer' },
    { value: this.totalMandanten(), label: 'Hochschulen' },
    { value: this.totalStudiengaenge(), label: 'Studiengaenge' },
    { value: this.totalGrades(), label: 'Noten' },
    { value: this.totalModules(), label: 'Module' }
  ]);

  ngOnInit(): void {
    this.loadOverviewData();
  }

  async loadOverviewData(): Promise<void> {
    try {
      // KPIs laden
      const [usersResult, mandantenResult, studiengaengeResult, notenResponse, moduleResult] = await Promise.all([
        firstValueFrom(this.apollo.query<{ users: User[] }>({
          query: GET_ALL_USERS,
          context: { clientName: 'user' },
          fetchPolicy: 'network-only'
        })),
        firstValueFrom(this.apollo.query<{ mandanten: any[] }>({
          query: GET_ALL_MANDANTEN,
          fetchPolicy: 'network-only'
        })),
        firstValueFrom(this.apollo.query<{ studiengaenge: any[] }>({
          query: GET_ALL_STUDIENGAENGE,
          fetchPolicy: 'network-only'
        })),
        firstValueFrom(this.http.get<ApiResponse<any[]>>('/api/noten')),
        firstValueFrom(this.apollo.query<{ module: Modul[] }>({
          query: GET_ALL_MODULE,
          fetchPolicy: 'network-only'
        }))
      ]);

      this.totalUsers.set(usersResult.data?.users?.length || 0);
      this.totalMandanten.set(mandantenResult.data?.mandanten?.length || 0);
      this.totalStudiengaenge.set(studiengaengeResult.data?.studiengaenge?.length || 0);
      this.totalGrades.set(notenResponse.data?.length || 0);
      this.totalModules.set(moduleResult.data?.module?.length || 0);

      this.users.set(usersResult.data?.users || []);

    } catch (error) {
      console.error('Error loading overview data:', error);
    }
  }

  async loadUsers(): Promise<void> {
    this.loadingUsers.set(true);
    try {
      const result = await firstValueFrom(this.apollo.query<{ users: User[] }>({
        query: GET_ALL_USERS,
        context: { clientName: 'user' },
        fetchPolicy: 'network-only'
      }));
      this.users.set(result.data?.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      this.loadingUsers.set(false);
    }
  }

}

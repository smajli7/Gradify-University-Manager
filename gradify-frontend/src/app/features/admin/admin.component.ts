import { Component, OnInit, inject, signal } from '@angular/core';
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
    <div class="admin-page">
      <header class="page-header">
        <div class="header-content">
          <h1>System-Übersicht</h1>
          <p class="subtitle">Kennzahlen und Schnellzugriff</p>
        </div>
      </header>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card card">
          <div class="kpi-icon users-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <div class="kpi-content">
            <span class="kpi-value">{{ totalUsers() }}</span>
            <span class="kpi-label">Benutzer</span>
          </div>
        </div>

        <div class="kpi-card card">
          <div class="kpi-icon mandanten-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div class="kpi-content">
            <span class="kpi-value">{{ totalMandanten() }}</span>
            <span class="kpi-label">Hochschulen</span>
          </div>
        </div>

        <div class="kpi-card card">
          <div class="kpi-icon studiengaenge-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <div class="kpi-content">
            <span class="kpi-value">{{ totalStudiengaenge() }}</span>
            <span class="kpi-label">Studiengänge</span>
          </div>
        </div>

        <div class="kpi-card card">
          <div class="kpi-icon grades-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="kpi-content">
            <span class="kpi-value">{{ totalGrades() }}</span>
            <span class="kpi-label">Erfasste Noten</span>
          </div>
        </div>

        <div class="kpi-card card">
          <div class="kpi-icon modules-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <div class="kpi-content">
            <span class="kpi-value">{{ totalModules() }}</span>
            <span class="kpi-label">Module</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="actions-section card">
        <h2>Verwaltung</h2>
        <div class="quick-links">
          <a routerLink="/admin/mandanten" class="quick-link-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Hochschulen</span>
            <small>Hochschulen und Studiengänge</small>
          </a>
          <a routerLink="/admin/users" class="quick-link-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            <span>Benutzerverwaltung</span>
            <small>Benutzer anlegen und verwalten</small>
          </a>
          <a routerLink="/admin/assignments" class="quick-link-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>Dozenten-Zuweisungen</span>
            <small>Module zu Dozenten zuordnen</small>
          </a>
        </div>
      </div>

      <!-- Noten-Funktionen (Nebenfunktionen) -->
      <div class="secondary-section card">
        <h2>Noten-Funktionen</h2>
        <div class="secondary-links">
          <a routerLink="/grades/validation" class="secondary-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <span>Notenvalidierung</span>
          </a>
          <a routerLink="/calculation" class="secondary-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            <span>Notenberechnung</span>
          </a>
          <a routerLink="/stats" class="secondary-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <span>Statistik</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page {
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

    /* Tabs */
    .tabs {
      display: flex;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-xl);
      border-bottom: 1px solid var(--border-color);
    }

    .tab {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md) var(--spacing-lg);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-muted);
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
      position: relative;
      bottom: -1px;
    }

    .tab svg {
      width: 20px;
      height: 20px;
    }

    .tab:hover {
      color: var(--text-primary);
      background: var(--bg-hover);
    }

    .tab.active {
      color: var(--text-primary);
      border-bottom-color: var(--text-primary);
    }

    /* Tab Content */
    .tab-content {
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Cards */
    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-xl);
    }

    .kpi-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
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

    .users-icon {
      background: rgba(148, 163, 184, 0.1);
      color: #94A3B8;
    }

    .mandanten-icon {
      background: rgba(148, 163, 184, 0.1);
      color: #94A3B8;
    }

    .studiengaenge-icon {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }

    .grades-icon {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }

    .modules-icon {
      background: rgba(148, 163, 184, 0.1);
      color: #94A3B8;
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

    /* Section Header */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);
    }

    .section-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    /* Quick Links */
    .info-section h2 {
      font-size: 1.125rem;
      margin: 0 0 var(--spacing-md) 0;
    }

    .quick-links {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-md);
    }

    .quick-link-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-lg);
      background: var(--bg-hover);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .quick-link-btn:hover {
      background: var(--bg-elevated);
      border-color: var(--text-secondary);
      color: var(--text-primary);
    }

    .quick-link-btn svg {
      width: 32px;
      height: 32px;
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

    /* Badges */
    .role-badge {
      display: inline-block;
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: var(--text-primary);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge.active {
      background: rgba(16, 185, 129, 0.15);
      color: var(--color-success);
    }

    .status-badge.inactive {
      background: rgba(239, 68, 68, 0.15);
      color: var(--color-danger);
    }

    /* Buttons */
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

    .btn svg {
      width: 16px;
      height: 16px;
    }

    .btn-icon {
      padding: var(--spacing-xs);
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

    .btn-icon:hover {
      border-color: var(--text-secondary);
      color: var(--text-primary);
    }

    .btn-icon svg {
      width: 16px;
      height: 16px;
    }

    /* Loading/Info */
    .loading-card, .info-box {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-xl);
    }

    .loading-card {
      justify-content: center;
    }

    .info-box {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .info-box svg {
      width: 24px;
      height: 24px;
      color: var(--text-secondary);
      flex-shrink: 0;
    }

    .spinner-large {
      width: 48px;
      height: 48px;
      border: 4px solid var(--border-color);
      border-top-color: var(--text-secondary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .actions-section h2, .secondary-section h2 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 var(--spacing-lg) 0;
    }

    .quick-link-btn small {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: var(--spacing-xs);
    }

    /* Secondary Links (Noten-Funktionen) */
    .secondary-section {
      margin-top: var(--spacing-xl);
    }

    .secondary-links {
      display: flex;
      gap: var(--spacing-md);
      flex-wrap: wrap;
    }

    .secondary-link {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-hover);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .secondary-link:hover {
      background: var(--bg-elevated);
      border-color: var(--text-secondary);
      color: var(--text-primary);
    }

    .secondary-link svg {
      width: 18px;
      height: 18px;
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

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';

const GET_ALL_USERS = gql`
  query GetAllUsers {
    users {
      id
      benutzername
      vorname
      nachname
      rollen {
        name
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
      semester
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

interface User {
  id: string;
  benutzername: string;
  vorname: string;
  nachname: string;
  rollen: { name: string }[];
}

interface Modul {
  id: string;
  modulNr: string;
  name: string;
  ects: number;
  semester: string;
}

interface Assignment {
  dozentId: string;
  dozentName: string;
  modulId: string;
  modulNr: string;
  modulName: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-content">
          <h1>Dozenten-Modul-Zuweisungen</h1>
          <p class="subtitle">{{ assignments().length }} Zuweisungen aktiv</p>
        </div>
        <button class="btn btn-primary" (click)="openNewAssignmentModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Neue Zuweisung
        </button>
      </header>

      <div class="info-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>Jeder Dozent kann maximal 3 Module unterrichten</span>
      </div>

      @if (loading()) {
        <div class="loading-card card">
          <div class="spinner-large"></div>
          <p>Lade Zuweisungen...</p>
        </div>
      }

      @if (!loading()) {
        <div class="table-container card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Dozent</th>
                <th>Modul</th>
                <th>ECTS</th>
                <th>Semester</th>
                <th class="col-center">Anzahl Module</th>
                <th class="col-center">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              @for (assignment of assignments(); track assignment.dozentId + assignment.modulId) {
                <tr>
                  <td>{{ assignment.dozentName }}</td>
                  <td>
                    <span class="modul-badge">{{ assignment.modulNr }}</span>
                    {{ assignment.modulName }}
                  </td>
                  <td>{{ getModulEcts(assignment.modulId) }}</td>
                  <td>{{ getModulSemester(assignment.modulId) }}</td>
                  <td class="col-center">
                    <span class="count-badge" [class.warning]="getDozentModuleCount(assignment.dozentId) >= 3">
                      {{ getDozentModuleCount(assignment.dozentId) }}/3
                    </span>
                  </td>
                  <td class="col-center">
                    <button 
                      class="btn-icon btn-delete" 
                      (click)="deleteAssignment(assignment)" 
                      title="Zuweisung löschen">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              }
              @if (assignments().length === 0) {
                <tr>
                  <td colspan="6" class="empty-row">Keine Zuweisungen vorhanden</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Modal: Neue Zuweisung -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Neue Zuweisung erstellen</h2>
              <button class="modal-close" (click)="closeModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group full-width">
                  <label>Dozent*</label>
                  <select class="form-input" [(ngModel)]="selectedDozentId" (change)="onDozentChange()">
                    <option value="">-- Dozent wählen --</option>
                    @for (dozent of dozenten(); track dozent.id) {
                      <option [value]="dozent.id">{{ dozent.vorname }} {{ dozent.nachname }}</option>
                    }
                  </select>
                  @if (selectedDozentId && getDozentModuleCount(selectedDozentId) >= 3) {
                    <span class="error-message">Dieser Dozent hat bereits 3 Module zugewiesen (Maximum erreicht)</span>
                  }
                </div>

                <div class="form-group full-width">
                  <label>Modul*</label>
                  <select class="form-input" [(ngModel)]="selectedModulId">
                    <option value="">-- Modul wählen --</option>
                    @for (modul of availableModules(); track modul.id) {
                      <option [value]="modul.id">{{ modul.modulNr }} - {{ modul.name }} ({{ modul.ects }} ECTS)</option>
                    }
                  </select>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()">Abbrechen</button>
              <button 
                class="btn btn-primary" 
                (click)="saveAssignment()" 
                [disabled]="!selectedDozentId || !selectedModulId || getDozentModuleCount(selectedDozentId) >= 3">
                Zuweisen
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-lg);
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);
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
      background: rgba(0, 242, 255, 0.05);
      border: 1px solid rgba(0, 242, 255, 0.2);
      border-radius: var(--radius-md);
      color: var(--color-primary);
      margin-bottom: var(--spacing-lg);
    }

    .info-banner svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
    }

    .loading-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-2xl);
    }

    .spinner-large {
      width: 48px;
      height: 48px;
      border: 4px solid var(--border-color);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: var(--spacing-md);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

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

    .modul-badge {
      display: inline-block;
      padding: 2px 6px;
      background: rgba(0, 242, 255, 0.1);
      border: 1px solid rgba(0, 242, 255, 0.2);
      color: var(--color-primary);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      margin-right: var(--spacing-xs);
    }

    .count-badge {
      display: inline-block;
      padding: 4px 8px;
      background: rgba(16, 185, 129, 0.1);
      color: var(--color-success);
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .count-badge.warning {
      background: rgba(245, 158, 11, 0.1);
      color: var(--color-warning);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-md);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn svg {
      width: 16px;
      height: 16px;
    }

    .btn-secondary {
      background: var(--bg-hover);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .btn-secondary:hover {
      background: var(--bg-elevated);
      border-color: var(--color-primary);
    }

    .btn-icon {
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

    .btn-icon:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .btn-icon.btn-delete:hover {
      border-color: var(--color-danger);
      color: var(--color-danger);
    }

    .btn-icon svg {
      width: 16px;
      height: 16px;
    }

    .empty-row {
      text-align: center;
      color: var(--text-muted);
      padding: var(--spacing-2xl) !important;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      width: 90%;
      max-width: 500px;
      animation: slideUp 0.3s ease;
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
      font-size: 1.25rem;
      margin: 0;
    }

    .modal-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: var(--spacing-xs);
      display: flex;
      align-items: center;
      transition: color 0.2s;
    }

    .modal-close:hover {
      color: var(--text-primary);
    }

    .modal-close svg {
      width: 20px;
      height: 20px;
    }

    .modal-body {
      padding: var(--spacing-lg);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-sm);
      padding: var(--spacing-lg);
      border-top: 1px solid var(--border-color);
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .form-input {
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-deep);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: 0.9375rem;
      transition: all 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(0, 242, 255, 0.1);
    }

    .error-message {
      color: var(--color-danger);
      font-size: 0.75rem;
      margin-top: var(--spacing-xs);
    }
  `]
})
export class AssignmentsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apollo = inject(Apollo);

  // State
  loading = signal(false);
  showModal = signal(false);
  
  // Data
  users = signal<User[]>([]);
  dozenten = signal<User[]>([]);
  module = signal<Modul[]>([]);
  assignments = signal<Assignment[]>([]);

  // Form
  selectedDozentId = '';
  selectedModulId = '';

  // Available modules (not yet assigned to selected dozent)
  availableModules = signal<Modul[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      // Alle Daten parallel laden
      const [usersResult, moduleResult] = await Promise.all([
        firstValueFrom(this.apollo.query<{ users: User[] }>({
          query: GET_ALL_USERS,
          context: { clientName: 'user' },
          fetchPolicy: 'network-only'
        })),
        firstValueFrom(this.apollo.query<{ module: Modul[] }>({
          query: GET_ALL_MODULE,
          fetchPolicy: 'network-only'
        }))
      ]);

      this.users.set(usersResult.data?.users || []);
      this.module.set(moduleResult.data?.module || []);

      // Filter nur Dozenten (ROLE_LEHRENDER)
      const allUsers = this.users();
      const dozentenList = allUsers.filter(u => 
        u.rollen?.some(r => r.name === 'ROLE_LEHRENDER')
      );
      this.dozenten.set(dozentenList);

      // Lade Zuweisungen für alle Dozenten
      await this.loadAllAssignments();

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadAllAssignments(): Promise<void> {
    const allAssignments: Assignment[] = [];

    for (const dozent of this.dozenten()) {
      try {
        const result = await firstValueFrom(this.apollo.query<{ dozentenModule: Modul[] }>({
          query: GET_DOZENTEN_MODULE,
          variables: { dozentId: dozent.id },
          fetchPolicy: 'network-only'
        }));

        const dozentenModule = result.data?.dozentenModule || [];
        
        for (const modul of dozentenModule) {
          allAssignments.push({
            dozentId: dozent.id,
            dozentName: `${dozent.vorname} ${dozent.nachname}`,
            modulId: modul.id,
            modulNr: modul.modulNr,
            modulName: modul.name
          });
        }
      } catch (error) {
        console.error(`Error loading modules for dozent ${dozent.id}:`, error);
      }
    }

    this.assignments.set(allAssignments);
  }

  openNewAssignmentModal(): void {
    this.selectedDozentId = '';
    this.selectedModulId = '';
    this.availableModules.set([]);
    this.showModal.set(true);
  }

  async onDozentChange(): Promise<void> {
    if (!this.selectedDozentId) {
      this.availableModules.set([]);
      return;
    }

    // Lade bereits zugewiesene Module dieses Dozenten
    try {
      const result = await firstValueFrom(this.apollo.query<{ dozentenModule: Modul[] }>({
        query: GET_DOZENTEN_MODULE,
        variables: { dozentId: this.selectedDozentId },
        fetchPolicy: 'network-only'
      }));

      const assignedIds = new Set(
        (result.data?.dozentenModule || []).map(m => String(m.id ?? ''))
      );
      
      // Filter verfügbare Module (nicht bereits zugewiesen)
      const available = this.module().filter(m => !assignedIds.has(String(m.id ?? '')));
      this.availableModules.set(available);

    } catch (error) {
      console.error('Error loading dozent modules:', error);
      this.availableModules.set(this.module());
    }
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedDozentId = '';
    this.selectedModulId = '';
  }

  async saveAssignment(): Promise<void> {
    if (!this.selectedDozentId || !this.selectedModulId) return;
    if (this.getDozentModuleCount(this.selectedDozentId) >= 3) {
      alert('Dieser Dozent hat bereits das Maximum von 3 Modulen erreicht');
      return;
    }

    try {
      await firstValueFrom(
        this.http.post<ApiResponse<any>>('/api/module-zuweisungen', {
          dozentId: this.selectedDozentId,
          modulId: this.selectedModulId
        })
      );

      this.closeModal();
      await this.loadAllAssignments();

    } catch (error: any) {
      console.error('Error creating assignment:', error);
      alert('Fehler beim Erstellen: ' + (error.error?.message || error.message));
    }
  }

  async deleteAssignment(assignment: Assignment): Promise<void> {
    if (!confirm(`Zuweisung wirklich löschen?\n${assignment.dozentName} → ${assignment.modulName}`)) {
      return;
    }

    try {
      await firstValueFrom(
        this.http.delete<ApiResponse<any>>(
          `/api/module-zuweisungen?dozentId=${assignment.dozentId}&modulId=${assignment.modulId}`
        )
      );

      await this.loadAllAssignments();

    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      alert('Fehler beim Löschen: ' + (error.error?.message || error.message));
    }
  }

  getDozentModuleCount(dozentId: string): number {
    return this.assignments().filter(a => a.dozentId === dozentId).length;
  }

  getModulEcts(modulId: string): number {
    return this.module().find(m => m.id === modulId)?.ects || 0;
  }

  getModulSemester(modulId: string): string {
    return this.module().find(m => m.id === modulId)?.semester || '-';
  }
}

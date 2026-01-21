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
      email
      aktiv
      rollen {
        id
        name
      }
    }
  }
`;

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  benutzername: string;
  vorname: string;
  nachname: string;
  email: string;
  aktiv: boolean;
  rollen: Role[];
}

interface UserFormData {
  username: string;
  password?: string;
  vorname: string;
  nachname: string;
  email: string;
  rolle: string;
  aktiv: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Component({
  selector: 'app-users-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-content">
          <h1>Benutzerverwaltung</h1>
          <p class="subtitle">{{ users().length }} Benutzer registriert</p>
        </div>
        <button class="btn btn-primary" (click)="openNewUserModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Neuer Benutzer
        </button>
      </header>

      @if (loading()) {
        <div class="loading-card card">
          <div class="spinner-large"></div>
          <p>Lade Benutzer...</p>
        </div>
      }

      @if (!loading()) {
        <div class="table-container card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Benutzername</th>
                <th>Name</th>
                <th>Rolle</th>
                <th>E-Mail</th>
                <th class="col-center">Status</th>
                <th class="col-center">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td>
                    <span class="username-badge">{{ user.benutzername }}</span>
                  </td>
                  <td>{{ user.vorname }} {{ user.nachname }}</td>
                  <td>
                    <span class="role-badge" [class]="getRoleClass(user.rollen)">
                      {{ getRoleLabel(user.rollen) }}
                    </span>
                  </td>
                  <td class="email-cell">{{ user.email }}</td>
                  <td class="col-center">
                    <span class="status-badge" [class.active]="user.aktiv" [class.inactive]="!user.aktiv">
                      {{ user.aktiv ? 'Aktiv' : 'Inaktiv' }}
                    </span>
                  </td>
                  <td class="col-center">
                    <div class="action-btns">
                      <button class="btn-icon" (click)="editUser(user)" title="Bearbeiten">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button 
                        class="btn-icon btn-toggle" 
                        (click)="toggleUserStatus(user)" 
                        [title]="user.aktiv ? 'Deaktivieren' : 'Aktivieren'">
                        @if (user.aktiv) {
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        } @else {
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              }
              @if (users().length === 0) {
                <tr>
                  <td colspan="6" class="empty-row">Keine Benutzer gefunden</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Modal: Neuer/Bearbeiten Benutzer -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editMode() ? 'Benutzer bearbeiten' : 'Neuer Benutzer' }}</h2>
              <button class="modal-close" (click)="closeModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group">
                  <label>Benutzername*</label>
                  <input 
                    type="text" 
                    class="form-input"
                    [(ngModel)]="formData.username"
                    placeholder="prof.mueller"
                    [disabled]="editMode()">
                </div>

                @if (!editMode()) {
                  <div class="form-group">
                    <label>Passwort*</label>
                    <input 
                      type="password" 
                      class="form-input"
                      [(ngModel)]="formData.password"
                      placeholder="********">
                  </div>
                }

                <div class="form-group">
                  <label>Vorname*</label>
                  <input 
                    type="text" 
                    class="form-input"
                    [(ngModel)]="formData.vorname"
                    placeholder="Max">
                </div>

                <div class="form-group">
                  <label>Nachname*</label>
                  <input 
                    type="text" 
                    class="form-input"
                    [(ngModel)]="formData.nachname"
                    placeholder="Mustermann">
                </div>

                <div class="form-group full-width">
                  <label>E-Mail*</label>
                  <input 
                    type="email" 
                    class="form-input"
                    [(ngModel)]="formData.email"
                    placeholder="max@example.com">
                </div>

                <div class="form-group">
                  <label>Rolle*</label>
                  <select class="form-input" [(ngModel)]="formData.rolle">
                    <option value="">-- Rolle wählen --</option>
                    <option value="ROLE_STUDENT">Student</option>
                    <option value="ROLE_LEHRENDER">Dozent</option>
                    <option value="ROLE_PRUEFUNGSAMT">Prüfungsamt</option>
                    <option value="ROLE_ADMIN">Admin</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      class="checkbox"
                      [(ngModel)]="formData.aktiv">
                    <span>Benutzer aktiv</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()">Abbrechen</button>
              <button class="btn btn-primary" (click)="saveUser()" [disabled]="!isFormValid()">
                {{ editMode() ? 'Speichern' : 'Anlegen' }}
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

    .username-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      padding: 4px 8px;
      background: rgba(0, 242, 255, 0.1);
      border: 1px solid rgba(0, 242, 255, 0.2);
      color: var(--color-primary);
      border-radius: var(--radius-sm);
      font-weight: 600;
    }

    .email-cell {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .role-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 500;
    }

    .role-badge.role-admin {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .role-badge.role-dozent {
      background: rgba(168, 85, 247, 0.15);
      color: #a855f7;
    }

    .role-badge.role-pruefungsamt {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }

    .role-badge.role-student {
      background: rgba(0, 242, 255, 0.15);
      color: var(--color-primary);
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

    .action-btns {
      display: flex;
      gap: var(--spacing-xs);
      justify-content: center;
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

    .btn-icon.btn-toggle:hover {
      border-color: var(--color-success);
      color: var(--color-success);
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
      animation: fadeIn 0.2s;
    }

    .modal {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
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
      display: grid;
      grid-template-columns: repeat(2, 1fr);
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

    .form-input:disabled {
      background: var(--bg-hover);
      color: var(--text-muted);
      cursor: not-allowed;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      cursor: pointer;
      padding: var(--spacing-sm) 0;
    }

    .checkbox {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }
  `]
})
export class UsersAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apollo = inject(Apollo);

  // State
  loading = signal(false);
  showModal = signal(false);
  editMode = signal(false);
  users = signal<User[]>([]);

  // Form data
  formData: UserFormData = this.getEmptyFormData();
  editingUserId: string | null = null;

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.apollo.query<{ users: User[] }>({
        query: GET_ALL_USERS,
        context: { clientName: 'user' },
        fetchPolicy: 'network-only'
      }));
      this.users.set(result.data?.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Fehler beim Laden der Benutzer');
    } finally {
      this.loading.set(false);
    }
  }

  openNewUserModal(): void {
    this.editMode.set(false);
    this.editingUserId = null;
    this.formData = this.getEmptyFormData();
    this.showModal.set(true);
  }

  editUser(user: User): void {
    this.editMode.set(true);
    this.editingUserId = user.id;
    this.formData = {
      username: user.benutzername,
      vorname: user.vorname,
      nachname: user.nachname,
      email: user.email,
      rolle: user.rollen.length > 0 ? user.rollen[0].name : '',
      aktiv: user.aktiv
    };
    this.showModal.set(true);
  }

  getRoleLabel(rollen: Role[]): string {
    if (!rollen || rollen.length === 0) return 'Keine Rolle';
    const role = rollen[0].name;
    switch (role) {
      case 'ROLE_ADMIN': return 'Admin';
      case 'ROLE_LEHRENDER': return 'Dozent';
      case 'ROLE_PRUEFUNGSAMT': return 'Prüfungsamt';
      case 'ROLE_STUDENT': return 'Student';
      default: return role.replace('ROLE_', '');
    }
  }

  getRoleClass(rollen: Role[]): string {
    if (!rollen || rollen.length === 0) return '';
    const role = rollen[0].name;
    switch (role) {
      case 'ROLE_ADMIN': return 'role-admin';
      case 'ROLE_LEHRENDER': return 'role-dozent';
      case 'ROLE_PRUEFUNGSAMT': return 'role-pruefungsamt';
      case 'ROLE_STUDENT': return 'role-student';
      default: return '';
    }
  }

  closeModal(): void {
    this.showModal.set(false);
    this.formData = this.getEmptyFormData();
    this.editingUserId = null;
  }

  async saveUser(): Promise<void> {
    if (!this.isFormValid()) return;

    try {
      if (this.editMode() && this.editingUserId) {
        // Update user
        await firstValueFrom(
          this.http.put<ApiResponse<User>>(`/api/users/${this.editingUserId}`, this.formData)
        );
      } else {
        // Create user
        await firstValueFrom(
          this.http.post<ApiResponse<User>>('/api/users', this.formData)
        );
      }

      this.closeModal();
      await this.loadUsers();

    } catch (error: any) {
      console.error('Error saving user:', error);
      alert('Fehler beim Speichern: ' + (error.error?.message || error.message));
    }
  }

  async toggleUserStatus(user: User): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch<ApiResponse<User>>(`/api/users/${user.id}/toggle-status`, {})
      );
      await this.loadUsers();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      alert('Fehler: ' + (error.error?.message || error.message));
    }
  }

  isFormValid(): boolean {
    if (!this.formData.username || !this.formData.vorname || 
        !this.formData.nachname || !this.formData.email || !this.formData.rolle) {
      return false;
    }
    if (!this.editMode() && !this.formData.password) {
      return false;
    }
    return true;
  }

  private getEmptyFormData(): UserFormData {
    return {
      username: '',
      password: '',
      vorname: '',
      nachname: '',
      email: '',
      rolle: '',
      aktiv: true
    };
  }
}

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { SkeletonCardComponent } from '../../../shared/components/skeleton-card/skeleton-card.component';

const GET_ALL_USERS = gql`
  query GetAllUsers {
    users {
      id
      benutzername
      vorname
      nachname
      email
      mandantId
      aktiv
      rollen {
        id
        name
      }
    }
  }
`;

const GET_MANDANTEN = gql`
  query GetMandanten {
    mandanten {
      id
      name
      kuerzel
      aktiv
    }
  }
`;

interface Role {
  id: string;
  name: string;
}

interface Mandant {
  id: string;
  name: string;
  kuerzel: string;
  aktiv: boolean;
}

interface User {
  id: string;
  benutzername: string;
  vorname: string;
  nachname: string;
  email: string;
  mandantId?: string;
  aktiv: boolean;
  rollen: Role[];
}

interface RoleInfo {
  id: number;
  name: string;
}

interface UserFormData {
  username: string;
  password?: string;
  vorname: string;
  nachname: string;
  email: string;
  rolle: string;
  mandantId: string;
  aktiv: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: number;
}

@Component({
  selector: 'app-users-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonCardComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-content">
          <h1>Benutzerverwaltung</h1>
          <p class="subtitle">
            {{ filteredUsers().length }} von {{ users().length }} Benutzer
            @if (hasActiveFilters()) { <span class="filter-hint">(gefiltert)</span> }
          </p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="exportUsers()" [disabled]="filteredUsers().length === 0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
          <button class="btn btn-secondary" (click)="openImportModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import
          </button>
          <button class="btn btn-primary" (click)="openNewUserModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Neuer Benutzer
          </button>
        </div>
      </header>

      @if (loading()) {
        <app-skeleton-card [lines]="6" />
      }

      @if (!loading()) {
        <div class="filters-bar card">
          <div class="filters-row">
            <div class="filter-group filter-search">
              <label>Suche</label>
              <input 
                type="text" 
                class="form-input form-input--search" 
                placeholder="Benutzername, Name, E-Mail..."
                [ngModel]="searchTerm()"
                (ngModelChange)="searchTerm.set($event)">
            </div>
            <div class="filter-group">
              <label>Hochschule</label>
              <select class="form-input" [ngModel]="filterMandantId()" (ngModelChange)="filterMandantId.set($event)">
                <option value="">Alle Hochschulen</option>
                @for (m of mandanten(); track m.id) {
                  <option [value]="m.id">{{ m.name }} ({{ m.kuerzel }})</option>
                }
              </select>
            </div>
            <div class="filter-group">
              <label>Rolle</label>
              <select class="form-input" [ngModel]="filterRolle()" (ngModelChange)="filterRolle.set($event)">
                <option value="">Alle Rollen</option>
                    <option value="ROLE_ADMIN">Admin</option>
                    <option value="ROLE_HOCHSCHUL_VERWALTER">Hochschul-Verwalter</option>
                    <option value="ROLE_LEHRENDER">Dozent</option>
                    <option value="ROLE_PRUEFUNGSAMT">Prüfungsamt</option>
                    <option value="ROLE_STUDENT">Student</option>
              </select>
            </div>
            @if (hasActiveFilters()) {
              <button class="btn btn-secondary btn-sm" (click)="clearFilters()">Filter zurücksetzen</button>
            }
          </div>
        </div>
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
              @for (user of filteredUsers(); track user.id) {
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
              @if (filteredUsers().length === 0) {
                <tr>
                  <td colspan="6" class="empty-row">
                    @if (hasActiveFilters()) {
                      Keine Benutzer entsprechen den Filtern
                    } @else {
                      Keine Benutzer gefunden
                    }
                  </td>
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
                    <option value="ROLE_HOCHSCHUL_VERWALTER">Hochschul-Verwalter</option>
                    <option value="ROLE_ADMIN">Admin</option>
                  </select>
                </div>

                @if (!editMode() && (formData.rolle === 'ROLE_HOCHSCHUL_VERWALTER' || formData.rolle === 'ROLE_PRUEFUNGSAMT')) {
                  <div class="form-group full-width">
                    <label>Hochschule*</label>
                    <select class="form-input" [(ngModel)]="formData.mandantId" required>
                      <option value="">-- Hochschule wählen --</option>
                      @for (m of mandanten(); track m.id) {
                        <option [value]="m.id">{{ m.name }} ({{ m.kuerzel }})</option>
                      }
                    </select>
                    <span class="form-hint">Für Hochschul-Verwalter und Prüfungsamt muss die zugeordnete Hochschule gewählt werden.</span>
                  </div>
                }

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

      <!-- Modal: CSV Import -->
      @if (showImportModal()) {
        <div class="modal-overlay" (click)="closeImportModal()">
          <div class="modal modal--wide" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Benutzer importieren</h2>
              <button class="modal-close" (click)="closeImportModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div class="modal-body">
              <div class="import-info">
                <h3>CSV-Format</h3>
                <p class="text-muted">Importieren Sie Benutzer mit einer CSV-Datei (Semikolon-getrennt, UTF-8).</p>
                
                <div class="format-example">
                  <div class="format-cols">
                    <span class="col-tag">Benutzername</span>
                    <span class="col-tag">Vorname</span>
                    <span class="col-tag">Nachname</span>
                    <span class="col-tag">Email</span>
                    <span class="col-tag col-tag--role">Rolle</span>
                    <span class="col-tag col-tag--pw">Passwort</span>
                    <span class="col-tag">Aktiv</span>
                  </div>
                </div>

                <div class="format-values">
                  <strong>Rollen:</strong> STUDENT, LEHRENDER, PRUEFUNGSAMT, ADMIN
                </div>

                <button class="btn btn-secondary btn-sm" (click)="downloadTemplate()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Vorlage herunterladen
                </button>
              </div>

              <div class="upload-area" 
                   [class.upload-area--dragover]="isDragover"
                   (dragover)="onDragOver($event)"
                   (dragleave)="onDragLeave($event)"
                   (drop)="onDrop($event)"
                   (click)="fileInput.click()">
                <input #fileInput type="file" accept=".csv" (change)="onFileSelected($event)" hidden>
                
                @if (!selectedFile()) {
                  <div class="upload-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p>CSV-Datei hierher ziehen oder klicken</p>
                } @else {
                  <div class="file-selected">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span>{{ selectedFile()!.name }}</span>
                    <button class="remove-file" (click)="removeFile($event)">×</button>
                  </div>
                }
              </div>

              @if (importResult()) {
                <div class="import-result">
                  <h4>Import abgeschlossen</h4>
                  <div class="result-stats">
                    <div class="stat stat--success">
                      <span class="stat-value">{{ importResult()!.created }}</span>
                      <span class="stat-label">erstellt</span>
                    </div>
                    <div class="stat stat--muted">
                      <span class="stat-value">{{ importResult()!.skipped }}</span>
                      <span class="stat-label">übersprungen</span>
                    </div>
                  </div>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeImportModal()">
                {{ importResult() ? 'Schließen' : 'Abbrechen' }}
              </button>
              @if (!importResult()) {
                <button class="btn btn-primary" (click)="importUsers()" [disabled]="importing() || !selectedFile()">
                  @if (importing()) {
                    Importiere...
                  } @else {
                    Import starten
                  }
                </button>
              }
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
      border-top-color: var(--text-primary);
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
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
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
      background: rgba(220, 38, 38, 0.12);
      color: #DC2626;
    }

    .role-badge.role-hochschul {
      background: rgba(22, 163, 74, 0.12);
      color: #16A34A;
    }

    .role-badge.role-dozent {
      background: rgba(147, 51, 234, 0.12);
      color: #9333EA;
    }

    .role-badge.role-pruefungsamt {
      background: rgba(202, 138, 4, 0.12);
      color: #CA8A04;
    }

    .role-badge.role-student {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-secondary);
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
      border-color: var(--text-secondary);
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
      border-color: var(--text-secondary);
      color: var(--text-primary);
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
      border-color: var(--text-secondary);
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.06);
    }

    .form-input:disabled {
      background: var(--bg-hover);
      color: var(--text-muted);
      cursor: not-allowed;
    }

    .form-hint {
      display: block;
      margin-top: var(--spacing-xs);
      font-size: var(--font-size-sm);
      color: var(--text-muted);
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

    .filters-bar {
      margin-bottom: var(--spacing-lg);
    }

    .filters-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--spacing-md);
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      min-width: 160px;
    }

    .filter-group.filter-search {
      flex: 1;
      min-width: 200px;
    }

    .filter-group label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .form-input--search {
      max-width: 320px;
    }

    .filter-hint {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .btn-sm {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: 0.875rem;
    }

    .header-actions {
      display: flex;
      gap: var(--spacing-sm);
    }

    .modal--wide {
      max-width: 640px;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 0.875rem;
    }

    .import-info h3 {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: 1rem;
    }

    .format-example {
      background: var(--bg-deep);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: var(--spacing-md);
      margin: var(--spacing-md) 0;
    }

    .format-cols {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .col-tag {
      padding: 2px 8px;
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
    }

    .col-tag--role {
      background: rgba(147, 51, 234, 0.12);
      color: #9333EA;
    }

    .col-tag--pw {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .format-values {
      margin: var(--spacing-md) 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .upload-area {
      border: 2px dashed var(--border-color);
      border-radius: var(--radius-lg);
      padding: var(--spacing-xl);
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      background: var(--bg-deep);
      margin-top: var(--spacing-lg);
    }

    .upload-area:hover {
      border-color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.03);
    }

    .upload-area--dragover {
      border-color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.06);
    }

    .upload-icon {
      color: var(--text-muted);
      margin-bottom: var(--spacing-md);
    }

    .upload-icon svg {
      width: 48px;
      height: 48px;
    }

    .file-selected {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      color: var(--color-success);
    }

    .file-selected svg {
      width: 24px;
      height: 24px;
    }

    .remove-file {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0 4px;
    }

    .remove-file:hover {
      color: var(--color-danger);
    }

    .import-result {
      margin-top: var(--spacing-lg);
      padding: var(--spacing-lg);
      background: rgba(0, 255, 136, 0.05);
      border: 1px solid rgba(0, 255, 136, 0.3);
      border-radius: var(--radius-lg);
    }

    .import-result h4 {
      margin: 0 0 var(--spacing-md) 0;
      color: var(--color-success);
    }

    .result-stats {
      display: flex;
      gap: var(--spacing-xl);
    }

    .result-stats .stat {
      display: flex;
      flex-direction: column;
    }

    .result-stats .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .result-stats .stat--success .stat-value {
      color: var(--color-success);
    }

    .result-stats .stat--muted .stat-value {
      color: var(--text-muted);
    }

    .result-stats .stat-label {
      font-size: 0.875rem;
      color: var(--text-muted);
    }
  `]
})
export class UsersAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apollo = inject(Apollo);
  private readonly toast = inject(ToastService);

  // State
  loading = signal(false);
  showModal = signal(false);
  editMode = signal(false);
  users = signal<User[]>([]);
  mandanten = signal<Mandant[]>([]);

  // Filter (als Signals, damit computed() bei Änderung neu berechnet wird)
  searchTerm = signal('');
  filterMandantId = signal('');
  filterRolle = signal('');

  filteredUsers = computed(() => {
    let list = this.users();
    const search = this.searchTerm()?.trim().toLowerCase();
    const mandantId = this.filterMandantId()?.trim();
    const rolle = this.filterRolle()?.trim();

    if (search) {
      list = list.filter(u => {
        const text = `${u.benutzername} ${u.vorname} ${u.nachname} ${u.email}`.toLowerCase();
        return text.includes(search);
      });
    }
    if (mandantId) {
      list = list.filter(u => String(u.mandantId ?? '') === String(mandantId));
    }
    if (rolle) {
      list = list.filter(u => u.rollen?.some(r => r.name === rolle));
    }
    return list;
  });

  hasActiveFilters(): boolean {
    return !!(this.searchTerm()?.trim() || this.filterMandantId() || this.filterRolle());
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.filterMandantId.set('');
    this.filterRolle.set('');
  }

  // Import State
  showImportModal = signal(false);
  importing = signal(false);
  selectedFile = signal<File | null>(null);
  importResult = signal<ImportResult | null>(null);
  isDragover = false;

  // Form data
  formData: UserFormData = this.getEmptyFormData();
  editingUserId: string | null = null;

  // Rolle Name -> ID für API-Payload
  private rolesMap = new Map<string, number>();
  private readonly DEFAULT_MANDANT_ID = 1;

  ngOnInit(): void {
    this.loadRoles();
    this.loadMandanten();
    this.loadUsers();
  }

  async loadMandanten(): Promise<void> {
    try {
      const result = await firstValueFrom(this.apollo.query<{ mandanten: Mandant[] }>({
        query: GET_MANDANTEN,
        context: { clientName: 'studiengang' },
        fetchPolicy: 'network-only'
      }));
      this.mandanten.set(result.data?.mandanten || []);
    } catch (err) {
      console.error('Error loading mandanten:', err);
    }
  }

  private async loadRoles(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ success: boolean; data: RoleInfo[] }>('/api/users/roles'));
      const roles = res?.data ?? [];
      this.rolesMap.clear();
      for (const r of roles) {
        this.rolesMap.set(r.name, r.id);
      }
    } catch {
      // Fallback: Standard-IDs aus data.sql
      this.rolesMap.set('ROLE_STUDENT', 1);
      this.rolesMap.set('ROLE_LEHRENDER', 2);
      this.rolesMap.set('ROLE_PRUEFUNGSAMT', 3);
      this.rolesMap.set('ROLE_STUDIENGANGLEITUNG', 4);
      this.rolesMap.set('ROLE_HOCHSCHUL_VERWALTER', 6);
      this.rolesMap.set('ROLE_ADMIN', 5);
    }
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
      this.toast.error('Fehler beim Laden der Benutzer');
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
      mandantId: user.mandantId ?? '',
      aktiv: user.aktiv
    };
    this.showModal.set(true);
  }

  getRoleLabel(rollen: Role[]): string {
    if (!rollen || rollen.length === 0) return 'Keine Rolle';
    const role = rollen[0].name;
    switch (role) {
      case 'ROLE_ADMIN': return 'Admin';
      case 'ROLE_HOCHSCHUL_VERWALTER': return 'Hochschul-Verwalter';
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
      case 'ROLE_HOCHSCHUL_VERWALTER': return 'role-hochschul';
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

  /** Erstellt API-Payload: CreateBenutzerRequest (neu) oder UpdateBenutzerRequest (Update) */
  private buildUserPayload(isUpdate: boolean): Record<string, unknown> {
    const roleId = this.formData.rolle ? this.rolesMap.get(this.formData.rolle) : undefined;
    const payload: Record<string, unknown> = {
      benutzername: this.formData.username,
      vorname: this.formData.vorname,
      nachname: this.formData.nachname,
      email: this.formData.email,
      rollenIds: roleId != null ? [roleId] : []
    };
    if (!isUpdate) {
      const mandantId = this.formData.mandantId?.trim();
      payload['mandantId'] = mandantId ? Number(mandantId) : this.DEFAULT_MANDANT_ID;
      payload['passwort'] = this.formData.password ?? '';
    } else if (this.formData.password && this.formData.password.length >= 8) {
      payload['passwort'] = this.formData.password;
    }
    return payload;
  }

  async saveUser(): Promise<void> {
    if (!this.isFormValid()) return;

    const isUpdate = this.editMode() && !!this.editingUserId;
    const payload = this.buildUserPayload(isUpdate);

    try {
      if (isUpdate) {
        await firstValueFrom(
          this.http.put<ApiResponse<User>>(`/api/users/${this.editingUserId}`, payload)
        );
      } else {
        await firstValueFrom(
          this.http.post<ApiResponse<User>>('/api/users', payload)
        );
      }

      this.closeModal();
      await this.loadUsers();

    } catch (error: any) {
      console.error('Error saving user:', error);
      const msg = this.extractErrorMessage(error);
      this.toast.error('Fehler beim Speichern: ' + msg);
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
      this.toast.error('Fehler: ' + (error.error?.message || error.message));
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
    const needsMandant = !this.editMode() && 
      (this.formData.rolle === 'ROLE_HOCHSCHUL_VERWALTER' || this.formData.rolle === 'ROLE_PRUEFUNGSAMT');
    if (needsMandant && !this.formData.mandantId?.trim()) {
      return false;
    }
    return true;
  }

  /** Extrahiert lesbare Fehlermeldung aus HttpErrorResponse / ApiResponse / Spring Validation */
  private extractErrorMessage(error: unknown): string {
    if (!error || typeof error !== 'object') return 'Unbekannter Fehler';
    const e = error as { error?: unknown; status?: number; message?: string };
    const body = e.error;
    if (body && typeof body === 'object') {
      const b = body as { message?: string; errors?: Array<{ field?: string; defaultMessage?: string }> };
      if (b.message) return b.message;
      if (Array.isArray(b.errors) && b.errors.length > 0) {
        return b.errors.map((x: { field?: string; defaultMessage?: string }) =>
          (x.field ? x.field + ': ' : '') + (x.defaultMessage ?? '')).join('; ');
      }
    }
    if (e.status === 0) return 'Verbindung fehlgeschlagen. Sind alle Services gestartet?';
    return e.message ?? 'Unbekannter Fehler';
  }

  private getEmptyFormData(): UserFormData {
    return {
      username: '',
      password: '',
      vorname: '',
      nachname: '',
      email: '',
      rolle: '',
      mandantId: '',
      aktiv: true
    };
  }

  // ========== EXPORT ==========
  async exportUsers(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get('/api/users/export', { responseType: 'text' })
      );
      
      const blob = new Blob([response], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `benutzer_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      this.toast.error('Export fehlgeschlagen. Ist der User-Service gestartet?');
    }
  }

  // ========== IMPORT ==========
  openImportModal(): void {
    this.selectedFile.set(null);
    this.importResult.set(null);
    this.showImportModal.set(true);
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
    if (this.importResult()) {
      this.loadUsers();
    }
  }

  async downloadTemplate(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get('/api/users/import/template', { responseType: 'text' })
      );
      
      const blob = new Blob([response], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'benutzer_template.csv';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Template download failed:', error);
      this.toast.error('Vorlage konnte nicht heruntergeladen werden.');
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    if (!file.name.endsWith('.csv')) {
      this.toast.warning('Bitte nur CSV-Dateien hochladen');
      return;
    }
    this.selectedFile.set(file);
    this.importResult.set(null);
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile.set(null);
    this.importResult.set(null);
  }

  async importUsers(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    this.importing.set(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await firstValueFrom(
        this.http.post<ApiResponse<ImportResult>>('/api/users/import', formData)
      );

      if (response.success && response.data) {
        this.importResult.set(response.data);
      }

    } catch (error: any) {
      console.error('Import error:', error);
      this.toast.error('Import fehlgeschlagen: ' + (error.error?.message || error.message || 'Unbekannter Fehler'));
    } finally {
      this.importing.set(false);
    }
  }
}

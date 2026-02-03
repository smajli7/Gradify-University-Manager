import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Apollo, gql } from 'apollo-angular';
import { AuthService } from '../../../core/services/auth.service';

const LOAD_TIMEOUT_MS = 15000;

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
    }
  }
`;

const GET_ALL_MODULE = gql`
  query GetAllModule {
    module {
      id
      name
      modulNr
    }
  }
`;

const GET_ALL_USERS = gql`
  query GetAllUsers {
    users {
      id
      vorname
      nachname
      benutzername
    }
  }
`;

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface Note {
  id: string;
  modulId: string;
  einschreibungId: string;
  noteWert: number | null;
  bestanden: boolean;
  status: string;
  pruefungsdatum: string;
  versuch: number;
  kommentar: string | null;
  erfasstAm: string;
  erfasstVon: string;
  validiertAm: string | null;
  validiertVon: string | null;
  // Extended fields
  studentName?: string;
  modulName?: string;
  erfasstVonName?: string;
  validiertVonName?: string;
  selected?: boolean;
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
}

interface ModulInfo {
  id: string;
  name: string;
  modulNr: string;
}

interface UserInfo {
  id: string;
  vorname: string;
  nachname: string;
  benutzername: string;
}

@Component({
  selector: 'app-validation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page animate-slide-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Notenvalidierung</h1>
          <p class="text-muted">Noten prüfen und freigeben</p>
        </div>
        <div class="header-stats">
          <div class="stat-badge stat-badge--warning">
            <span class="stat-value">{{ pendingCount() }}</span>
            <span class="stat-label">Ausstehend</span>
          </div>
          <div class="stat-badge stat-badge--info">
            <span class="stat-value">{{ validatedCount() }}</span>
            <span class="stat-label">Validiert</span>
          </div>
          <div class="stat-badge stat-badge--success">
            <span class="stat-value">{{ releasedCount() }}</span>
            <span class="stat-label">Freigegeben</span>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="filter-group">
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()">
            <option value="all">Alle Status</option>
            <option value="ERFASST">Erfasst (ausstehend)</option>
            <option value="VALIDIERT">Validiert</option>
            <option value="FREIGEGEBEN">Freigegeben</option>
          </select>
        </div>
        
        <div class="search-wrapper">
          <span class="search-icon material-icons-outlined">search</span>
          <input 
            type="text" 
            class="search-input" 
            placeholder="Suche nach Student, Modul..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="applyFilters()">
        </div>

        @if (selectedCount() > 0) {
          <div class="batch-actions">
            <button class="btn btn--primary" (click)="batchValidate()" [disabled]="processing()">
              <span class="material-icons-outlined">check</span>
              {{ selectedCount() }} validieren
            </button>
            <button class="btn btn--success" (click)="batchRelease()" [disabled]="processing()">
              <span class="material-icons-outlined">verified</span>
              {{ selectedCount() }} freigeben
            </button>
          </div>
        }
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner-lg"></div>
          <p>Lade Noten...</p>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="error-state">
          <span class="material-icons-outlined">error</span>
          <p>{{ error() }}</p>
          <button class="btn btn--primary" (click)="loadData()">Erneut versuchen</button>
        </div>
      }

      <!-- Data Table -->
      @if (!loading() && !error()) {
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-checkbox">
                  <input 
                    type="checkbox" 
                    [checked]="allSelected()"
                    (change)="toggleSelectAll($event)">
                </th>
                <th class="col-student">Student</th>
                <th class="col-modul">Modul</th>
                <th class="col-note">Note</th>
                <th class="col-status">Status</th>
                <th class="col-datum">Prüfungsdatum</th>
                <th class="col-versuch">Versuch</th>
                <th class="col-actions">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              @for (note of filteredNoten(); track note.id) {
                <tr [class.selected]="note.selected" [class.status-erfasst]="note.status === 'ERFASST'" [class.status-validiert]="note.status === 'VALIDIERT'">
                  <td class="col-checkbox">
                    <input 
                      type="checkbox" 
                      [checked]="note.selected"
                      (change)="toggleSelect(note)">
                  </td>
                  <td class="col-student">
                    @if (note.studentName) {
                      <div class="cell-content">
                        <span class="student-name">{{ note.studentName }}</span>
                      </div>
                    } @else {
                      <div class="cell-content cell-content--muted">
                        <span class="material-icons-outlined">person</span>
                        <span class="id-text">{{ note.einschreibungId.substring(0, 8) }}...</span>
                      </div>
                    }
                  </td>
                  <td class="col-modul">
                    @if (note.modulName) {
                      <div class="cell-content">
                        <span class="modul-name">{{ note.modulName }}</span>
                      </div>
                    } @else {
                      <div class="cell-content cell-content--muted">
                        <span class="material-icons-outlined">book</span>
                        <span class="id-text">{{ note.modulId.substring(0, 8) }}...</span>
                      </div>
                    }
                  </td>
                  <td class="col-note">
                    @if (note.noteWert !== null) {
                      <span class="note-value" [class]="getNoteClass(note.noteWert)">
                        {{ note.noteWert | number:'1.1-1' }}
                      </span>
                    } @else {
                      <span class="note-value note-value--bestanden">
                        {{ note.bestanden ? 'Bestanden' : '-' }}
                      </span>
                    }
                  </td>
                  <td class="col-status">
                    <span class="status-badge" [class]="'status-badge--' + note.status.toLowerCase()">
                      {{ getStatusLabel(note.status) }}
                    </span>
                  </td>
                  <td class="col-datum">{{ formatDate(note.pruefungsdatum) }}</td>
                  <td class="col-versuch">{{ note.versuch }}. Versuch</td>
                  <td class="col-actions">
                    <div class="action-buttons">
                      @if (note.status === 'ERFASST') {
                        <button 
                          class="action-btn action-btn--validate" 
                          title="Validieren"
                          (click)="validateNote(note)"
                          [disabled]="processing()">
                          <span class="material-icons-outlined">check</span>
                        </button>
                      }
                      @if (note.status === 'ERFASST' || note.status === 'VALIDIERT') {
                        <button 
                          class="action-btn action-btn--release" 
                          title="Freigeben"
                          (click)="releaseNote(note)"
                          [disabled]="processing()">
                          <span class="material-icons-outlined">verified</span>
                        </button>
                      }
                      <button 
                        class="action-btn action-btn--info" 
                        title="Details anzeigen"
                        (click)="showDetails(note)">
                        <span class="material-icons-outlined">info</span>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="empty-cell">
                    @if (statusFilter() === 'all' && !searchTerm()) {
                      Keine Noten vorhanden
                    } @else {
                      Keine Noten gefunden für die ausgewählten Filter
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Summary -->
        <div class="summary-bar">
          <span>{{ filteredNoten().length }} von {{ noten().length }} Noten angezeigt</span>
        </div>
      }

      <!-- Detail Modal -->
      @if (selectedNote()) {
        <div class="modal-overlay" (click)="closeDetails()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Notendetails</h2>
              <button class="modal-close" (click)="closeDetails()">
                <span class="material-icons-outlined">close</span>
              </button>
            </div>
            <div class="modal-body">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Student</span>
                  <span class="detail-value">{{ selectedNote()!.studentName || selectedNote()!.einschreibungId }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Modul</span>
                  <span class="detail-value">{{ selectedNote()!.modulName || selectedNote()!.modulId }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Note</span>
                  <span class="detail-value">
                    {{ selectedNote()!.noteWert !== null ? (selectedNote()!.noteWert | number:'1.1-1') : (selectedNote()!.bestanden ? 'Bestanden' : '-') }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Status</span>
                  <span class="detail-value">{{ getStatusLabel(selectedNote()!.status) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Prüfungsdatum</span>
                  <span class="detail-value">{{ formatDate(selectedNote()!.pruefungsdatum) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Versuch</span>
                  <span class="detail-value">{{ selectedNote()!.versuch }}. Versuch</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Erfasst am</span>
                  <span class="detail-value">{{ formatDate(selectedNote()!.erfasstAm) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Erfasst von</span>
                  <span class="detail-value">{{ selectedNote()!.erfasstVonName || selectedNote()!.erfasstVon || '-' }}</span>
                </div>
                @if (selectedNote()!.validiertAm) {
                  <div class="detail-item">
                    <span class="detail-label">Validiert am</span>
                    <span class="detail-value">{{ formatDate(selectedNote()!.validiertAm!) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Validiert von</span>
                    <span class="detail-value">{{ selectedNote()!.validiertVonName || selectedNote()!.validiertVon || '-' }}</span>
                  </div>
                }
                @if (selectedNote()!.kommentar) {
                  <div class="detail-item detail-item--full">
                    <span class="detail-label">Kommentar</span>
                    <span class="detail-value">{{ selectedNote()!.kommentar }}</span>
                  </div>
                }
              </div>
            </div>
            <div class="modal-footer">
              @if (selectedNote()!.status === 'ERFASST') {
                <button class="btn btn--primary" (click)="validateNote(selectedNote()!); closeDetails()">
                  Validieren
                </button>
              }
              @if (selectedNote()!.status === 'ERFASST' || selectedNote()!.status === 'VALIDIERT') {
                <button class="btn btn--success" (click)="releaseNote(selectedNote()!); closeDetails()">
                  Freigeben
                </button>
              }
              <button class="btn btn--secondary" (click)="closeDetails()">Schließen</button>
            </div>
          </div>
        </div>
      }

      <!-- Success Message -->
      @if (successMessage()) {
        <div class="toast toast--success animate-slide-up">
          <span class="material-icons-outlined">check_circle</span>
          {{ successMessage() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-md) 0;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-lg);
      flex-wrap: wrap;
      gap: var(--spacing-md);
    }

    .header-content h1 {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: 1.75rem;
      font-weight: 600;
    }

    .header-stats {
      display: flex;
      gap: var(--spacing-sm);
    }

    .stat-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-lg);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
    }

    .stat-badge--warning {
      border-color: rgba(245, 158, 11, 0.3);
      background: rgba(245, 158, 11, 0.1);
    }

    .stat-badge--warning .stat-value {
      color: var(--color-warning);
    }

    .stat-badge--info {
      border-color: rgba(59, 130, 246, 0.3);
      background: rgba(59, 130, 246, 0.1);
    }

    .stat-badge--info .stat-value {
      color: var(--color-info);
    }

    .stat-badge--success {
      border-color: rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.1);
    }

    .stat-badge--success .stat-value {
      color: var(--color-success);
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
    }

    .stat-label {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    .toolbar {
      display: flex;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
      flex-wrap: wrap;
      align-items: center;
    }

    .filter-select {
      padding: 12px 36px 12px 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      color: var(--text-primary);
      font-size: 0.95rem;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%238B949E'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
    }

    .filter-select:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .search-wrapper {
      position: relative;
      flex: 1;
      max-width: 400px;
    }

    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 20px;
    }

    .search-input {
      width: 100%;
      padding: 12px 40px 12px 44px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      color: var(--text-primary);
      font-size: 0.95rem;
      transition: all 0.2s ease;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(0, 242, 255, 0.1);
    }

    .search-input::placeholder {
      color: var(--text-muted);
    }

    .batch-actions {
      display: flex;
      gap: var(--spacing-sm);
      margin-left: auto;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-md);
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn--primary {
      background: var(--color-primary);
      color: var(--bg-primary);
    }

    .btn--primary:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn--success {
      background: var(--color-success);
      color: white;
    }

    .btn--success:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn--secondary {
      background: var(--bg-surface);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }

    .btn--secondary:hover {
      background: var(--bg-hover);
    }

    .btn .material-icons-outlined {
      font-size: 1.125rem;
    }

    .loading-state, .error-state {
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
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: var(--spacing-md);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-state .material-icons-outlined {
      font-size: 48px;
      color: var(--color-danger);
      margin-bottom: var(--spacing-md);
    }

    .table-container {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      overflow: hidden;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th {
      padding: var(--spacing-md);
      text-align: left;
      font-weight: 500;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--border-color);
    }

    .data-table td {
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
    }

    .data-table tbody tr {
      transition: background 0.15s ease;
    }

    .data-table tbody tr:hover {
      background: var(--bg-hover);
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .data-table tbody tr.selected {
      background: rgba(0, 242, 255, 0.05);
    }

    .data-table tbody tr.status-erfasst {
      border-left: 3px solid var(--color-warning);
    }

    .data-table tbody tr.status-validiert {
      border-left: 3px solid var(--color-info);
    }

    .col-checkbox {
      width: 40px;
      text-align: center;
    }

    .cell-content {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .cell-content--muted {
      color: var(--color-text-muted);
      font-size: 0.8125rem;
    }

    .cell-content--muted .material-icons-outlined {
      font-size: 1rem;
      opacity: 0.6;
    }

    .id-text {
      font-family: monospace;
      font-size: 0.75rem;
    }

    .student-name, .modul-name {
      font-weight: 500;
    }

    .note-value {
      font-weight: 600;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: var(--font-size-sm);
    }

    .note-value--success { background: rgba(16, 185, 129, 0.15); color: var(--color-success); }
    .note-value--info { background: rgba(59, 130, 246, 0.15); color: var(--color-info); }
    .note-value--warning { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
    .note-value--danger { background: rgba(239, 68, 68, 0.15); color: var(--color-danger); }
    .note-value--bestanden { background: rgba(16, 185, 129, 0.15); color: var(--color-success); }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: 500;
    }

    .status-badge--erfasst {
      background: rgba(245, 158, 11, 0.15);
      color: var(--color-warning);
    }

    .status-badge--validiert {
      background: rgba(59, 130, 246, 0.15);
      color: var(--color-info);
    }

    .status-badge--freigegeben {
      background: rgba(16, 185, 129, 0.15);
      color: var(--color-success);
    }

    .action-buttons {
      display: flex;
      gap: var(--spacing-xs);
    }

    .action-btn {
      background: none;
      border: none;
      padding: 6px;
      cursor: pointer;
      color: var(--text-muted);
      border-radius: var(--radius-md);
      transition: all 0.15s ease;
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-btn:hover:not(:disabled) {
      background: var(--bg-hover);
      color: var(--color-primary);
    }

    .action-btn--validate:hover:not(:disabled) {
      color: var(--color-primary);
    }

    .action-btn--release:hover:not(:disabled) {
      color: var(--color-success);
    }

    .action-btn--info:hover {
      color: var(--color-info);
    }

    .empty-cell {
      text-align: center;
      padding: var(--spacing-2xl) !important;
      color: var(--text-muted);
    }

    .empty-cell .material-icons-outlined {
      font-size: 48px;
      margin-bottom: var(--spacing-sm);
      opacity: 0.5;
    }

    .summary-bar {
      display: flex;
      justify-content: space-between;
      padding: var(--spacing-md);
      background: rgba(0, 0, 0, 0.1);
      border-top: 1px solid var(--border-color);
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.2s ease;
    }

    @keyframes slideUp {
      from { 
        opacity: 0; 
        transform: translateY(10px) scale(0.98);
      }
      to { 
        opacity: 1; 
        transform: translateY(0) scale(1);
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
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .modal-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--text-muted);
      border-radius: var(--radius-md);
      transition: all 0.15s ease;
    }

    .modal-close:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .modal-body {
      padding: var(--spacing-lg);
      overflow-y: auto;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-sm);
      padding: var(--spacing-lg);
      border-top: 1px solid var(--border-color);
      background: rgba(0, 0, 0, 0.1);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-lg);
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item--full {
      grid-column: 1 / -1;
    }

    .detail-label {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-value {
      font-size: 0.95rem;
      color: var(--text-primary);
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: var(--spacing-lg);
      right: var(--spacing-lg);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: 1001;
    }

    .toast--success {
      background: var(--color-success);
      color: white;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
      }

      .header-stats {
        width: 100%;
        justify-content: space-between;
      }

      .toolbar {
        flex-direction: column;
        align-items: stretch;
      }

      .search-wrapper {
        max-width: none;
      }

      .batch-actions {
        margin-left: 0;
        justify-content: stretch;
      }

      .batch-actions .btn {
        flex: 1;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ValidationComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly apollo = inject(Apollo);
  
  // Lookup maps for names
  private readonly studentenMap = new Map<string, StudentInfo>();
  private readonly einschreibungToStudentMap = new Map<string, string>();
  private readonly moduleMap = new Map<string, ModulInfo>();
  private readonly usersMap = new Map<string, UserInfo>();

  // State
  loading = signal(true);
  error = signal<string | null>(null);
  processing = signal(false);
  successMessage = signal<string | null>(null);

  noten = signal<Note[]>([]);
  
  statusFilter = signal<string>('all');
  searchTerm = signal<string>('');
  
  selectedNote = signal<Note | null>(null);

  // Computed
  filteredNoten = computed(() => {
    let result = this.noten();
    
    // Status filter
    if (this.statusFilter() !== 'all') {
      result = result.filter(n => n.status === this.statusFilter());
    }
    
    // Search filter
    const search = this.searchTerm().toLowerCase();
    if (search) {
      const safeStr = (v: unknown) => (v != null ? String(v) : '');
      result = result.filter(n => 
        (n.studentName?.toLowerCase().includes(search)) ||
        (n.modulName?.toLowerCase().includes(search)) ||
        safeStr(n.einschreibungId).toLowerCase().includes(search) ||
        safeStr(n.modulId).toLowerCase().includes(search)
      );
    }
    
    return result;
  });

  pendingCount = computed(() => this.noten().filter(n => n.status === 'ERFASST').length);
  validatedCount = computed(() => this.noten().filter(n => n.status === 'VALIDIERT').length);
  releasedCount = computed(() => this.noten().filter(n => n.status === 'FREIGEGEBEN').length);
  
  selectedCount = computed(() => this.filteredNoten().filter(n => n.selected).length);
  allSelected = computed(() => {
    const filtered = this.filteredNoten();
    return filtered.length > 0 && filtered.every(n => n.selected);
  });

  ngOnInit(): void {
    // Read query params for student filter (from students page)
    this.route.queryParams.subscribe(params => {
      if (params['student']) {
        this.searchTerm.set(params['student']);
      } else if (params['matrikel']) {
        this.searchTerm.set(params['matrikel']);
      }
    });
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const withTimeout = <T>(p: Promise<T>, label: string): Promise<T> =>
      Promise.race([
        p,
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error(`${label} Zeitüberschreitung (${LOAD_TIMEOUT_MS / 1000}s)`)), LOAD_TIMEOUT_MS)
        )
      ]);

    try {
      // Lade Noten zuerst (Hauptdaten) – Rest sind Lookups
      const notenResponse = await withTimeout(
        firstValueFrom(this.http.get<ApiResponse<Note[]>>('/api/noten')),
        'Noten'
      );
      const rawNoten = notenResponse?.data ?? [];

      // Lookups parallel, einzeln abfangen – bei Fehler leere Listen
      const [studentsResult, einschreibungenResult, moduleResult, usersResult] = await Promise.all([
        withTimeout(
          firstValueFrom(this.apollo.query<{ students: StudentInfo[] }>({
            query: GET_ALL_STUDENTS,
            context: { clientName: 'user' },
            fetchPolicy: 'network-only'
          })),
          'Studenten'
        ).catch(() => ({ data: { students: [] } })),
        withTimeout(
          firstValueFrom(this.apollo.query<{ einschreibungen: EinschreibungInfo[] }>({
            query: GET_ALL_EINSCHREIBUNGEN,
            fetchPolicy: 'network-only'
          })),
          'Einschreibungen'
        ).catch(() => ({ data: { einschreibungen: [] } })),
        withTimeout(
          firstValueFrom(this.apollo.query<{ module: ModulInfo[] }>({
            query: GET_ALL_MODULE,
            fetchPolicy: 'network-only'
          })),
          'Module'
        ).catch(() => ({ data: { module: [] } })),
        withTimeout(
          firstValueFrom(this.apollo.query<{ users: UserInfo[] }>({
            query: GET_ALL_USERS,
            context: { clientName: 'user' },
            fetchPolicy: 'network-only'
          })),
          'Benutzer'
        ).catch(() => ({ data: { users: [] } }))
      ]);

      // Lookup-Maps aufbauen (IDs als String für einheitlichen Zugriff)
      this.studentenMap.clear();
      (studentsResult.data?.students || []).forEach(s => this.studentenMap.set(String(s.id), s));
      this.einschreibungToStudentMap.clear();
      (einschreibungenResult.data?.einschreibungen || []).forEach(e => {
        this.einschreibungToStudentMap.set(String(e.id), String(e.studentId));
      });
      this.moduleMap.clear();
      (moduleResult.data?.module || []).forEach(m => this.moduleMap.set(String(m.id), m));
      this.usersMap.clear();
      (usersResult.data?.users || []).forEach(u => this.usersMap.set(String(u.id), u));

      const enrichedNoten = rawNoten.map(n => this.enrichNote(n));
      this.noten.set(enrichedNoten);
    } catch (err: unknown) {
      const e = err as { error?: { message?: string }; message?: string };
      console.error('Error loading validation data:', err);
      this.error.set('Fehler beim Laden: ' + (e?.error?.message ?? e?.message ?? 'Unbekannter Fehler'));
    } finally {
      this.loading.set(false);
    }
  }

  private enrichNote(n: Note): Note {
    const eid = String(n.einschreibungId ?? '');
    const mid = String(n.modulId ?? '');
    const studentId = this.einschreibungToStudentMap.get(eid);
    const student = studentId ? this.studentenMap.get(String(studentId)) : null;
    const modul = this.moduleMap.get(mid);
    const erfasstVonUser = n.erfasstVon ? this.usersMap.get(String(n.erfasstVon)) : null;
    const validiertVonUser = n.validiertVon ? this.usersMap.get(String(n.validiertVon)) : null;
    return {
      ...n,
      id: String(n.id),
      einschreibungId: eid,
      modulId: mid,
      erfasstVon: String(n.erfasstVon ?? ''),
      validiertVon: n.validiertVon != null ? String(n.validiertVon) : null,
      selected: false,
      studentName: student ? `${student.vorname} ${student.nachname}` : undefined,
      modulName: modul ? `${modul.modulNr} - ${modul.name}` : undefined,
      erfasstVonName: erfasstVonUser ? `${erfasstVonUser.vorname} ${erfasstVonUser.nachname}` : undefined,
      validiertVonName: validiertVonUser ? `${validiertVonUser.vorname} ${validiertVonUser.nachname}` : undefined
    };
  }

  applyFilters(): void {
    // Filters are applied via computed signal
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const filtered = this.filteredNoten();
    const notenList = this.noten();
    
    const updatedNoten = notenList.map(n => {
      if (filtered.some(f => f.id === n.id)) {
        return { ...n, selected: checked };
      }
      return n;
    });
    
    this.noten.set(updatedNoten);
  }

  toggleSelect(note: Note): void {
    const notenList = this.noten();
    const updatedNoten = notenList.map(n => 
      n.id === note.id ? { ...n, selected: !n.selected } : n
    );
    this.noten.set(updatedNoten);
  }

  async validateNote(note: Note): Promise<void> {
    this.processing.set(true);
    try {
      await firstValueFrom(
        this.http.post(`/api/noten/${note.id}/validate`, null)
      );
      this.showSuccess('Note validiert');
      await this.loadData();
    } catch (err: any) {
      console.error('Error validating note:', err);
      this.error.set('Fehler beim Validieren: ' + (err.error?.message || err.message || 'Unbekannter Fehler'));
    } finally {
      this.processing.set(false);
    }
  }

  async releaseNote(note: Note): Promise<void> {
    this.processing.set(true);
    try {
      await firstValueFrom(
        this.http.post(`/api/noten/${note.id}/release`, null)
      );
      this.showSuccess('Note freigegeben');
      await this.loadData();
    } catch (err: any) {
      console.error('Error releasing note:', err);
      this.error.set('Fehler beim Freigeben: ' + (err.error?.message || err.message || 'Unbekannter Fehler'));
    } finally {
      this.processing.set(false);
    }
  }

  async batchValidate(): Promise<void> {
    const selected = this.filteredNoten().filter(n => n.selected && n.status === 'ERFASST');
    this.processing.set(true);
    
    try {
      for (const note of selected) {
        await firstValueFrom(
          this.http.post(`/api/noten/${note.id}/validate`, null)
        );
      }
      this.showSuccess(`${selected.length} Noten validiert`);
      await this.loadData();
    } catch (err: any) {
      console.error('Error batch validating:', err);
      this.error.set('Fehler beim Batch-Validieren: ' + (err.error?.message || err.message || 'Unbekannter Fehler'));
    } finally {
      this.processing.set(false);
    }
  }

  async batchRelease(): Promise<void> {
    const selected = this.filteredNoten().filter(n => n.selected && (n.status === 'ERFASST' || n.status === 'VALIDIERT'));
    this.processing.set(true);
    
    try {
      for (const note of selected) {
        // Wenn ERFASST, erst validieren
        if (note.status === 'ERFASST') {
          await firstValueFrom(
            this.http.post(`/api/noten/${note.id}/validate`, null)
          );
        }
        // Dann freigeben
        await firstValueFrom(
          this.http.post(`/api/noten/${note.id}/release`, null)
        );
      }
      this.showSuccess(`${selected.length} Noten freigegeben`);
      await this.loadData();
    } catch (err: any) {
      console.error('Error batch releasing:', err);
      this.error.set('Fehler beim Batch-Freigeben: ' + (err.error?.message || err.message || 'Unbekannter Fehler'));
    } finally {
      this.processing.set(false);
    }
  }

  showDetails(note: Note): void {
    this.selectedNote.set(note);
  }

  closeDetails(): void {
    this.selectedNote.set(null);
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  formatDate(dateString: string | null): string {
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

  getNoteClass(noteWert: number): string {
    if (noteWert <= 1.5) return 'note-value--success';
    if (noteWert <= 2.5) return 'note-value--info';
    if (noteWert <= 3.5) return 'note-value--warning';
    return 'note-value--danger';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'ERFASST': 'Erfasst',
      'VALIDIERT': 'Validiert',
      'FREIGEGEBEN': 'Freigegeben'
    };
    return labels[status] || status;
  }
}

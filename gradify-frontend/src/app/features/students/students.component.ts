import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StudentService } from '../../core/services/student.service';
import { Student, StudentStatus } from '../../types';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page animate-slide-up">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Studenten</h1>
          <p class="text-muted">{{ studentService.totalCount() }} Studenten insgesamt</p>
        </div>
        <div class="header-stats">
          <div class="stat-badge stat-badge--success">
            <span class="stat-value">{{ studentService.activeCount() }}</span>
            <span class="stat-label">Aktiv</span>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-wrapper">
          <span class="search-icon material-icons-outlined">search</span>
          <input 
            type="text" 
            class="search-input" 
            placeholder="Suche nach Name, Matrikelnr., E-Mail..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearch($event)">
          @if (searchTerm()) {
            <button class="clear-btn" (click)="clearSearch()">
              <span class="material-icons-outlined">close</span>
            </button>
          }
        </div>
        
        <div class="filter-group">
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="onStatusFilter($event)">
            <option [ngValue]="null">Alle Status</option>
            <option [ngValue]="StudentStatus.AKTIV">Aktiv</option>
            <option [ngValue]="StudentStatus.BEURLAUBT">Beurlaubt</option>
            <option [ngValue]="StudentStatus.EXMATRIKULIERT">Exmatrikuliert</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      @if (studentService.loading()) {
        <div class="loading-state">
          <div class="spinner-lg"></div>
          <p>Lade Studenten...</p>
        </div>
      }

      <!-- Error State -->
      @if (studentService.error()) {
        <div class="error-state">
          <span class="material-icons-outlined">error</span>
          <p>{{ studentService.error() }}</p>
          <button class="btn btn--primary" (click)="loadStudents()">Erneut versuchen</button>
        </div>
      }

      <!-- Data Table -->
      @if (!studentService.loading() && !studentService.error()) {
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-matrikel">Matrikelnr.</th>
                <th class="col-name">Name</th>
                <th class="col-email">E-Mail</th>
                <th class="col-status">Status</th>
                <th class="col-actions">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              @for (student of filteredStudents(); track student.id) {
                <tr class="table-row" (click)="openDetail(student)">
                  <td class="col-matrikel">
                    <span class="matrikel-badge">{{ student.matrikelnummer }}</span>
                  </td>
                  <td class="col-name">
                    <div class="name-cell">
                      <div class="avatar">{{ getInitials(student) }}</div>
                      <div class="name-info">
                        <span class="full-name">{{ student.vorname }} {{ student.nachname }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="col-email">{{ student.email }}</td>
                  <td class="col-status">
                    <span class="status-badge status-badge--{{ studentService.getStatusColor(student.status) }}">
                      {{ studentService.getStatusLabel(student.status) }}
                    </span>
                  </td>
                  <td class="col-actions">
                    <button class="action-btn" title="Details anzeigen" (click)="openDetail(student); $event.stopPropagation()">
                      <span class="material-icons-outlined">visibility</span>
                    </button>
                    <button class="action-btn" title="Noten anzeigen" (click)="viewGrades(student); $event.stopPropagation()">
                      <span class="material-icons-outlined">grade</span>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="empty-state">
                    <span class="material-icons-outlined">search_off</span>
                    <p>Keine Studenten gefunden</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Info -->
        <div class="table-footer">
          <span class="result-count">{{ filteredStudents().length }} von {{ studentService.totalCount() }} Studenten</span>
        </div>
      }

      <!-- Detail Modal -->
      @if (selectedStudent()) {
        <div class="modal-overlay" (click)="closeDetail()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Studentendetails</h2>
              <button class="close-btn" (click)="closeDetail()">
                <span class="material-icons-outlined">close</span>
              </button>
            </div>
            <div class="modal-body">
              <div class="detail-avatar">{{ getInitials(selectedStudent()!) }}</div>
              <h3 class="detail-name">{{ selectedStudent()!.vorname }} {{ selectedStudent()!.nachname }}</h3>
              
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Matrikelnummer</span>
                  <span class="detail-value">{{ selectedStudent()!.matrikelnummer }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">E-Mail</span>
                  <span class="detail-value">{{ selectedStudent()!.email }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Status</span>
                  <span class="status-badge status-badge--{{ studentService.getStatusColor(selectedStudent()!.status) }}">
                    {{ studentService.getStatusLabel(selectedStudent()!.status) }}
                  </span>
                </div>
                @if (selectedStudent()!.geburtsdatum) {
                  <div class="detail-item">
                    <span class="detail-label">Geburtsdatum</span>
                    <span class="detail-value">{{ selectedStudent()!.geburtsdatum }}</span>
                  </div>
                }
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn--secondary" (click)="closeDetail()">Schließen</button>
              <button class="btn btn--primary" (click)="viewGrades(selectedStudent()!)">
                <span class="material-icons-outlined">grade</span>
                Noten anzeigen
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-md) 0;
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-lg);
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

    .stat-badge--success {
      border-color: rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.1);
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-success);
    }

    .stat-label {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
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

    .clear-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      display: flex;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .clear-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
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

    /* Table */
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

    .table-row {
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .table-row:hover {
      background: var(--bg-hover);
    }

    .table-row:last-child td {
      border-bottom: none;
    }

    /* Column widths */
    .col-matrikel { width: 130px; }
    .col-name { width: auto; }
    .col-email { width: 220px; }
    .col-status { width: 120px; }
    .col-actions { width: 100px; text-align: right; }

    /* Cell styles */
    .matrikel-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: var(--font-size-sm);
      padding: 4px 8px;
      background: rgba(0, 242, 255, 0.1);
      border: 1px solid rgba(0, 242, 255, 0.2);
      border-radius: var(--radius-md);
      color: var(--color-primary);
    }

    .name-cell {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: white;
    }

    .full-name {
      font-weight: 500;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: 500;
    }

    .status-badge--success {
      background: rgba(16, 185, 129, 0.15);
      color: var(--color-success);
    }

    .status-badge--warning {
      background: rgba(245, 158, 11, 0.15);
      color: var(--color-warning);
    }

    .status-badge--danger {
      background: rgba(239, 68, 68, 0.15);
      color: var(--color-danger);
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

    .action-btn:hover {
      background: var(--bg-hover);
      color: var(--color-primary);
    }

    .empty-state {
      text-align: center;
      padding: var(--spacing-2xl) !important;
      color: var(--text-muted);
    }

    .empty-state .material-icons-outlined {
      font-size: 48px;
      margin-bottom: var(--spacing-sm);
      opacity: 0.5;
    }

    /* Table Footer */
    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md);
      color: var(--text-muted);
      font-size: var(--font-size-sm);
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
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

    .modal-content {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      overflow: auto;
      animation: slideUp 0.2s ease;
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
      margin: 0;
      font-size: 1.25rem;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: var(--radius-md);
      transition: all 0.15s ease;
    }

    .close-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .modal-body {
      padding: var(--spacing-lg);
      text-align: center;
    }

    .detail-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 600;
      color: white;
      margin: 0 auto var(--spacing-md);
    }

    .detail-name {
      margin: 0 0 var(--spacing-lg) 0;
      font-size: 1.25rem;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-md);
      text-align: left;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-label {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-value {
      font-weight: 500;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-sm);
      padding: var(--spacing-lg);
      border-top: 1px solid var(--border-color);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: 10px 18px;
      border-radius: var(--radius-lg);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn--primary {
      background: var(--color-primary);
      border: none;
      color: var(--bg-deep);
    }

    .btn--primary:hover {
      filter: brightness(1.1);
    }

    .btn--secondary {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .btn--secondary:hover {
      background: var(--bg-hover);
    }

    .btn .material-icons-outlined {
      font-size: 18px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .toolbar {
        flex-direction: column;
      }

      .search-wrapper {
        max-width: none;
      }

      .col-email {
        display: none;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class StudentsComponent implements OnInit {
  StudentStatus = StudentStatus;
  
  searchTerm = signal('');
  statusFilter = signal<StudentStatus | null>(null);
  selectedStudent = signal<Student | null>(null);

  filteredStudents = computed(() => {
    let students = this.studentService.students();
    
    // Apply search filter
    const term = this.searchTerm().toLowerCase();
    if (term) {
      students = students.filter(s =>
        s.vorname.toLowerCase().includes(term) ||
        s.nachname.toLowerCase().includes(term) ||
        s.matrikelnummer.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    const status = this.statusFilter();
    if (status) {
      students = students.filter(s => s.status === status);
    }
    
    return students;
  });

  constructor(
    public studentService: StudentService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.studentService.loadStudents().subscribe();
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  onStatusFilter(status: StudentStatus | null): void {
    this.statusFilter.set(status);
  }

  getInitials(student: Student): string {
    return `${student.vorname.charAt(0)}${student.nachname.charAt(0)}`.toUpperCase();
  }

  openDetail(student: Student): void {
    this.selectedStudent.set(student);
  }

  closeDetail(): void {
    this.selectedStudent.set(null);
  }

  viewGrades(student: Student): void {
    this.closeDetail();
    // Navigate to validation page with student filter (for Prüfungsamt)
    this.router.navigate(['/grades/validation'], {
      queryParams: { 
        student: `${student.vorname} ${student.nachname}`,
        matrikel: student.matrikelnummer
      }
    });
  }
}

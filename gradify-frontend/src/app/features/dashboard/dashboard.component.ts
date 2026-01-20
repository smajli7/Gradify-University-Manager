import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CalculationService, BerechnungDto, FortschrittDto } from '../../core/services/calculation.service';

// Query für alle Studenten (User-Service)
const GET_STUDENTS_QUERY = gql`
  query GetAllStudents {
    students {
      id
      vorname
      nachname
      matrikelnummer
      status
    }
  }
`;

// Query für Einschreibungen eines Studenten (Studiengang-Service)
const GET_EINSCHREIBUNGEN_QUERY = gql`
  query GetEinschreibungen($studentId: ID!) {
    einschreibungen(studentId: $studentId) {
      id
      aktuellesSemester
      status
      studiengang {
        id
        name
        kuerzel
        gesamtEcts
      }
    }
  }
`;

// Query für Dashboard-Daten einer Einschreibung (Studiengang-Service)
const DASHBOARD_EINSCHREIBUNG_QUERY = gql`
  query GetDashboardEinschreibung($einschreibungId: ID!) {
    einschreibung(id: $einschreibungId) {
      id
      aktuellesSemester
      studiengang {
        id
        name
        kuerzel
        gesamtEcts
      }
      poId
      pruefungsordnung {
        id
        version
        module {
          id
          modulNr
          name
          ects
        }
      }
    }
  }
`;

// Query für Noten (Noten-Service)
const DASHBOARD_NOTEN_QUERY = gql`
  query GetDashboardNoten($einschreibungId: ID!) {
    notenByStudent(einschreibungId: $einschreibungId) {
      id
      modulId
      noteWert
      bestanden
      versuch
      status
      pruefungsdatum
    }
    durchschnittsnote(einschreibungId: $einschreibungId)
  }
`;

const GET_DOZENTEN_MODULE = gql`
  query GetDozentenModule($dozentId: ID!) {
    dozentenModule(dozentId: $dozentId) {
      id
      modulNr
      name
      ects
      semester
      pruefungsform
      pruefungsdauer
      vorleistung
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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="dashboard-page">
      <div class="page-header animate-slide-up">
        <div class="header-content">
          <h1>Dashboard</h1>
          <p class="page-subtitle">
            @if (studiengangName()) {
              {{ studiengangName() }} - {{ currentSemester() }}. Semester
            } @else {
              Willkommen! Wählen Sie einen Studenten und eine Einschreibung.
            }
          </p>
        </div>
      </div>

      <!-- Auswahl (nur für Nicht-Studenten sichtbar) -->
      @if (canSelectStudent()) {
        <div class="selection-controls animate-slide-up">
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
              (change)="loadDashboard()"
              [disabled]="!selectedStudent || einschreibungen().length === 0">
              <option value="">-- Einschreibung wählen --</option>
              @for (einschreibung of einschreibungen(); track einschreibung.id) {
                <option [value]="einschreibung.id">
                  {{ einschreibung.studiengang }} ({{ einschreibung.kuerzel }}) - {{ einschreibung.semester }}. Sem
                </option>
              }
            </select>
          </div>

          <button class="btn btn--primary" (click)="loadDashboard()" [disabled]="!selectedEinschreibung || loading()">
            @if (loading()) {
              <span class="spinner-sm"></span>
            } @else {
              <span>Laden</span>
            }
          </button>
        </div>
      }

      <!-- Dozenten Dashboard -->
      @if (isDozent()) {
        <div class="dozent-dashboard animate-slide-up">
          <div class="welcome-header">
            <h1>{{ authService.userFullName() }}</h1>
            <p class="subtitle">Ihre Module im Überblick</p>
          </div>

          @if (loadingDozentenModule()) {
            <div class="loading-state card">
              <div class="spinner-lg"></div>
              <p>Lade Module...</p>
            </div>
          }

          @if (!loadingDozentenModule() && dozentenModule().length > 0) {
            <div class="module-list">
              @for (modul of dozentenModule(); track modul.id) {
                <div class="modul-item card">
                  <div class="modul-main">
                    <div class="modul-title">
                      <span class="modul-nr-badge">{{ modul.modulNr }}</span>
                      <h2>{{ modul.name }}</h2>
                    </div>
                    <div class="modul-details">
                      <div class="detail-row">
                        <span class="detail-label">Prüfungsform:</span>
                        <span class="detail-value">{{ modul.pruefungsform }}</span>
                        @if (modul.pruefungsdauer) {
                          <span class="detail-value-muted">({{ modul.pruefungsdauer }})</span>
                        }
                      </div>
                      @if (modul.vorleistung) {
                        <div class="detail-row">
                          <span class="detail-label">Vorleistung:</span>
                          <span class="detail-value">{{ modul.vorleistung }}</span>
                        </div>
                      }
                      <div class="detail-row">
                        <span class="detail-label">Umfang:</span>
                        <span class="detail-value">{{ modul.ects }} ECTS · Semester {{ modul.semester }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          @if (!loadingDozentenModule() && dozentenModule().length === 0) {
            <div class="empty-state card">
              <p>Ihnen sind aktuell keine Module zugewiesen.</p>
            </div>
          }
        </div>
      }

      <!-- Einschreibungs-Auswahl für Studenten (falls mehrere vorhanden) -->
      @if (isStudent() && einschreibungen().length > 1) {
        <div class="selection-controls animate-slide-up">
          <div class="control-group">
            <label>Einschreibung:</label>
            <select 
              class="select-input" 
              [(ngModel)]="selectedEinschreibung" 
              (change)="loadDashboard()">
              @for (einschreibung of einschreibungen(); track einschreibung.id) {
                <option [value]="einschreibung.id">
                  {{ einschreibung.studiengang }} ({{ einschreibung.kuerzel }}) - {{ einschreibung.semester }}. Sem
                </option>
              }
            </select>
          </div>
        </div>
      }

      <!-- Loading Students -->
      @if (loadingStudents()) {
        <div class="loading-state">
          <div class="spinner-lg"></div>
          <p>Lade Studenten...</p>
        </div>
      }

      <!-- Loading Dashboard -->
      @if (loading() && !loadingStudents()) {
        <div class="loading-state">
          <div class="spinner-lg"></div>
          <p>Lade Dashboard...</p>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="error-state">
          <span class="error-icon">!</span>
          <p>{{ error() }}</p>
          <button class="btn btn--secondary" (click)="loadStudents()">Erneut versuchen</button>
        </div>
      }

      <!-- Dashboard Content -->
      @if (!loading() && !error() && dataLoaded()) {
        <!-- Stats Cards -->
        <div class="stats-grid animate-slide-up">
          <div class="stat-card" style="animation-delay: 100ms">
            <div class="stat-icon stat-icon--primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18"/>
                <path d="M18 17V9"/>
                <path d="M13 17V5"/>
                <path d="M8 17v-3"/>
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-value-wrapper">
                <span class="stat-value">
                  @if (gesamtnote() !== null) {
                    {{ gesamtnote() | number:'1.1-1' }}
                  } @else {
                    -
                  }
                </span>
                @if (gesamtnote() !== null && gesamtnoteVomService()) {
                  <span class="stat-verified-icon stat-verified-icon--service tooltip-container">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span class="tooltip-text">Berechnet durch Berechnungs-Service nach Prüfungsordnung</span>
                  </span>
                } @else if (gesamtnote() !== null && berechnungServiceErreichbar()) {
                  <span class="stat-verified-icon stat-verified-icon--pending tooltip-container">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span class="tooltip-text">Durchschnitt - Service erreichbar, Berechnung ausstehend (gRPC-Verbindung prüfen)</span>
                  </span>
                } @else if (gesamtnote() !== null) {
                  <span class="stat-verified-icon stat-verified-icon--fallback tooltip-container">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span class="tooltip-text">Durchschnitt (vorläufig) - Berechnungs-Service nicht verfügbar</span>
                  </span>
                }
              </div>
              <span class="stat-label">Gesamtnote</span>
            </div>
          </div>

          <div class="stat-card" style="animation-delay: 200ms">
            <div class="stat-icon stat-icon--success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ bestandenCount() }}</span>
              <span class="stat-label">Bestandene Module</span>
            </div>
          </div>

          <div class="stat-card" style="animation-delay: 300ms">
            <div class="stat-icon stat-icon--secondary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ ectsErreicht() }}</span>
              <span class="stat-label">ECTS erreicht</span>
            </div>
          </div>

          <div class="stat-card" style="animation-delay: 400ms">
            <div class="stat-icon stat-icon--warning">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ offeneModule() }}</span>
              <span class="stat-label">Offene Module</span>
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-section animate-slide-up" style="animation-delay: 450ms">
          <div class="progress-header">
            <span>Studienfortschritt</span>
            <span>{{ ectsErreicht() }} / {{ totalEcts() }} ECTS ({{ progressPercent() | number:'1.0-0' }}%)</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progressPercent()"></div>
          </div>
        </div>

        <!-- Recent Grades -->
        <section class="section animate-slide-up" style="animation-delay: 500ms">
          <div class="section-header">
            <h2>Letzte Noten</h2>
            <a routerLink="/grades" class="btn btn--secondary btn--sm">
              Alle anzeigen
            </a>
          </div>

          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Modul</th>
                  <th>Datum</th>
                  <th>Note</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (note of recentNoten(); track note.id) {
                  <tr>
                    <td>
                      <div class="module-info">
                        <span class="module-name">{{ getModulName(note.modulId) }}</span>
                        <span class="module-code">{{ getModulNr(note.modulId) }}</span>
                      </div>
                    </td>
                    <td>{{ formatDate(note.pruefungsdatum) }}</td>
                    <td>
                      <span class="grade grade--{{ getNoteColor(note.noteWert) }}">
                        {{ formatNote(note.noteWert) }}
                      </span>
                    </td>
                    <td>
                      <span class="badge badge--{{ getStatusColor(note.status) }}">
                        {{ getStatusLabel(note.status) }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="empty-cell">Noch keine Noten vorhanden</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

      }

      <!-- Empty State (nur für Nicht-Studenten) -->
      @if (!loading() && !loadingStudents() && !error() && !dataLoaded() && canSelectStudent() && students().length > 0) {
        <div class="empty-state animate-slide-up">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 3v18h18"/>
              <path d="M18 17V9"/>
              <path d="M13 17V5"/>
              <path d="M8 17v-3"/>
            </svg>
          </div>
          <h3>Dashboard</h3>
          <p>Wählen Sie einen Studenten und eine Einschreibung, um das Dashboard anzuzeigen.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-page {
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

    .page-subtitle {
      color: var(--text-muted);
      margin: 0;
    }

    /* Selection Controls */
    .dozent-dashboard {
      max-width: 900px;
      margin: 0 auto;
    }

    .welcome-header {
      margin-bottom: var(--spacing-xl);
    }

    .welcome-header h1 {
      font-size: 2rem;
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-primary);
    }

    .module-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .modul-item {
      padding: var(--spacing-xl);
    }

    .modul-main {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .modul-title {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .modul-nr-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 60px;
      padding: 8px 12px;
      background: var(--color-primary);
      color: white;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .modul-title h2 {
      font-size: 1.25rem;
      margin: 0;
      color: var(--text-primary);
      font-weight: 600;
    }

    .modul-details {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      padding-left: 72px;
    }

    .detail-row {
      display: flex;
      gap: var(--spacing-sm);
      font-size: 0.9375rem;
    }

    .detail-label {
      color: var(--text-muted);
      min-width: 120px;
    }

    .detail-value {
      color: var(--text-primary);
    }

    .detail-value-muted {
      color: var(--text-muted);
    }

    .empty-state {
      text-align: center;
      padding: var(--spacing-2xl);
      color: var(--text-muted);
    }

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

    .select-input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .select-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Loading & Error States */
    .loading-state,
    .error-state,
    .empty-state {
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
      background: rgba(255, 0, 85, 0.15);
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

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      transition: all var(--transition-normal);
    }

    .stat-card:hover {
      border-color: var(--border-color-light);
      transform: translateY(-2px);
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-lg);
    }

    .stat-icon--primary {
      background: rgba(0, 242, 255, 0.15);
      color: var(--color-primary);
    }

    .stat-icon--success {
      background: rgba(0, 255, 136, 0.15);
      color: var(--color-success);
    }

    .stat-icon--secondary {
      background: rgba(112, 0, 255, 0.15);
      color: var(--color-secondary);
    }

    .stat-icon--warning {
      background: rgba(255, 184, 0, 0.15);
      color: var(--color-warning);
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1;
    }

    .stat-label {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      margin-top: var(--spacing-xs);
    }

    .stat-value-wrapper {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .stat-verified-icon {
      display: inline-flex;
      align-items: center;
      opacity: 0.7;
      cursor: help;
      transition: opacity 0.2s ease;
    }

    .stat-verified-icon:hover {
      opacity: 1;
    }

    .stat-verified-icon--service {
      color: var(--color-success);
    }

    .stat-verified-icon--fallback {
      color: var(--color-warning);
    }

    .stat-verified-icon--pending {
      color: var(--color-primary);
    }

    /* Tooltip */
    .tooltip-container {
      position: relative;
    }

    .tooltip-text {
      visibility: hidden;
      opacity: 0;
      position: absolute;
      bottom: 130%;
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-deep);
      color: var(--text-primary);
      padding: 8px 12px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      font-size: var(--font-size-xs);
      font-weight: 400;
      white-space: nowrap;
      z-index: 100;
      transition: opacity 0.2s ease, visibility 0.2s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .tooltip-text::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-width: 6px;
      border-style: solid;
      border-color: var(--border-color) transparent transparent transparent;
    }

    .tooltip-container:hover .tooltip-text {
      visibility: visible;
      opacity: 1;
    }

    /* Progress Section */
    .progress-section {
      padding: var(--spacing-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      margin-bottom: var(--spacing-lg);
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .progress-bar {
      height: 10px;
      background: var(--bg-deep);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--color-primary), var(--color-success));
      border-radius: var(--radius-full);
      transition: width 0.5s ease;
    }

    /* Section */
    .section {
      margin-bottom: var(--spacing-lg);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);
    }

    .section-header h2 {
      font-size: var(--font-size-lg);
      margin: 0;
    }

    /* Table */
    .table-container {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
    }

    .table th {
      padding: var(--spacing-md);
      text-align: left;
      font-weight: 500;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--border-color);
    }

    .table td {
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
    }

    .table tr:last-child td {
      border-bottom: none;
    }

    .table tr:hover {
      background: var(--bg-hover);
    }

    .module-info {
      display: flex;
      flex-direction: column;
    }

    .module-name {
      font-weight: 500;
      color: var(--text-primary);
    }

    .module-code {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }

    .grade {
      display: inline-block;
      padding: 4px 10px;
      border-radius: var(--radius-md);
      font-weight: 600;
    }

    .grade--success { background: rgba(0, 255, 136, 0.15); color: var(--color-success); }
    .grade--info { background: rgba(0, 242, 255, 0.15); color: var(--color-primary); }
    .grade--warning { background: rgba(255, 184, 0, 0.15); color: var(--color-warning); }
    .grade--danger { background: rgba(255, 0, 85, 0.15); color: var(--color-danger); }
    .grade--muted { background: var(--bg-hover); color: var(--text-muted); }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: 500;
    }

    .badge--success { background: rgba(0, 255, 136, 0.15); color: var(--color-success); }
    .badge--warning { background: rgba(255, 184, 0, 0.15); color: var(--color-warning); }
    .badge--info { background: rgba(0, 242, 255, 0.15); color: var(--color-primary); }

    .empty-cell {
      text-align: center;
      color: var(--text-muted);
      padding: var(--spacing-xl) !important;
    }

    /* Quick Links */
    .quick-links {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--spacing-md);
    }

    .quick-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-lg);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      text-decoration: none;
      color: var(--text-primary);
      transition: all 0.2s ease;
    }

    .quick-link:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
    }

    .quick-icon {
      color: var(--color-primary);
    }

    .quick-text {
      font-weight: 500;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: 10px 18px;
      border-radius: var(--radius-lg);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
      text-decoration: none;
    }

    .btn--primary {
      background: var(--color-primary);
      color: var(--bg-deep);
    }

    .btn--primary:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    .btn--primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn--secondary {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .btn--secondary:hover {
      background: var(--bg-hover);
    }

    .btn--sm {
      padding: 6px 12px;
      font-size: var(--font-size-sm);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
      }

      .selection-controls {
        flex-direction: column;
      }

      .control-group {
        width: 100%;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  
  selectedStudent = '';
  selectedEinschreibung = '';
  
  loadingStudents = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  dataLoaded = signal(false);
  
  // Role-based visibility
  isStudent = computed(() => this.authService.isStudent());
  isDozent = computed(() => this.authService.isDozent());
  canSelectStudent = computed(() => !this.isStudent() && !this.isDozent());
  
  // Data
  students = signal<StudentOption[]>([]);
  einschreibungen = signal<EinschreibungOption[]>([]);
  einschreibung = signal<any>(null);
  noten = signal<any[]>([]);
  module = signal<any[]>([]);
  berechnung = signal<BerechnungDto | null>(null);
  fortschritt = signal<FortschrittDto | null>(null);
  
  // Dozenten Data
  dozentenModule = signal<any[]>([]);
  loadingDozentenModule = signal(false);
  
  // Computed
  studiengangName = computed(() => {
    const e = this.einschreibung();
    return e?.studiengang?.name ? `${e.studiengang.name} (${e.studiengang.kuerzel})` : null;
  });
  
  currentSemester = computed(() => this.einschreibung()?.aktuellesSemester || 1);
  totalEcts = computed(() => this.einschreibung()?.studiengang?.gesamtEcts || 0);
  
  // Berechnungsdaten vom Service oder Fallback-Berechnung
  gesamtnote = computed(() => {
    // Versuche zuerst vom Berechnungsservice
    const berechnung = this.berechnung();
    
    if (berechnung?.gesamtnote !== null && berechnung?.gesamtnote !== undefined) {
      return berechnung.gesamtnote;
    }
    
    // Fallback: Durchschnitt aus bestandenen Noten berechnen
    const bestandeneNoten = this.noten().filter(n => 
      (n.bestanden === true || n.status === 'FREIGEGEBEN' || n.status === 'VALIDIERT') &&
      n.noteWert !== null && n.noteWert !== undefined
    );
    
    if (bestandeneNoten.length === 0) {
      return null;
    }
    
    const summe = bestandeneNoten.reduce((sum, n) => sum + n.noteWert, 0);
    const durchschnitt = summe / bestandeneNoten.length;
    return Math.round(durchschnitt * 10) / 10; // Auf 1 Dezimalstelle runden
  });
  
  // Flag ob Service erreichbar war (unabhängig davon ob Gesamtnote berechnet wurde)
  berechnungServiceErreichbar = computed(() => {
    const berechnung = this.berechnung();
    // Service ist erreichbar wenn wir ein Berechnung-Objekt haben
    return berechnung !== null;
  });

  // Flag ob Gesamtnote vom Service kommt (nicht vom Fallback)
  gesamtnoteVomService = computed(() => {
    const berechnung = this.berechnung();
    const vomService = berechnung?.gesamtnote !== null && berechnung?.gesamtnote !== undefined;
    return vomService;
  });
  
  bestandenCount = computed(() => {
    const f = this.fortschritt();
    if (f && f.moduleBestanden > 0) return f.moduleBestanden;
    // Fallback: aus Noten berechnen
    const bestandeneNoten = this.noten().filter(n => {
      return n.bestanden === true || n.status === 'FREIGEGEBEN' || n.status === 'VALIDIERT';
    });
    return bestandeneNoten.length;
  });
  
  ectsErreicht = computed(() => {
    const f = this.fortschritt();
    if (f && f.ectsErreicht > 0) return f.ectsErreicht;
    // Fallback: aus Noten berechnen
    const bestandeneNoten = this.noten().filter(n => 
      n.bestanden === true || n.status === 'FREIGEGEBEN' || n.status === 'VALIDIERT'
    );
    const bestandeneModulIds = new Set(
      bestandeneNoten.map(n => String(n.modulId))
    );
    const moduleList = this.module();
    const ects = moduleList
      .filter(m => bestandeneModulIds.has(String(m.id)))
      .reduce((sum, m) => sum + (m.ects || 0), 0);
    return ects;
  });
  
  offeneModule = computed(() => {
    // Immer aus Modulen berechnen, da Service-Daten oft unvollständig
    const moduleList = this.module();
    if (moduleList.length === 0) {
      // Kein Fallback möglich, prüfe Service
      const f = this.fortschritt();
      if (f && f.moduleOffen > 0) return f.moduleOffen;
      return 0;
    }
    
    const bestandeneNoten = this.noten().filter(n => 
      n.bestanden === true || n.status === 'FREIGEGEBEN' || n.status === 'VALIDIERT'
    );
    const bestandeneModulIds = new Set(
      bestandeneNoten.map(n => String(n.modulId))
    );
    return moduleList.filter(m => !bestandeneModulIds.has(String(m.id))).length;
  });
  
  progressPercent = computed(() => {
    // Immer aus ECTS berechnen für konsistente Anzeige
    const total = this.totalEcts();
    const erreicht = this.ectsErreicht();
    if (total === 0) return 0;
    return (erreicht / total) * 100;
  });
  
  recentNoten = computed(() => {
    return [...this.noten()]
      .sort((a, b) => new Date(b.pruefungsdatum).getTime() - new Date(a.pruefungsdatum).getTime())
      .slice(0, 5);
  });

  private readonly calculationService = inject(CalculationService);

  constructor(private readonly apollo: Apollo) {}

  ngOnInit(): void {
    if (this.isStudent()) {
      // Studenten sehen nur ihre eigenen Daten
      this.loadOwnData();
    } else if (this.isDozent()) {
      // Dozenten sehen ihre Module
      this.loadDozentenModuleData();
    } else {
      // Admins/Prüfungsamt können Studenten auswählen
      this.loadStudents();
    }
  }

  async loadDozentenModuleData(): Promise<void> {
    this.loadingDozentenModule.set(true);
    
    try {
      const dozentId = this.authService.currentUser()?.id;
      if (!dozentId) return;

      const result = await firstValueFrom(this.apollo.query<{ dozentenModule: any[] }>({
        query: GET_DOZENTEN_MODULE,
        variables: { dozentId },
        fetchPolicy: 'network-only'
      }));

      this.dozentenModule.set(result.data?.dozentenModule || []);

    } catch (error) {
      console.error('Error loading dozenten module:', error);
    } finally {
      this.loadingDozentenModule.set(false);
    }
  }

  loadOwnData(): void {
    const studentId = this.authService.getStudentId();
    if (!studentId) {
      this.error.set('Keine Student-ID gefunden. Bitte erneut einloggen.');
      return;
    }

    this.selectedStudent = studentId;
    this.loadingStudents.set(true);
    this.error.set(null);

    // Lade Einschreibungen für den eingeloggten Studenten
    this.apollo.query<{ einschreibungen: any[] }>({
      query: GET_EINSCHREIBUNGEN_QUERY,
      variables: { studentId },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    }).subscribe({
      next: (result) => {
        console.log('Einschreibungen Query Result:', result);
        
        if (result.errors && result.errors.length > 0) {
          console.error('GraphQL Errors:', result.errors);
          this.error.set(`Fehler beim Laden der Einschreibungen: ${result.errors[0].message}`);
          this.loadingStudents.set(false);
          return;
        }

        const einschreibungList = result.data?.einschreibungen || [];
        console.log('Loaded einschreibungen:', einschreibungList.length);
        
        this.einschreibungen.set(einschreibungList.map(e => ({
          id: e.id,
          studiengang: e.studiengang?.name || 'Unbekannt',
          kuerzel: e.studiengang?.kuerzel || '?',
          semester: e.aktuellesSemester
        })));
        this.loadingStudents.set(false);

        // Automatisch erste Einschreibung auswählen und Dashboard laden
        if (einschreibungList.length > 0) {
          this.selectedEinschreibung = einschreibungList[0].id;
          console.log('Auto-selecting einschreibung:', this.selectedEinschreibung);
          this.loadDashboard();
        } else {
          this.error.set('Keine Einschreibungen gefunden');
        }
      },
      error: (err) => {
        console.error('Error loading einschreibungen:', err);
        this.error.set(`Fehler beim Laden der Einschreibungen: ${err.message || 'Unbekannter Fehler'}`);
        this.loadingStudents.set(false);
      }
    });
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

    // Lade Einschreibungen für den gewählten Studenten
    this.apollo.query<{ einschreibungen: any[] }>({
      query: GET_EINSCHREIBUNGEN_QUERY,
      variables: { studentId: this.selectedStudent },
      fetchPolicy: 'network-only'
    }).subscribe({
      next: (result) => {
        const einschreibungList = result.data?.einschreibungen || [];
        this.einschreibungen.set(einschreibungList.map(e => ({
          id: e.id,
          studiengang: e.studiengang?.name || 'Unbekannt',
          kuerzel: e.studiengang?.kuerzel || '?',
          semester: e.aktuellesSemester
        })));

        // Automatisch erste Einschreibung auswählen
        if (einschreibungList.length > 0) {
          this.selectedEinschreibung = einschreibungList[0].id;
          this.loadDashboard();
        }
      },
      error: (err) => {
        console.error('Error loading einschreibungen:', err);
        this.error.set('Fehler beim Laden der Einschreibungen');
      }
    });
  }

  loadDashboard(): void {
    if (!this.selectedEinschreibung) return;

    this.loading.set(true);
    this.error.set(null);
    this.dataLoaded.set(false);

    const einschreibungQuery = this.apollo.query<any>({
      query: DASHBOARD_EINSCHREIBUNG_QUERY,
      variables: { einschreibungId: this.selectedEinschreibung },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });

    const notenQuery = this.apollo.query<any>({
      query: DASHBOARD_NOTEN_QUERY,
      variables: { einschreibungId: this.selectedEinschreibung },
      context: { clientName: 'noten' },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });

    // Lade Hauptdaten (Einschreibung und Noten)
    Promise.all([
      firstValueFrom(einschreibungQuery).catch(err => {
        console.error('Einschreibung Query Error:', err);
        return { data: null, errors: [{ message: err.message || 'Unbekannter Fehler' }] };
      }),
      firstValueFrom(notenQuery).catch(err => {
        console.error('Noten Query Error:', err);
        return { data: { notenByStudent: [], durchschnittsnote: null }, errors: [] };
      })
    ]).then(([einschreibungResult, notenResult]) => {
      console.log('Einschreibung Result:', einschreibungResult);
      console.log('Noten Result:', notenResult);
      
      // Prüfe auf GraphQL-Fehler
      if (einschreibungResult.errors && einschreibungResult.errors.length > 0) {
        console.error('GraphQL Errors (Einschreibung):', einschreibungResult.errors);
        const errorMsg = einschreibungResult.errors[0].message;
        this.error.set(`Fehler beim Laden der Einschreibung: ${errorMsg}`);
        this.loading.set(false);
        return;
      }

      if (notenResult.errors && notenResult.errors.length > 0) {
        console.warn('GraphQL Errors (Noten):', notenResult.errors);
        // Noten-Fehler sind nicht kritisch, wir zeigen trotzdem das Dashboard
      }

      const einschreibungData = einschreibungResult?.data?.einschreibung;
      
      if (!einschreibungData) {
        this.error.set('Einschreibung nicht gefunden');
        this.loading.set(false);
        return;
      }

      this.einschreibung.set(einschreibungData);
      
      // Module aus Prüfungsordnung laden
      const moduleList = einschreibungData.pruefungsordnung?.module || [];
      this.module.set(moduleList);
      
      // Noten laden
      const notenList = notenResult?.data?.notenByStudent || [];
      this.noten.set(notenList);
      
      // Lade Berechnungsdaten vom Berechnungs-Service (optional - im Hintergrund)
      this.loadBerechnungsdaten(einschreibungData);
      
      this.dataLoaded.set(true);
      this.loading.set(false);
    }).catch((err) => {
      console.error('Error loading dashboard:', err);
      this.error.set(`Fehler beim Laden des Dashboards: ${err.message || 'Unbekannter Fehler'}`);
      this.loading.set(false);
    });
  }

  getModulName(modulId: string): string {
    const modul = this.module().find(m => m.id === modulId);
    return modul?.name || 'Unbekanntes Modul';
  }

  getModulNr(modulId: string): string {
    const modul = this.module().find(m => m.id === modulId);
    return modul?.modulNr || modulId;
  }

  formatDate(dateString: string): string {
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

  formatNote(noteWert: number | null): string {
    if (noteWert === null || noteWert === undefined) return '-';
    return noteWert.toFixed(1).replace('.', ',');
  }

  getNoteColor(noteWert: number | null): string {
    if (noteWert === null || noteWert === undefined) return 'muted';
    if (noteWert <= 1.5) return 'success';
    if (noteWert <= 2.5) return 'info';
    if (noteWert <= 3.5) return 'warning';
    return 'danger';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'ERFASST': 'Erfasst',
      'VALIDIERT': 'Validiert',
      'FREIGEGEBEN': 'Bestanden'
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'ERFASST': 'warning',
      'VALIDIERT': 'info',
      'FREIGEGEBEN': 'success'
    };
    return colors[status] || 'info';
  }

  /**
   * Lädt Berechnungsdaten vom Berechnungs-Service (optional, im Hintergrund).
   * Das Dashboard funktioniert auch ohne diese Daten.
   */
  private loadBerechnungsdaten(einschreibungData: any): void {
    const poId = einschreibungData.poId;
    const ectsGesamt = einschreibungData.studiengang?.gesamtEcts || 180;
    
    console.log('loadBerechnungsdaten - poId:', poId, 'ectsGesamt:', ectsGesamt);
    
    // Lade Gesamtnote
    this.calculationService.getGesamtnote(this.selectedEinschreibung).subscribe({
      next: (result) => {
        console.log('getGesamtnote result:', result);
        if (result.success && result.data) {
          console.log('Loaded berechnung:', result.data);
          this.berechnung.set(result.data);
          
          // Wenn Berechnung existiert aber keine Gesamtnote hat, triggere Neuberechnung
          if (result.data.gesamtnote === null && poId) {
            console.log('Berechnung ohne Gesamtnote, starte Neuberechnung...');
            this.triggerNeuberechnung(poId, ectsGesamt);
          }
        } else {
          // Keine Berechnung vorhanden, triggere Neuberechnung
          console.log('Keine Berechnung vorhanden, starte Neuberechnung... poId:', poId);
          if (poId) {
            this.triggerNeuberechnung(poId, ectsGesamt);
          } else {
            console.warn('Keine poId vorhanden - kann keine Neuberechnung triggern');
          }
        }
      },
      error: (err) => {
        console.warn('Berechnung Service Fehler:', err.status, err.message);
        // 404 = keine Berechnung vorhanden, versuche Neuberechnung
        console.log('Versuche Neuberechnung... poId:', poId);
        if (poId) {
          this.triggerNeuberechnung(poId, ectsGesamt);
        } else {
          console.warn('Keine poId vorhanden - kann keine Neuberechnung triggern');
        }
      }
    });

    // Lade Fortschritt
    this.calculationService.getFortschritt(this.selectedEinschreibung).subscribe({
      next: (result) => {
        if (result.success && result.data) {
          console.log('Loaded fortschritt:', result.data);
          this.fortschritt.set(result.data);
        }
      },
      error: (err) => {
        console.warn('Fortschritt Service nicht verfügbar:', err);
        // Nicht kritisch, Dashboard funktioniert auch ohne
      }
    });
  }

  /**
   * Triggert eine Neuberechnung der Gesamtnote.
   */
  private triggerNeuberechnung(poId: string, ectsGesamt: number): void {
    console.log('=== TRIGGER NEUBERECHNUNG ===');
    console.log('Einschreibung:', this.selectedEinschreibung);
    console.log('PO-ID:', poId);
    console.log('ECTS Gesamt:', ectsGesamt);
    
    this.calculationService.berechneGesamtnote(this.selectedEinschreibung, poId, ectsGesamt)
      .subscribe({
        next: (result) => {
          console.log('Neuberechnung Response:', result);
          if (result.success && result.data) {
            console.log('Neuberechnung erfolgreich - Gesamtnote:', result.data.gesamtnote);
            this.berechnung.set(result.data);
            // Lade auch Fortschritt neu
            this.calculationService.getFortschritt(this.selectedEinschreibung).subscribe({
              next: (fortschrittResult) => {
                if (fortschrittResult.success && fortschrittResult.data) {
                  console.log('Fortschritt aktualisiert:', fortschrittResult.data);
                  this.fortschritt.set(fortschrittResult.data);
                }
              },
              error: (err) => console.warn('Fortschritt nach Neuberechnung nicht verfügbar:', err)
            });
          } else {
            console.warn('Neuberechnung: Kein Ergebnis in Response', result);
          }
        },
        error: (err) => {
          console.error('Neuberechnung FEHLER:', err);
          console.error('Status:', err.status, 'Message:', err.message);
          // Dashboard funktioniert trotzdem mit Fallback-Berechnung
        }
      });
  }
}

import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
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
  imports: [CommonModule, FormsModule, RouterLink, SkeletonStateComponent],
  template: `
    <div class="page animate-slide-up">
      <!-- Loading State -->
      @if (loading()) {
        <div class="profile-header profile-header--skeleton">
          <div class="profile-header__avatar"></div>
          <div class="profile-header__main">
            <div class="profile-header__name"></div>
            <div class="profile-header__subline"></div>
          </div>
        </div>
        <app-skeleton-state [lineCount]="6" />
      }

      <!-- Error State -->
      @if (error()) {
        <div class="error-state">
          <span class="error-icon" aria-hidden="true"></span>
          <p>{{ error() }}</p>
          <button class="btn btn--primary" (click)="loadProfile()">Erneut versuchen</button>
        </div>
      }

      <!-- Profile Content -->
      @if (!loading() && !error()) {
        <!-- 1) Profil-Kopfzeile -->
        <header class="profile-header">
          <div class="profile-header__left">
            <div class="profile-header__avatar" [title]="displayName()">
              {{ initials() }}
            </div>
            <div class="profile-header__main">
              <h1 class="profile-header__name">{{ displayName() }}</h1>
              <p class="profile-header__subline">{{ headerSubline() }}</p>
            </div>
          </div>
          <div class="profile-header__right">
            <div class="profile-header__chips">
              @if (authService.currentUser()?.roles?.length) {
                <span class="chip chip--role">{{ formatRole(authService.currentUser()!.roles[0]) }}</span>
              }
              @if (isAktivChipVisible()) {
                <span class="chip chip--aktiv">Aktiv</span>
              }
              @if (studentData()?.matrikelnummer) {
                <span class="chip chip--matrikel" [title]="'Kopieren: ' + studentData()!.matrikelnummer">
                  {{ studentData()!.matrikelnummer }}
                  <button type="button" class="copy-btn" (click)="copyToClipboard(studentData()!.matrikelnummer, $event)" title="Kopieren" aria-label="Kopieren"><svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                </span>
              }
              @if (headerEmailOrLogin(); as val) {
                <span class="chip chip--email" [title]="'Kopieren: ' + val">
                  {{ val }}
                  <button type="button" class="copy-btn" (click)="copyToClipboard(val, $event)" title="Kopieren" aria-label="Kopieren"><svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                </span>
              }
            </div>
          </div>
        </header>

        <div class="profile-content">
          <!-- Account + Student als Accordion -->
          <div class="card card--accordion">
            <button type="button" class="card-header card-header--tappable" (click)="toggleSection('account')" [attr.aria-expanded]="sectionOpen('account')">
              <h2 class="card-title">Account</h2>
              <span class="card-header__chevron" [class.card-header__chevron--open]="sectionOpen('account')">▼</span>
            </button>
            @if (sectionOpen('account')) {
              <div class="card-body">
                <div class="detail-grid">
                  <div class="detail-row">
                    <span class="detail-label">Benutzername</span>
                    <span class="detail-value">{{ authService.currentUser()?.username || '–' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Rolle</span>
                    <span class="detail-value">
                      @for (role of authService.currentUser()?.roles || []; track role) {
                        <span class="role-badge" [ngClass]="getRoleBadgeClass(role)">{{ formatRole(role) }}</span>
                      }
                      @if (!authService.currentUser()?.roles?.length) { – }
                    </span>
                  </div>
                </div>
              </div>
            }
          </div>

          @if (authService.isStudent() && studentData()) {
            <div class="card card--accordion">
              <button type="button" class="card-header card-header--tappable" (click)="toggleSection('student')" [attr.aria-expanded]="sectionOpen('student')">
                <h2 class="card-title">Student</h2>
                <span class="card-header__chevron" [class.card-header__chevron--open]="sectionOpen('student')">▼</span>
              </button>
              @if (sectionOpen('student')) {
                <div class="card-body">
                  <div class="detail-grid">
                    <div class="detail-row">
                      <span class="detail-label">Matrikelnummer</span>
                      <span class="detail-value detail-value--copyable">
                        {{ studentData()!.matrikelnummer || '–' }}
                        @if (studentData()!.matrikelnummer) {
                          <button type="button" class="copy-btn copy-btn--inline" (click)="copyToClipboard(studentData()!.matrikelnummer!, $event)" title="Kopieren" aria-label="Kopieren"><svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                        }
                      </span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">E-Mail</span>
                      <span class="detail-value detail-value--copyable">
                        {{ studentData()!.email || '–' }}
                        @if (studentData()!.email) {
                          <button type="button" class="copy-btn copy-btn--inline" (click)="copyToClipboard(studentData()!.email!, $event)" title="Kopieren" aria-label="Kopieren"><svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                        }
                      </span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Geburtsdatum</span>
                      <span class="detail-value detail-value--num">{{ formatDate(studentData()!.geburtsdatum) }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Status</span>
                      <span class="detail-value">
                        <span class="status-badge status-badge--{{ studentData()!.status.toLowerCase() }}">{{ formatStatus(studentData()!.status) }}</span>
                      </span>
                    </div>
                    @if (studentData()!.benutzer?.letzterLogin) {
                      <div class="detail-row">
                        <span class="detail-label">Letzter Login</span>
                        <span class="detail-value detail-value--num">{{ formatDateTime(studentData()!.benutzer!.letzterLogin) }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- Lehrende: Profil-Karte (gleiche Struktur wie Student) -->
          @if (!authService.isStudent() && authService.currentUser(); as user) {
            <div class="card card--accordion">
              <button type="button" class="card-header card-header--tappable" (click)="toggleSection('lehrende')" [attr.aria-expanded]="sectionOpen('lehrende')">
                <h2 class="card-title">{{ lehrendeSectionTitle() }}</h2>
                <span class="card-header__chevron" [class.card-header__chevron--open]="sectionOpen('lehrende')">▼</span>
              </button>
              @if (sectionOpen('lehrende')) {
                <div class="card-body">
                  <div class="detail-grid">
                    <div class="detail-row">
                      <span class="detail-label">Benutzername</span>
                      <span class="detail-value detail-value--copyable">
                        {{ user.username || '–' }}
                        @if (user.username) {
                          <button type="button" class="copy-btn copy-btn--inline" (click)="copyToClipboard(user.username, $event)" title="Kopieren" aria-label="Kopieren"><svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                        }
                      </span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Name</span>
                      <span class="detail-value detail-value--num">{{ (user.vorname && user.nachname) ? (user.vorname + ' ' + user.nachname) : '–' }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">E-Mail</span>
                      <span class="detail-value detail-value--copyable">
                        {{ headerEmailOrLogin() || '–' }}
                        @if (headerEmailOrLogin()) {
                          <button type="button" class="copy-btn copy-btn--inline" (click)="copyToClipboard(headerEmailOrLogin()!, $event)" title="Kopieren" aria-label="Kopieren"><svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                        }
                      </span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Rolle</span>
                      <span class="detail-value">
                        @for (role of user.roles || []; track role) {
                          <span class="role-badge" [ngClass]="getRoleBadgeClass(role)">{{ formatRole(role) }}</span>
                        }
                        @if (!user.roles?.length) { – }
                      </span>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- 4) Einschreibung als Highlight-Card (Primary) – Student -->
          @if (authService.isStudent() && primaryEinschreibung(); as e) {
            <div class="card card--primary">
              <div class="card-body card-body--einschreibung">
                <div class="einschreibung-hero">
                  <div class="einschreibung-hero__text">
                    <h2 class="einschreibung-hero__title">{{ e.studiengang.name }} ({{ e.studiengang.kuerzel }})</h2>
                    <span class="status-badge status-badge--{{ e.status.toLowerCase() }}">{{ formatStatus(e.status) }}</span>
                  </div>
                  <p class="einschreibung-hero__subline">Prüfungsordnung {{ e.pruefungsordnung?.version || 'N/A' }}</p>
                  <div class="einschreibung-kpis">
                    <div class="einschreibung-kpi">
                      <span class="einschreibung-kpi__label">Aktuelles Semester</span>
                      <span class="einschreibung-kpi__value" style="font-variant-numeric: tabular-nums;">{{ e.aktuellesSemester }}. Sem</span>
                    </div>
                    <div class="einschreibung-kpi">
                      <span class="einschreibung-kpi__label">Regelstudienzeit</span>
                      <span class="einschreibung-kpi__value" style="font-variant-numeric: tabular-nums;">{{ e.studiengang.regelstudienzeit }} Sem</span>
                    </div>
                    <div class="einschreibung-kpi">
                      <span class="einschreibung-kpi__label">Gesamt ECTS</span>
                      <span class="einschreibung-kpi__value" style="font-variant-numeric: tabular-nums;">{{ e.studiengang.gesamtEcts }}</span>
                    </div>
                    <div class="einschreibung-kpi">
                      <span class="einschreibung-kpi__label">Immatrikuliert am</span>
                      <span class="einschreibung-kpi__value" style="font-variant-numeric: tabular-nums;">{{ formatDate(e.immatrikuliertAm) }}</span>
                    </div>
                  </div>
                </div>
                <div class="einschreibung-hero__action">
                  <a [routerLink]="['/study-plan']" class="btn btn--primary">Zum Studienplan</a>
                </div>
              </div>
            </div>
          }

          @if (authService.isStudent() && einschreibungen().length === 0 && !loading()) {
            <div class="card">
              <div class="card-body">
                <div class="empty-state">
                  <span class="empty-icon" aria-hidden="true"></span>
                  <p>Keine Einschreibungen gefunden</p>
                </div>
              </div>
            </div>
          }

          <!-- Highlight-Card für Lehrende (gleiche Optik wie Einschreibung, ohne Buttons wie beim Studenten) -->
          @if (!authService.isStudent() && authService.currentUser()) {
            <div class="card card--primary">
              <div class="card-body card-body--einschreibung">
                <div class="einschreibung-hero">
                  <div class="einschreibung-hero__text">
                    <h2 class="einschreibung-hero__title">{{ lehrendeHeroTitle() }}</h2>
                    <span class="status-badge status-badge--aktiv">Aktiv</span>
                  </div>
                  <p class="einschreibung-hero__subline">{{ lehrendeHeroSubline() }}</p>
                  <div class="einschreibung-kpis">
                    <div class="einschreibung-kpi">
                      <span class="einschreibung-kpi__label">Rolle</span>
                      <span class="einschreibung-kpi__value">{{ authService.userRole() || '–' }}</span>
                    </div>
                    @if (headerEmailOrLogin()) {
                      <div class="einschreibung-kpi">
                        <span class="einschreibung-kpi__label">E-Mail / Login</span>
                        <span class="einschreibung-kpi__value">{{ headerEmailOrLogin() }}</span>
                      </div>
                    }
                  </div>
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

    /* ––– 1) Profil-Kopfzeile ––– */
    .profile-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-xl);
      padding-bottom: var(--spacing-lg);
      border-bottom: 1px solid var(--border-color);
    }

    .profile-header__left {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .profile-header__avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
      flex-shrink: 0;
    }

    .profile-header--skeleton .profile-header__avatar {
      background: var(--bg-hover);
    }

    .profile-header__main {
      min-width: 0;
    }

    .profile-header__name {
      margin: 0 0 var(--spacing-2px) 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }

    .profile-header__subline {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .profile-header__right {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .profile-header__chips {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: var(--radius-md);
      font-size: var(--font-size-xs);
      font-weight: 500;
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
    }

    .chip--aktiv {
      color: var(--text-primary);
    }

    .copy-btn {
      background: none;
      border: none;
      padding: 2px;
      cursor: pointer;
      opacity: 0.75;
      line-height: 0;
      color: rgba(255, 255, 255, 0.9);
    }

    .copy-btn:hover {
      opacity: 1;
    }

    .copy-btn--inline {
      margin-left: 6px;
    }

    .copy-icon {
      display: block;
      stroke: currentColor;
    }

    /* ––– Content + Cards ––– */
    .profile-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .card--accordion .card-header {
      padding: var(--spacing-sm) var(--spacing-md);
      min-height: auto;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md) var(--spacing-lg);
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-elevated);
    }

    .card-header--tappable {
      width: 100%;
      cursor: pointer;
      border: none;
      text-align: left;
      font: inherit;
      color: inherit;
    }

    .card-header--tappable:hover {
      background: var(--bg-hover);
    }

    .card-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .card-header__chevron {
      font-size: 0.7rem;
      opacity: 0.7;
      transition: transform 0.2s ease;
    }

    .card-header__chevron--open {
      transform: rotate(180deg);
    }

    .card-body {
      padding: var(--spacing-md) var(--spacing-lg);
    }

    /* ––– 2) Detail-Grid (Label | Value) ––– */
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-sm) var(--spacing-lg);
    }

    .detail-row {
      display: contents;
    }

    .detail-row .detail-label {
      grid-column: 1;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-muted);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: var(--spacing-2px) 0;
    }

    .detail-row .detail-value {
      grid-column: 2;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }

    .detail-value--num {
      font-variant-numeric: tabular-nums;
    }

    .detail-value--copyable .copy-btn {
      flex-shrink: 0;
    }

    /* ––– 4) Einschreibung Highlight-Card ––– */
    .card--primary {
      border-color: rgba(255, 255, 255, 0.12);
      background: var(--bg-surface);
    }

    .card-body--einschreibung {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--spacing-lg);
    }

    .einschreibung-hero__text {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      flex-wrap: wrap;
      margin-bottom: var(--spacing-xs);
    }

    .einschreibung-hero__title {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .einschreibung-hero__subline {
      margin: 0 0 var(--spacing-md) 0;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .einschreibung-kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--spacing-md);
      max-width: 100%;
    }

    .einschreibung-kpi {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .einschreibung-kpi__label {
      font-size: 0.7rem;
      font-weight: 500;
      color: var(--text-muted);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .einschreibung-kpi__value {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .einschreibung-hero__action {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
      flex-shrink: 0;
    }

    /* Role + Status Badges */
    .role-badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-secondary);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: 500;
    }

    .role-badge--admin { background: rgba(220, 38, 38, 0.15); color: #DC2626; border-color: rgba(220, 38, 38, 0.3); }
    .role-badge--hv { background: rgba(22, 163, 74, 0.15); color: #16A34A; border-color: rgba(22, 163, 74, 0.3); }
    .role-badge--dozent { background: rgba(147, 51, 234, 0.15); color: #9333EA; border-color: rgba(147, 51, 234, 0.3); }
    .role-badge--pa { background: rgba(202, 138, 4, 0.15); color: #CA8A04; border-color: rgba(202, 138, 4, 0.3); }
    .role-badge--student { background: rgba(255, 255, 255, 0.1); color: var(--text-secondary); border-color: rgba(255, 255, 255, 0.2); }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: 500;
    }

    .status-badge--aktiv { background: rgba(34, 197, 94, 0.15); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.3); }
    .status-badge--beurlaubt { background: rgba(255, 184, 0, 0.15); color: var(--color-warning); border: 1px solid rgba(255, 184, 0, 0.3); }
    .status-badge--exmatrikuliert { background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); }

    /* Error + Empty */
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-2xl);
      color: var(--text-muted);
    }

    .error-icon { font-size: 48px; margin-bottom: var(--spacing-md); }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-xl);
      color: var(--text-muted);
    }

    .empty-icon { font-size: 48px; margin-bottom: var(--spacing-md); }

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

    .btn--primary:hover:not(:disabled) { opacity: 0.9; }

    .btn--outline {
      background: transparent;
      color: var(--text-primary);
      border-color: var(--border-color);
    }

    .btn--outline:hover:not(:disabled) { background: var(--bg-hover); }

    @media (max-width: 768px) {
      .profile-header { flex-direction: column; align-items: flex-start; }
      .profile-header__right { width: 100%; }
      .detail-grid { grid-template-columns: 1fr; }
      .detail-row .detail-value { grid-column: 1; }
      .einschreibung-kpis { grid-template-columns: repeat(2, 1fr); }
      .card-body--einschreibung { flex-direction: column; }
    }
  `]
})
export class ProfileComponent implements OnInit {
  private readonly apollo = inject(Apollo);
  readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  loading = signal(false);
  error = signal<string | null>(null);
  studentData = signal<StudentData | null>(null);
  einschreibungen = signal<EinschreibungData[]>([]);

  /** Accordion: 'account', 'student', 'lehrende' standardmäßig offen. */
  sectionsOpen = signal<Record<string, boolean>>({ account: true, student: true, lehrende: true });

  displayName = computed(() => {
    const u = this.authService.currentUser();
    const s = this.studentData();
    if (s?.vorname || s?.nachname) return [s?.vorname, s?.nachname].filter(Boolean).join(' ') || '–';
    if (u?.vorname || u?.nachname) return [u.vorname, u.nachname].filter(Boolean).join(' ') || '–';
    return u?.username || '–';
  });

  initials = computed(() => {
    const u = this.authService.currentUser();
    const s = this.studentData();
    const v = (s?.vorname ?? u?.vorname ?? '').trim().slice(0, 1).toUpperCase();
    const n = (s?.nachname ?? u?.nachname ?? '').trim().slice(0, 1).toUpperCase();
    if (v || n) return (v + n) || '?';
    return (u?.username ?? '?').slice(0, 2).toUpperCase();
  });

  headerSubline = computed(() => {
    if (this.authService.isStudent()) {
      const e = this.einschreibungen()[0];
      const parts = ['Student'];
      if (e?.studiengang?.kuerzel) parts.push(e.studiengang.kuerzel);
      if (e?.aktuellesSemester) parts.push(`${e.aktuellesSemester}. Semester`);
      return parts.join(' · ');
    }
    if (this.authService.isDozent()) return 'Lehrende';
    if (this.authService.isPruefungsamt()) return 'Prüfungsamt';
    if (this.authService.isAdmin()) return 'Administration';
    if (this.authService.isHochschulVerwalter()) return 'Hochschulverwaltung';
    return 'Benutzer';
  });

  /** Chip „Aktiv“: bei Studierenden wenn benutzer.aktiv, sonst wenn eingeloggt. */
  isAktivChipVisible = computed(() => {
    if (this.authService.isStudent() && this.studentData()?.benutzer?.aktiv === false) return false;
    return !!this.authService.currentUser();
  });

  lehrendeSectionTitle = computed(() => {
    if (this.authService.isDozent()) return 'Lehrende';
    if (this.authService.isPruefungsamt()) return 'Prüfungsamt';
    if (this.authService.isAdmin()) return 'Administration';
    return 'Profil';
  });

  lehrendeHeroTitle = computed(() => {
    if (this.authService.isDozent()) return 'Lehrende';
    if (this.authService.isPruefungsamt()) return 'Prüfungsamt';
    if (this.authService.isAdmin()) return 'Administration';
    return 'Übersicht';
  });

  lehrendeHeroSubline = computed(() => {
    if (this.authService.isDozent()) return 'Noten erfassen und Statistik';
    if (this.authService.isAdmin() || this.authService.isPruefungsamt()) return 'Verwaltung und Zuweisungen';
    return 'Ihr Bereich';
  });

  primaryEinschreibung = computed(() => this.einschreibungen()[0] ?? null);

  primaryEmail = computed(() => {
    const s = this.studentData();
    if (s?.email) return s.email;
    return this.authService.currentUser()?.username?.includes('@') ? this.authService.currentUser()?.username : null;
  });

  /** Im Header und in Karten: E-Mail oder Login (Studierende: E-Mail; sonst Benutzername, damit Lehrende immer E-Mail/Login sehen). */
  headerEmailOrLogin = computed(() => {
    if (this.authService.isStudent() && this.studentData()?.email) return this.studentData()!.email;
    return this.authService.currentUser()?.username ?? null;
  });

  sectionOpen(key: string): boolean {
    return this.sectionsOpen()[key] !== false;
  }

  toggleSection(key: string): void {
    const cur = this.sectionsOpen();
    this.sectionsOpen.set({ ...cur, [key]: !cur[key] });
  }

  async copyToClipboard(text: string, event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success('Kopiert');
    } catch {
      this.toast.error('Kopieren fehlgeschlagen');
    }
  }

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

import { Component, HostListener, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { HeaderComponent } from '../header/header.component';
import { DockComponent, DockItem } from '../dock/dock.component';
import { MobileMenuComponent } from '../mobile-menu/mobile-menu.component';
import { AuthService } from '../../../core/services/auth.service';
import { OverlayService } from '../../../core/services/overlay.service';

const GET_MANDANT = gql`
  query GetMandant($id: ID!) {
    mandant(id: $id) {
      id
      name
      kuerzel
    }
  }
`;

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    HeaderComponent, 
    DockComponent, 
    MobileMenuComponent
  ],
  template: `
    <div class="shell">
      <!-- Header -->
      <app-header
        [userName]="userName()"
        [userRole]="userRole()"
        [mandantName]="mandantName()"
        [showUserMenu]="showUserMenu"
        (menuToggle)="toggleMobileMenu()"
        (userMenuToggle)="toggleUserMenu()"
        (logout)="onLogout()">
      </app-header>

      <!-- Body: Sidebar + Content -->
      <div class="shell-body">
        <!-- Sidebar (Desktop) -->
        <app-dock
          [items]="dockItems"
          [userRole]="userRole()">
        </app-dock>

        <!-- Main Content (zentriert neben Sidebar) -->
        <main class="main-content">
          <div class="main-content-inner">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>

      <!-- Mobile Menu (slide-in overlay) -->
      <app-mobile-menu
        [items]="dockItems"
        [userRole]="userRole()"
        [isOpen]="mobileMenuOpen"
        (close)="closeMobileMenu()"
        (logout)="onLogout()">
      </app-mobile-menu>
    </div>
  `,
  styles: [`
    .shell {
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .shell-body {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-width: 0;
    }

    .main-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      overflow-y: auto;
      overflow-x: hidden;
      height: calc(100vh - 60px);
      padding: var(--spacing-2xl) var(--spacing-lg) var(--spacing-xl);
      scrollbar-gutter: stable;
      box-sizing: border-box;
    }

    .main-content-inner {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0;
      box-sizing: border-box;
    }

    @media (max-width: 768px) {
      .main-content {
        padding: var(--spacing-md);
        height: auto;
        overflow-y: visible;
        align-items: stretch;
        scrollbar-gutter: auto;
      }

      .main-content-inner {
        max-width: none;
      }
    }
  `]
})
export class ShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly apollo = inject(Apollo);
  readonly overlayService = inject(OverlayService);

  // User State from AuthService
  userName = computed(() => this.authService.userFullName());
  userRole = computed(() => this.authService.userRole());
  mandantName = computed(() => this._mandantName());

  private _mandantName = signal<string | null>(null);

  ngOnInit(): void {
    const mandantId = this.authService.getMandantId();
    if (mandantId != null) {
      this.apollo.query<{ mandant: { id: string; name: string; kuerzel: string } | null }>({
        query: GET_MANDANT,
        variables: { id: String(mandantId) },
        context: { clientName: 'studiengang' },
        fetchPolicy: 'network-only'
      }).subscribe({
        next: (res) => {
          const m = res.data?.mandant;
          if (m?.name) this._mandantName.set(m.name);
        },
        error: () => { /* Mandant nicht verfügbar */ }
      });
    }
  }

  // UI State
  showUserMenu = false;
  mobileMenuOpen = false;

  // Navigation Items – Prüfungsamt reduziert (Queue-Fokus), Rest wie bisher
  dockItems: DockItem[] = [
    // === PRÜFUNGSAMT (Dashboard → Validierung → Protokoll → …) ===
    {
      id: 'dashboard-pa',
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'assets/icons/dashboard.svg',
      roles: ['PRUEFUNGSAMT'],
      section: 'Prüfungsamt'
    },
    {
      id: 'validation-pa',
      label: 'Validierung',
      route: '/grades/validation',
      icon: 'assets/icons/validation.svg',
      roles: ['PRUEFUNGSAMT'],
      section: 'Prüfungsamt'
    },
    {
      id: 'audit-pa',
      label: 'Protokoll',
      route: '/grades/audit',
      icon: 'assets/icons/audit.svg',
      roles: ['PRUEFUNGSAMT', 'HOCHSCHUL_VERWALTER'],
      section: 'Prüfungsamt'
    },
    {
      id: 'stats-pa',
      label: 'Statistik',
      route: '/stats',
      icon: 'assets/icons/stats.svg',
      roles: ['PRUEFUNGSAMT'],
      section: 'Prüfungsamt'
    },
    {
      id: 'students-pa',
      label: 'Studierende',
      route: '/students',
      icon: 'assets/icons/students.svg',
      roles: ['PRUEFUNGSAMT'],
      section: 'Prüfungsamt'
    },
    // === STUDENT ===
    {
      id: 'dashboard-student',
      label: 'Übersicht',
      route: '/dashboard',
      icon: 'assets/icons/dashboard.svg',
      roles: ['STUDENT'],
      section: 'Studium'
    },
    // === ADMIN / HV (ohne PRUEFUNGSAMT in Akademisch) ===
    {
      id: 'admin',
      label: 'Übersicht',
      route: '/admin',
      icon: 'assets/icons/dashboard.svg',
      roles: ['ADMIN'],
      section: ''
    },
    {
      id: 'mandanten',
      label: 'Hochschulen',
      route: '/admin/mandanten',
      icon: 'assets/icons/stats.svg',
      roles: ['ADMIN', 'HOCHSCHUL_VERWALTER'],
      section: 'Verwaltung'
    },
    {
      id: 'users',
      label: 'Benutzer',
      route: '/admin/users',
      icon: 'assets/icons/admin.svg',
      roles: ['ADMIN'],
      section: 'Verwaltung'
    },
    {
      id: 'assignments',
      label: 'Zuweisungen',
      route: '/admin/assignments',
      icon: 'assets/icons/grades.svg',
      roles: ['ADMIN', 'HOCHSCHUL_VERWALTER', 'PRUEFUNGSAMT'],
      section: 'Verwaltung'
    },
    // === ADMIN: Auswertung (eigene Sektion) ===
    {
      id: 'students-admin',
      label: 'Studenten',
      route: '/students',
      icon: 'assets/icons/students.svg',
      roles: ['ADMIN'],
      section: 'Auswertung'
    },
    {
      id: 'validation-admin',
      label: 'Validierung',
      route: '/grades/validation',
      icon: 'assets/icons/validation.svg',
      roles: ['ADMIN'],
      section: 'Auswertung'
    },
    {
      id: 'stats-admin',
      label: 'Statistik',
      route: '/stats',
      icon: 'assets/icons/stats.svg',
      roles: ['ADMIN'],
      section: 'Auswertung'
    },
    {
      id: 'audit-admin',
      label: 'Protokoll',
      route: '/grades/audit',
      icon: 'assets/icons/audit.svg',
      roles: ['ADMIN'],
      section: 'Auswertung'
    },
    // === HOCHSCHUL_VERWALTER: Akademisch (wie bisher) ===
    {
      id: 'students',
      label: 'Studenten',
      route: '/students',
      icon: 'assets/icons/students.svg',
      roles: ['HOCHSCHUL_VERWALTER'],
      section: 'Akademisch'
    },
    {
      id: 'validation',
      label: 'Validierung',
      route: '/grades/validation',
      icon: 'assets/icons/validation.svg',
      roles: ['HOCHSCHUL_VERWALTER'],
      section: 'Akademisch'
    },
    {
      id: 'stats',
      label: 'Statistik',
      route: '/stats',
      icon: 'assets/icons/stats.svg',
      roles: ['LEHRENDER', 'HOCHSCHUL_VERWALTER'],
      section: 'Akademisch'
    },
    {
      id: 'study-plan',
      label: 'Studienplan',
      route: '/study-plan',
      icon: 'assets/icons/calculation.svg',
      roles: ['STUDENT'],
      section: 'Studium'
    },
    
    // === DOZENT (Meine Module zuerst = Standardansicht) ===
    {
      id: 'dashboard-dozent',
      label: 'Meine Module',
      route: '/dashboard',
      icon: 'assets/icons/calculation.svg',
      roles: ['LEHRENDER'],
      section: 'LEHRE'
    },
    {
      id: 'grades-entry-dozent',
      label: 'Notenerfassung',
      route: '/grades/entry',
      icon: 'assets/icons/grades.svg',
      roles: ['LEHRENDER'],
      section: 'LEHRE'
    },
    {
      id: 'stats-dozent',
      label: 'Statistik',
      route: '/stats',
      icon: 'assets/icons/stats.svg',
      roles: ['LEHRENDER'],
      section: 'LEHRE'
    },
    {
      id: 'audit-dozent',
      label: 'Protokoll',
      route: '/grades/audit',
      icon: 'assets/icons/audit.svg',
      roles: ['LEHRENDER'],
      section: 'LEHRE'
    },
    
    // === STUDENT ===
    {
      id: 'grades',
      label: 'Noten',
      route: '/grades',
      icon: 'assets/icons/grades.svg',
      roles: ['STUDENT'],
      section: 'Leistung'
    },
    {
      id: 'progress',
      label: 'Fortschritt',
      route: '/progress',
      icon: 'assets/icons/progress.svg',
      roles: ['STUDENT'],
      section: 'Studium'
    },
    // === Konto (alle Rollen) ===
    {
      id: 'profile',
      label: 'Profil',
      route: '/profile',
      icon: 'assets/icons/profile.svg',
      roles: ['ADMIN', 'DOZENT', 'LEHRENDER', 'PRUEFUNGSAMT', 'HOCHSCHUL_VERWALTER', 'STUDENT'],
      section: 'Konto'
    }
  ];

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showUserMenu) {
      this.showUserMenu = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showUserMenu = false;
    this.mobileMenuOpen = false;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  toggleUserMenu(): void {
    setTimeout(() => {
      this.showUserMenu = !this.showUserMenu;
    }, 10);
  }

  onLogout(): void {
    this.authService.logout();
  }
}

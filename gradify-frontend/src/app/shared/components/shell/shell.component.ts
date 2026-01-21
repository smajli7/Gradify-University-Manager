import { Component, HostListener, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { DockComponent, DockItem } from '../dock/dock.component';
import { MobileMenuComponent } from '../mobile-menu/mobile-menu.component';
import { AuthService } from '../../../core/services/auth.service';

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
        [showUserMenu]="showUserMenu"
        (menuToggle)="toggleMobileMenu()"
        (userMenuToggle)="toggleUserMenu()"
        (logout)="onLogout()">
      </app-header>

      <!-- Main Content -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <!-- Floating Dock (Desktop) -->
      <app-dock
        [items]="dockItems"
        [userRole]="userRole()">
      </app-dock>

      <!-- Mobile Menu -->
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
      min-height: 100dvh; /* Dynamic viewport height for mobile */
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .main-content {
      flex: 1;
      padding: var(--spacing-xl) var(--spacing-lg);
      padding-bottom: 120px; /* Platz fuer Dock */
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }

    @media (max-width: 768px) {
      .main-content {
        padding: var(--spacing-md);
        padding-bottom: var(--spacing-xl);
      }
    }
  `]
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  // User State from AuthService
  userName = computed(() => this.authService.userFullName());
  userRole = computed(() => this.authService.userRole());

  // UI State
  showUserMenu = false;
  mobileMenuOpen = false;

  // Navigation Items mit Custom Icons
  // Icons liegen in: assets/icons/*.png (oder .svg)
  // Navigation Items mit Custom Icons
  // Ersetze .svg durch .png wenn du eigene Photoshop-Icons erstellst
  dockItems: DockItem[] = [
    // === ADMIN ===
    {
      id: 'admin',
      label: 'Übersicht',
      route: '/admin',
      icon: 'assets/icons/dashboard.svg',
      roles: ['ADMIN']
    },
    {
      id: 'mandanten',
      label: 'Hochschulen',
      route: '/admin/mandanten',
      icon: 'assets/icons/stats.svg',
      roles: ['ADMIN']
    },
    {
      id: 'users',
      label: 'Benutzer',
      route: '/admin/users',
      icon: 'assets/icons/admin.svg',
      roles: ['ADMIN']
    },
    {
      id: 'assignments',
      label: 'Zuweisungen',
      route: '/admin/assignments',
      icon: 'assets/icons/grades.svg',
      roles: ['ADMIN']
    },
    {
      id: 'students',
      label: 'Studenten',
      route: '/students',
      icon: 'assets/icons/students.svg',
      roles: ['ADMIN', 'PRUEFUNGSAMT']
    },
    {
      id: 'validation',
      label: 'Validierung',
      route: '/grades/validation',
      icon: 'assets/icons/validation.svg',
      roles: ['ADMIN', 'PRUEFUNGSAMT']
    },
    {
      id: 'calculation',
      label: 'Berechnung',
      route: '/calculation',
      icon: 'assets/icons/calculation.svg',
      roles: ['ADMIN', 'PRUEFUNGSAMT']
    },
    {
      id: 'stats',
      label: 'Statistik',
      route: '/stats',
      icon: 'assets/icons/stats.svg',
      roles: ['ADMIN', 'DOZENT', 'LEHRENDER', 'PRUEFUNGSAMT']
    },
    {
      id: 'study-plan',
      label: 'Studienplan',
      route: '/study-plan',
      icon: 'assets/icons/progress.svg',
      roles: ['ADMIN', 'PRUEFUNGSAMT', 'STUDENT']
    },
    
    // === DOZENT ===
    {
      id: 'dashboard-dozent',
      label: 'Module',
      route: '/dashboard',
      icon: 'assets/icons/grades.svg',
      roles: ['LEHRENDER']
    },
    
    // === PRÜFUNGSAMT ===
    // (nutzt Admin-Items: Students, Validation, Calculation, Stats)
    
    // === STUDENT ===
    {
      id: 'grades',
      label: 'Noten',
      route: '/grades',
      icon: 'assets/icons/grades.svg',
      roles: ['STUDENT']
    },
    {
      id: 'progress',
      label: 'Fortschritt',
      route: '/progress',
      icon: 'assets/icons/progress.svg',
      roles: ['STUDENT']
    },
    {
      id: 'dashboard-student',
      label: 'Studenten Übersicht',
      route: '/dashboard',
      icon: 'assets/icons/dashboard.svg',
      roles: ['STUDENT']
    },
    
    // === ALLE ===
    {
      id: 'profile',
      label: 'Profil',
      route: '/profile',
      icon: 'assets/icons/profile.svg',
      roles: ['ADMIN', 'DOZENT', 'LEHRENDER', 'PRUEFUNGSAMT', 'STUDENT']
    }
  ];

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // User-Menu schliessen wenn ausserhalb geklickt
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
    // Verzoegerung damit Click-Event nicht sofort schliesst
    setTimeout(() => {
      this.showUserMenu = !this.showUserMenu;
    }, 10);
  }

  onLogout(): void {
    this.authService.logout();
  }
}

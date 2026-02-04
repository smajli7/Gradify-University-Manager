import { Component, Input, Output, EventEmitter, inject, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DebugService } from '../../../core/services/debug.service';
import { DebugPanelComponent } from '../debug-panel/debug-panel.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, DebugPanelComponent],
  template: `
    <header class="header">
      <div class="header-container">
        <!-- Mobile Menu Button -->
        <button 
          class="menu-btn hide-desktop"
          (click)="menuToggle.emit()"
          aria-label="Menu oeffnen">
          <span class="material-icons-outlined">menu</span>
        </button>

        <!-- Logo -->
        <a routerLink="/dashboard" class="logo">
          <svg class="logo-svg" viewBox="0 0 180 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Rahmen -->
            <rect x="2" y="4" width="90" height="32" rx="8" ry="8" 
                  stroke="url(#headerLogoGradient)" stroke-width="1.5" fill="none"/>
            
            <!-- Text 1.0 | 1.3 -->
            <text x="47" y="26" font-family="DM Sans, sans-serif" font-size="13" font-weight="600" 
                  fill="#E6EDF3" text-anchor="middle">
              <tspan>1.0</tspan>
              <tspan fill="#8B949E" font-weight="300"> | </tspan>
              <tspan>1.3</tspan>
            </text>
            
            <!-- Gradify Text -->
            <text x="138" y="28" font-family="DM Sans, sans-serif" font-size="18" font-weight="600" 
                  fill="#E6EDF3" text-anchor="middle" letter-spacing="0.5">Gradify</text>
            
            <!-- Gradient Definition -->
            <defs>
              <linearGradient id="headerLogoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#00F2FF"/>
                <stop offset="100%" stop-color="#7000FF"/>
              </linearGradient>
            </defs>
          </svg>
        </a>

        <!-- Spacer -->
        <div class="spacer"></div>

        <!-- Debug Toggle -->
        <button
          class="debug-btn"
          [class.active]="isDebugActive()"
          (click)="toggleDebug()"
          [title]="isDebugActive() ? 'Debug aus' : 'Debug an'">
          <span class="material-icons-outlined">bug_report</span>
          <span class="debug-label hide-mobile">Debug</span>
        </button>

        <!-- User Menu -->
        <div class="user-menu">
          <div class="user-info hide-mobile">
            <span class="user-name">{{ userName }}</span>
            <span class="user-role badge" [ngClass]="'badge--' + userRoleClass">
              {{ userRoleLabel }}
            </span>
          </div>

          <button 
            class="user-avatar"
            (click)="userMenuToggle.emit()"
            [title]="userName">
            <img 
              *ngIf="userAvatar" 
              [src]="userAvatar" 
              [alt]="userName"
              class="avatar-img">
            <span *ngIf="!userAvatar" class="avatar-fallback">
              {{ userInitials }}
            </span>
          </button>

          <!-- Dropdown (optional, gesteuert von Parent) -->
          <div class="dropdown" *ngIf="showUserMenu" (click)="$event.stopPropagation()">
            <a routerLink="/profile" class="dropdown-item">
              <span class="material-icons-outlined">person</span>
              Profil
            </a>
            <a routerLink="/settings" class="dropdown-item" *ngIf="userRole === 'ADMIN'">
              <span class="material-icons-outlined">settings</span>
              Einstellungen
            </a>
            <hr class="dropdown-divider">
            <button class="dropdown-item dropdown-item--danger" (click)="logout.emit()">
              <span class="material-icons-outlined">logout</span>
              Abmelden
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Debug Panel -->
    <app-debug-panel></app-debug-panel>
  `,
  styles: [`
    .header {
      position: sticky;
      top: 0;
      z-index: var(--z-header);
      background: rgba(22, 27, 34, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border-color);
    }

    .header-container {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      max-width: 1400px;
      margin: 0 auto;
      padding: var(--spacing-sm) var(--spacing-lg);
      height: 64px;
    }

    /* Menu Button (Mobile) */
    .menu-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: none;
      border: none;
      color: var(--text-primary);
      cursor: pointer;
      border-radius: var(--radius-md);
      transition: background var(--transition-fast);
    }

    .menu-btn:hover {
      background: var(--bg-hover);
    }

    /* Logo */
    .logo {
      display: flex;
      align-items: center;
      text-decoration: none;
    }

    .logo-svg {
      width: 160px;
      height: 44px;
    }

    .spacer {
      flex: 1;
    }

    /* User Menu */
    .user-menu {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .user-name {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--text-primary);
    }

    .user-role {
      font-size: 10px;
      padding: 2px 8px;
    }

    .badge--admin {
      background: rgba(var(--color-danger-rgb), 0.15);
      color: var(--color-danger);
      border-color: rgba(var(--color-danger-rgb), 0.3);
    }

    .badge--hochschul_verwalter {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border-color: rgba(34, 197, 94, 0.3);
    }

    .badge--dozent {
      background: rgba(var(--color-secondary-rgb), 0.15);
      color: #a855f7;
      border-color: rgba(var(--color-secondary-rgb), 0.3);
    }

    .badge--pruefungsamt {
      background: rgba(var(--color-warning-rgb), 0.15);
      color: var(--color-warning);
      border-color: rgba(var(--color-warning-rgb), 0.3);
    }

    .badge--student {
      background: rgba(var(--color-primary-rgb), 0.15);
      color: var(--color-primary);
      border-color: rgba(var(--color-primary-rgb), 0.3);
    }

    /* Avatar */
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid var(--border-color);
      background: var(--bg-elevated);
      cursor: pointer;
      overflow: hidden;
      transition: all var(--transition-fast);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-avatar:hover {
      border-color: var(--color-primary);
      box-shadow: 0 0 12px rgba(var(--color-primary-rgb), 0.3);
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-fallback {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-muted);
    }

    /* Dropdown */
    .dropdown {
      position: absolute;
      top: calc(100% + var(--spacing-sm));
      right: 0;
      min-width: 200px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: var(--spacing-xs);
      animation: slideDown 0.2s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-sm);
      color: var(--text-primary);
      text-decoration: none;
      border-radius: var(--radius-md);
      border: none;
      background: none;
      width: 100%;
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .dropdown-item:hover {
      background: var(--bg-hover);
    }

    .dropdown-item .material-icons-outlined {
      font-size: 18px;
      color: var(--text-muted);
    }

    .dropdown-item--danger {
      color: var(--color-danger);
    }

    .dropdown-item--danger .material-icons-outlined {
      color: var(--color-danger);
    }

    .dropdown-divider {
      border: none;
      border-top: 1px solid var(--border-color);
      margin: var(--spacing-xs) 0;
    }

    /* Debug Toggle */
    .debug-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(255,255,255,0.08);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-muted);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .debug-btn:hover {
      background: rgba(255,255,255,0.12);
      color: var(--text-primary);
      border-color: var(--color-primary);
    }

    .debug-btn.active {
      background: rgba(var(--color-primary-rgb), 0.15);
      color: var(--color-primary);
      border-color: var(--color-primary);
    }

    .debug-btn .material-icons-outlined {
      font-size: 18px;
    }

    .debug-label {
      font-weight: 500;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header-container {
        padding: var(--spacing-sm) var(--spacing-md);
      }

      .logo-text {
        font-size: var(--font-size-md);
      }
    }
  `]
})
export class HeaderComponent implements AfterViewInit {
  private readonly debugService = inject(DebugService);

  @ViewChild(DebugPanelComponent) debugPanel!: DebugPanelComponent;

  @Input() userName: string = 'Benutzer';
  @Input() userRole: string = 'STUDENT';
  @Input() userAvatar: string | null = null;
  @Input() logoSrc: string | null = null;
  @Input() showUserMenu: boolean = false;

  @Output() menuToggle = new EventEmitter<void>();
  @Output() userMenuToggle = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() debugPanelOpen = new EventEmitter<boolean>();

  ngAfterViewInit(): void {
    if (this.debugService.debugMode() && this.debugPanel) {
      this.debugPanel.open();
    }
  }

  isDebugActive(): boolean {
    return this.debugService.debugMode();
  }

  toggleDebug(): void {
    this.debugService.toggle();
    const on = this.debugService.debugMode();
    if (this.debugPanel) {
      if (on) this.debugPanel.open();
      else this.debugPanel.close();
    }
    this.debugPanelOpen.emit(on);
  }

  get userInitials(): string {
    return this.userName
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  get userRoleLabel(): string {
    const labels: Record<string, string> = {
      'ADMIN': 'Admin',
      'HOCHSCHUL_VERWALTER': 'Hochschul-Verwalter',
      'DOZENT': 'Dozent',
      'LEHRENDER': 'Dozent',
      'PRUEFUNGSAMT': 'Prüfungsamt',
      'STUDENT': 'Student'
    };
    return labels[this.userRole] || this.userRole;
  }

  get userRoleClass(): string {
    return this.userRole.toLowerCase();
  }
}

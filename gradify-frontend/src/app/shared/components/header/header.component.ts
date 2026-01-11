import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
          <img 
            *ngIf="logoSrc" 
            [src]="logoSrc" 
            alt="Gradify" 
            class="logo-img">
          <span *ngIf="!logoSrc" class="logo-emoji">🎓</span>
          <span class="logo-text">Gradify</span>
        </a>

        <!-- Spacer -->
        <div class="spacer"></div>

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
      gap: var(--spacing-sm);
      text-decoration: none;
    }

    .logo-img {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }

    .logo-emoji {
      font-size: 28px;
    }

    .logo-text {
      font-size: var(--font-size-lg);
      font-weight: 700;
      background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
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
export class HeaderComponent {
  @Input() userName: string = 'Benutzer';
  @Input() userRole: string = 'STUDENT';
  @Input() userAvatar: string | null = null;
  @Input() logoSrc: string | null = null;
  @Input() showUserMenu: boolean = false;

  @Output() menuToggle = new EventEmitter<void>();
  @Output() userMenuToggle = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

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
      'DOZENT': 'Dozent',
      'PRUEFUNGSAMT': 'Pruefungsamt',
      'STUDENT': 'Student'
    };
    return labels[this.userRole] || this.userRole;
  }

  get userRoleClass(): string {
    return this.userRole.toLowerCase();
  }
}

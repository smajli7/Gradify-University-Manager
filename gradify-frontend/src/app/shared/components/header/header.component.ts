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
          aria-label="Menü öffnen">
          <span class="material-icons-outlined">menu</span>
        </button>

        <!-- Logo (einheitlich mit Login-Screen) -->
        <a routerLink="/dashboard" class="logo">
          <div class="logo-frame-container">
            <svg class="logo-frame-svg" viewBox="0 0 200 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="headerLogoFrameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="rgba(200, 210, 220, 0.7)"/>
                  <stop offset="30%" stop-color="rgba(180, 190, 200, 0.6)"/>
                  <stop offset="50%" stop-color="rgba(160, 170, 180, 0.55)"/>
                  <stop offset="70%" stop-color="rgba(180, 190, 200, 0.6)"/>
                  <stop offset="100%" stop-color="rgba(200, 210, 220, 0.7)"/>
                </linearGradient>
              </defs>
              <rect class="logo-frame-rect" x="2" y="2" width="196" height="48" rx="10" ry="10"
                    stroke="url(#headerLogoFrameGrad)" stroke-width="2" fill="none"/>
            </svg>
            <div class="logo-content">
              <div class="version-group version-left">
                <span class="char">1</span><span class="char">.</span><span class="char">0</span>
              </div>
              <div class="version-divider"></div>
              <div class="version-group version-right">
                <span class="char">1</span><span class="char">.</span><span class="char">3</span>
              </div>
            </div>
          </div>
          <div class="logo-title">
            <span class="letter">G</span><span class="letter">r</span><span class="letter">a</span>
            <span class="letter">d</span><span class="letter">i</span><span class="letter">f</span><span class="letter">y</span>
          </div>
        </a>

        <!-- Debug Toggle (unauffällig rechts vom Logo) -->
        <button
          class="debug-btn"
          [class.active]="isDebugActive()"
          (click)="toggleDebug()"
          [title]="isDebugActive() ? 'Debug aus' : 'Debug an'">
          <span class="material-icons-outlined">bug_report</span>
        </button>

        <!-- Spacer -->
        <div class="spacer"></div>

        <!-- Hochschule (wenn mandantName gesetzt) -->
        @if (mandantName) {
          <div class="mandant-badge" [title]="mandantName">
            <span class="mandant-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </span>
            <span class="mandant-text">{{ mandantName }}</span>
          </div>
        }

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
      background: rgba(18, 18, 18, 0.94);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border-color);
    }

    .header-container {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-sm) var(--spacing-lg);
      height: 60px;
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

    /* Logo (einheitlich mit Login) */
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
    }

    .logo-frame-container {
      position: relative;
      width: 120px;
      height: 32px;
    }

    .logo-frame-svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    .logo-frame-rect {
      stroke-dasharray: 500;
      stroke-dashoffset: 0;
    }

    .logo-content {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      align-items: center;
      font-family: var(--font-family);
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .version-group { display: flex; }

    .version-divider {
      width: 2px;
      height: 18px;
      background: linear-gradient(to top, transparent, var(--text-muted) 20%, var(--text-muted) 80%, transparent);
      margin: 0 8px;
    }

    .logo-title {
      display: flex;
      font-family: var(--font-family);
      font-size: 18px;
      font-weight: 500;
      letter-spacing: 2px;
      color: var(--text-primary);
    }

    .logo-title .letter {
      color: var(--text-primary);
    }

    .spacer {
      flex: 1;
    }

    /* Hochschule-Badge */
    .mandant-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-md);
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 500;
    }

    .mandant-icon {
      display: flex;
      flex-shrink: 0;
    }

    .mandant-icon svg {
      width: 16px;
      height: 16px;
      opacity: 0.85;
    }

    @media (max-width: 768px) {
      .mandant-badge {
        display: none;
      }
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
      background: var(--bg-elevated);
      color: var(--text-secondary);
      border-color: var(--border-color);
    }

    .badge--hochschul_verwalter {
      background: var(--bg-elevated);
      color: var(--text-secondary);
      border-color: var(--border-color);
    }

    .badge--dozent, .badge--lehrender {
      background: var(--bg-elevated);
      color: var(--text-secondary);
      border-color: var(--border-color);
    }

    .badge--pruefungsamt {
      background: var(--bg-elevated);
      color: var(--text-secondary);
      border-color: var(--border-color);
    }

    .badge--student {
      background: var(--bg-elevated);
      color: var(--text-secondary);
      border-color: var(--border-color);
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
      border-color: var(--text-secondary);
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

    /* Debug Toggle (unauffällig) */
    .debug-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      opacity: 0.5;
      cursor: pointer;
      transition: all 0.2s;
    }

    .debug-btn:hover {
      opacity: 0.8;
      color: var(--text-muted);
    }

    .debug-btn.active {
      opacity: 0.9;
      color: var(--text-secondary);
    }

    .debug-btn .material-icons-outlined {
      font-size: 16px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header-container {
        padding: var(--spacing-sm) var(--spacing-md);
      }

      .logo-frame-container {
        width: 100px;
        height: 28px;
      }

      .logo-content { font-size: 12px; }

      .logo-title { font-size: 16px; letter-spacing: 1px; }
    }
  `]
})
export class HeaderComponent implements AfterViewInit {
  private readonly debugService = inject(DebugService);

  @ViewChild(DebugPanelComponent) debugPanel!: DebugPanelComponent;

  @Input() userName: string = 'Benutzer';
  @Input() userRole: string = 'STUDENT';
  @Input() mandantName: string | null = null;
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

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DockItem } from '../dock/dock.component';

@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <!-- Backdrop -->
    <div 
      class="backdrop" 
      [class.backdrop--visible]="isOpen"
      (click)="close.emit()">
    </div>

    <!-- Slide-in Menu -->
    <nav class="mobile-menu" [class.mobile-menu--open]="isOpen">
      <div class="menu-header">
        <span class="menu-title">Navigation</span>
        <button class="close-btn" (click)="close.emit()">
          <span class="material-icons-outlined">close</span>
        </button>
      </div>

      <div class="menu-content">
        @for (item of visibleItems; track item.id) {
          <a 
            class="menu-item"
            [routerLink]="item.route"
            routerLinkActive="menu-item--active"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            (click)="close.emit()">
            
            <div class="menu-icon">
              <img 
                [src]="item.icon" 
                [alt]="item.label"
                class="menu-icon-img"
                (error)="onIconError($event, item)">
              <span class="menu-icon-fallback" *ngIf="item.iconError">
                {{ item.label.charAt(0) }}
              </span>
            </div>
            
            <span class="menu-label">{{ item.label }}</span>
            
            <span class="material-icons-outlined menu-arrow">chevron_right</span>
          </a>
        }
      </div>

      <div class="menu-footer">
        <a routerLink="/profile" class="menu-item" (click)="close.emit()">
          <div class="menu-icon">
            <span class="material-icons-outlined">person</span>
          </div>
          <span class="menu-label">Profil</span>
        </a>
        
        <button class="menu-item menu-item--danger" (click)="logout.emit()">
          <div class="menu-icon">
            <span class="material-icons-outlined">logout</span>
          </div>
          <span class="menu-label">Abmelden</span>
        </button>
      </div>
    </nav>
  `,
  styles: [`
    /* Backdrop */
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: calc(var(--z-modal) - 1);
      opacity: 0;
      visibility: hidden;
      transition: all var(--transition-normal);
    }

    .backdrop--visible {
      opacity: 1;
      visibility: visible;
    }

    /* Mobile Menu */
    .mobile-menu {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 280px;
      max-width: 85vw;
      background: var(--bg-surface);
      border-right: 1px solid var(--border-color);
      z-index: var(--z-modal);
      display: flex;
      flex-direction: column;
      transform: translateX(-100%);
      transition: transform var(--transition-normal);
    }

    .mobile-menu--open {
      transform: translateX(0);
    }

    /* Header */
    .menu-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md) var(--spacing-lg);
      border-bottom: 1px solid var(--border-color);
    }

    .menu-title {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--text-primary);
    }

    .close-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
    }

    .close-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    /* Content */
    .menu-content {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-md);
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      text-decoration: none;
      color: var(--text-primary);
      border-radius: var(--radius-lg);
      margin-bottom: var(--spacing-xs);
      transition: all var(--transition-fast);
      border: none;
      background: none;
      width: 100%;
      cursor: pointer;
      font-size: var(--font-size-md);
      font-family: var(--font-family);
    }

    .menu-item:hover {
      background: var(--bg-hover);
    }

    .menu-item--active {
      background: rgba(var(--color-primary-rgb), 0.1);
      color: var(--color-primary);
    }

    .menu-item--active .menu-icon {
      background: rgba(var(--color-primary-rgb), 0.15);
    }

    .menu-item--active .menu-icon-img {
      filter: brightness(1.3) drop-shadow(0 0 4px rgba(var(--color-primary-rgb), 0.5));
    }

    .menu-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-elevated);
      border-radius: var(--radius-md);
      flex-shrink: 0;
    }

    .menu-icon-img {
      width: 24px;
      height: 24px;
      object-fit: contain;
    }

    .menu-icon-fallback {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .menu-icon .material-icons-outlined {
      font-size: 22px;
      color: var(--text-muted);
    }

    .menu-label {
      flex: 1;
      text-align: left;
    }

    .menu-arrow {
      color: var(--text-muted);
      font-size: 20px;
    }

    /* Footer */
    .menu-footer {
      padding: var(--spacing-md);
      border-top: 1px solid var(--border-color);
    }

    .menu-item--danger {
      color: var(--color-danger);
    }

    .menu-item--danger .menu-icon .material-icons-outlined {
      color: var(--color-danger);
    }
  `]
})
export class MobileMenuComponent {
  @Input() items: DockItem[] = [];
  @Input() userRole: string = 'STUDENT';
  @Input() isOpen: boolean = false;

  @Output() close = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  get visibleItems(): (DockItem & { iconError?: boolean })[] {
    return this.items
      .filter(item => !item.roles || item.roles.includes(this.userRole))
      .map(item => ({ ...item, iconError: false }));
  }

  onIconError(event: Event, item: DockItem & { iconError?: boolean }): void {
    item.iconError = true;
  }
}

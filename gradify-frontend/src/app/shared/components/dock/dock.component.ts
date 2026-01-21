import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

export interface DockItem {
  id: string;
  label: string;
  route: string;
  icon: string; // Pfad zum Custom Icon (z.B. 'assets/icons/dashboard.png')
  roles?: string[]; // Welche Rollen sehen dieses Item
}

@Component({
  selector: 'app-dock',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="dock" [class.dock--hidden]="isHidden">
      <div class="dock-container">
        @for (item of visibleItems; track item.id) {
          <a 
            class="dock-item"
            [routerLink]="item.route"
            routerLinkActive="dock-item--active"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' || item.route === '/admin' }"
            [title]="item.label">
            
            <!-- Custom Icon Image -->
            <div class="dock-icon">
              <img 
                [src]="item.icon" 
                [alt]="item.label"
                class="dock-icon-img"
                (error)="onIconError($event, item)">
              
              <!-- Fallback: Erstes Zeichen des Labels -->
              <span class="dock-icon-fallback" *ngIf="item.iconError">
                {{ item.label.charAt(0) }}
              </span>
            </div>
            
            <!-- Label (erscheint bei Hover) -->
            <span class="dock-label">{{ item.label }}</span>
            
            <!-- Active Indicator -->
            <span class="dock-indicator"></span>
          </a>
        }
      </div>
    </nav>
  `,
  styles: [`
    .dock {
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      transition: all var(--transition-normal);
      pointer-events: auto;
    }

    .dock--hidden {
      transform: translateX(-50%) translateY(100px);
      opacity: 0;
      pointer-events: none;
    }

    .dock-container {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-md);
      background: rgba(22, 27, 34, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    }

    .dock-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--spacing-sm);
      text-decoration: none;
      transition: all var(--transition-fast);
      cursor: pointer;
    }

    .dock-icon {
      position: relative;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-lg);
      background: var(--bg-elevated);
      transition: all var(--transition-fast);
      overflow: hidden;
    }

    .dock-icon-img {
      width: 28px;
      height: 28px;
      object-fit: contain;
      filter: brightness(0.9);
      transition: all var(--transition-fast);
    }

    .dock-icon-fallback {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .dock-label {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(-8px);
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      font-size: var(--font-size-xs);
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: all var(--transition-fast);
      pointer-events: none;
      box-shadow: var(--shadow-md);
    }

    .dock-label::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: var(--border-color);
    }

    .dock-indicator {
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: transparent;
      transition: all var(--transition-fast);
    }

    /* Hover State */
    .dock-item:hover .dock-icon {
      transform: translateY(-4px) scale(1.1);
      background: var(--bg-hover);
    }

    .dock-item:hover .dock-icon-img {
      filter: brightness(1.2);
    }

    .dock-item:hover .dock-label {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(-12px);
    }

    /* Active State */
    .dock-item--active .dock-icon {
      background: rgba(var(--color-primary-rgb), 0.15);
      box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.3);
    }

    .dock-item--active .dock-icon-img {
      filter: brightness(1.3) drop-shadow(0 0 8px rgba(var(--color-primary-rgb), 0.5));
    }

    .dock-item--active .dock-indicator {
      background: var(--color-primary);
      box-shadow: 0 0 8px var(--color-primary);
    }

    .dock-item--active .dock-icon-fallback {
      color: var(--color-primary);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .dock {
        display: none;
      }
    }

    @media (max-width: 600px) {
      .dock-icon {
        width: 40px;
        height: 40px;
      }

      .dock-icon-img {
        width: 24px;
        height: 24px;
      }

      .dock-container {
        padding: var(--spacing-xs) var(--spacing-sm);
      }
    }
  `]
})
export class DockComponent {
  @Input() items: DockItem[] = [];
  @Input() userRole: string = 'STUDENT';
  @Input() isHidden: boolean = false;

  private router = inject(Router);

  get visibleItems(): (DockItem & { iconError?: boolean })[] {
    // Wenn keine Rolle, zeige nichts
    if (!this.userRole || this.userRole === '') {
      return [];
    }
    
    return this.items
      .filter(item => !item.roles || item.roles.length === 0 || item.roles.includes(this.userRole))
      .map(item => ({ ...item, iconError: false }));
  }

  onIconError(event: Event, item: DockItem & { iconError?: boolean }): void {
    item.iconError = true;
  }
}

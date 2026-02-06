import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

export interface DockItem {
  id: string;
  label: string;
  route: string;
  icon: string;
  roles?: string[];
  section?: string;
  iconError?: boolean;
}

@Component({
  selector: 'app-dock',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.sidebar--collapsed]="isCollapsed">
      <nav class="sidebar-nav">
        @for (group of groupedItems; track group.section) {
          @if (group.section && !isCollapsed) {
            <div class="sidebar-section-label">{{ group.section }}</div>
          }
          @for (item of group.items; track item.id) {
            <a 
              class="sidebar-item"
              [routerLink]="item.route"
              routerLinkActive="sidebar-item--active"
              [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' || item.route === '/admin' }"
              [title]="item.label">
              
              <div class="sidebar-icon">
                <img 
                  [src]="item.icon" 
                  [alt]="item.label"
                  class="sidebar-icon-img"
                  (error)="onIconError($event, item)">
                <span class="sidebar-icon-fallback" *ngIf="item.iconError">
                  {{ item.label.charAt(0) }}
                </span>
              </div>
              
              <span class="sidebar-label" [class.collapsed-hidden]="isCollapsed">{{ item.label }}</span>
            </a>
          }
        }
      </nav>

      <div class="sidebar-footer">
        <button class="sidebar-toggle" (click)="toggleCollapse()" [title]="isCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'">
          <span class="material-icons-outlined">{{ isCollapsed ? 'chevron_right' : 'chevron_left' }}</span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    /* Icon-Rail: zuerst Text ausblenden, dann Breite verringern */
    .sidebar {
      position: sticky;
      top: 60px;
      height: calc(100vh - 60px);
      width: 240px;
      min-width: 240px;
      background: rgba(18, 18, 18, 0.95); /* Leicht transparent */
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-right: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: var(--z-sidebar, 400);
      transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) 0s, min-width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) 0s;
    }

    .sidebar--collapsed {
      width: 68px;
      min-width: 68px;
      transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s, min-width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s;
    }

    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 12px 8px; /* Mehr Padding um die Liste */
    }

    .sidebar--collapsed .sidebar-nav {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 12px 0;
    }

    .sidebar-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 14px;
      margin-bottom: 4px;
      width: 100%;
      box-sizing: border-box;
      text-decoration: none;
      color: #A1A1AA; /* Secondary Text */
      border-radius: 8px; /* Leicht abgerundet wirkt oft hochwertiger als komplett eckig */
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      white-space: nowrap;
      min-height: 44px;
      position: relative;
    }

    .sidebar--collapsed .sidebar-item {
      width: 44px;
      height: 44px;
      padding: 0;
      margin: 0 0 4px 0;
      gap: 0;
      justify-content: center;
      border-radius: 10px;
    }

    .sidebar-item:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #F4F4F5;
    }
    .sidebar-item:focus-visible {
      outline: 2px solid rgba(249, 115, 22, 0.5);
      outline-offset: 2px;
    }

    .sidebar-item--active {
      background: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
      font-weight: 500;
    }

    /* Aktiver Indikator (kleiner Dot oder Strich) */
    .sidebar-item--active {
      border-left: 3px solid transparent;
    }
    .sidebar-item--active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      height: 24px;
      width: 3px;
      background: #F97316;
      border-radius: 0 4px 4px 0;
      opacity: 1;
    }

    .sidebar--collapsed .sidebar-item--active::before {
      display: none;
    }

    .sidebar-section-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      padding: var(--spacing-md) 14px var(--spacing-xs);
      margin-top: var(--spacing-sm);
    }
    .sidebar-section-label:first-child {
      margin-top: 0;
    }

    .sidebar-icon {
      width: 20px;
      height: 20px;
      min-width: 20px;
      min-height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .sidebar-icon-img {
      width: 18px;
      height: 18px;
      object-fit: contain;
      filter: brightness(0.7);
      transition: filter 0.2s ease;
    }

    .sidebar-item:hover .sidebar-icon-img,
    .sidebar-item--active .sidebar-icon-img {
      filter: brightness(1);
    }

    .sidebar-label {
      font-size: 14px;
      font-weight: 400;
      letter-spacing: 0.01em;
      white-space: nowrap;
      transition: opacity 0.15s ease 0.1s;
    }

    .collapsed-hidden {
      opacity: 0;
      width: 0;
      min-width: 0;
      overflow: hidden;
      pointer-events: none;
      transition: opacity 0.2s ease 0s;
    }

    .sidebar-icon-fallback {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .sidebar-footer {
      padding: var(--spacing-xs);
      border-top: 1px solid var(--border-color);
    }

    .sidebar--collapsed .sidebar-footer {
      display: flex;
      justify-content: center;
    }

    .sidebar-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 40px;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 0;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .sidebar-toggle:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .sidebar-toggle .material-icons-outlined {
      font-size: 20px;
    }

    @media (max-width: 768px) {
      .sidebar {
        display: none;
      }
    }
  `]
})
export class DockComponent {
  @Input() items: DockItem[] = [];
  @Input() userRole: string = 'STUDENT';
  @Input() isHidden: boolean = false;

  isCollapsed = false;

  private readonly router = inject(Router);

  get visibleItems(): DockItem[] {
    if (!this.userRole || this.userRole === '') {
      return [];
    }
    return this.items
      .filter(item => !item.roles || item.roles.length === 0 || item.roles.includes(this.userRole))
      .map(item => ({ ...item, iconError: false }));
  }

  /** Gruppierung für Sidebar: Studium / Leistung / Konto etc. */
  get groupedItems(): { section: string; items: DockItem[] }[] {
    const order = ['', 'Studium', 'Leistung', 'Verwaltung', 'Akademisch', 'Lehre', 'Konto'];
    const map = new Map<string, DockItem[]>();
    for (const item of this.visibleItems) {
      const s = item.section ?? '';
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(item);
    }
    return order.filter(s => map.has(s) && map.get(s)!.length > 0).map(section => ({
      section,
      items: map.get(section)!
    }));
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  onIconError(event: Event, item: DockItem & { iconError?: boolean }): void {
    item.iconError = true;
  }
}

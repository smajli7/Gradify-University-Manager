import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DebugService } from '../../../core/services/debug.service';
import { SystemStatusService } from '../../../core/services/system-status.service';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-debug-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="debug-panel" [class.open]="isOpen()">
      <div class="panel-header">
        <h3>Debug</h3>
        <div class="panel-actions">
          <button class="btn-icon" (click)="clearLog()" title="Log leeren">
            <span class="material-icons-outlined">delete_sweep</span>
          </button>
          <span class="entry-count">{{ entryCount() }} Einträge</span>
          <button class="btn-icon" (click)="close()" title="Schließen">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- gRPC-Status (Backend Service→Service) -->
      <div class="grpc-section">
        <div class="grpc-title">
          <span class="material-icons-outlined">lan</span>
          gRPC (Backend-intern)
        </div>
        @if (grpcStatus()) {
          <div class="grpc-grid">
            <div class="grpc-item" [class.ok]="grpcStatus()?.noten?.available">
              <span class="grpc-label">Berechnung → Noten</span>
              <span class="grpc-value">{{ grpcStatus()?.noten?.message ?? '-' }}</span>
            </div>
            <div class="grpc-item" [class.ok]="grpcStatus()?.studiengang?.available">
              <span class="grpc-label">Berechnung → Studiengang</span>
              <span class="grpc-value">{{ grpcStatus()?.studiengang?.message ?? '-' }}</span>
            </div>
          </div>
        } @else {
          <div class="grpc-loading">Lade gRPC-Status…</div>
        }
      </div>

      <!-- Legende -->
      <div class="legend">
        <span><b>REST</b> = /api/* (Auth, Noten, Berechnung…)</span>
        <span><b>GraphQL</b> = /graphql/* (User, Studiengang, Noten)</span>
      </div>

      <div class="filter-bar">
        <button [class.active]="filter() === 'all'" (click)="filter.set('all')">Alle</button>
        <button [class.active]="filter() === 'HTTP'" (click)="filter.set('HTTP')">REST</button>
        <button [class.active]="filter() === 'GraphQL'" (click)="filter.set('GraphQL')">GraphQL</button>
      </div>
      <div class="entry-list">
        @for (entry of filteredEntries(); track entry.id) {
          <div class="entry" [class.expanded]="expandedId() === entry.id" (click)="toggleExpand(entry.id)">
            <div class="entry-row">
              <span class="entry-type" [class.http]="entry.type === 'HTTP'" [class.gql]="entry.type === 'GraphQL'">
                {{ entry.type }}
              </span>
              @if (entry.service) {
                <span class="entry-service" [title]="'Backend: ' + entry.service">{{ entry.service }}</span>
              }
              <span class="entry-method" *ngIf="entry.method">{{ entry.method }}</span>
              <span class="entry-url">{{ entry.url }}</span>
              <span class="entry-op" *ngIf="entry.operationName">{{ entry.operationName }}</span>
              <span class="entry-status" [class.ok]="(entry.status ?? 0) >= 200 && (entry.status ?? 0) < 300"
                    [class.err]="(entry.status ?? 0) >= 400 || (entry.error)">
                {{ entry.status ?? (entry.error ? 'ERR' : '-') }}
              </span>
              <span class="entry-meta">
                @if (entry.durationMs) { {{ entry.durationMs }}ms }
                @if (entry.responseSize && entry.responseSize > 0) {
                  <span class="entry-size">· {{ formatSize(entry.responseSize) }}</span>
                }
              </span>
              <button class="btn-copy" (click)="copyEntry(entry); $event.stopPropagation()" title="Kopieren">
                <span class="material-icons-outlined">content_copy</span>
              </button>
            </div>
            @if (expandedId() === entry.id) {
              <div class="entry-details">
                <div class="detail-section">
                  <strong>Zeit:</strong> {{ entry.timestamp }}
                </div>
                @if (entry.requestBody) {
                  <div class="detail-section">
                    <strong>Request:</strong>
                    <pre>{{ formatJson(entry.requestBody) }}</pre>
                  </div>
                }
                @if (entry.responseBody !== undefined) {
                  <div class="detail-section">
                    <strong>Response:</strong>
                    <pre>{{ formatJson(entry.responseBody) }}</pre>
                  </div>
                }
                @if (entry.error) {
                  <div class="detail-section error">
                    <strong>Fehler:</strong> {{ entry.error }}
                  </div>
                }
              </div>
            }
          </div>
        } @empty {
          <p class="empty">Kein Traffic geloggt. Debug-Mode aktivieren und App nutzen.</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .debug-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 480px;
      max-width: 95vw;
      height: 100vh;
      background: var(--bg-surface);
      border-left: 1px solid var(--border-color);
      box-shadow: -8px 0 24px rgba(0,0,0,0.3);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.25s ease;
    }

    .debug-panel.open {
      transform: translateX(0);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }

    .panel-header h3 {
      margin: 0;
      font-size: var(--font-size-md);
      color: var(--text-primary);
    }

    .panel-actions {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .entry-count {
      font-size: 12px;
      color: var(--text-muted);
    }

    .btn-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: var(--radius-md);
      transition: background, color 0.15s;
    }

    .btn-icon:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .filter-bar {
      display: flex;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm);
      border-bottom: 1px solid var(--border-color);
    }

    .filter-bar button {
      padding: 6px 12px;
      font-size: 12px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      background: var(--bg-elevated);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }

    .filter-bar button:hover,
    .filter-bar button.active {
      background: var(--bg-hover);
      color: var(--text-primary);
      border-color: var(--color-primary);
    }

    .entry-list {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-sm);
    }

    .entry {
      margin-bottom: var(--spacing-xs);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      background: var(--bg-elevated);
      cursor: pointer;
      overflow: hidden;
    }

    .entry:hover {
      border-color: var(--color-primary);
      background: rgba(var(--color-primary-rgb), 0.05);
    }

    .entry-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm);
      font-size: 12px;
    }

    .entry-type {
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
    }

    .entry-type.http {
      background: rgba(var(--color-primary-rgb), 0.2);
      color: var(--color-primary);
    }

    .entry-type.gql {
      background: rgba(168, 85, 247, 0.2);
      color: #a855f7;
    }

    .entry-method {
      font-family: monospace;
      color: var(--text-muted);
    }

    .entry-url {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: monospace;
      font-size: 11px;
    }

    .entry-op {
      color: var(--text-muted);
      font-size: 11px;
    }

    .entry-status {
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 11px;
    }

    .entry-status.ok {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .entry-status.err {
      background: rgba(var(--color-danger-rgb), 0.2);
      color: var(--color-danger);
    }

    .entry-meta {
      font-size: 11px;
      color: var(--text-muted);
    }

    .entry-service {
      font-size: 10px;
      padding: 2px 6px;
      background: rgba(255,255,255,0.08);
      border-radius: 4px;
      color: var(--text-muted);
    }

    .entry-size {
      color: var(--text-muted);
    }

    .btn-copy {
      display: flex;
      padding: 4px;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 4px;
      opacity: 0.7;
    }

    .btn-copy:hover {
      opacity: 1;
      background: rgba(255,255,255,0.1);
    }

    .btn-copy .material-icons-outlined {
      font-size: 14px;
    }

    .grpc-section {
      padding: var(--spacing-sm) var(--spacing-md);
      border-bottom: 1px solid var(--border-color);
      background: rgba(0,0,0,0.15);
    }

    .grpc-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .grpc-title .material-icons-outlined {
      font-size: 16px;
    }

    .grpc-grid {
      display: grid;
      gap: 4px;
    }

    .grpc-item {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 4px;
      background: rgba(0,0,0,0.2);
    }

    .grpc-item.ok {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }

    .grpc-label {
      color: var(--text-muted);
    }

    .grpc-value {
      font-family: monospace;
    }

    .grpc-loading {
      font-size: 11px;
      color: var(--text-muted);
    }

    .legend {
      padding: 6px var(--spacing-md);
      font-size: 10px;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      gap: 2px;
      border-bottom: 1px solid var(--border-color);
    }

    .entry-details {
      padding: var(--spacing-sm) var(--spacing-md);
      border-top: 1px solid var(--border-color);
      background: rgba(0,0,0,0.2);
      font-size: 11px;
    }

    .detail-section {
      margin-bottom: var(--spacing-sm);
    }

    .detail-section:last-child {
      margin-bottom: 0;
    }

    .detail-section strong {
      display: block;
      margin-bottom: 4px;
      color: var(--text-muted);
    }

    .detail-section pre {
      margin: 0;
      padding: var(--spacing-sm);
      background: rgba(0,0,0,0.3);
      border-radius: var(--radius-sm);
      overflow-x: auto;
      font-size: 10px;
      max-height: 200px;
      overflow-y: auto;
    }

    .detail-section.error {
      color: var(--color-danger);
    }

    .empty {
      padding: var(--spacing-xl);
      text-align: center;
      color: var(--text-muted);
      font-size: var(--font-size-sm);
    }
  `]
})
export class DebugPanelComponent implements OnInit, OnDestroy {
  private readonly debugService = inject(DebugService);
  private readonly systemStatus = inject(SystemStatusService);
  private grpcSub?: Subscription;

  isOpen = signal(false);
  expandedId = signal<string | null>(null);
  filter = signal<'all' | 'HTTP' | 'GraphQL'>('all');
  grpcStatus = signal<{ noten?: { available: boolean; message: string }; studiengang?: { available: boolean; message: string } } | null>(null);

  trafficLog = this.debugService.trafficLog;
  entryCount = this.debugService.entryCount;

  filteredEntries = computed(() => {
    const log = this.trafficLog();
    const f = this.filter();
    if (f === 'all') return log;
    return log.filter(e => e.type === f);
  });

  ngOnInit(): void {
    this.grpcSub = interval(10000).pipe(
      startWith(0),
      switchMap(() => this.systemStatus.getBerechnungGrpcStatus())
    ).subscribe(res => {
      const d = res?.data;
      if (d) {
        this.grpcStatus.set({
          noten: d.notenService ? { available: d.notenService.available, message: d.notenService.message } : undefined,
          studiengang: d.studiengangService ? { available: d.studiengangService.available, message: d.studiengangService.message } : undefined
        });
      } else {
        this.grpcStatus.set(null);
      }
    });
  }

  ngOnDestroy(): void {
    this.grpcSub?.unsubscribe();
  }

  open(): void {
    this.isOpen.set(true);
    this.systemStatus.getBerechnungGrpcStatus().subscribe(res => {
      const d = res?.data;
      if (d) {
        this.grpcStatus.set({
          noten: d.notenService ? { available: d.notenService.available, message: d.notenService.message } : undefined,
          studiengang: d.studiengangService ? { available: d.studiengangService.available, message: d.studiengangService.message } : undefined
        });
      }
    });
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggleExpand(id: string): void {
    this.expandedId.update(current => current === id ? null : id);
  }

  clearLog(): void {
    this.debugService.clearLog();
  }

  formatJson(obj: unknown): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async copyEntry(entry: import('../../../core/services/debug.service').TrafficEntry): Promise<void> {
    const text = [
      `${entry.type} ${entry.method ?? ''} ${entry.url}`,
      `Status: ${entry.status ?? '-'} | ${entry.durationMs ?? '-'}ms`,
      entry.operationName ? `Operation: ${entry.operationName}` : null,
      entry.requestBody ? `Request: ${JSON.stringify(entry.requestBody, null, 2)}` : null,
      entry.responseBody !== undefined ? `Response: ${JSON.stringify(entry.responseBody, null, 2)}` : null
    ].filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }
}

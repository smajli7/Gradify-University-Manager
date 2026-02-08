import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface AuditEintrag {
  id: number;
  noteId: number;
  einschreibungId: number | null;
  modulId: number | null;
  geaendertVon: number;
  geaendertVonName?: string;
  aenderungsTyp: string;
  alterWert: number | null;
  neuerWert: number | null;
  kommentar: string | null;
  geaendertAm: string;
  // Angereichert im Frontend
  modulName?: string;
}

interface ModulInfo {
  id: string;
  name: string;
  modulNr?: string;
}

const AENDERUNGSTYPEN = [
  { value: '', label: 'Alle' },
  { value: 'ERSTELLT', label: 'Erstellt' },
  { value: 'NOTE_GEAENDERT', label: 'Geändert' },
  { value: 'VALIDIERT', label: 'Validiert' },
  { value: 'FREIGEGEBEN', label: 'Freigegeben' },
  { value: 'STORNIERT', label: 'Storniert' }
];

const GET_DOZENTEN_MODULE = gql`
  query GetDozentenModule($dozentId: ID!) {
    dozentenModule(dozentId: $dozentId) {
      id
      name
      modulNr
    }
  }
`;

const GET_ALL_MODULE = gql`
  query GetAllModule {
    module {
      id
      name
      modulNr
    }
  }
`;

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page pa-page">
      <header class="page-header">
        <div class="header-content">
          <h1 class="page-title">Protokoll (Audit Log)</h1>
          <p class="page-subtitle">
            Änderungen an Noten: Wer hat wann was geändert.
            @if (isDozent()) {
              <span class="hint"> – Anzeige beschränkt auf deine zugewiesenen Module.</span>
            }
          </p>
        </div>
      </header>

      <div class="card filter-card">
        <h2 class="filter-title">Filter</h2>
        <div class="filter-grid">
          <div class="filter-row">
            <label>Von Datum</label>
            <input type="date" [(ngModel)]="vonDatum" />
          </div>
          <div class="filter-row">
            <label>Bis Datum</label>
            <input type="date" [(ngModel)]="bisDatum" />
          </div>
          <div class="filter-row">
            <label>Modul</label>
            <select [(ngModel)]="selectedModulId">
              <option value="">Alle Module</option>
              @for (m of availableModules(); track m.id) {
                <option [value]="m.id">{{ m.modulNr ? m.modulNr + ' – ' : '' }}{{ m.name }}</option>
              }
            </select>
          </div>
          <div class="filter-row">
            <label>Aktionstyp</label>
            <select [(ngModel)]="aenderungsTyp">
              @for (o of aenderungsTypOptions; track o.value) {
                <option [value]="o.value">{{ o.label }}</option>
              }
            </select>
          </div>
        </div>
        <div class="filter-actions">
          <button type="button" class="btn btn-primary" (click)="load()" [disabled]="loading()">
            {{ loading() ? 'Lädt…' : 'Filter anwenden' }}
          </button>
          <button type="button" class="btn btn-secondary" (click)="exportCsv()" [disabled]="entries().length === 0">
            CSV exportieren
          </button>
          <span class="result-count" *ngIf="entries().length > 0">{{ entries().length }} Einträge</span>
        </div>
      </div>

      @if (error()) {
        <div class="card error-card">
          <p class="error-text">{{ error() }}</p>
        </div>
      }

      <div class="card table-card">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p class="loading-text">Einträge werden geladen…</p>
          </div>
        } @else if (entries().length === 0) {
          <p class="empty-state-text">Keine Einträge für die gewählten Filter.</p>
        } @else {
          <div class="table-wrap">
            <table class="audit-table">
              <thead>
                <tr>
                  <th>Zeit</th>
                  <th>Aktion</th>
                  <th>Note</th>
                  <th>Modul</th>
                  <th>Wer</th>
                  <th>Vorher</th>
                  <th>Nachher</th>
                  <th>Kommentar</th>
                </tr>
              </thead>
              <tbody>
                @for (e of entries(); track e.id) {
                  <tr>
                    <td class="cell-time">{{ formatDate(e.geaendertAm) }}</td>
                    <td><span [class]="'badge badge-' + e.aenderungsTyp">{{ labelForTyp(e.aenderungsTyp) }}</span></td>
                    <td>#{{ e.noteId }}</td>
                    <td>{{ e.modulName ?? ('Modul ' + e.modulId) }}</td>
                    <td>{{ e.geaendertVonName ?? ('User ' + e.geaendertVon) }}</td>
                    <td class="cell-note">{{ e.alterWert != null ? e.alterWert : '–' }}</td>
                    <td class="cell-note">{{ e.neuerWert != null ? e.neuerWert : '–' }}</td>
                    <td class="cell-kommentar" [title]="e.kommentar ?? ''">{{ e.kommentar ?? '–' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .pa-page { padding: 0; }
    .page-header { margin-bottom: var(--spacing-xl); }
    .page-title { font-size: 1.75rem; font-weight: 700; margin: 0 0 var(--spacing-xs) 0; color: var(--text-primary); }
    .page-subtitle { font-size: 0.9375rem; color: var(--text-muted); margin: 0; }
    .hint { font-style: italic; }
    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: var(--spacing-xl);
      margin-bottom: var(--spacing-lg);
    }
    .filter-title { font-size: 1rem; font-weight: 600; margin: 0 0 var(--spacing-md) 0; color: var(--text-primary); }
    .filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--spacing-sm) var(--spacing-lg);
    }
    .filter-row {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }
    .filter-row label { min-width: 80px; font-size: 0.875rem; color: var(--text-secondary); white-space: nowrap; }
    .filter-row input, .filter-row select {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      background: var(--bg-surface);
      color: var(--text-primary);
      min-width: 0;
    }
    .filter-actions { display: flex; align-items: center; gap: var(--spacing-md); margin-top: var(--spacing-lg); }
    .result-count { font-size: 0.8125rem; color: var(--text-muted); margin-left: auto; }
    .btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 8px;
      font-weight: 500; border: none; cursor: pointer; font-size: 0.875rem; text-decoration: none;
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary { background: var(--text-primary); color: var(--bg-deep); }
    .btn-secondary { background: var(--bg-muted, #e5e7eb); color: var(--text-primary); }
    .error-card { border-color: var(--error-color, #dc2626); }
    .error-text { color: var(--error-color, #dc2626); margin: 0; }
    .empty-state-text { color: var(--text-secondary); margin: 0; text-align: center; padding: var(--spacing-xl) 0; }
    .table-wrap { overflow-x: auto; }
    .audit-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .audit-table th, .audit-table td {
      padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border-color);
    }
    .audit-table th { font-weight: 600; color: var(--text-secondary); background: var(--bg-muted, rgba(0,0,0,0.03)); position: sticky; top: 0; }
    .audit-table tbody tr:hover { background: var(--bg-muted, rgba(0,0,0,0.02)); }
    .cell-time { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .cell-note { font-variant-numeric: tabular-nums; text-align: center; }
    .cell-kommentar { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .badge {
      display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 500;
    }
    .badge-ERSTELLT { background: #d1fae5; color: #065f46; }
    .badge-NOTE_GEAENDERT { background: #dbeafe; color: #1e40af; }
    .badge-VALIDIERT { background: #fef3c7; color: #92400e; }
    .badge-FREIGEGEBEN { background: #d1fae5; color: #065f46; }
    .badge-STORNIERT { background: #fee2e2; color: #991b1b; }
    .loading-state { display: flex; flex-direction: column; align-items: center; padding: var(--spacing-xl) 0; gap: var(--spacing-md); }
    .loading-text { color: var(--text-muted); font-size: 0.875rem; margin: 0; }
    .spinner {
      width: 28px; height: 28px; border: 3px solid var(--border-color);
      border-top-color: var(--text-primary); border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class AuditComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apollo = inject(Apollo);
  private readonly auth = inject(AuthService);

  vonDatum = '';
  bisDatum = '';
  selectedModulId = '';
  aenderungsTyp = '';
  aenderungsTypOptions = AENDERUNGSTYPEN;

  entries = signal<AuditEintrag[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  availableModules = signal<ModulInfo[]>([]);

  /** true wenn aktueller User nur Dozent (LEHRENDER) ist, kein PA/ADMIN/HV */
  isDozent = signal(false);
  /** Modul-IDs des Dozenten (seine Zuweisungen) */
  private dozentModulIds: string[] = [];
  /** Lookup: modulId → ModulInfo */
  private readonly modulMap = new Map<string, ModulInfo>();

  ngOnInit(): void {
    const to = new Date();
    const from = new Date(to);
    from.setMonth(from.getMonth() - 1);
    this.bisDatum = this.formatDateForInput(to);
    this.vonDatum = this.formatDateForInput(from);

    const user = this.auth.currentUser();
    const roles = user?.roles?.map(r => r.replace('ROLE_', '')) ?? [];
    const hasFullAccess = roles.some(r => ['PRUEFUNGSAMT', 'ADMIN', 'HOCHSCHUL_VERWALTER'].includes(r));
    const isLehrender = roles.includes('LEHRENDER');
    this.isDozent.set(isLehrender && !hasFullAccess);

    this.loadModulesAndData(user?.id ?? null);
  }

  private async loadModulesAndData(userId: string | null): Promise<void> {
    try {
      if (this.isDozent() && userId) {
        // Dozent: nur zugewiesene Module laden
        const res = await firstValueFrom(this.apollo.query<{ dozentenModule: ModulInfo[] }>({
          query: GET_DOZENTEN_MODULE,
          variables: { dozentId: userId },
          fetchPolicy: 'network-only'
        }));
        const module = res.data?.dozentenModule ?? [];
        this.availableModules.set(module);
        this.dozentModulIds = module.map(m => m.id);
        module.forEach(m => this.modulMap.set(String(m.id), m));
      } else {
        // PA/ADMIN/HV: alle Module laden
        const res = await firstValueFrom(this.apollo.query<{ module: ModulInfo[] }>({
          query: GET_ALL_MODULE,
          fetchPolicy: 'network-only'
        }));
        const module = res.data?.module ?? [];
        this.availableModules.set(module);
        module.forEach(m => this.modulMap.set(String(m.id), m));
      }
    } catch {
      // Module-Lookup fehlgeschlagen → trotzdem laden, nur ohne Modulnamen
    }
    this.load();
  }

  load(): void {
    this.error.set(null);
    this.loading.set(true);
    let params = new HttpParams().set('limit', '500');

    if (this.vonDatum) params = params.set('vonDatum', this.vonDatum);
    if (this.bisDatum) params = params.set('bisDatum', this.bisDatum);
    if (this.aenderungsTyp) params = params.set('aenderungsTyp', this.aenderungsTyp);

    if (this.isDozent()) {
      // Dozent: modulIds seiner zugewiesenen Module senden
      const idsToSend = this.selectedModulId
        ? [this.selectedModulId]
        : this.dozentModulIds;
      if (idsToSend.length === 0) {
        this.entries.set([]);
        this.loading.set(false);
        return;
      }
      params = params.set('modulIds', idsToSend.join(','));
    } else if (this.selectedModulId) {
      // PA/ADMIN/HV: einzelne modulId als Filter (optional)
      params = params.set('modulId', this.selectedModulId);
    }

    this.http.get<ApiResponse<AuditEintrag[]>>('/api/noten/audit', { params }).subscribe({
      next: (res) => {
        const enriched = (res?.data ?? []).map(e => this.enrichEntry(e));
        this.entries.set(enriched);
        this.loading.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? 'Fehler beim Laden des Protokolls';
        this.error.set(msg);
        this.entries.set([]);
        this.loading.set(false);
      }
    });
  }

  private enrichEntry(e: AuditEintrag): AuditEintrag {
    const mod = this.modulMap.get(String(e.modulId));
    let modulName: string | undefined;
    if (mod) {
      modulName = mod.modulNr ? `${mod.modulNr} – ${mod.name}` : mod.name;
    }
    return { ...e, modulName };
  }

  exportCsv(): void {
    const rows = this.entries();
    if (rows.length === 0) return;
    const headers = ['Zeit', 'Aktion', 'Note-ID', 'Modul', 'Geändert von', 'Vorher', 'Nachher', 'Kommentar'];
    const lines = [headers.join(';')];
    for (const e of rows) {
      const row = [
        this.formatDate(e.geaendertAm),
        this.labelForTyp(e.aenderungsTyp),
        e.noteId,
        e.modulName ?? e.modulId ?? '',
        e.geaendertVonName ?? e.geaendertVon,
        e.alterWert ?? '',
        e.neuerWert ?? '',
        (e.kommentar ?? '').replaceAll(';', ',')
      ];
      lines.push(row.join(';'));
    }
    const csv = lines.join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit_${this.formatDateForInput(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  labelForTyp(typ: string): string {
    const map: Record<string, string> = {
      'ERSTELLT': 'Erstellt',
      'NOTE_GEAENDERT': 'Geändert',
      'VALIDIERT': 'Validiert',
      'FREIGEGEBEN': 'Freigegeben',
      'STORNIERT': 'Storniert'
    };
    return map[typ] ?? typ;
  }

  formatDate(iso: string): string {
    if (!iso) return '–';
    const d = new Date(iso);
    return d.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  }

  private formatDateForInput(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}

import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SkeletonStateComponent } from '../../shared/components/skeleton-state/skeleton-state.component';

const GET_DOZENTEN_MODULE = gql`
  query GetDozentenModule($dozentId: ID!) {
    dozentenModule(dozentId: $dozentId) {
      id
      modulNr
      name
      ects
      semester
      pruefungsform
    }
  }
`;

interface WorkQueueItem {
  id: string;
  modulCode: string;
  modulName: string;
  pruefungstermin: string;
  status: 'leer' | 'entwurf' | 'eingereicht' | 'validiert' | 'freigegeben' | 'zurueckgewiesen';
  progress: number;
  progressTotal: number;
  lastChange: string;
  zurueckweisungsGrund?: string;
}

@Component({
  selector: 'app-todos',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonStateComponent],
  template: `
    <div class="todos-page">
      <header class="todos-header">
        <h1 class="todos-title">To-dos</h1>
        <p class="todos-subtitle">Was ist heute zu tun?</p>
      </header>

      @if (loading()) {
        <app-skeleton-state [lineCount]="8" />
      }

      @if (!loading()) {
        <!-- KPI-Zeile: kompakt -->
        <div class="kpi-row">
          <div class="kpi-item">
            <span class="kpi-value" style="font-variant-numeric: tabular-nums;">{{ kpiOffen() }}</span>
            <span class="kpi-label">Offen</span>
          </div>
          <div class="kpi-item kpi-item--warn" [class.has-value]="kpiZurueckgewiesen() > 0">
            <span class="kpi-value" style="font-variant-numeric: tabular-nums;">{{ kpiZurueckgewiesen() }}</span>
            <span class="kpi-label">Zurückgewiesen</span>
          </div>
          <div class="kpi-item">
            <span class="kpi-value" style="font-variant-numeric: tabular-nums;">{{ kpiWartetValidierung() }}</span>
            <span class="kpi-label">Wartet auf Validierung</span>
          </div>
          <div class="kpi-item">
            <span class="kpi-value" style="font-variant-numeric: tabular-nums;">{{ kpiDemnaechstFaellig() }}</span>
            <span class="kpi-label">Demnächst fällig</span>
          </div>
        </div>

        <!-- Work Queue = Arbeitsliste -->
        <section class="work-queue">
          <h2 class="work-queue-title">Arbeitsliste</h2>
          @if (workQueue().length === 0) {
            <div class="work-queue-empty">
              <p>Keine offenen Erfassungen. Alle Module sind aktuell.</p>
              <a [routerLink]="['/grades/entry']" class="btn btn--primary">Notenerfassung öffnen</a>
            </div>
          }
          @if (workQueue().length > 0) {
            <ul class="work-queue-list">
              @for (item of workQueue(); track item.id) {
                <li class="work-queue-item">
                  <div class="work-queue-main">
                    <span class="work-queue-modul">{{ item.modulCode }} – {{ item.modulName }}</span>
                    <span class="work-queue-meta">Prüfung: {{ item.pruefungstermin }} · {{ item.progress }}/{{ item.progressTotal }} erfasst</span>
                    @if (item.progressTotal > 0) {
                      <div class="work-queue-progress-wrap">
                        <div class="work-queue-progress-bar" [style.width.%]="(item.progress / item.progressTotal) * 100"></div>
                      </div>
                    }
                    <span class="work-queue-change">Letzte Änderung: {{ item.lastChange }}</span>
                  </div>
                  <div class="work-queue-status">
                    <span class="status-badge status-badge--{{ item.status }}">{{ getStatusLabel(item.status) }}</span>
                  </div>
                  <div class="work-queue-cta">
                    @switch (item.status) {
                      @case ('leer') {
                        <a [routerLink]="['/grades/entry']" [queryParams]="{ modulId: item.id }" class="btn btn--primary btn--sm">Erfassen</a>
                      }
                      @case ('entwurf') {
                        <a [routerLink]="['/grades/entry']" [queryParams]="{ modulId: item.id }" class="btn btn--primary btn--sm">Weiter erfassen</a>
                      }
                      @case ('zurueckgewiesen') {
                        <a [routerLink]="['/grades/entry']" [queryParams]="{ modulId: item.id }" class="btn btn--primary btn--sm">Korrektur ansehen</a>
                      }
                      @case ('eingereicht') {
                        <span class="btn btn--ghost btn--sm" disabled>Wartet auf Validierung</span>
                      }
                      @case ('validiert') {
                        <span class="btn btn--ghost btn--sm">Validiert</span>
                      }
                      @case ('freigegeben') {
                        <a [routerLink]="['/grades/entry']" [queryParams]="{ modulId: item.id }" class="btn btn--ghost btn--sm">Details</a>
                      }
                      @default {
                        <a [routerLink]="['/grades/entry']" [queryParams]="{ modulId: item.id }" class="btn btn--primary btn--sm">Details</a>
                      }
                    }
                  </div>
                </li>
              }
            </ul>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .todos-page { max-width: 900px; margin: 0 auto; }
    .todos-header { margin-bottom: var(--spacing-lg); }
    .todos-title { margin: 0 0 var(--spacing-2px) 0; font-size: 1.35rem; font-weight: 700; color: var(--text-primary); }
    .todos-subtitle { margin: 0; font-size: var(--font-size-sm); color: var(--text-muted); }

    .kpi-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-xl);
      padding: var(--spacing-sm) 0;
      border-bottom: 1px solid var(--border-color);
    }
    .kpi-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      min-width: 100px;
    }
    .kpi-item--warn.has-value { border-color: rgba(249, 115, 22, 0.5); background: rgba(249, 115, 22, 0.06); }
    .kpi-value { font-size: 1.15rem; font-weight: 700; color: var(--text-primary); }
    .kpi-label { font-size: 0.7rem; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }

    .work-queue-title { margin: 0 0 var(--spacing-md) 0; font-size: 1rem; font-weight: 600; color: var(--text-primary); }
    .work-queue-empty { padding: var(--spacing-xl); text-align: center; color: var(--text-muted); }
    .work-queue-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--spacing-xs); }
    .work-queue-item {
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      transition: background 0.15s, border-color 0.15s;
    }
    .work-queue-item:hover { background: var(--bg-hover); }
    .work-queue-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .work-queue-modul { font-weight: 600; color: var(--text-primary); }
    .work-queue-meta { font-size: var(--font-size-sm); color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .work-queue-change { font-size: 0.75rem; color: var(--text-muted); }
    .work-queue-progress-wrap { height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; margin-top: 6px; overflow: hidden; max-width: 120px; }
    .work-queue-progress-bar { height: 100%; background: rgba(249, 115, 22, 0.7); border-radius: 2px; transition: width 0.2s ease; }
    .work-queue-status { flex-shrink: 0; }
    .work-queue-cta { flex-shrink: 0; }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 0.7rem;
      font-weight: 500;
    }
    .status-badge--leer { background: rgba(255,255,255,0.06); color: var(--text-muted); border: 1px solid var(--border-color); }
    .status-badge--entwurf { background: rgba(255,255,255,0.1); color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.2); }
    .status-badge--eingereicht { background: rgba(59,130,246,0.15); color: #3B82F6; border: 1px solid rgba(59,130,246,0.3); }
    .status-badge--validiert { background: rgba(34,197,94,0.12); color: #22C55E; border: 1px solid rgba(34,197,94,0.3); }
    .status-badge--freigegeben { background: rgba(34,197,94,0.15); color: #22C55E; border: 1px solid rgba(34,197,94,0.3); }
    .status-badge--zurueckgewiesen { background: rgba(249,115,22,0.15); color: #F97316; border: 1px solid rgba(249,115,22,0.3); }

    .btn--ghost { background: transparent; border-color: transparent; color: var(--text-muted); }
    .btn--ghost:disabled { opacity: 0.7; cursor: default; }
    .btn--sm { padding: 6px 12px; font-size: 0.8rem; }

    @media (max-width: 768px) {
      .work-queue-item { grid-template-columns: 1fr; }
      .work-queue-cta { justify-self: start; }
    }
  `]
})
export class TodosComponent implements OnInit {
  private readonly apollo = inject(Apollo);
  private readonly authService = inject(AuthService);

  loading = signal(true);
  module = signal<{ id: string; modulNr: string; name: string; ects: number; semester: string; pruefungsform?: string }[]>([]);

  kpiOffen = computed(() => this.workQueue().filter(i => i.status === 'leer' || i.status === 'entwurf').length);
  kpiZurueckgewiesen = computed(() => this.workQueue().filter(i => i.status === 'zurueckgewiesen').length);
  kpiWartetValidierung = computed(() => this.workQueue().filter(i => i.status === 'eingereicht').length);
  kpiDemnaechstFaellig = computed(() => 0);

  workQueue = computed((): WorkQueueItem[] => {
    const mods = this.module();
    return mods.map(m => ({
      id: m.id,
      modulCode: m.modulNr ?? '',
      modulName: m.name ?? '',
      pruefungstermin: '–',
      status: 'entwurf' as const,
      progress: 0,
      progressTotal: 0,
      lastChange: '–'
    }));
  });

  getStatusLabel(status: WorkQueueItem['status']): string {
    const map: Record<WorkQueueItem['status'], string> = {
      leer: 'Leer',
      entwurf: 'Entwurf',
      eingereicht: 'Eingereicht',
      validiert: 'Validiert',
      freigegeben: 'Freigegeben',
      zurueckgewiesen: 'Zurückgewiesen'
    };
    return map[status] ?? status;
  }

  ngOnInit(): void {
    this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    const dozentId = this.authService.currentUser()?.id;
    if (!dozentId) {
      this.loading.set(false);
      return;
    }
    try {
      const result = await firstValueFrom(this.apollo.query<{ dozentenModule: any[] }>({
        query: GET_DOZENTEN_MODULE,
        variables: { dozentId },
        fetchPolicy: 'network-only'
      }));
      this.module.set(result.data?.dozentenModule ?? []);
    } catch (e) {
      console.error('Todos load error', e);
    } finally {
      this.loading.set(false);
    }
  }
}

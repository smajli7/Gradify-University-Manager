import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { SkeletonStateComponent } from '../../shared/components/skeleton-state/skeleton-state.component';

const GET_STUDENTS = gql`query GetAllStudents { students { id vorname nachname matrikelnummer } }`;
const GET_EINSCHREIBUNGEN = gql`query GetAllEinschreibungen { einschreibungen { id studentId } }`;
const GET_MODULE = gql`query GetAllModule { module { id name modulNr } }`;

interface NoteRow {
  id: string;
  modulId: string;
  einschreibungId: string;
  status: string;
  erfasstAm?: string;
  noteWert?: number | null;
  studentName?: string;
  modulName?: string;
}

@Component({
  selector: 'app-pa-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonStateComponent],
  template: `
    <div class="pa-dashboard">
      <header class="pa-header">
        <div class="pa-header-content">
          <h1 class="pa-title">Prüfungsamt - Überblick</h1>
          <p class="pa-subtitle">{{ todayLabel() }}</p>
        </div>
      </header>

      @if (loading()) {
        <app-skeleton-state [lineCount]="6" />
      }

      @if (!loading() && !error()) {
        <!-- Hero-Bereich mit Datum + Status-Übersicht (wie Student-Dashboard) -->
        <div class="pa-top">
          <div class="pa-hero-card">
            <div class="pa-hero-accent"></div>
            <div class="pa-hero-main">
              <div class="pa-hero-date">
                <span class="pa-hero-day">{{ todayDay() }}</span>
                <span class="pa-hero-month">{{ todayMonthYear() }}</span>
              </div>
              <div class="pa-hero-content">
                <h2 class="pa-hero-title">Noten-Status heute</h2>
                <p class="pa-hero-detail">Ausstehend, Validiert und Freigegeben auf einen Blick.</p>
                <div class="pa-hero-mini">
                  <span class="pa-hero-mini-item">Ausstehend: {{ ausstehend() }}</span>
                  <span class="pa-hero-mini-item">Validiert: {{ validiertWartet() }}</span>
                  <span class="pa-hero-mini-item">Freigegeben: {{ freigegebenCount() }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="pa-kpi-single">
            <div class="pa-kpi-row pa-kpi-row--warning">
              <span class="pa-kpi-label">Ausstehend</span>
              <span class="pa-kpi-value">{{ ausstehend() }}</span>
            </div>
            <div class="pa-kpi-row">
              <span class="pa-kpi-label">Validiert</span>
              <span class="pa-kpi-value">{{ validiertWartet() }}</span>
            </div>
            <div class="pa-kpi-row">
              <span class="pa-kpi-label">Freigegeben</span>
              <span class="pa-kpi-value">{{ freigegebenCount() }}</span>
            </div>
          </div>
        </div>

        <!-- Klickbare Kacheln: Zur Validierung / Freigabe -->
        <section class="pa-actions">
          <a routerLink="/grades/validation" [queryParams]="{ status: 'ERFASST' }" class="pa-action-card pa-action-card--warning">
            <span class="pa-action-value">{{ ausstehend() }}</span>
            <span class="pa-action-label">Ausstehend</span>
            <span class="pa-action-hint">zum Prüfen</span>
          </a>
          <a routerLink="/grades/validation" [queryParams]="{ status: 'VALIDIERT' }" class="pa-action-card pa-action-card--info">
            <span class="pa-action-value">{{ validiertWartet() }}</span>
            <span class="pa-action-label">Validiert</span>
            <span class="pa-action-hint">wartet auf Freigabe</span>
          </a>
          <a routerLink="/grades/validation" [queryParams]="{ status: 'FREIGEGEBEN' }" class="pa-action-card pa-action-card--success">
            <span class="pa-action-value">{{ freigegebenCount() }}</span>
            <span class="pa-action-label">Freigegeben</span>
            <span class="pa-action-hint">gesamt</span>
          </a>
        </section>
      }

      @if (error()) {
        <div class="pa-error card">
          <p>{{ error() }}</p>
          <button type="button" class="btn btn-primary" (click)="load()">Erneut laden</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .pa-dashboard { padding: 0; max-width: 960px; margin: 0 auto; }
    .pa-header { margin-bottom: 24px; }
    .pa-title { font-size: 2rem; font-weight: 700; margin: 0 0 var(--spacing-xs) 0; color: var(--text-primary); letter-spacing: -0.02em; }
    .pa-subtitle { font-size: var(--font-size-sm); color: var(--text-muted); margin: 0; }

    .pa-top {
      display: grid;
      grid-template-columns: 1fr 200px;
      gap: 24px;
      align-items: stretch;
      margin-bottom: 24px;
    }
    @media (max-width: 900px) {
      .pa-top { grid-template-columns: 1fr; }
      .pa-kpi-single { flex-direction: row; flex-wrap: wrap; }
      .pa-kpi-row { flex: 1; min-width: 100px; }
      .pa-kpi-row--warning { border-left: none; border-top: 3px solid rgba(245, 158, 11, 0.5); }
    }

    .pa-hero-card {
      position: relative;
      background: var(--bg-surface);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: none;
    }
    .pa-hero-accent {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, rgba(245, 158, 11, 0.2), rgba(99, 102, 241, 0.12));
    }
    .pa-hero-main {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 20px 24px;
    }
    .pa-hero-date {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      flex-shrink: 0;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 12px;
      padding: 8px;
    }
    .pa-hero-day {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      color: var(--text-primary);
    }
    .pa-hero-month {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .pa-hero-content { flex: 1; min-width: 0; }
    .pa-hero-title { font-size: 1.2rem; font-weight: 600; margin: 0 0 4px 0; color: var(--text-primary); }
    .pa-hero-detail { font-size: var(--font-size-sm); color: var(--text-muted); margin: 0 0 10px 0; }
    .pa-hero-mini {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }
    .pa-hero-mini-item {
      padding-right: var(--spacing-sm);
      border-right: 1px solid rgba(255, 255, 255, 0.1);
    }
    .pa-hero-mini-item:last-child { border-right: none; padding-right: 0; }

    .pa-kpi-single {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 160px;
      background: var(--bg-surface);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: none;
    }
    .pa-kpi-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex: 1;
      min-height: 52px;
      padding: 12px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      box-sizing: border-box;
    }
    .pa-kpi-row:last-child { border-bottom: none; }
    .pa-kpi-row--warning {
      background: rgba(245, 158, 11, 0.06);
      border-left: 3px solid rgba(245, 158, 11, 0.5);
    }
    .pa-kpi-single .pa-kpi-label {
      font-size: 10px;
      margin: 0;
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }
    .pa-kpi-row--warning .pa-kpi-label { color: var(--text-secondary); }
    .pa-kpi-single .pa-kpi-value {
      font-size: 1.3rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      text-align: right;
      min-width: 3ch;
      flex-shrink: 0;
      margin-left: auto;
      color: var(--text-primary);
    }

    .pa-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--spacing-md);
    }
    .pa-action-card {
      display: flex;
      flex-direction: column;
      padding: var(--spacing-lg);
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: var(--bg-surface);
      text-decoration: none;
      color: inherit;
      transition: background 0.2s, border-color 0.2s, transform 0.15s;
    }
    .pa-action-card:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.18);
      transform: translateY(-2px);
    }
    .pa-action-card--warning { border-left: 4px solid rgba(245, 158, 11, 0.8); }
    .pa-action-card--info { border-left: 4px solid rgba(99, 102, 241, 0.8); }
    .pa-action-card--success { border-left: 4px solid rgba(16, 185, 129, 0.8); }
    .pa-action-value { font-size: 1.75rem; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
    .pa-action-label { font-weight: 600; color: var(--text-primary); margin-top: 4px; }
    .pa-action-hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }

    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }
    .pa-error { text-align: center; padding: var(--spacing-xl); }
    .pa-error p { margin: 0 0 var(--spacing-md) 0; color: var(--text-muted); }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-weight: 500; text-decoration: none; border: 1px solid transparent; cursor: pointer; font-size: 0.875rem; }
    .btn-primary { background: var(--text-primary); color: var(--bg-deep); border-color: var(--text-primary); }
  `]
})
export class PaDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apollo = inject(Apollo);

  loading = signal(true);
  error = signal<string | null>(null);
  noten = signal<NoteRow[]>([]);
  private readonly studentMap = new Map<string, string>();
  private readonly modulMap = new Map<string, string>();

  ausstehend = computed(() => this.noten().filter(n => n.status === 'ERFASST').length);
  validiertWartet = computed(() => this.noten().filter(n => n.status === 'VALIDIERT').length);
  freigegebenCount = computed(() => this.noten().filter(n => n.status === 'FREIGEGEBEN').length);

  private readonly locale = 'de-DE';
  todayLabel = computed(() => {
    const d = new Date();
    return d.toLocaleDateString(this.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  });
  todayDay = computed(() => new Date().getDate().toString());
  todayMonthYear = computed(() => {
    const d = new Date();
    return d.toLocaleDateString(this.locale, { month: 'short', year: 'numeric' });
  });

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [notenRes, studentsRes, einschreibungenRes, moduleRes] = await Promise.all([
        firstValueFrom(this.http.get<{ success: boolean; data: NoteRow[] }>('/api/noten')).catch(() => ({ data: [] })),
        firstValueFrom(this.apollo.query<{ students: { id: string; vorname: string; nachname: string }[] }>({ query: GET_STUDENTS, context: { clientName: 'user' }, fetchPolicy: 'network-only' })).catch(() => ({ data: { students: [] } })),
        firstValueFrom(this.apollo.query<{ einschreibungen: { id: string; studentId: string }[] }>({ query: GET_EINSCHREIBUNGEN, fetchPolicy: 'network-only' })).catch(() => ({ data: { einschreibungen: [] } })),
        firstValueFrom(this.apollo.query<{ module: { id: string; name: string; modulNr: string }[] }>({ query: GET_MODULE, fetchPolicy: 'network-only' })).catch(() => ({ data: { module: [] } }))
      ]);
      const rawNoten = (notenRes as any)?.data ?? [];
      this.noten.set(rawNoten.map((n: any) => ({ ...n, id: String(n.id), modulId: String(n.modulId ?? ''), einschreibungId: String(n.einschreibungId ?? '') })));
      this.studentMap.clear();
      const students = studentsRes.data?.students || [];
      (einschreibungenRes.data?.einschreibungen || []).forEach((e: any) => {
        const s = students.find((st: any) => String(st.id) === String(e.studentId));
        if (s) this.studentMap.set(String(e.id), `${s.vorname} ${s.nachname}`);
      });
      this.modulMap.clear();
      (moduleRes.data?.module || []).forEach((m: any) => this.modulMap.set(String(m.id), `${m.modulNr} - ${m.name}`));
    } catch (e) {
      this.error.set('Daten konnten nicht geladen werden.');
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }
}

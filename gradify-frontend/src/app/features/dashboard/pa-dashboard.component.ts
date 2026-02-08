import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
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
          <h1 class="pa-title">Prüfungsamt – Überblick</h1>
          <p class="pa-subtitle">Was ist offen? In 10 Sekunden sehen, was heute zu tun ist.</p>
        </div>
      </header>

      @if (loading()) {
        <app-skeleton-state [lineCount]="6" />
      }

      @if (!loading() && !error()) {
        <!-- Aktionskacheln (Primary KPIs, klickbar) -->
        <section class="pa-kpis">
          <a routerLink="/grades/validation" [queryParams]="{ status: 'ERFASST' }" class="pa-kpi pa-kpi--warning">
            <span class="pa-kpi-value">{{ ausstehend() }}</span>
            <span class="pa-kpi-label">Ausstehend</span>
            <span class="pa-kpi-hint">zum Prüfen</span>
          </a>
          <div class="pa-kpi pa-kpi--muted">
            <span class="pa-kpi-value">{{ konflikte() }}</span>
            <span class="pa-kpi-label">Konflikte</span>
            <span class="pa-kpi-hint">fehlende Daten, Duplikate</span>
          </div>
          <a routerLink="/grades/validation" [queryParams]="{ status: 'VALIDIERT' }" class="pa-kpi pa-kpi--info">
            <span class="pa-kpi-value">{{ validiertWartet() }}</span>
            <span class="pa-kpi-label">Validiert</span>
            <span class="pa-kpi-hint">wartet auf Freigabe</span>
          </a>
          <a routerLink="/grades/release" class="pa-kpi pa-kpi--success">
            <span class="pa-kpi-value">{{ freigegebenCount() }}</span>
            <span class="pa-kpi-label">Freigegeben</span>
            <span class="pa-kpi-hint">gesamt im Zeitraum</span>
          </a>
        </section>

        <!-- Als Nächstes (Top 10) -->
        <section class="pa-next card">
          <h2 class="pa-section-title">Als Nächstes</h2>
          <p class="pa-section-subtitle">Älteste zuerst – direkt prüfen oder zur Validierungs-Inbox.</p>
          @if (nextList().length === 0) {
            <div class="pa-empty">
              <p>Keine ausstehenden Validierungen.</p>
              <a routerLink="/grades/validation" class="btn btn-ghost">Zeitraum ändern / Alle anzeigen</a>
            </div>
          } @else {
            <ul class="pa-next-list">
              @for (note of nextList(); track note.id) {
                <li class="pa-next-item">
                  <div class="pa-next-main">
                    <span class="pa-next-student">{{ note.studentName || note.einschreibungId }}</span>
                    <span class="pa-next-modul">{{ note.modulName || note.modulId }}</span>
                    @if (note.noteWert != null) {
                      <span class="pa-next-note" [class.bad]="(note.noteWert ?? 0) >= 5">{{ note.noteWert | number:'1.1-1' }}</span>
                    }
                  </div>
                  <div class="pa-next-actions">
                    <a [routerLink]="['/grades/validation']" [queryParams]="{ noteId: note.id }" class="btn btn-sm btn-primary">Prüfen</a>
                  </div>
                </li>
              }
            </ul>
            <div class="pa-next-footer">
              <a routerLink="/grades/validation" class="btn btn-primary">Zur Validierung (Inbox)</a>
            </div>
          }
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
    .pa-dashboard { padding: 0; max-width: 900px; margin: 0 auto; }
    .pa-header { margin-bottom: var(--spacing-xl); }
    .pa-title { font-size: 1.75rem; font-weight: 700; margin: 0 0 var(--spacing-xs) 0; color: var(--text-primary); letter-spacing: -0.02em; }
    .pa-subtitle { font-size: 0.9375rem; color: var(--text-muted); margin: 0; }
    .pa-kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-xl);
    }
    .pa-kpi {
      display: flex;
      flex-direction: column;
      padding: var(--spacing-lg);
      border-radius: 12px;
      border: 1px solid var(--border-color);
      background: var(--bg-surface);
      text-decoration: none;
      color: inherit;
      transition: background 0.2s, border-color 0.2s;
    }
    .pa-kpi:hover { background: var(--bg-hover); border-color: rgba(255,255,255,0.12); }
    .pa-kpi--warning { border-left: 4px solid rgba(245, 158, 11, 0.8); }
    .pa-kpi--info { border-left: 4px solid rgba(99, 102, 241, 0.8); }
    .pa-kpi--success { border-left: 4px solid rgba(16, 185, 129, 0.8); }
    .pa-kpi--muted { border-left: 4px solid rgba(255,255,255,0.2); opacity: 0.9; cursor: default; }
    .pa-kpi--muted:hover { background: var(--bg-surface); }
    .pa-kpi-value { font-size: 1.75rem; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
    .pa-kpi-label { font-weight: 600; color: var(--text-primary); margin-top: 4px; }
    .pa-kpi-hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }
    .pa-section-title { font-size: 1.125rem; font-weight: 600; margin: 0 0 var(--spacing-xs) 0; color: var(--text-primary); }
    .pa-section-subtitle { font-size: 0.875rem; color: var(--text-muted); margin: 0 0 var(--spacing-md) 0; }
    .pa-empty { text-align: center; padding: var(--spacing-xl); color: var(--text-muted); }
    .pa-next-list { list-style: none; padding: 0; margin: 0; }
    .pa-next-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-md);
      padding: var(--spacing-sm) 0;
      border-bottom: 1px solid var(--border-color);
    }
    .pa-next-item:last-child { border-bottom: none; }
    .pa-next-main { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm); min-width: 0; }
    .pa-next-student { font-weight: 500; color: var(--text-primary); }
    .pa-next-modul { font-size: 0.875rem; color: var(--text-muted); }
    .pa-next-note { font-variant-numeric: tabular-nums; font-weight: 600; }
    .pa-next-note.bad { color: #ef4444; }
    .pa-next-actions { flex-shrink: 0; }
    .pa-next-footer { margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--border-color); }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-weight: 500; text-decoration: none; border: 1px solid transparent; cursor: pointer; font-size: 0.875rem; }
    .btn-sm { padding: 6px 12px; font-size: 0.8125rem; }
    .btn-primary { background: var(--text-primary); color: var(--bg-deep); border-color: var(--text-primary); }
    .btn-ghost { background: transparent; color: var(--text-muted); border-color: var(--border-color); }
    .btn-ghost:hover { background: var(--bg-hover); color: var(--text-primary); }
    .pa-error { text-align: center; padding: var(--spacing-xl); }
    .pa-error p { margin: 0 0 var(--spacing-md) 0; color: var(--text-muted); }
  `]
})
export class PaDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apollo = inject(Apollo);
  private readonly authService = inject(AuthService);

  loading = signal(true);
  error = signal<string | null>(null);
  noten = signal<NoteRow[]>([]);
  private readonly studentMap = new Map<string, string>();
  private readonly modulMap = new Map<string, string>();

  ausstehend = computed(() => this.noten().filter(n => n.status === 'ERFASST').length);
  konflikte = computed(() => 0);
  validiertWartet = computed(() => this.noten().filter(n => n.status === 'VALIDIERT').length);
  freigegebenCount = computed(() => this.noten().filter(n => n.status === 'FREIGEGEBEN').length);
  nextList = computed(() => {
    const list = this.noten()
      .filter(n => n.status === 'ERFASST')
      .sort((a, b) => (a.erfasstAm || '').localeCompare(b.erfasstAm || ''))
      .slice(0, 10)
      .map(n => ({
        ...n,
        studentName: this.studentMap.get(n.einschreibungId),
        modulName: this.modulMap.get(n.modulId)
      }));
    return list;
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
      (moduleRes.data?.module || []).forEach((m: any) => this.modulMap.set(String(m.id), `${m.modulNr} – ${m.name}`));
    } catch (e) {
      this.error.set('Daten konnten nicht geladen werden.');
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }
}

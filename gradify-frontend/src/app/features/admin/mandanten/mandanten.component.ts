import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';

const GET_ALL_MANDANTEN = gql`
  query GetAllMandanten {
    mandanten {
      id
      name
      kuerzel
      aktiv
    }
  }
`;

const GET_STUDIENGAENGE_BY_MANDANT = gql`
  query GetStudiengaengeByMandant($mandantId: ID!) {
    studiengaenge(mandantId: $mandantId) {
      id
      name
      kuerzel
      abschlussart
      regelstudienzeit
      gesamtEcts
    }
  }
`;

interface Mandant {
  id: string;
  name: string;
  kuerzel: string;
  aktiv: boolean;
}

interface Studiengang {
  id: string;
  name: string;
  kuerzel: string;
  abschlussart: string;
  regelstudienzeit: number;
  gesamtEcts: number;
}

@Component({
  selector: 'app-mandanten',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-content">
          <h1>Hochschul-Verwaltung</h1>
          <p class="subtitle">Mandanten und Studiengänge</p>
        </div>
      </header>

      @if (loading()) {
        <div class="loading-card card">
          <div class="spinner-large"></div>
          <p>Lade Daten...</p>
        </div>
      }

      @if (!loading()) {
        <!-- Mandanten -->
        <div class="section">
          <h2 class="section-title">Hochschulen / Mandanten</h2>
          <div class="mandanten-grid">
            @for (mandant of mandanten(); track mandant.id) {
              <div class="mandant-card card" (click)="selectMandant(mandant)">
                <div class="mandant-header">
                  <div class="mandant-badge">{{ mandant.kuerzel }}</div>
                  <span class="status-dot" [class.active]="mandant.aktiv"></span>
                </div>
                <h3>{{ mandant.name }}</h3>
                <p class="text-muted">{{ getStudiengangCount(mandant.id) }} Studiengänge</p>
              </div>
            }
          </div>
        </div>

        <!-- Studiengänge des ausgewählten Mandanten -->
        @if (selectedMandant()) {
          <div class="section">
            <h2 class="section-title">
              Studiengänge: {{ selectedMandant()!.name }}
            </h2>
            
            @if (loadingStudiengaenge()) {
              <div class="loading-small card">
                <div class="spinner"></div>
                <span>Lade Studiengänge...</span>
              </div>
            }

            @if (!loadingStudiengaenge() && studiengaenge().length > 0) {
              <div class="table-container card">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Kürzel</th>
                      <th>Name</th>
                      <th>Abschluss</th>
                      <th class="col-center">Regelstudienzeit</th>
                      <th class="col-center">ECTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (sg of studiengaenge(); track sg.id) {
                      <tr>
                        <td>
                          <span class="sg-badge">{{ sg.kuerzel }}</span>
                        </td>
                        <td>{{ sg.name }}</td>
                        <td>{{ sg.abschlussart }}</td>
                        <td class="col-center">{{ sg.regelstudienzeit }} Semester</td>
                        <td class="col-center">{{ sg.gesamtEcts }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            @if (!loadingStudiengaenge() && studiengaenge().length === 0) {
              <div class="empty-card card">
                <p>Keine Studiengänge vorhanden</p>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-lg);
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: var(--spacing-xl);
    }

    .header-content h1 {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .subtitle {
      color: var(--text-muted);
      margin: var(--spacing-xs) 0 0 0;
    }

    .section {
      margin-bottom: var(--spacing-2xl);
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-lg) 0;
    }

    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
    }

    .mandanten-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--spacing-lg);
    }

    .mandant-card {
      cursor: pointer;
      transition: all 0.2s;
    }

    .mandant-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 242, 255, 0.2);
      border-color: var(--color-primary);
    }

    .mandant-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md);
    }

    .mandant-badge {
      padding: 6px 12px;
      background: rgba(0, 242, 255, 0.1);
      border: 1px solid rgba(0, 242, 255, 0.2);
      color: var(--color-primary);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 700;
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--text-muted);
    }

    .status-dot.active {
      background: var(--color-success);
      box-shadow: 0 0 8px var(--color-success);
    }

    .mandant-card h3 {
      font-size: 1.125rem;
      margin: 0 0 var(--spacing-xs) 0;
    }

    .loading-card, .loading-small, .empty-card {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-md);
      padding: var(--spacing-xl);
    }

    .spinner-large, .spinner {
      border: 4px solid var(--border-color);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner-large {
      width: 48px;
      height: 48px;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border-width: 3px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .table-container {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th,
    .data-table td {
      padding: var(--spacing-sm) var(--spacing-md);
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    .data-table th {
      font-weight: 600;
      color: var(--text-muted);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--bg-hover);
    }

    .data-table tbody tr:hover {
      background: var(--bg-hover);
    }

    .col-center {
      text-align: center;
    }

    .sg-badge {
      display: inline-block;
      padding: 4px 8px;
      background: rgba(0, 242, 255, 0.1);
      border: 1px solid rgba(0, 242, 255, 0.2);
      color: var(--color-primary);
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .empty-card {
      text-align: center;
      color: var(--text-muted);
    }
  `]
})
export class MandantenComponent implements OnInit {
  private readonly apollo = inject(Apollo);

  // State
  loading = signal(false);
  loadingStudiengaenge = signal(false);

  // Data
  mandanten = signal<Mandant[]>([]);
  studiengaenge = signal<Studiengang[]>([]);
  selectedMandant = signal<Mandant | null>(null);

  ngOnInit(): void {
    this.loadMandanten();
  }

  async loadMandanten(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.apollo.query<{ mandanten: Mandant[] }>({
        query: GET_ALL_MANDANTEN,
        fetchPolicy: 'network-only'
      }));

      this.mandanten.set(result.data?.mandanten || []);

    } catch (error) {
      console.error('Error loading mandanten:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async selectMandant(mandant: Mandant): Promise<void> {
    this.selectedMandant.set(mandant);
    this.loadingStudiengaenge.set(true);

    try {
      const result = await firstValueFrom(this.apollo.query<{ studiengaenge: Studiengang[] }>({
        query: GET_STUDIENGAENGE_BY_MANDANT,
        variables: { mandantId: mandant.id },
        fetchPolicy: 'network-only'
      }));

      this.studiengaenge.set(result.data?.studiengaenge || []);

    } catch (error) {
      console.error('Error loading studiengaenge:', error);
    } finally {
      this.loadingStudiengaenge.set(false);
    }
  }

  getStudiengangCount(mandantId: string): number {
    // Cached count would be better, but for now just return 0
    return 0;
  }
}

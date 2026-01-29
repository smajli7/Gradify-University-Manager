import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';

const GET_ALL_MANDANTEN_WITH_STUDIENGAENGE = gql`
  query GetAllMandantenWithStudiengaenge {
    mandanten {
      id
      name
      kuerzel
      aktiv
      studiengaenge {
        id
        name
        kuerzel
        abschlussart
        regelstudienzeit
        gesamtEcts
      }
    }
  }
`;

interface Studiengang {
  id: string;
  name: string;
  kuerzel: string;
  abschlussart: string;
  regelstudienzeit: number;
  gesamtEcts: number;
}

interface Mandant {
  id: string;
  name: string;
  kuerzel: string;
  aktiv: boolean;
  studiengaenge: Studiengang[];
}

interface ImportResult {
  studiengaengeCreated: number;
  studiengaengeUpdated: number;
  moduleCreated: number;
  moduleSkipped: number;
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
              <div class="mandant-card card" 
                   [class.selected]="selectedMandant()?.id === mandant.id"
                   (click)="selectMandant(mandant)">
                <div class="mandant-header">
                  <div class="mandant-badge">{{ mandant.kuerzel }}</div>
                  <span class="status-dot" [class.active]="mandant.aktiv"></span>
                </div>
                <h3>{{ mandant.name }}</h3>
                <p class="text-muted">{{ mandant.studiengaenge?.length || 0 }} Studiengänge</p>
              </div>
            }
          </div>
        </div>

        <!-- Studiengänge des ausgewählten Mandanten -->
        @if (selectedMandant()) {
          <div class="section">
            <div class="section-header">
              <h2 class="section-title">
                Studiengänge: {{ selectedMandant()!.name }}
              </h2>
              <button class="btn btn--primary" (click)="openImportModal()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                CSV-Import
              </button>
            </div>
            
            @if (selectedMandant()!.studiengaenge.length > 0) {
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
                    @for (sg of selectedMandant()!.studiengaenge; track sg.id) {
                      <tr>
                        <td>
                          <span class="sg-badge">{{ sg.kuerzel }}</span>
                        </td>
                        <td>{{ sg.name }}</td>
                        <td>{{ formatAbschlussart(sg.abschlussart) }}</td>
                        <td class="col-center">{{ sg.regelstudienzeit }} Semester</td>
                        <td class="col-center">{{ sg.gesamtEcts }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            @if (selectedMandant()!.studiengaenge.length === 0) {
              <div class="empty-card card">
                <div class="empty-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                    <path d="M6 12v5c0 2 4 3 6 3s6-1 6-3v-5"/>
                  </svg>
                </div>
                <p>Noch keine Studiengänge vorhanden</p>
                <button class="btn btn--primary" (click)="openImportModal()">
                  CSV-Import starten
                </button>
              </div>
            }
          </div>
        }
      }

      <!-- Modal: CSV Import -->
      @if (showImportModal()) {
        <div class="modal-overlay" (click)="closeImportModal()">
          <div class="modal-content modal-content--wide" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Studiengänge & Module importieren</h2>
              <button class="close-btn" (click)="closeImportModal()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div class="modal-body">
              <div class="import-info">
                <h3>CSV-Format</h3>
                <p class="text-muted">
                  Importieren Sie Studiengänge mit allen Modulen in einer CSV-Datei.
                  Jede Zeile enthält ein Modul, Studiengang-Infos werden pro Zeile wiederholt.
                </p>
                
                <div class="format-example">
                  <div class="format-header">Spalten (Semikolon-getrennt):</div>
                  <div class="format-cols">
                    <span class="col-tag col-tag--sg">Studiengang_Kuerzel</span>
                    <span class="col-tag col-tag--sg">Studiengang_Name</span>
                    <span class="col-tag col-tag--sg">Abschlussart</span>
                    <span class="col-tag col-tag--sg">Regelstudienzeit</span>
                    <span class="col-tag col-tag--sg">GesamtECTS</span>
                    <span class="col-tag col-tag--po">PO_Version</span>
                    <span class="col-tag col-tag--mod">Modul_Nr</span>
                    <span class="col-tag col-tag--mod">Modul_Name</span>
                    <span class="col-tag col-tag--mod">ECTS</span>
                    <span class="col-tag col-tag--mod">Semester</span>
                    <span class="col-tag col-tag--mod">Pruefungsform</span>
                    <span class="col-tag col-tag--mod">Modultyp</span>
                    <span class="col-tag col-tag--mod">Gewichtung</span>
                    <span class="col-tag col-tag--mod">In_Gesamtnote</span>
                  </div>
                </div>
                
                <div class="format-values">
                  <div class="value-group">
                    <strong>Abschlussart:</strong> BACHELOR, MASTER
                  </div>
                  <div class="value-group">
                    <strong>Pruefungsform:</strong> KLAUSUR, HAUSARBEIT, MUENDLICH, PROJEKT, PORTFOLIO, PRAESENTATION, PRAXISBERICHT
                  </div>
                  <div class="value-group">
                    <strong>Modultyp:</strong> PFLICHT, WAHLPFLICHT, ZUSATZ
                  </div>
                </div>
                
                <button class="btn btn--secondary btn--sm" (click)="downloadTemplate()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Vorlage herunterladen
                </button>
              </div>
              
              <div class="upload-area" 
                   [class.upload-area--dragover]="isDragover"
                   (dragover)="onDragOver($event)"
                   (dragleave)="onDragLeave($event)"
                   (drop)="onDrop($event)"
                   (click)="fileInput.click()">
                <input #fileInput type="file" accept=".csv" (change)="onFileSelected($event)" hidden>
                
                @if (!selectedFile()) {
                  <div class="upload-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p>CSV-Datei hierher ziehen oder klicken</p>
                  <span class="text-muted">Unterstützt: .csv (UTF-8, Semikolon-getrennt)</span>
                } @else {
                  <div class="file-selected">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span>{{ selectedFile()!.name }}</span>
                    <button class="remove-file" (click)="removeFile($event)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                }
              </div>

              @if (importResult()) {
                <div class="import-result" [class.import-result--success]="importResult()!.moduleCreated > 0">
                  <h4>Import abgeschlossen</h4>
                  <div class="result-stats">
                    <div class="stat">
                      <span class="stat-value">{{ importResult()!.studiengaengeCreated }}</span>
                      <span class="stat-label">Studiengänge erstellt</span>
                    </div>
                    <div class="stat">
                      <span class="stat-value">{{ importResult()!.moduleCreated }}</span>
                      <span class="stat-label">Module erstellt</span>
                    </div>
                    @if (importResult()!.moduleSkipped > 0) {
                      <div class="stat stat--muted">
                        <span class="stat-value">{{ importResult()!.moduleSkipped }}</span>
                        <span class="stat-label">Module übersprungen</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
            
            <div class="modal-footer">
              <button class="btn btn--secondary" (click)="closeImportModal()">
                {{ importResult() ? 'Schließen' : 'Abbrechen' }}
              </button>
              @if (!importResult()) {
                <button class="btn btn--primary" 
                        (click)="importCsv()" 
                        [disabled]="saving() || !selectedFile()">
                  @if (saving()) {
                    <span class="spinner-btn"></span>
                    Importiere...
                  } @else {
                    Import starten
                  }
                </button>
              }
            </div>
          </div>
        </div>
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
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .empty-icon {
      color: var(--text-muted);
      opacity: 0.5;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);
    }

    .section-header .section-title {
      margin: 0;
    }

    .mandant-card.selected {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 1px var(--color-primary), 0 4px 12px rgba(0, 242, 255, 0.2);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: 10px 18px;
      border-radius: var(--radius-lg);
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }

    .btn--primary {
      background: var(--color-primary);
      color: var(--bg-deep);
    }

    .btn--primary:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    .btn--primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn--secondary {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .btn--secondary:hover {
      background: var(--bg-hover);
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      width: 100%;
      max-width: 560px;
      max-height: 90vh;
      overflow: auto;
      animation: slideUp 0.2s ease;
    }

    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(20px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-lg);
      border-bottom: 1px solid var(--border-color);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: var(--radius-md);
      transition: all 0.15s ease;
    }

    .close-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .modal-body {
      padding: var(--spacing-lg);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-sm);
      padding: var(--spacing-lg);
      border-top: 1px solid var(--border-color);
    }

    .form-group {
      margin-bottom: var(--spacing-md);
    }

    .form-group--short {
      flex: 0 0 120px;
    }

    .form-group label {
      display: block;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      margin-bottom: var(--spacing-xs);
    }

    .form-input {
      width: 100%;
      padding: 10px 14px;
      background: var(--bg-deep);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: 0.95rem;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .form-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .form-row {
      display: flex;
      gap: var(--spacing-md);
    }

    .form-row .form-group {
      flex: 1;
    }

    .spinner-btn {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(0, 0, 0, 0.2);
      border-top-color: var(--bg-deep);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    .modal-content--wide {
      max-width: 720px;
    }

    .btn--sm {
      padding: 6px 12px;
      font-size: var(--font-size-sm);
    }

    /* Import Info */
    .import-info {
      margin-bottom: var(--spacing-lg);
    }

    .import-info h3 {
      margin: 0 0 var(--spacing-xs) 0;
      font-size: 1rem;
    }

    .format-example {
      background: var(--bg-deep);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: var(--spacing-md);
      margin: var(--spacing-md) 0;
    }

    .format-header {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      margin-bottom: var(--spacing-sm);
    }

    .format-cols {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .col-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: 0.7rem;
      font-family: 'JetBrains Mono', monospace;
    }

    .col-tag--sg {
      background: rgba(0, 242, 255, 0.15);
      color: var(--color-primary);
    }

    .col-tag--po {
      background: rgba(112, 0, 255, 0.15);
      color: var(--color-secondary);
    }

    .col-tag--mod {
      background: rgba(0, 255, 136, 0.15);
      color: var(--color-success);
    }

    .format-values {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-md);
      margin: var(--spacing-md) 0;
      font-size: var(--font-size-sm);
    }

    .value-group {
      color: var(--text-secondary);
    }

    .value-group strong {
      color: var(--text-primary);
    }

    /* Upload Area */
    .upload-area {
      border: 2px dashed var(--border-color);
      border-radius: var(--radius-lg);
      padding: var(--spacing-xl);
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      background: var(--bg-deep);
    }

    .upload-area:hover {
      border-color: var(--color-primary);
      background: rgba(0, 242, 255, 0.05);
    }

    .upload-area--dragover {
      border-color: var(--color-primary);
      background: rgba(0, 242, 255, 0.1);
    }

    .upload-icon {
      color: var(--text-muted);
      margin-bottom: var(--spacing-md);
    }

    .upload-area p {
      margin: 0 0 var(--spacing-xs) 0;
      color: var(--text-primary);
    }

    .file-selected {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      color: var(--color-success);
    }

    .remove-file {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: var(--radius-sm);
    }

    .remove-file:hover {
      color: var(--color-danger);
      background: rgba(255, 0, 85, 0.1);
    }

    /* Import Result */
    .import-result {
      margin-top: var(--spacing-lg);
      padding: var(--spacing-lg);
      background: var(--bg-hover);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
    }

    .import-result--success {
      border-color: rgba(0, 255, 136, 0.3);
      background: rgba(0, 255, 136, 0.05);
    }

    .import-result h4 {
      margin: 0 0 var(--spacing-md) 0;
      color: var(--color-success);
    }

    .result-stats {
      display: flex;
      gap: var(--spacing-xl);
    }

    .result-stats .stat {
      display: flex;
      flex-direction: column;
    }

    .result-stats .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .result-stats .stat-label {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .result-stats .stat--muted .stat-value {
      color: var(--text-muted);
    }
  `]
})
export class MandantenComponent implements OnInit {
  private readonly apollo = inject(Apollo);
  private readonly http = inject(HttpClient);

  // State
  loading = signal(false);
  saving = signal(false);
  showImportModal = signal(false);
  isDragover = false;

  // Data
  mandanten = signal<Mandant[]>([]);
  selectedMandant = signal<Mandant | null>(null);
  
  // Import
  selectedFile = signal<File | null>(null);
  importResult = signal<ImportResult | null>(null);

  ngOnInit(): void {
    this.loadMandanten();
  }

  async loadMandanten(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.apollo.query<{ mandanten: Mandant[] }>({
        query: GET_ALL_MANDANTEN_WITH_STUDIENGAENGE,
        fetchPolicy: 'network-only'
      }));

      this.mandanten.set(result.data?.mandanten || []);

      // Wenn ein Mandant ausgewählt war, aktualisieren
      const current = this.selectedMandant();
      if (current) {
        const updated = this.mandanten().find(m => m.id === current.id);
        if (updated) {
          this.selectedMandant.set(updated);
        }
      }

    } catch (error) {
      console.error('Error loading mandanten:', error);
    } finally {
      this.loading.set(false);
    }
  }

  selectMandant(mandant: Mandant): void {
    this.selectedMandant.set(mandant);
  }

  formatAbschlussart(art: string): string {
    const labels: Record<string, string> = {
      'BACHELOR': 'Bachelor',
      'MASTER': 'Master'
    };
    return labels[art] || art;
  }

  // Import Modal
  openImportModal(): void {
    this.selectedFile.set(null);
    this.importResult.set(null);
    this.showImportModal.set(true);
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
    // Wenn Import erfolgreich, Daten neu laden
    if (this.importResult()) {
      this.loadMandanten();
    }
  }

  // Drag & Drop
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    if (!file.name.endsWith('.csv')) {
      alert('Bitte nur CSV-Dateien hochladen');
      return;
    }
    this.selectedFile.set(file);
    this.importResult.set(null);
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile.set(null);
    this.importResult.set(null);
  }

  async downloadTemplate(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get('/api/import/template', { responseType: 'text' })
      );
      
      // Datei herunterladen
      const blob = new Blob([response], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'studiengang_template.csv';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Template download failed:', error);
      alert('Vorlage konnte nicht heruntergeladen werden. Ist der Studiengang-Service gestartet?');
    }
  }

  async importCsv(): Promise<void> {
    const file = this.selectedFile();
    const mandant = this.selectedMandant();
    if (!file || !mandant) return;

    this.saving.set(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mandantId', mandant.id);

      const response = await firstValueFrom(
        this.http.post<{ success: boolean; data: ImportResult; message: string }>(
          '/api/import/studiengaenge', 
          formData
        )
      );

      console.log('Import response:', response);
      
      if (response.success && response.data) {
        this.importResult.set(response.data);
      }

    } catch (error: any) {
      console.error('Import error:', error);
      alert('Import fehlgeschlagen: ' + (error.error?.message || error.message || 'Unbekannter Fehler'));
    } finally {
      this.saving.set(false);
    }
  }
}

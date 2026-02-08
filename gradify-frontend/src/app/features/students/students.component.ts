import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { StudentService } from '../../core/services/student.service';
import { Student, StudentStatus } from '../../types';
import { SkeletonStateComponent } from '../../shared/components/skeleton-state/skeleton-state.component';

// ── GraphQL Queries für Berechnung ──
const GET_EINSCHREIBUNGEN_QUERY = gql`
  query GetEinschreibungen($studentId: ID!) {
    einschreibungen(studentId: $studentId) {
      id
      aktuellesSemester
      studiengang { id name kuerzel gesamtEcts }
    }
  }
`;

const CALC_EINSCHREIBUNG_QUERY = gql`
  query GetCalculationData($einschreibungId: ID!) {
    einschreibung(id: $einschreibungId) {
      id
      studiengang { id name kuerzel gesamtEcts }
      pruefungsordnung {
        id version berechnungsart
        module { id modulNr name ects gewichtung inGesamtnote semester }
      }
    }
  }
`;

const CALC_NOTEN_QUERY = gql`
  query GetCalculationNoten($einschreibungId: ID!) {
    notenByStudent(einschreibungId: $einschreibungId) {
      id modulId noteWert bestanden status
    }
  }
`;

interface EinschreibungOption {
  id: string;
  studiengang: string;
  kuerzel: string;
  semester: number;
}

interface ModulMitNote {
  id: string;
  modulNr: string;
  name: string;
  ects: number;
  gewichtung: number;
  inGesamtnote: boolean;
  semester: string;
  noteWert: number | null;
  bestanden: boolean | null;
}

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonStateComponent],
  template: `
    <div class="students-page animate-slide-up">
      <!-- Header row -->
      <div class="page-header">
        <div class="header-left">
          <h1>Studierende</h1>
          <span class="header-count">{{ studentService.totalCount() }} gesamt</span>
        </div>
        <div class="header-kpis">
          <span class="hkpi hkpi--ok">{{ studentService.activeCount() }} Aktiv</span>
          <span class="hkpi hkpi--warn">{{ beurlaubtCount() }} Beurlaubt</span>
          <span class="hkpi hkpi--off">{{ exmatCount() }} Exmat.</span>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-wrap">
          <span class="material-icons-outlined si">search</span>
          <input type="text" class="search-input" placeholder="Name, Matrikelnr. oder E-Mail..."
            [(ngModel)]="searchTerm" (ngModelChange)="onSearch($event)">
          @if (searchTerm()) {
            <button class="search-clear" (click)="clearSearch()"><span class="material-icons-outlined">close</span></button>
          }
        </div>
        <div class="filter-chips">
          <button class="fc" [class.fc--on]="statusFilter() === null" (click)="onStatusFilter(null)">Alle</button>
          <button class="fc fc--ok" [class.fc--on]="statusFilter() === StudentStatus.AKTIV" (click)="onStatusFilter(StudentStatus.AKTIV)">Aktiv</button>
          <button class="fc fc--warn" [class.fc--on]="statusFilter() === StudentStatus.BEURLAUBT" (click)="onStatusFilter(StudentStatus.BEURLAUBT)">Beurlaubt</button>
          <button class="fc fc--err" [class.fc--on]="statusFilter() === StudentStatus.EXMATRIKULIERT" (click)="onStatusFilter(StudentStatus.EXMATRIKULIERT)">Exmat.</button>
        </div>
      </div>

      <!-- Loading -->
      @if (studentService.loading()) {
        <app-skeleton-state [lineCount]="6" />
      }

      <!-- Error -->
      @if (studentService.error()) {
        <div class="msg msg--error"><span class="material-icons-outlined">error_outline</span> {{ studentService.error() }}</div>
      }

      <!-- Student Table -->
      @if (!studentService.loading() && !studentService.error()) {
        <div class="table-card">
          <table class="t">
            <thead>
              <tr>
                <th>Student</th>
                <th>Matrikelnr.</th>
                <th>E-Mail</th>
                <th class="tc">Status</th>
                <th class="tc">Aktion</th>
              </tr>
            </thead>
            <tbody>
              @for (student of filteredStudents(); track student.id) {
                <tr class="row" [class.row--active]="selectedStudent()?.id === student.id" (click)="openCalc(student)">
                  <td>
                    <div class="name-cell">
                      <div class="av" [class]="'av--' + studentService.getStatusColor(student.status)">{{ getInitials(student) }}</div>
                      <span class="sname">{{ student.vorname }} {{ student.nachname }}</span>
                    </div>
                  </td>
                  <td class="mono">{{ student.matrikelnummer }}</td>
                  <td class="email-col">{{ student.email }}</td>
                  <td class="tc">
                    <span class="status-chip" [class]="'status-chip--' + studentService.getStatusColor(student.status)">
                      {{ studentService.getStatusLabel(student.status) }}
                    </span>
                  </td>
                  <td class="tc">
                    <button class="act-btn" title="Berechnung anzeigen" (click)="$event.stopPropagation(); openCalc(student)">
                      <span class="material-icons-outlined">functions</span>
                    </button>
                    <button class="act-btn" title="Noten anzeigen" (click)="$event.stopPropagation(); viewGrades(student)">
                      <span class="material-icons-outlined">grade</span>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="empty-row">Keine Studierenden gefunden</td></tr>
              }
            </tbody>
          </table>
        </div>
        <div class="footer-count">{{ filteredStudents().length }} von {{ studentService.totalCount() }}</div>
      }

      <!-- Calculation Drawer -->
      @if (selectedStudent()) {
        <div class="drawer-overlay" (click)="closeCalc()"></div>
        <div class="drawer">
          <div class="drawer-header">
            <div class="drawer-student">
              <div class="dav" [class]="'av--' + studentService.getStatusColor(selectedStudent()!.status)">{{ getInitials(selectedStudent()!) }}</div>
              <div class="drawer-info">
                <span class="drawer-name">{{ selectedStudent()!.vorname }} {{ selectedStudent()!.nachname }}</span>
                <span class="drawer-sub">{{ selectedStudent()!.matrikelnummer }} · {{ selectedStudent()!.email }}</span>
              </div>
            </div>
            <button class="drawer-close" (click)="closeCalc()"><span class="material-icons-outlined">close</span></button>
          </div>

          <!-- Student details -->
          <div class="drawer-details">
            <div class="dd"><span class="material-icons-outlined dd-ic">badge</span><span class="dd-lbl">Status</span><span class="status-chip" [class]="'status-chip--' + studentService.getStatusColor(selectedStudent()!.status)">{{ studentService.getStatusLabel(selectedStudent()!.status) }}</span></div>
            @if (selectedStudent()!.geburtsdatum) {
              <div class="dd"><span class="material-icons-outlined dd-ic">cake</span><span class="dd-lbl">Geb.</span><span>{{ selectedStudent()!.geburtsdatum }}</span></div>
            }
          </div>

          <!-- Einschreibung selector (only if multiple) -->
          @if (calcEinschreibungen().length > 1) {
            <div class="drawer-einschr">
              <select class="einschr-select" [(ngModel)]="calcSelectedEinschreibung" (change)="loadCalcData()">
                @for (e of calcEinschreibungen(); track e.id) {
                  <option [value]="e.id">{{ e.studiengang }} ({{ e.kuerzel }}) - {{ e.semester }}. Sem</option>
                }
              </select>
            </div>
          } @else if (calcEinschreibungen().length === 1) {
            <div class="drawer-sg-badge">{{ calcEinschreibungen()[0].studiengang }} ({{ calcEinschreibungen()[0].kuerzel }})</div>
          }

          <!-- Loading -->
          @if (calcLoading()) {
            <div class="drawer-body"><app-skeleton-state [lineCount]="4" /></div>
          }

          <!-- Error -->
          @if (calcError()) {
            <div class="drawer-body">
              <div class="msg msg--warn">
                <span class="material-icons-outlined">info</span>
                <span>{{ calcError() }}</span>
              </div>
            </div>
          }

          <!-- Calculation result -->
          @if (!calcLoading() && !calcError() && calcDataLoaded()) {
            <!-- Grade + KPIs -->
            <div class="calc-hero">
              <div class="calc-grade" [class]="'calc-grade--' + getGradeColor(gesamtnote())">
                <span class="cg-num">{{ gesamtnote() | number:'1.2-2' }}</span>
                <span class="cg-word">
                  @if (gesamtnote() <= 1.5) { Sehr gut }
                  @else if (gesamtnote() <= 2.5) { Gut }
                  @else if (gesamtnote() <= 3.5) { Befriedigend }
                  @else if (gesamtnote() <= 4.0) { Ausreichend }
                  @else { N. best. }
                </span>
              </div>
              <div class="calc-kpis">
                <div class="ck"><span class="ck-v">{{ bewertetCount() }}</span><span class="ck-l">Module</span></div>
                <div class="ck"><span class="ck-v">{{ gewichtungsSumme() | number:'1.1-1' }}</span><span class="ck-l">Gew.</span></div>
                <div class="ck"><span class="ck-v">{{ ectsInNote() }}</span><span class="ck-l">ECTS</span></div>
              </div>
              <span class="calc-po">{{ berechnungsart() }} - PO {{ poVersion() }}</span>
            </div>

            <!-- Module table -->
            <div class="calc-table-wrap">
              <table class="ct">
                <thead>
                  <tr>
                    <th class="tc">Sem.</th>
                    <th>Modul</th>
                    <th class="tc">Note</th>
                    <th class="tc">Gew.</th>
                    <th class="tc">Zählt</th>
                    <th class="tr">Beitrag</th>
                  </tr>
                </thead>
                <tbody>
                  @for (modul of moduleMitNoten(); track modul.id) {
                    <tr [class.excl]="!zaehltInNote(modul)">
                      <td class="tc mono">{{ modul.semester }}</td>
                      <td><span class="mc">{{ modul.modulNr }}</span> {{ modul.name }}</td>
                      <td class="tc">
                        @if (modul.noteWert !== null) {
                          <span class="nchip" [class]="'nchip--' + getGradeColor(modul.noteWert)">{{ modul.noteWert | number:'1.1-1' }}</span>
                        } @else { <span class="nchip nchip--empty">–</span> }
                      </td>
                      <td class="tc mono">{{ modul.gewichtung }}×</td>
                      <td class="tc">
                        @if (zaehltInNote(modul)) { <span class="material-icons-outlined icy">check</span> }
                        @else { <span class="material-icons-outlined icn">remove</span> }
                      </td>
                      <td class="tr mono">
                        @if (zaehltInNote(modul)) { {{ modul.noteWert! * modul.gewichtung | number:'1.2-2' }} }
                        @else { – }
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr class="ft">
                    <td></td>
                    <td colspan="2"><strong>Summe</strong></td>
                    <td class="tc"><strong>{{ gewichtungsSumme() | number:'1.1-1' }}</strong></td>
                    <td></td>
                    <td class="tr"><strong>{{ notenSumme() | number:'1.2-2' }}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          }

          <!-- No data yet -->
          @if (!calcLoading() && !calcError() && !calcDataLoaded()) {
            <div class="drawer-body">
              <div class="msg msg--muted"><span class="material-icons-outlined">hourglass_empty</span> Daten werden geladen...</div>
            </div>
          }

          <!-- Footer -->
          <div class="drawer-footer">
            <button class="dbtn" (click)="viewGrades(selectedStudent()!)">
              <span class="material-icons-outlined">grade</span> Noten anzeigen
            </button>
            <button class="dbtn dbtn--muted" (click)="closeCalc()">Schließen</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .students-page { padding: var(--spacing-sm) 0; }

    /* ── Header ── */
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-sm); flex-wrap: wrap; gap: var(--spacing-sm); }
    .header-left { display: flex; align-items: baseline; gap: var(--spacing-sm); }
    .page-header h1 { margin: 0; font-size: 1.35rem; font-weight: 600; }
    .header-count { font-size: var(--font-size-sm); color: var(--text-muted); }
    .header-kpis { display: flex; gap: 6px; }
    .hkpi { font-size: 0.7rem; font-weight: 600; padding: 3px 8px; border-radius: var(--radius-full); border: 1px solid var(--border-color); }
    .hkpi--ok { color: #10b981; border-color: rgba(16,185,129,0.25); }
    .hkpi--warn { color: #f59e0b; border-color: rgba(245,158,11,0.25); }
    .hkpi--off { color: var(--text-muted); }

    /* ── Toolbar ── */
    .toolbar {
      display: flex; align-items: center; gap: var(--spacing-md);
      background: var(--bg-surface); border: 1px solid var(--border-color);
      border-radius: var(--radius-lg); padding: 8px 12px;
      margin-bottom: var(--spacing-sm); flex-wrap: wrap;
    }
    .search-wrap { position: relative; flex: 1; min-width: 180px; max-width: 340px; }
    .si { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 18px; color: var(--text-muted); pointer-events: none; }
    .search-input {
      width: 100%; padding: 7px 30px 7px 34px;
      background: var(--bg-deep); border: 1px solid var(--border-color);
      border-radius: var(--radius-md); color: var(--text-primary); font-size: var(--font-size-sm);
    }
    .search-input:focus { outline: none; border-color: rgba(99,102,241,0.5); }
    .search-input::placeholder { color: var(--text-muted); }
    .search-clear { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; display: flex; border-radius: 50%; }
    .search-clear:hover { background: var(--bg-hover); }

    .filter-chips { display: flex; gap: 4px; }
    .fc {
      padding: 5px 10px; border-radius: var(--radius-full);
      border: 1px solid var(--border-color); background: none;
      color: var(--text-muted); font-size: 0.7rem; font-weight: 500;
      cursor: pointer; transition: all 0.12s;
    }
    .fc:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); }
    .fc--on { background: rgba(255,255,255,0.1); color: var(--text-primary); border-color: rgba(255,255,255,0.2); }
    .fc--ok.fc--on { background: rgba(16,185,129,0.1); color: #10b981; border-color: rgba(16,185,129,0.3); }
    .fc--warn.fc--on { background: rgba(245,158,11,0.1); color: #f59e0b; border-color: rgba(245,158,11,0.3); }
    .fc--err.fc--on { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); }

    /* ── Messages ── */
    .msg { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: var(--radius-md); font-size: var(--font-size-sm); }
    .msg .material-icons-outlined { font-size: 20px; }
    .msg--error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; }
    .msg--warn { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); color: #f59e0b; }
    .msg--muted { background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-muted); }

    /* ── Table ── */
    .table-card {
      background: var(--bg-surface); border: 1px solid var(--border-color);
      border-radius: var(--radius-lg); overflow: hidden;
    }
    .t { width: 100%; border-collapse: collapse; }
    .t th {
      padding: 8px 12px; text-align: left; font-weight: 600;
      font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em;
      color: var(--text-muted); background: var(--bg-deep);
      border-bottom: 1px solid var(--border-color);
    }
    .t td { padding: 8px 12px; border-bottom: 1px solid var(--border-color); font-size: 0.8rem; }
    .t tbody tr:last-child td { border-bottom: none; }
    .tc { text-align: center; }
    .tr { text-align: right; }
    .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }

    .row { cursor: pointer; transition: background 0.1s; }
    .row:hover { background: rgba(255,255,255,0.03); }
    .row--active { background: rgba(99,102,241,0.06); }

    .name-cell { display: flex; align-items: center; gap: 8px; }
    .av {
      width: 30px; height: 30px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 700; color: white; flex-shrink: 0;
      background: linear-gradient(135deg, #64748b, #94a3b8);
    }
    .av--success { background: linear-gradient(135deg, #059669, #10b981); }
    .av--warning { background: linear-gradient(135deg, #d97706, #f59e0b); }
    .av--danger { background: linear-gradient(135deg, #dc2626, #ef4444); }

    .sname { font-weight: 500; }
    .email-col { color: var(--text-muted); font-size: 0.75rem; }

    .status-chip {
      display: inline-block; padding: 2px 8px; border-radius: 4px;
      font-size: 0.7rem; font-weight: 600;
    }
    .status-chip--success { background: rgba(16,185,129,0.1); color: #10b981; }
    .status-chip--warning { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .status-chip--danger { background: rgba(239,68,68,0.1); color: #ef4444; }

    .act-btn {
      background: none; border: none; color: var(--text-muted);
      cursor: pointer; padding: 4px; border-radius: 6px;
      transition: all 0.12s;
    }
    .act-btn .material-icons-outlined { font-size: 18px; }
    .act-btn:hover { background: rgba(99,102,241,0.08); color: #818cf8; }

    .empty-row { text-align: center; padding: 24px; color: var(--text-muted); }
    .footer-count { text-align: center; padding: 8px 0; font-size: 0.75rem; color: var(--text-muted); }

    /* ── Drawer ── */
    .drawer-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      backdrop-filter: blur(2px); z-index: 999;
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .drawer {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: 520px; max-width: 100vw;
      background: var(--bg-surface); border-left: 1px solid var(--border-color);
      z-index: 1000; display: flex; flex-direction: column;
      animation: slideIn 0.2s ease;
      overflow-y: auto;
    }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

    .drawer-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px; border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }
    .drawer-student { display: flex; align-items: center; gap: 10px; }
    .dav {
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 700; color: white; flex-shrink: 0;
      background: linear-gradient(135deg, #64748b, #94a3b8);
    }
    .drawer-info { display: flex; flex-direction: column; gap: 1px; }
    .drawer-name { font-weight: 600; font-size: var(--font-size-sm); }
    .drawer-sub { font-size: 0.7rem; color: var(--text-muted); }
    .drawer-close {
      background: none; border: none; color: var(--text-muted);
      cursor: pointer; padding: 4px; border-radius: 50%;
    }
    .drawer-close:hover { background: var(--bg-hover); color: var(--text-primary); }

    .drawer-details {
      display: flex; gap: 16px; padding: 8px 16px;
      border-bottom: 1px solid var(--border-color); font-size: 0.75rem;
    }
    .dd { display: flex; align-items: center; gap: 4px; }
    .dd-ic { font-size: 14px; color: var(--text-muted); }
    .dd-lbl { color: var(--text-muted); margin-right: 2px; }

    .drawer-einschr { padding: 8px 16px; border-bottom: 1px solid var(--border-color); }
    .einschr-select {
      width: 100%; padding: 6px 28px 6px 10px;
      background: var(--bg-deep); border: 1px solid var(--border-color);
      border-radius: var(--radius-sm); color: var(--text-primary);
      font-size: var(--font-size-sm); appearance: none; cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 6px center;
    }

    .drawer-sg-badge {
      padding: 6px 16px; font-size: 0.75rem; color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
    }

    .drawer-body { padding: 16px; flex: 1; }

    /* ── Calc Hero ── */
    .calc-hero {
      display: flex; align-items: center; gap: 16px;
      padding: 14px 16px; border-bottom: 1px solid var(--border-color);
    }
    .calc-grade {
      width: 64px; height: 64px; border-radius: 50%;
      border: 3px solid var(--border-color);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; flex-shrink: 0;
    }
    .calc-grade--success { border-color: rgba(16,185,129,0.5); }
    .calc-grade--good { border-color: rgba(99,102,241,0.5); }
    .calc-grade--warning { border-color: rgba(245,158,11,0.5); }
    .calc-grade--danger { border-color: rgba(239,68,68,0.5); }

    .cg-num { font-size: 1.15rem; font-weight: 700; line-height: 1; color: var(--text-primary); }
    .cg-word { font-size: 0.55rem; color: var(--text-muted); margin-top: 1px; }

    .calc-kpis { display: flex; gap: 14px; flex: 1; }
    .ck { display: flex; flex-direction: column; align-items: center; }
    .ck-v { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
    .ck-l { font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; }

    .calc-po {
      font-size: 0.65rem; color: var(--text-muted);
      padding: 2px 6px; background: rgba(255,255,255,0.04);
      border: 1px solid var(--border-color); border-radius: var(--radius-full);
      white-space: nowrap; flex-shrink: 0;
    }

    /* ── Calc Table ── */
    .calc-table-wrap { overflow-x: auto; flex: 1; }
    .ct { width: 100%; border-collapse: collapse; }
    .ct th {
      padding: 7px 10px; text-align: left; font-weight: 600;
      font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.04em;
      color: var(--text-muted); background: var(--bg-deep);
      border-bottom: 1px solid var(--border-color);
    }
    .ct td { padding: 6px 10px; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; }
    .ct tbody tr { transition: background 0.1s; }
    .ct tbody tr:hover { background: rgba(255,255,255,0.02); }
    .ct tbody tr:last-child td { border-bottom: none; }
    .excl { opacity: 0.35; }

    .mc {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.6rem; color: var(--text-muted);
      padding: 1px 3px; background: var(--bg-hover);
      border-radius: 3px; margin-right: 3px;
    }

    .nchip { display: inline-block; padding: 1px 6px; border-radius: 3px; font-weight: 600; font-size: 0.7rem; }
    .nchip--success { background: rgba(16,185,129,0.1); color: #10b981; }
    .nchip--good { background: rgba(99,102,241,0.1); color: #818cf8; }
    .nchip--warning { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .nchip--danger { background: rgba(239,68,68,0.1); color: #ef4444; }
    .nchip--empty { background: var(--bg-hover); color: var(--text-muted); }

    .icy { font-size: 14px; color: #10b981; }
    .icn { font-size: 14px; color: var(--text-muted); opacity: 0.4; }

    .ft { background: rgba(255,255,255,0.03); }
    .ft td { border-bottom: none; padding: 8px 10px; }

    /* ── Drawer Footer ── */
    .drawer-footer {
      display: flex; gap: 8px; padding: 10px 16px;
      border-top: 1px solid var(--border-color); flex-shrink: 0;
    }
    .dbtn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 7px 14px; border-radius: var(--radius-md);
      font-size: 0.8rem; font-weight: 500; cursor: pointer;
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
      color: var(--text-primary); transition: all 0.12s;
    }
    .dbtn .material-icons-outlined { font-size: 16px; }
    .dbtn:hover { background: rgba(255,255,255,0.14); }
    .dbtn--muted { background: none; border-color: var(--border-color); color: var(--text-muted); }
    .dbtn--muted:hover { background: var(--bg-hover); color: var(--text-primary); }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .page-header { flex-direction: column; align-items: flex-start; }
      .toolbar { flex-direction: column; align-items: stretch; }
      .search-wrap { max-width: none; }
      .drawer { width: 100vw; }
      .calc-hero { flex-wrap: wrap; }
    }
  `]
})
export class StudentsComponent implements OnInit {
  StudentStatus = StudentStatus;

  searchTerm = signal('');
  statusFilter = signal<StudentStatus | null>(null);
  selectedStudent = signal<Student | null>(null);

  // Calculation state
  calcEinschreibungen = signal<EinschreibungOption[]>([]);
  calcSelectedEinschreibung = '';
  calcLoading = signal(false);
  calcError = signal<string | null>(null);
  calcDataLoaded = signal(false);
  calcEinschreibung = signal<any>(null);
  calcModule = signal<any[]>([]);
  calcNoten = signal<any[]>([]);

  beurlaubtCount = computed(() => this.studentService.students().filter(s => s.status === StudentStatus.BEURLAUBT).length);
  exmatCount = computed(() => this.studentService.students().filter(s => s.status === StudentStatus.EXMATRIKULIERT).length);

  filteredStudents = computed(() => {
    let students = this.studentService.students();
    const term = this.searchTerm().toLowerCase();
    if (term) {
      students = students.filter(s =>
        s.vorname.toLowerCase().includes(term) ||
        s.nachname.toLowerCase().includes(term) ||
        s.matrikelnummer.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
      );
    }
    const status = this.statusFilter();
    if (status) {
      students = students.filter(s => s.status === status);
    }
    return students;
  });

  // Calculation computed signals
  poVersion = computed(() => this.calcEinschreibung()?.pruefungsordnung?.version || '');
  berechnungsart = computed(() => {
    const art = this.calcEinschreibung()?.pruefungsordnung?.berechnungsart;
    return art === 'GEWICHTET' ? 'Gewichtet' : 'Arithmetisch';
  });

  moduleMitNoten = computed((): ModulMitNote[] => {
    const moduleList = this.calcModule();
    const notenList = this.calcNoten();
    const notenMap = new Map(notenList.map(n => [String(n.modulId ?? ''), n]));
    const withNoten = moduleList.map(m => ({
      ...m,
      semester: (m as any).semester ?? '',
      noteWert: notenMap.get(String(m.id ?? ''))?.noteWert ?? null,
      bestanden: notenMap.get(String(m.id ?? ''))?.bestanden ?? null
    }));
    // Sort by semester (1, 2, 3, 4, 5, 6, 6-7) so Bachelorarbeit etc. appear in 7th semester
    return withNoten.slice().sort((a, b) => {
      const sa = a.semester || '0';
      const sb = b.semester || '0';
      if (sa === sb) return 0;
      if (sa === '6-7') return 1;
      if (sb === '6-7') return -1;
      return parseInt(sa, 10) - parseInt(sb, 10);
    });
  });

  /**
   * Nur bestandene Module mit Note in Gesamtnote:
   *  - inGesamtnote muss true sein (PO-Regel)
   *  - noteWert muss vorhanden und <= 4.0 sein (5.0 = nicht bestanden, zählt NICHT)
   *  - bestanden darf nicht explizit false sein
   */
  private bestandeneInNote = () =>
    this.moduleMitNoten().filter(m =>
      m.inGesamtnote && m.noteWert != null &&
      m.noteWert > 0 && m.noteWert <= 4.0 &&
      m.bestanden !== false
    );

  bewertetCount = computed(() => this.bestandeneInNote().length);
  gewichtungsSumme = computed(() => this.bestandeneInNote().reduce((sum, m) => sum + m.gewichtung, 0));
  notenSumme = computed(() => this.bestandeneInNote().reduce((sum, m) => sum + (m.noteWert! * m.gewichtung), 0));
  ectsInNote = computed(() => this.bestandeneInNote().reduce((sum, m) => sum + m.ects, 0));
  gesamtnote = computed(() => {
    const gew = this.gewichtungsSumme();
    if (gew === 0) return 0;
    return this.notenSumme() / gew;
  });

  constructor(
    public studentService: StudentService,
    private readonly router: Router,
    private readonly apollo: Apollo
  ) {}

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.studentService.loadStudents().subscribe();
  }

  onSearch(term: string): void { this.searchTerm.set(term); }
  clearSearch(): void { this.searchTerm.set(''); }
  onStatusFilter(status: StudentStatus | null): void { this.statusFilter.set(status); }

  getInitials(student: Student): string {
    return `${student.vorname.charAt(0)}${student.nachname.charAt(0)}`.toUpperCase();
  }

  // ── Calculation Drawer ──

  openCalc(student: Student): void {
    this.selectedStudent.set(student);
    this.calcEinschreibungen.set([]);
    this.calcSelectedEinschreibung = '';
    this.calcLoading.set(true);
    this.calcError.set(null);
    this.calcDataLoaded.set(false);

    // Load einschreibungen for this student
    console.log('[Calc] Loading einschreibungen for student ID:', student.id, '(' + student.vorname + ' ' + student.nachname + ')');
    this.apollo.query<{ einschreibungen: any[] }>({
      query: GET_EINSCHREIBUNGEN_QUERY,
      variables: { studentId: String(student.id) },
      fetchPolicy: 'no-cache'
    }).subscribe({
      next: (result: any) => {
        console.log('[Calc] Einschreibungen raw result:', result);
        const errors = result.errors;
        if (errors?.length) {
          console.error('[Calc] GraphQL errors:', errors);
          this.calcError.set('Fehler: ' + errors[0].message);
          this.calcLoading.set(false);
          return;
        }
        const list = result.data?.einschreibungen || [];
        console.log('[Calc] Found', list.length, 'einschreibungen for student', student.id);
        this.calcEinschreibungen.set(list.map((e: any) => ({
          id: e.id,
          studiengang: e.studiengang?.name || 'Unbekannt',
          kuerzel: e.studiengang?.kuerzel || '?',
          semester: e.aktuellesSemester
        })));
        if (list.length > 0) {
          this.calcSelectedEinschreibung = list[0].id;
          this.loadCalcData();
        } else {
          this.calcLoading.set(false);
          this.calcError.set('Keine Einschreibung gefunden (Student-ID: ' + student.id + '). Bitte prüfen Sie, ob der Studiengang-Service läuft.');
        }
      },
      error: (err: any) => {
        console.error('[Calc] Network/Query error:', err);
        const msg = err.graphQLErrors?.[0]?.message || err.networkError?.message || err.message || 'Netzwerkfehler';
        this.calcError.set('Fehler beim Laden: ' + msg);
        this.calcLoading.set(false);
      }
    });
  }

  closeCalc(): void {
    this.selectedStudent.set(null);
  }

  loadCalcData(): void {
    if (!this.calcSelectedEinschreibung) return;
    this.calcLoading.set(true);
    this.calcError.set(null);
    this.calcDataLoaded.set(false);

    const einschreibungQuery = this.apollo.query<any>({
      query: CALC_EINSCHREIBUNG_QUERY,
      variables: { einschreibungId: this.calcSelectedEinschreibung },
      fetchPolicy: 'network-only'
    });

    const notenQuery = this.apollo.query<any>({
      query: CALC_NOTEN_QUERY,
      variables: { einschreibungId: this.calcSelectedEinschreibung },
      context: { clientName: 'noten' },
      fetchPolicy: 'network-only'
    });

    Promise.all([einschreibungQuery.toPromise(), notenQuery.toPromise()]).then(([eResult, nResult]) => {
      const data = eResult?.data?.einschreibung;
      if (!data) {
        this.calcError.set('Einschreibung nicht gefunden');
        this.calcLoading.set(false);
        return;
      }
      this.calcEinschreibung.set(data);
      this.calcModule.set(data.pruefungsordnung?.module || []);
      this.calcNoten.set(nResult?.data?.notenByStudent || []);
      this.calcDataLoaded.set(true);
      this.calcLoading.set(false);
    }).catch((err) => {
      console.error('Error loading calc data:', err);
      this.calcError.set('Fehler beim Laden der Berechnungsdaten');
      this.calcLoading.set(false);
    });
  }

  viewGrades(student: Student): void {
    this.closeCalc();
    this.router.navigate(['/grades/validation'], {
      queryParams: {
        student: `${student.vorname} ${student.nachname}`,
        matrikel: student.matrikelnummer
      }
    });
  }

  /** Prüft ob ein Modul tatsächlich in die Gesamtnote zählt (PO + bestanden). */
  zaehltInNote(modul: ModulMitNote): boolean {
    return modul.inGesamtnote &&
      modul.noteWert != null &&
      modul.noteWert > 0 &&
      modul.noteWert <= 4.0 &&
      modul.bestanden !== false;
  }

  getGradeColor(noteWert: number | null): string {
    if (noteWert == null) return 'empty';
    if (noteWert <= 1.5) return 'success';
    if (noteWert <= 2.5) return 'good';
    if (noteWert <= 3.5) return 'warning';
    return 'danger';
  }
}

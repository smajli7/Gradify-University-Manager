import { Injectable, signal, computed } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, tap, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { Note, NoteStatus, NoteWithModul } from '../../types';
import { GET_NOTEN_BY_STUDENT, GET_NOTEN_BY_MODUL, GET_NOTE, GET_STUDENT_STATS } from '../../graphql/queries';

/**
 * Service für Noten-Operationen via GraphQL
 */
@Injectable({
  providedIn: 'root'
})
export class GradeService {
  // Reactive state
  private notenSignal = signal<Note[]>([]);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);
  private durchschnittSignal = signal<number | null>(null);

  // Public computed signals
  readonly noten = computed(() => this.notenSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());
  readonly durchschnitt = computed(() => this.durchschnittSignal());

  // Computed stats
  readonly bestandenCount = computed(() => 
    this.notenSignal().filter(n => n.bestanden === true).length
  );
  readonly nichtBestandenCount = computed(() => 
    this.notenSignal().filter(n => n.bestanden === false).length
  );
  readonly offenCount = computed(() => 
    this.notenSignal().filter(n => n.bestanden === null || n.bestanden === undefined).length
  );

  constructor(private apollo: Apollo) {}

  /**
   * Lädt Noten eines Studenten
   */
  loadNotenByStudent(einschreibungId: string): Observable<{ noten: Note[], durchschnitt: number | null }> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.apollo.watchQuery<{ notenByStudent: Note[], durchschnittsnote: number }>({
      query: GET_NOTEN_BY_STUDENT,
      variables: { einschreibungId },
      fetchPolicy: 'cache-and-network'
    }).valueChanges.pipe(
      map(result => ({
        noten: result.data.notenByStudent,
        durchschnitt: result.data.durchschnittsnote
      })),
      tap(data => {
        this.notenSignal.set(data.noten);
        this.durchschnittSignal.set(data.durchschnitt);
        this.loadingSignal.set(false);
      }),
      catchError(error => {
        console.error('Error loading grades:', error);
        this.errorSignal.set('Fehler beim Laden der Noten');
        this.loadingSignal.set(false);
        return of({ noten: [], durchschnitt: null });
      })
    );
  }

  /**
   * Lädt Noten eines Moduls (für Dozenten)
   */
  loadNotenByModul(modulId: string): Observable<Note[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.apollo.watchQuery<{ notenByModul: Note[] }>({
      query: GET_NOTEN_BY_MODUL,
      variables: { modulId },
      fetchPolicy: 'cache-and-network'
    }).valueChanges.pipe(
      map(result => result.data.notenByModul),
      tap(noten => {
        this.notenSignal.set(noten);
        this.loadingSignal.set(false);
      }),
      catchError(error => {
        console.error('Error loading grades:', error);
        this.errorSignal.set('Fehler beim Laden der Noten');
        this.loadingSignal.set(false);
        return of([]);
      })
    );
  }

  /**
   * Lädt eine einzelne Note
   */
  getNote(id: string): Observable<Note | null> {
    return this.apollo.query<{ note: Note }>({
      query: GET_NOTE,
      variables: { id }
    }).pipe(
      map(result => result.data.note),
      catchError(error => {
        console.error('Error loading grade:', error);
        return of(null);
      })
    );
  }

  /**
   * Lädt Statistiken eines Studenten
   */
  loadStats(einschreibungId: string): Observable<{ durchschnitt: number | null, bestanden: number }> {
    return this.apollo.query<{ durchschnittsnote: number, bestandeneModule: number }>({
      query: GET_STUDENT_STATS,
      variables: { einschreibungId }
    }).pipe(
      map(result => ({
        durchschnitt: result.data.durchschnittsnote,
        bestanden: result.data.bestandeneModule
      })),
      catchError(error => {
        console.error('Error loading stats:', error);
        return of({ durchschnitt: null, bestanden: 0 });
      })
    );
  }

  /**
   * Status-Label für UI
   */
  getStatusLabel(status: NoteStatus): string {
    const labels: Record<NoteStatus, string> = {
      [NoteStatus.ERFASST]: 'Erfasst',
      [NoteStatus.VALIDIERT]: 'Validiert',
      [NoteStatus.FREIGEGEBEN]: 'Freigegeben'
    };
    return labels[status] || status;
  }

  /**
   * Status-Farbe für UI
   */
  getStatusColor(status: NoteStatus): string {
    const colors: Record<NoteStatus, string> = {
      [NoteStatus.ERFASST]: 'warning',
      [NoteStatus.VALIDIERT]: 'info',
      [NoteStatus.FREIGEGEBEN]: 'success'
    };
    return colors[status] || 'default';
  }

  /**
   * Note-Farbe basierend auf Wert
   */
  getNoteColor(noteWert: number | undefined): string {
    if (noteWert === undefined || noteWert === null) return 'muted';
    if (noteWert <= 1.5) return 'success';
    if (noteWert <= 2.5) return 'info';
    if (noteWert <= 3.5) return 'warning';
    if (noteWert <= 4.0) return 'caution';
    return 'danger';
  }

  /**
   * Formatiert Note als String
   */
  formatNote(noteWert: number | undefined): string {
    if (noteWert === undefined || noteWert === null) return '-';
    return noteWert.toFixed(1);
  }

  /**
   * Setzt Noten zurück
   */
  clearNoten(): void {
    this.notenSignal.set([]);
    this.durchschnittSignal.set(null);
    this.errorSignal.set(null);
  }
}

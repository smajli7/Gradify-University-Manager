import { Injectable, signal, computed } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, tap, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { Student, StudentStatus } from '../../types';
import { GET_STUDENTS, GET_STUDENT, GET_STUDENT_BY_MATRIKEL } from '../../graphql/queries';

/**
 * Service für Studenten-Operationen via GraphQL
 */
@Injectable({
  providedIn: 'root'
})
export class StudentService {
  // Reactive state
  private studentsSignal = signal<Student[]>([]);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  // Public computed signals
  readonly students = computed(() => this.studentsSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());

  // Filtered counts
  readonly activeCount = computed(() => 
    this.studentsSignal().filter(s => s.status === StudentStatus.AKTIV).length
  );
  readonly totalCount = computed(() => this.studentsSignal().length);

  constructor(private apollo: Apollo) {}

  /**
   * Lädt alle Studenten
   */
  loadStudents(): Observable<Student[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.apollo.watchQuery<{ students: Student[] }>({
      query: GET_STUDENTS,
      fetchPolicy: 'cache-and-network'
    }).valueChanges.pipe(
      map(result => result.data.students),
      tap(students => {
        this.studentsSignal.set(students);
        this.loadingSignal.set(false);
      }),
      catchError(error => {
        console.error('Error loading students:', error);
        this.errorSignal.set('Fehler beim Laden der Studenten');
        this.loadingSignal.set(false);
        return of([]);
      })
    );
  }

  /**
   * Lädt einen einzelnen Studenten
   */
  getStudent(id: string): Observable<Student | null> {
    return this.apollo.watchQuery<{ student: Student }>({
      query: GET_STUDENT,
      variables: { id }
    }).valueChanges.pipe(
      map(result => result.data.student),
      catchError(error => {
        console.error('Error loading student:', error);
        return of(null);
      })
    );
  }

  /**
   * Sucht Student nach Matrikelnummer
   */
  searchByMatrikel(matrikelnummer: string): Observable<Student | null> {
    return this.apollo.query<{ studentByMatrikel: Student }>({
      query: GET_STUDENT_BY_MATRIKEL,
      variables: { matrikelnummer }
    }).pipe(
      map(result => result.data.studentByMatrikel),
      catchError(error => {
        console.error('Error searching student:', error);
        return of(null);
      })
    );
  }

  /**
   * Filtert Studenten nach Suchbegriff (lokal)
   */
  filterStudents(searchTerm: string): Student[] {
    const term = searchTerm.toLowerCase();
    return this.studentsSignal().filter(student =>
      student.vorname.toLowerCase().includes(term) ||
      student.nachname.toLowerCase().includes(term) ||
      student.matrikelnummer.toLowerCase().includes(term) ||
      student.email.toLowerCase().includes(term)
    );
  }

  /**
   * Filtert Studenten nach Status (lokal)
   */
  filterByStatus(status: StudentStatus | null): Student[] {
    if (!status) return this.studentsSignal();
    return this.studentsSignal().filter(student => student.status === status);
  }

  /**
   * Status-Label für UI
   */
  getStatusLabel(status: StudentStatus): string {
    const labels: Record<StudentStatus, string> = {
      [StudentStatus.AKTIV]: 'Aktiv',
      [StudentStatus.BEURLAUBT]: 'Beurlaubt',
      [StudentStatus.EXMATRIKULIERT]: 'Exmatrikuliert'
    };
    return labels[status] || status;
  }

  /**
   * Status-Farbe für UI
   */
  getStatusColor(status: StudentStatus): string {
    const colors: Record<StudentStatus, string> = {
      [StudentStatus.AKTIV]: 'success',
      [StudentStatus.BEURLAUBT]: 'warning',
      [StudentStatus.EXMATRIKULIERT]: 'danger'
    };
    return colors[status] || 'default';
  }
}

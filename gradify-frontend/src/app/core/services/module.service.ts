import { Injectable, signal, computed } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, tap, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { Modul, Studiengang, Modultyp, Pruefungsform } from '../../types';
import { GET_MODULE, GET_MODUL, GET_STUDIENGAENGE, GET_STUDIENGANG } from '../../graphql/queries';

/**
 * Service für Modul- und Studiengang-Operationen via GraphQL
 */
@Injectable({
  providedIn: 'root'
})
export class ModuleService {
  // Reactive state
  private moduleSignal = signal<Modul[]>([]);
  private studiengaengeSignal = signal<Studiengang[]>([]);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  // Public computed signals
  readonly module = computed(() => this.moduleSignal());
  readonly studiengaenge = computed(() => this.studiengaengeSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());

  // Module als Map für schnellen Zugriff (String-Keys für sicheren Lookup)
  readonly moduleMap = computed(() => {
    const map = new Map<string, Modul>();
    this.moduleSignal().forEach(m => map.set(String(m?.id ?? ''), m));
    return map;
  });

  constructor(private apollo: Apollo) {}

  /**
   * Lädt Module eines Studiengangs
   */
  loadModule(studiengangId?: string, poId?: string): Observable<Modul[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.apollo.watchQuery<{ module: Modul[] }>({
      query: GET_MODULE,
      variables: { studiengangId, poId },
      context: { clientName: 'studiengang' },
      fetchPolicy: 'cache-and-network'
    }).valueChanges.pipe(
      map(result => result.data.module),
      tap(module => {
        this.moduleSignal.set(module);
        this.loadingSignal.set(false);
      }),
      catchError(error => {
        console.error('Error loading modules:', error);
        this.errorSignal.set('Fehler beim Laden der Module');
        this.loadingSignal.set(false);
        return of([]);
      })
    );
  }

  /**
   * Lädt ein einzelnes Modul und fügt es dem Cache hinzu
   */
  getModul(id: string): Observable<Modul | null> {
    const key = String(id);
    const cached = this.moduleMap().get(key);
    if (cached) {
      return of(cached);
    }

    return this.apollo.query<{ modul: Modul }>({
      query: GET_MODUL,
      variables: { id },
      context: { clientName: 'studiengang' }
    }).pipe(
      map(result => result.data.modul),
      tap(modul => {
        if (modul) {
          const list = this.moduleSignal();
          const exists = list.some(m => String(m?.id) === key);
          if (!exists) {
            this.moduleSignal.set([...list, modul]);
          }
        }
      }),
      catchError(error => {
        console.error('Error loading module:', error);
        return of(null);
      })
    );
  }

  /**
   * Holt Modul-Name aus Cache (id kann string oder number sein)
   */
  getModulName(id: string | number | null | undefined): string {
    const key = id != null ? String(id) : '';
    const modul = this.moduleMap().get(key);
    return modul?.name || 'Unbekanntes Modul';
  }

  /**
   * Holt Modul-Nr aus Cache (id kann string oder number sein)
   */
  getModulNr(id: string | number | null | undefined): string {
    const key = id != null ? String(id) : '';
    const modul = this.moduleMap().get(key);
    return modul?.modulNr || '';
  }

  /**
   * Lädt alle Studiengänge
   */
  loadStudiengaenge(mandantId?: string): Observable<Studiengang[]> {
    this.loadingSignal.set(true);

    return this.apollo.watchQuery<{ studiengaenge: Studiengang[] }>({
      query: GET_STUDIENGAENGE,
      variables: { mandantId },
      fetchPolicy: 'cache-and-network'
    }).valueChanges.pipe(
      map(result => result.data.studiengaenge),
      tap(studiengaenge => {
        this.studiengaengeSignal.set(studiengaenge);
        this.loadingSignal.set(false);
      }),
      catchError(error => {
        console.error('Error loading programs:', error);
        this.loadingSignal.set(false);
        return of([]);
      })
    );
  }

  /**
   * Lädt einen Studiengang mit Modulen
   */
  getStudiengang(id: string): Observable<Studiengang | null> {
    return this.apollo.query<{ studiengang: Studiengang }>({
      query: GET_STUDIENGANG,
      variables: { id }
    }).pipe(
      map(result => result.data.studiengang),
      tap(studiengang => {
        // Module in Cache speichern
        if (studiengang?.module) {
          this.moduleSignal.set(studiengang.module);
        }
      }),
      catchError(error => {
        console.error('Error loading program:', error);
        return of(null);
      })
    );
  }

  /**
   * Modultyp-Label für UI
   */
  getModultypLabel(typ: Modultyp): string {
    const labels: Record<Modultyp, string> = {
      [Modultyp.PFLICHT]: 'Pflicht',
      [Modultyp.WAHLPFLICHT]: 'Wahlpflicht',
      [Modultyp.ZUSATZ]: 'Zusatz'
    };
    return labels[typ] || typ;
  }

  /**
   * Prüfungsform-Label für UI
   */
  getPruefungsformLabel(form: Pruefungsform): string {
    const labels: Record<Pruefungsform, string> = {
      [Pruefungsform.KLAUSUR]: 'Klausur',
      [Pruefungsform.HAUSARBEIT]: 'Hausarbeit',
      [Pruefungsform.MUENDLICH]: 'Mündlich',
      [Pruefungsform.PROJEKT]: 'Projekt',
      [Pruefungsform.PORTFOLIO]: 'Portfolio',
      [Pruefungsform.PRAESENTATION]: 'Präsentation',
      [Pruefungsform.PRAXISBERICHT]: 'Praxisbericht'
    };
    return labels[form] || form;
  }
}

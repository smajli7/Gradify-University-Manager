import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

export interface BerechnungDto {
  einschreibungId: string;
  gesamtnote: number | null;
  gesamtnoteRoh: number | null;
  status: string;
  berechnetAm: string | null;
  moduleBestanden: number;
  moduleGesamt: number;
}

export interface FortschrittDto {
  einschreibungId: string;
  ectsErreicht: number;
  ectsGesamt: number;
  moduleBestanden: number;
  moduleOffen: number;
  moduleNichtBestanden: number;
  fortschrittProzent: number;
}

@Injectable({
  providedIn: 'root'
})
export class CalculationService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = '/api/berechnungen';

  /**
   * Holt die berechnete Gesamtnote für eine Einschreibung.
   */
  getGesamtnote(einschreibungId: string): Observable<ApiResponse<BerechnungDto>> {
    return this.http.get<ApiResponse<BerechnungDto>>(
      `${this.API_URL}/einschreibung/${einschreibungId}`
    );
  }

  /**
   * Holt den Studienfortschritt (ECTS, bestandene Module).
   */
  getFortschritt(einschreibungId: string): Observable<ApiResponse<FortschrittDto>> {
    return this.http.get<ApiResponse<FortschrittDto>>(
      `${this.API_URL}/einschreibung/${einschreibungId}/fortschritt`
    );
  }

  /**
   * Triggert eine Neuberechnung der Gesamtnote.
   */
  berechneGesamtnote(
    einschreibungId: string,
    poId?: string,
    ectsGesamt: number = 180
  ): Observable<ApiResponse<BerechnungDto>> {
    const params: any = { ectsGesamt };
    if (poId) {
      params.poId = poId;
    }
    
    return this.http.post<ApiResponse<BerechnungDto>>(
      `${this.API_URL}/einschreibung/${einschreibungId}/berechnen`,
      null,
      { params }
    );
  }
}

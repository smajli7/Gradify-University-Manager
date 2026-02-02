import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface ServiceStatus {
  available: boolean;
  message: string;
  protocol: string;
  port: number;
}

export interface AuthGrpcData {
  userService: ServiceStatus;
  allAvailable: boolean;
}

export interface BerechnungGrpcData {
  notenService: ServiceStatus;
  studiengangService: ServiceStatus;
  allAvailable: boolean;
}

export interface AuthGrpcStatusResponse {
  success: boolean;
  data: AuthGrpcData;
}

export interface BerechnungGrpcStatusResponse {
  success: boolean;
  data: BerechnungGrpcData;
}

export interface SystemStatus {
  authService: {
    http: boolean;
    grpc: {
      userService: ServiceStatus | null;
    };
  };
  berechnungsService: {
    http: boolean;
    grpc: {
      notenService: ServiceStatus | null;
      studiengangService: ServiceStatus | null;
    };
  };
  allGrpcAvailable: boolean;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SystemStatusService {

  constructor(private http: HttpClient) {}

  /**
   * Holt den gRPC-Status vom Auth-Service
   */
  getAuthGrpcStatus(): Observable<AuthGrpcStatusResponse | null> {
    return this.http.get<AuthGrpcStatusResponse>('/api/auth/grpc-status').pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Holt den gRPC-Status vom Berechnungs-Service
   */
  getBerechnungGrpcStatus(): Observable<BerechnungGrpcStatusResponse | null> {
    return this.http.get<BerechnungGrpcStatusResponse>('/api/berechnungen/grpc-status').pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Holt den kombinierten System-Status
   */
  getFullStatus(): Observable<SystemStatus> {
    return forkJoin({
      auth: this.getAuthGrpcStatus(),
      berechnung: this.getBerechnungGrpcStatus()
    }).pipe(
      map(({ auth, berechnung }) => {
        const authGrpcAvailable = auth?.data?.allAvailable ?? false;
        const berechnungGrpcAvailable = berechnung?.data?.allAvailable ?? false;

        return {
          authService: {
            http: auth !== null,
            grpc: {
              userService: auth?.data?.userService ?? null
            }
          },
          berechnungsService: {
            http: berechnung !== null,
            grpc: {
              notenService: berechnung?.data?.notenService ?? null,
              studiengangService: berechnung?.data?.studiengangService ?? null
            }
          },
          allGrpcAvailable: authGrpcAvailable && berechnungGrpcAvailable,
          timestamp: new Date()
        };
      })
    );
  }
}

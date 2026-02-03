import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DebugService, TrafficEntry } from '../services/debug.service';

@Injectable()
export class LoggingInterceptor implements HttpInterceptor {
  constructor(private readonly debugService: DebugService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.debugService.debugMode()) return next.handle(req);

    const start = Date.now();
    const isGraphQL = req.url.includes('/graphql');
    const entry: TrafficEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: isGraphQL ? 'GraphQL' : 'HTTP',
      method: req.method,
      url: req.url,
      service: deriveService(req.url),
      operationName: isGraphQL && req.body && typeof req.body === 'object' && 'operationName' in req.body
        ? String((req.body as { operationName?: string }).operationName)
        : undefined,
      requestBody: req.body != null ? safeClone(req.body) : undefined
    };

    return next.handle(req).pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse) {
            entry.status = event.status;
            entry.durationMs = Date.now() - start;
            const body = event.body != null ? safeClone(event.body) : undefined;
            entry.responseBody = body;
            entry.responseSize = body != null ? approxSize(body) : 0;
            this.debugService.addEntry(entry);
          }
        },
        error: (err: { status?: number; message?: string; error?: unknown }) => {
          entry.status = err?.status ?? 0;
          entry.durationMs = Date.now() - start;
          entry.error = err?.message ?? 'Unbekannter Fehler';
          const errBody = err?.error != null ? safeClone(err.error) : undefined;
          entry.responseBody = errBody;
          entry.responseSize = errBody != null ? approxSize(errBody) : 0;
          this.debugService.addEntry(entry);
        }
      })
    );
  }
}

function safeClone(obj: unknown): unknown {
  try {
    if (obj == null) return obj;
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return String(obj);
  }
}

function deriveService(url: string): string {
  if (url.includes('/api/auth')) return 'Auth';
  if (url.includes('/api/users') || url.includes('/api/students')) return 'User';
  if (url.includes('/api/noten')) return 'Noten';
  if (url.includes('/api/berechnungen')) return 'Berechnung';
  if (url.includes('/graphql/noten')) return 'Noten (GQL)';
  if (url.includes('/graphql/user')) return 'User (GQL)';
  if (url.includes('/graphql/')) return 'Studiengang (GQL)';
  return '-';
}

function approxSize(obj: unknown): number {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    return 0;
  }
}

import { Injectable, signal, computed } from '@angular/core';

export interface TrafficEntry {
  id: string;
  timestamp: string;
  type: 'HTTP' | 'GraphQL';
  method?: string;
  url: string;
  operationName?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  status?: number;
  durationMs?: number;
  error?: string;
  /** Backend-Service (aus URL abgeleitet) */
  service?: string;
  /** Response-Größe in Bytes (approx.) */
  responseSize?: number;
}

const STORAGE_KEY = 'gradify-debug-mode';
const MAX_ENTRIES = 150;

@Injectable({ providedIn: 'root' })
export class DebugService {
  private readonly _debugMode = signal(this.loadFromStorage());
  readonly debugMode = this._debugMode.asReadonly();

  private readonly _trafficLog = signal<TrafficEntry[]>([]);
  readonly trafficLog = this._trafficLog.asReadonly();

  readonly entryCount = computed(() => this._trafficLog().length);

  toggle(): void {
    const next = !this._debugMode();
    this._debugMode.set(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  addEntry(entry: TrafficEntry): void {
    this._trafficLog.update(log => {
      const next = [entry, ...log].slice(0, MAX_ENTRIES);
      return next;
    });
  }

  clearLog(): void {
    this._trafficLog.set([]);
  }

  private loadFromStorage(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /** Maskiert sensible Felder für die Anzeige */
  static maskSensitive(obj: unknown): unknown {
    if (obj == null) return obj;
    if (typeof obj !== 'object') return obj;
    const masked = { ...obj } as Record<string, unknown>;
    const sensitive = ['authorization', 'password', 'token', 'Bearer'];
    for (const [k, v] of Object.entries(masked)) {
      const lower = k.toLowerCase();
      if (sensitive.some(s => lower.includes(s)) && typeof v === 'string') {
        masked[k] = '***';
      } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        masked[k] = DebugService.maskSensitive(v);
      }
    }
    return masked;
  }
}

import { Injectable, signal } from '@angular/core';

/**
 * Service fuer Online/Offline-Status.
 * Wird von der PWA genutzt, um Offline-Zustand anzuzeigen.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  readonly isOnline = signal(navigator.onLine);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.isOnline.set(true));
      window.addEventListener('offline', () => this.isOnline.set(false));
    }
  }
}

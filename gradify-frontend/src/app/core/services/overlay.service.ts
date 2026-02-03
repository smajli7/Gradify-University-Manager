import { Injectable, signal } from '@angular/core';

/**
 * Hält den Zustand, ob ein Vollbild-Modal (z.B. Notenbescheinigung) offen ist.
 * Das Dock wird ausgeblendet, solange ein Overlay offen ist.
 */
@Injectable({ providedIn: 'root' })
export class OverlayService {
  readonly overlayOpen = signal(false);

  setOverlayOpen(open: boolean): void {
    this.overlayOpen.set(open);
  }
}

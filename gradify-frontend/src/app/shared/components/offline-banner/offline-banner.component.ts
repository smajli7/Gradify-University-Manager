import { Component } from '@angular/core';
import { ConnectivityService } from '../../../core/services/connectivity.service';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  template: `
    @if (!connectivity.isOnline()) {
      <div class="offline-banner">
        <span class="material-icons-outlined">cloud_off</span>
        <span>Sie sind offline – einige Funktionen sind eingeschränkt.</span>
      </div>
    }
  `,
  styles: [`
    .offline-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: #FF3344;
      color: white;
      font-size: 0.875rem;
    }
    .offline-banner .material-icons-outlined {
      font-size: 1.25rem;
    }
  `]
})
export class OfflineBannerComponent {
  constructor(public connectivity: ConnectivityService) {}
}

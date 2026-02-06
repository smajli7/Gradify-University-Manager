import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OfflineBannerComponent } from './shared/components/offline-banner/offline-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, OfflineBannerComponent],
  template: `
    <app-offline-banner />
    <router-outlet></router-outlet>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class AppComponent {
  title = 'Gradify';
}

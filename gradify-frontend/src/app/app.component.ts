import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar color="primary">
      <mat-icon>school</mat-icon>
      <span class="ml-8">Gradify</span>
      <span class="spacer"></span>
      <button mat-button routerLink="/login">Login</button>
    </mat-toolbar>
    
    <main class="container">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .spacer {
      flex: 1 1 auto;
    }
    .ml-8 {
      margin-left: 8px;
    }
    main {
      padding: 24px;
    }
  `]
})
export class AppComponent {
  title = 'Gradify';
}



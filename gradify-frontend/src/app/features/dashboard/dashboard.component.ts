import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <h1>Dashboard</h1>
    <p class="text-muted">Willkommen bei Gradify!</p>
    
    <div class="card-grid mt-16">
      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>assignment</mat-icon>
          <mat-card-title>Meine Noten</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Hier können Sie Ihre Noten einsehen.</p>
        </mat-card-content>
      </mat-card>
      
      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>trending_up</mat-icon>
          <mat-card-title>Fortschritt</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Ihr aktueller Studienfortschritt.</p>
        </mat-card-content>
      </mat-card>
      
      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>calculate</mat-icon>
          <mat-card-title>Gesamtnote</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Ihre berechnete Gesamtnote.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    h1 {
      margin-bottom: 8px;
    }
    
    mat-icon[mat-card-avatar] {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #3f51b5;
    }
  `]
})
export class DashboardComponent {}




import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>school</mat-icon>
            Gradify Login
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <form (ngSubmit)="onLogin()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Benutzername</mat-label>
              <input matInput [(ngModel)]="username" name="username" required>
              <mat-icon matPrefix>person</mat-icon>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Passwort</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'" 
                     [(ngModel)]="password" name="password" required>
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button">
                <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
              </button>
            </mat-form-field>
            
            <button mat-raised-button color="primary" type="submit" class="full-width">
              Anmelden
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
    }
    
    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 24px;
    }
    
    mat-card-header {
      justify-content: center;
      margin-bottom: 24px;
    }
    
    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 24px;
    }
    
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  hidePassword = true;

  constructor(private router: Router) {}

  onLogin(): void {
    // TODO: Implement actual login
    console.log('Login attempt:', this.username);
    this.router.navigate(['/dashboard']);
  }
}





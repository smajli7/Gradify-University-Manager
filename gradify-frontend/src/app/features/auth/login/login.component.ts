import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <!-- Background Glow Effects -->
      <div class="bg-glow bg-glow--1"></div>
      <div class="bg-glow bg-glow--2"></div>
      
      <div class="login-container animate-slide-up">
        <!-- Logo -->
        <div class="logo">
          <span class="logo-icon">🎓</span>
          <h1 class="logo-text">Gradify</h1>
        </div>
        
        <p class="subtitle">Notenmanagement System</p>
        
        <!-- Login Card -->
        <div class="login-card">
          <h2>Anmelden</h2>
          
          <form (ngSubmit)="onLogin()" class="login-form">
            <div class="form-group">
              <label for="username">Benutzername</label>
              <div class="input-wrapper">
                <span class="input-icon material-icons-outlined">person</span>
                <input 
                  type="text" 
                  id="username"
                  class="input" 
                  [(ngModel)]="username" 
                  name="username" 
                  placeholder="max.mustermann"
                  required
                  autocomplete="username">
              </div>
            </div>
            
            <div class="form-group">
              <label for="password">Passwort</label>
              <div class="input-wrapper">
                <span class="input-icon material-icons-outlined">lock</span>
                <input 
                  [type]="hidePassword ? 'password' : 'text'"
                  id="password"
                  class="input" 
                  [(ngModel)]="password" 
                  name="password" 
                  placeholder="••••••••"
                  required
                  autocomplete="current-password">
                <button 
                  type="button" 
                  class="toggle-password"
                  (click)="hidePassword = !hidePassword">
                  <span class="material-icons-outlined">
                    {{ hidePassword ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>
            
            @if (errorMessage) {
              <div class="error-banner">
                <span class="material-icons-outlined">error</span>
                {{ errorMessage }}
              </div>
            }
            
            <button type="submit" class="btn btn--primary btn--lg submit-btn" [disabled]="isLoading">
              @if (isLoading) {
                <span class="spinner"></span>
                Anmelden...
              } @else {
                Anmelden
                <span class="material-icons-outlined">arrow_forward</span>
              }
            </button>
          </form>
          
          <!-- Demo Accounts Info -->
          <div class="demo-info">
            <p class="demo-title">Demo-Zugänge:</p>
            <div class="demo-accounts">
              <button class="demo-account" (click)="fillDemo('admin', 'admin123')">
                <span class="role-badge role-badge--admin">Admin</span>
              </button>
              <button class="demo-account" (click)="fillDemo('dozent', 'dozent123')">
                <span class="role-badge role-badge--dozent">Dozent</span>
              </button>
              <button class="demo-account" (click)="fillDemo('student', 'student123')">
                <span class="role-badge role-badge--student">Student</span>
              </button>
            </div>
          </div>
        </div>
        
        <p class="footer-text">© 2026 Gradify - Hochschule</p>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-lg);
      position: relative;
      overflow: hidden;
    }

    /* Background Glow Effects */
    .bg-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      opacity: 0.3;
      pointer-events: none;
    }

    .bg-glow--1 {
      width: 600px;
      height: 600px;
      background: var(--color-primary);
      top: -200px;
      right: -200px;
    }

    .bg-glow--2 {
      width: 500px;
      height: 500px;
      background: var(--color-secondary);
      bottom: -150px;
      left: -150px;
    }

    .login-container {
      width: 100%;
      max-width: 420px;
      text-align: center;
      position: relative;
      z-index: 1;
    }

    /* Logo */
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-sm);
    }

    .logo-icon {
      font-size: 48px;
      filter: drop-shadow(0 0 20px rgba(var(--color-primary-rgb), 0.5));
    }

    .logo-text {
      font-size: var(--font-size-3xl);
      font-weight: 700;
      background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      color: var(--text-muted);
      margin-bottom: var(--spacing-xl);
    }

    /* Card */
    .login-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: var(--spacing-xl);
      box-shadow: var(--shadow-lg);
    }

    .login-card h2 {
      margin-bottom: var(--spacing-lg);
      font-size: var(--font-size-xl);
    }

    /* Form */
    .login-form {
      text-align: left;
    }

    .form-group {
      margin-bottom: var(--spacing-md);
    }

    .form-group label {
      display: block;
      margin-bottom: var(--spacing-xs);
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--text-secondary);
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: var(--spacing-md);
      color: var(--text-muted);
      font-size: 20px;
    }

    .input-wrapper .input {
      padding-left: 48px;
      padding-right: 48px;
    }

    .toggle-password {
      position: absolute;
      right: var(--spacing-sm);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: var(--spacing-xs);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color var(--transition-fast);
    }

    .toggle-password:hover {
      color: var(--text-primary);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background: rgba(var(--color-danger-rgb), 0.1);
      border: 1px solid rgba(var(--color-danger-rgb), 0.3);
      border-radius: var(--radius-md);
      color: var(--color-danger);
      font-size: var(--font-size-sm);
      margin-bottom: var(--spacing-md);
    }

    .submit-btn {
      width: 100%;
      margin-top: var(--spacing-sm);
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Demo Info */
    .demo-info {
      margin-top: var(--spacing-lg);
      padding-top: var(--spacing-lg);
      border-top: 1px solid var(--border-color);
    }

    .demo-title {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      margin-bottom: var(--spacing-sm);
    }

    .demo-accounts {
      display: flex;
      gap: var(--spacing-sm);
      justify-content: center;
      flex-wrap: wrap;
    }

    .demo-account {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }

    .role-badge {
      display: inline-block;
      padding: var(--spacing-xs) var(--spacing-md);
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: 500;
      transition: all var(--transition-fast);
    }

    .role-badge--admin {
      background: rgba(var(--color-danger-rgb), 0.15);
      color: var(--color-danger);
      border: 1px solid rgba(var(--color-danger-rgb), 0.3);
    }

    .role-badge--admin:hover {
      background: rgba(var(--color-danger-rgb), 0.25);
    }

    .role-badge--dozent {
      background: rgba(var(--color-secondary-rgb), 0.15);
      color: #a855f7;
      border: 1px solid rgba(var(--color-secondary-rgb), 0.3);
    }

    .role-badge--dozent:hover {
      background: rgba(var(--color-secondary-rgb), 0.25);
    }

    .role-badge--student {
      background: rgba(var(--color-primary-rgb), 0.15);
      color: var(--color-primary);
      border: 1px solid rgba(var(--color-primary-rgb), 0.3);
    }

    .role-badge--student:hover {
      background: rgba(var(--color-primary-rgb), 0.25);
    }

    /* Footer */
    .footer-text {
      margin-top: var(--spacing-xl);
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    /* Responsive */
    @media (max-width: 480px) {
      .login-card {
        padding: var(--spacing-lg);
      }

      .logo-text {
        font-size: var(--font-size-2xl);
      }

      .logo-icon {
        font-size: 36px;
      }
    }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  hidePassword = true;
  isLoading = false;
  errorMessage = '';

  constructor(private router: Router) {}

  fillDemo(username: string, password: string): void {
    this.username = username;
    this.password = password;
    this.errorMessage = '';
  }

  onLogin(): void {
    if (!this.username || !this.password) {
      this.errorMessage = 'Bitte Benutzername und Passwort eingeben';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Simulate API call
    setTimeout(() => {
      // TODO: Implement actual login via AuthService
      console.log('Login attempt:', this.username);
      this.isLoading = false;
      this.router.navigate(['/dashboard']);
    }, 1000);
  }
}

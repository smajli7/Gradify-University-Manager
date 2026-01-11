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
        <!-- Splash Screen -->
        <div class="splash" [class.splash--hidden]="showContent">
          <!-- Ambient Glow Orbs -->
          <div class="orb orb--1"></div>
          <div class="orb orb--2"></div>
          <div class="orb orb--3"></div>
          
          <!-- Light Beams -->
          <div class="beam beam--1"></div>
          <div class="beam beam--2"></div>
          <div class="beam beam--3"></div>
          <div class="beam beam--4"></div>
          <div class="beam beam--5"></div>
          <div class="beam beam--6"></div>
          <div class="beam beam--7"></div>
          <div class="beam beam--8"></div>
          
          <!-- Main Logo -->
          <div class="splash-logo-container">
            <!-- Frame + Content wrapper -->
            <div class="splash-frame-wrapper">
              <!-- Frame with draw animation -->
              <svg class="splash-frame" viewBox="0 0 220 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="frameGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#00F2FF"/>
                    <stop offset="100%" stop-color="#7000FF"/>
                  </linearGradient>
                </defs>
                <rect class="frame-rect" x="2" y="2" width="216" height="56" rx="12" ry="12" 
                      stroke="url(#frameGradient)" stroke-width="2" fill="none"/>
              </svg>
              
              <!-- Content that fades in -->
              <div class="splash-content">
                <span class="splash-text">1.0</span>
                <span class="splash-divider">|</span>
                <span class="splash-text">1.3</span>
              </div>
            </div>
            
            <!-- Title with shimmer -->
            <div class="splash-title">Gradify</div>
          </div>
        </div>

        <!-- Logo (small, after splash) -->
        <div class="logo" [class.logo--visible]="showContent">
          <svg class="logo-svg" viewBox="0 0 180 90" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#00F2FF"/>
                <stop offset="100%" stop-color="#7000FF"/>
              </linearGradient>
            </defs>
            <rect x="15" y="8" width="150" height="44" rx="10" ry="10" 
                  stroke="url(#logoGradient)" stroke-width="2" fill="none"/>
            <text x="90" y="38" font-family="DM Sans, sans-serif" font-size="20" font-weight="600" 
                  fill="#E6EDF3" text-anchor="middle">
              <tspan>1.0</tspan>
              <tspan fill="#8B949E" font-weight="300"> | </tspan>
              <tspan>1.3</tspan>
            </text>
            <text x="90" y="76" font-family="DM Sans, sans-serif" font-size="22" font-weight="500" 
                  fill="#E6EDF3" text-anchor="middle" letter-spacing="1">Gradify</text>
          </svg>
        </div>
        
        <!-- Login Card with gradient border -->
        <div class="login-card-wrapper" [class.content--visible]="showContent">
          <div class="login-card">
            <h2 class="login-title">Willkommen zurück</h2>
            <p class="login-subtitle">Melden Sie sich an, um fortzufahren</p>
            
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
              
              <button type="submit" class="submit-btn" [disabled]="isLoading">
                @if (isLoading) {
                  <span class="spinner"></span>
                  Anmelden...
                } @else {
                  <span>Anmelden</span>
                  <span class="material-icons-outlined">east</span>
                }
              </button>
            </form>
            
            <!-- Demo Accounts Info -->
            <div class="demo-info">
              <div class="demo-divider">
                <span class="divider-line"></span>
                <span class="divider-text">Demo-Zugänge</span>
                <span class="divider-line"></span>
              </div>
              <div class="demo-accounts">
                <button class="demo-chip demo-chip--admin" (click)="fillDemo('admin', 'admin123')">
                  <span class="material-icons-outlined">shield</span>
                  Admin
                </button>
                <button class="demo-chip demo-chip--dozent" (click)="fillDemo('dozent', 'dozent123')">
                  <span class="material-icons-outlined">school</span>
                  Dozent
                </button>
                <button class="demo-chip demo-chip--student" (click)="fillDemo('student', 'student123')">
                  <span class="material-icons-outlined">person</span>
                  Student
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <p class="footer-text" [class.content--visible]="showContent">© 2026 Gradify - Hochschule</p>
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

    /* Background Glow Effects - matching splash screen */
    .bg-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      pointer-events: none;
      animation: bgFloat 10s ease-in-out infinite;
    }

    .bg-glow--1 {
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(0, 242, 255, 0.35) 0%, transparent 70%);
      top: -150px;
      right: -100px;
      animation-delay: 0s;
    }

    .bg-glow--2 {
      width: 450px;
      height: 450px;
      background: radial-gradient(circle, rgba(112, 0, 255, 0.35) 0%, transparent 70%);
      bottom: -100px;
      left: -100px;
      animation-delay: 3s;
    }

    @keyframes bgFloat {
      0%, 100% {
        transform: translate(0, 0) scale(1);
        opacity: 0.8;
      }
      50% {
        transform: translate(20px, -15px) scale(1.05);
        opacity: 1;
      }
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
      margin-bottom: var(--spacing-md);
    }

    /* Splash Screen */
    .splash {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-deep);
      z-index: 1000;
      transition: opacity 0.6s ease, visibility 0.6s ease;
      overflow: hidden;
    }

    .splash--hidden {
      opacity: 0;
      visibility: hidden;
    }

    /* Ambient Glow Orbs */
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.5;
      animation: orbFloat 8s ease-in-out infinite;
    }

    .orb--1 {
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(0, 242, 255, 0.4) 0%, transparent 70%);
      top: -15%;
      right: -10%;
      animation-delay: 0s;
    }

    .orb--2 {
      width: 350px;
      height: 350px;
      background: radial-gradient(circle, rgba(112, 0, 255, 0.4) 0%, transparent 70%);
      bottom: -10%;
      left: -10%;
      animation-delay: 2s;
      animation-duration: 10s;
    }

    .orb--3 {
      width: 250px;
      height: 250px;
      background: radial-gradient(circle, rgba(0, 242, 255, 0.3) 0%, rgba(112, 0, 255, 0.2) 50%, transparent 70%);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation-delay: 1s;
      animation-duration: 6s;
    }

    @keyframes orbFloat {
      0%, 100% {
        transform: translate(0, 0) scale(1);
        opacity: 0.4;
      }
      33% {
        transform: translate(30px, -20px) scale(1.1);
        opacity: 0.6;
      }
      66% {
        transform: translate(-20px, 15px) scale(0.95);
        opacity: 0.5;
      }
    }

    /* Light Beams */
    .beam {
      position: absolute;
      width: 2px;
      opacity: 0;
      animation: beamShoot 2.5s ease-out infinite;
    }

    .beam--1 {
      height: 120px;
      background: linear-gradient(to bottom, transparent, #00F2FF, transparent);
      top: 10%;
      left: 15%;
      transform: rotate(-25deg);
      animation-delay: 0s;
    }

    .beam--2 {
      height: 100px;
      background: linear-gradient(to bottom, transparent, #7000FF, transparent);
      top: 5%;
      right: 20%;
      transform: rotate(20deg);
      animation-delay: 0.3s;
    }

    .beam--3 {
      height: 140px;
      background: linear-gradient(to bottom, transparent, #00F2FF, #7000FF, transparent);
      top: 15%;
      left: 40%;
      transform: rotate(-15deg);
      animation-delay: 0.6s;
    }

    .beam--4 {
      height: 90px;
      background: linear-gradient(to bottom, transparent, #7000FF, transparent);
      top: 8%;
      right: 35%;
      transform: rotate(30deg);
      animation-delay: 0.9s;
    }

    .beam--5 {
      height: 110px;
      background: linear-gradient(to bottom, transparent, #00F2FF, transparent);
      top: 12%;
      right: 10%;
      transform: rotate(15deg);
      animation-delay: 1.2s;
    }

    .beam--6 {
      height: 130px;
      background: linear-gradient(to bottom, transparent, #7000FF, #00F2FF, transparent);
      top: 5%;
      left: 55%;
      transform: rotate(-35deg);
      animation-delay: 1.5s;
    }

    .beam--7 {
      height: 80px;
      background: linear-gradient(to bottom, transparent, #00F2FF, transparent);
      top: 18%;
      left: 25%;
      transform: rotate(-10deg);
      animation-delay: 1.8s;
    }

    .beam--8 {
      height: 100px;
      background: linear-gradient(to bottom, transparent, #7000FF, transparent);
      top: 10%;
      right: 45%;
      transform: rotate(25deg);
      animation-delay: 2.1s;
    }

    @keyframes beamShoot {
      0% {
        opacity: 0;
        transform: translateY(-20px);
      }
      15% {
        opacity: 0.8;
      }
      100% {
        opacity: 0;
        transform: translateY(120px);
      }
    }

    /* Logo Container */
    .splash-logo-container {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* Frame wrapper */
    .splash-frame-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 220px;
      height: 60px;
    }

    /* Frame - draws itself */
    .splash-frame {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 0 15px rgba(0, 242, 255, 0.25));
    }

    .frame-rect {
      stroke-dasharray: 560;
      stroke-dashoffset: 560;
      animation: drawFrame 1.2s ease-out 0.3s forwards;
    }

    @keyframes drawFrame {
      to {
        stroke-dashoffset: 0;
      }
    }

    /* Content inside frame */
    .splash-content {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: 'DM Sans', sans-serif;
      font-size: 24px;
      font-weight: 600;
      opacity: 0;
      animation: fadeIn 0.6s ease-out 1s forwards;
    }

    .splash-text {
      color: #E6EDF3;
    }

    .splash-divider {
      color: #8B949E;
      font-weight: 300;
    }

    /* Title with gradient shimmer effect on text */
    .splash-title {
      margin-top: 18px;
      font-family: 'DM Sans', sans-serif;
      font-size: 28px;
      font-weight: 500;
      letter-spacing: 3px;
      opacity: 0;
      background: linear-gradient(
        90deg,
        #E6EDF3 0%,
        #E6EDF3 25%,
        #00F2FF 40%,
        #7000FF 50%,
        #00F2FF 60%,
        #E6EDF3 75%,
        #E6EDF3 100%
      );
      background-size: 300% 100%;
      background-position: 100% 0;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: 
        fadeIn 0.6s ease-out 1.4s forwards,
        textShimmer 2s ease-in-out 2s forwards;
    }

    @keyframes textShimmer {
      0% {
        background-position: 100% 0;
      }
      100% {
        background-position: -50% 0;
      }
    }

    @keyframes fadeIn {
      to {
        opacity: 1;
      }
    }

    /* Logo after splash */
    .logo {
      opacity: 0;
      transform: translateY(-10px);
      transition: opacity 0.4s ease, transform 0.4s ease;
    }

    .logo--visible {
      opacity: 1;
      transform: translateY(0);
    }

    .logo-svg {
      width: 200px;
      height: 100px;
    }

    /* Content fade-in after splash */
    .login-card-wrapper,
    .footer-text {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }

    .login-card-wrapper.content--visible {
      opacity: 1;
      transform: translateY(0);
      transition-delay: 0.1s;
    }

    .footer-text.content--visible {
      opacity: 1;
      transform: translateY(0);
      transition-delay: 0.3s;
    }

    /* Card with gradient border */
    .login-card-wrapper {
      position: relative;
      padding: 2px;
      border-radius: 20px;
      background: linear-gradient(135deg, #00F2FF 0%, #7000FF 50%, #00F2FF 100%);
      background-size: 200% 200%;
      animation: gradientShift 8s ease-in-out infinite;
    }

    @keyframes gradientShift {
      0%, 100% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
    }

    .login-card {
      background: var(--bg-surface);
      border-radius: 18px;
      padding: var(--spacing-xl);
    }

    .login-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-xs) 0;
    }

    .login-subtitle {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      margin: 0 0 var(--spacing-lg) 0;
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
      transition: color 0.3s ease;
      z-index: 1;
    }

    .input-wrapper:focus-within .input-icon {
      color: #00F2FF;
    }

    .input-wrapper .input {
      width: 100%;
      padding: 14px 48px;
      background: rgba(11, 14, 20, 0.6);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .input-wrapper .input::placeholder {
      color: var(--text-muted);
    }

    .input-wrapper .input:focus {
      outline: none;
      border-color: #00F2FF;
      box-shadow: 0 0 0 3px rgba(0, 242, 255, 0.15),
                  0 0 20px rgba(0, 242, 255, 0.1);
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
      transition: color 0.3s ease;
      z-index: 1;
    }

    .toggle-password:hover {
      color: #00F2FF;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background: rgba(255, 0, 85, 0.1);
      border: 1px solid rgba(255, 0, 85, 0.3);
      border-radius: 12px;
      color: #FF0055;
      font-size: var(--font-size-sm);
      margin-bottom: var(--spacing-md);
    }

    .submit-btn {
      width: 100%;
      margin-top: var(--spacing-md);
      padding: 14px 24px;
      background: linear-gradient(135deg, #00F2FF 0%, #7000FF 100%);
      border: none;
      border-radius: 12px;
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .submit-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s ease;
    }

    .submit-btn:hover::before {
      left: 100%;
    }

    .submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 242, 255, 0.3),
                  0 8px 25px rgba(112, 0, 255, 0.2);
    }

    .submit-btn:active {
      transform: translateY(0);
    }

    .submit-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
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
      margin-top: var(--spacing-xl);
    }

    .demo-divider {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-md);
    }

    .divider-line {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--border-color), transparent);
    }

    .divider-text {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .demo-accounts {
      display: flex;
      gap: var(--spacing-sm);
      justify-content: center;
      flex-wrap: wrap;
    }

    .demo-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: transparent;
      border: 1px solid;
      border-radius: 20px;
      font-size: var(--font-size-sm);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .demo-chip .material-icons-outlined {
      font-size: 16px;
    }

    .demo-chip--admin {
      border-color: rgba(255, 0, 85, 0.4);
      color: #FF0055;
    }

    .demo-chip--admin:hover {
      background: rgba(255, 0, 85, 0.1);
      box-shadow: 0 0 15px rgba(255, 0, 85, 0.2);
    }

    .demo-chip--dozent {
      border-color: rgba(112, 0, 255, 0.4);
      color: #a855f7;
    }

    .demo-chip--dozent:hover {
      background: rgba(112, 0, 255, 0.1);
      box-shadow: 0 0 15px rgba(112, 0, 255, 0.2);
    }

    .demo-chip--student {
      border-color: rgba(0, 242, 255, 0.4);
      color: #00F2FF;
    }

    .demo-chip--student:hover {
      background: rgba(0, 242, 255, 0.1);
      box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);
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
  showContent = false;

  constructor(private router: Router) {
    // Splash screen for 3 seconds
    setTimeout(() => {
      this.showContent = true;
    }, 3000);
  }

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

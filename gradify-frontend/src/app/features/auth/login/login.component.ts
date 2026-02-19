import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface DemoUser {
  username: string;
  password: string;
  label: string;
  rolle: string;
  passwordKnown: boolean;
}

interface DemoApiUser {
  username: string;
  rolle: string;
  label?: string;
  mandantId?: number | null;
}

/** API-Response: entweder Array (Legacy) oder { users, demoPassword } */
interface DemoLoginsApiResponse {
  users?: DemoApiUser[];
  demoPassword?: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page" (click)="skipSplash()">
      <!-- Persistent Light Beams - distributed around edges, avoiding center -->
      <div class="beams-container">
        <div class="beam beam--1"></div>
        <div class="beam beam--2"></div>
        <div class="beam beam--3"></div>
        <div class="beam beam--4"></div>
        <div class="beam beam--5"></div>
        <div class="beam beam--6"></div>
        <div class="beam beam--7"></div>
        <div class="beam beam--8"></div>
        <div class="beam beam--9"></div>
        <div class="beam beam--10"></div>
        <div class="beam beam--11"></div>
        <div class="beam beam--12"></div>
      </div>

      <div class="login-container animate-slide-up">
        <!-- Splash Overlay (fades out, click to skip) -->
        <div class="splash-overlay" [class.splash-overlay--hidden]="isTransitioning"
             [class.splash-overlay--skipped]="splashSkipped">
        </div>

        <!-- Logo (starts centered, slides up to final position) -->
        <div class="logo-wrapper" [class.logo-wrapper--skipped]="splashSkipped">
          <!-- Frame with gradient -->
          <div class="logo-frame-container">
            <svg class="logo-frame-svg" viewBox="0 0 200 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoFrameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="rgba(200, 210, 220, 0.85)"/>
                  <stop offset="30%" stop-color="rgba(180, 190, 200, 0.75)"/>
                  <stop offset="50%" stop-color="rgba(160, 170, 180, 0.7)"/>
                  <stop offset="70%" stop-color="rgba(180, 190, 200, 0.75)"/>
                  <stop offset="100%" stop-color="rgba(200, 210, 220, 0.85)"/>
                </linearGradient>
              </defs>
              <rect class="logo-frame-rect" x="2" y="2" width="196" height="48" rx="10" ry="10"
                    stroke="url(#logoFrameGrad)" stroke-width="2" fill="none"/>
            </svg>

            <!-- Version Numbers inside frame -->
            <div class="logo-content">
              <div class="version-group version-left">
                <span class="char char--1">1</span>
                <span class="char char--2">.</span>
                <span class="char char--3">0</span>
              </div>
              <div class="version-divider"></div>
              <div class="version-group version-right">
                <span class="char char--1">1</span>
                <span class="char char--2">.</span>
                <span class="char char--3">3</span>
              </div>
            </div>
          </div>

          <!-- Gradify Title -->
          <div class="logo-title">
            <span class="letter letter--1">G</span>
            <span class="letter letter--2">r</span>
            <span class="letter letter--3">a</span>
            <span class="letter letter--4">d</span>
            <span class="letter letter--5">i</span>
            <span class="letter letter--6">f</span>
            <span class="letter letter--7">y</span>
          </div>
        </div>

        <!-- Login Card with animated SVG frame (like logo) -->
        <div class="login-card-wrapper" [class.content--visible]="showContent">
          <!-- SVG Frame that draws around card (like logo frame) -->
          <svg class="card-frame-svg" viewBox="0 0 420 540" preserveAspectRatio="none" fill="none">
            <defs>
              <linearGradient id="cardFrameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="rgba(255,255,255,0.12)"/>
                <stop offset="50%" stop-color="rgba(255,255,255,0.08)"/>
                <stop offset="100%" stop-color="rgba(255,255,255,0.12)"/>
              </linearGradient>
            </defs>
            <rect class="card-frame-rect" x="1" y="1" width="418" height="538" rx="18" ry="18"
                  stroke="url(#cardFrameGrad)" stroke-width="2" fill="none" pathLength="100"/>
          </svg>

          <div class="login-card">
            <h2 class="login-title">Willkommen bei Gradify</h2>
            <p class="login-subtitle">Anmelden, um fortzufahren</p>

            <form (ngSubmit)="onLogin()" class="login-form">
              <!-- Username field with CSS animated frame -->
              <div class="form-group">
                <label for="username">Benutzername</label>
                <div class="input-wrapper" [class.input-wrapper--filled]="demoFilled">
                  <span class="input-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="iconGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#C8D2DC"/>
                          <stop offset="100%" stop-color="#94A3B8"/>
                        </linearGradient>
                      </defs>
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="url(#iconGrad1)"/>
                    </svg>
                  </span>
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

              <!-- Password field with CSS animated frame -->
              <div class="form-group">
                <label for="password">Passwort</label>
                <div class="input-wrapper" [class.input-wrapper--filled]="demoFilled">
                  <span class="input-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="iconGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#C8D2DC"/>
                          <stop offset="100%" stop-color="#94A3B8"/>
                        </linearGradient>
                      </defs>
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="url(#iconGrad2)"/>
                    </svg>
                  </span>
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path [attr.d]="hidePassword ?
                        'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z' :
                        'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z'"
                        fill="currentColor"/>
                    </svg>
                  </button>
                </div>
              </div>

              @if (errorMessage) {
                <div class="error-banner">
                  <span class="material-icons-outlined">error</span>
                  {{ errorMessage }}
                </div>
              }

              <!-- Submit button -->
              <button type="submit" class="submit-btn" [disabled]="isLoading">
                @if (isLoading) {
                  <span class="spinner"></span>
                } @else {
                  <span class="btn-text">Anmelden</span>
                  <svg class="btn-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <defs>
                      <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#E2E8F0"/>
                        <stop offset="100%" stop-color="#CBD5E1"/>
                      </linearGradient>
                    </defs>
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" fill="url(#arrowGrad)"/>
                  </svg>
                }
              </button>
            </form>

            <!-- Demo Accounts - Rollen-Buttons + Rollen-Dropdowns -->
            <div class="demo-info">
              <div class="demo-divider">
                <span class="divider-line"></span>
                <span class="divider-text">Demo-Zugänge</span>
                <span class="divider-line"></span>
              </div>
              <div class="demo-role-buttons">
                <button type="button" class="demo-role-btn demo-role-btn--admin" [class.active]="activeRole === 'ADMIN'" (click)="selectRole('ADMIN')" title="Admin">
                  <span class="material-icons-outlined">shield</span>
                </button>
                <button type="button" class="demo-role-btn demo-role-btn--hv" [class.active]="activeRole === 'HOCHSCHUL_VERWALTER'" (click)="selectRole('HOCHSCHUL_VERWALTER')" title="Hochschul-Verwalter">
                  <span class="material-icons-outlined">account_balance</span>
                </button>
                <button type="button" class="demo-role-btn demo-role-btn--pa" [class.active]="activeRole === 'PRUEFUNGSAMT'" (click)="selectRole('PRUEFUNGSAMT')" title="Prüfungsamt">
                  <span class="material-icons-outlined">description</span>
                </button>
                <button type="button" class="demo-role-btn demo-role-btn--dozent" [class.active]="activeRole === 'LEHRENDER'" (click)="selectRole('LEHRENDER')" title="Dozent">
                  <span class="material-icons-outlined">school</span>
                </button>
                <button type="button" class="demo-role-btn demo-role-btn--student" [class.active]="activeRole === 'STUDENT'" (click)="selectRole('STUDENT')" title="Student">
                  <span class="material-icons-outlined">person</span>
                </button>
              </div>
              @if (activeRole) {
                <button type="button" class="demo-picker-trigger" (click)="toggleDemoPicker()">
                  <span class="demo-picker-trigger__text">{{ selectedDemoUserLabel || '- Nutzer wählen -' }}</span>
                  <span class="demo-picker-trigger__meta">{{ usersForActiveRole.length }} verfügbar</span>
                  <span class="material-icons-outlined demo-picker-trigger__icon">expand_more</span>
                </button>
                @if (demoPasswordHint) {
                  <p class="demo-hint">{{ demoPasswordHint }}</p>
                }
              }
            </div>
          </div>
        </div>

        <p class="footer-text" [class.content--visible]="showContent">© 2026 Gradify · Hochschulnotenverwaltung</p>
      </div>

      <!-- Demo-Picker Modal (Root-Level, immer über allem) -->
      @if (showDemoPicker) {
        <div class="demo-picker-overlay" (click)="closeDemoPicker()">
          <div class="demo-picker-modal" (click)="$event.stopPropagation()">
            <div class="demo-picker-modal__header">
              <h3>Demo-Nutzer wählen</h3>
              <button type="button" class="demo-picker-close" (click)="closeDemoPicker()" aria-label="Schließen">
                <span class="material-icons-outlined">close</span>
              </button>
            </div>
            <input
              class="demo-picker-search"
              type="text"
              [(ngModel)]="demoSearch"
              name="demoSearch"
              placeholder="Suche nach Name oder Benutzername">
            <div class="demo-picker-table-wrap">
              <table class="demo-picker-table">
                <thead>
                  <tr>
                    <th>Benutzername</th>
                    <th>Name / Rolle</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of filteredUsersForActiveRole; track u.username) {
                    <tr (click)="selectDemoUserFromPicker(u.username)" [class.active]="u.username === selectedDemoUser">
                      <td>{{ u.username }}</td>
                      <td>{{ u.label }}</td>
                    </tr>
                  }
                </tbody>
              </table>
              @if (filteredUsersForActiveRole.length === 0) {
                <p class="demo-picker-empty">Keine Nutzer für diese Suche gefunden.</p>
              }
            </div>
          </div>
        </div>
      }
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


    .login-container {
      width: 100%;
      max-width: 420px;
      text-align: center;
      position: relative;
      z-index: 1;
    }

    /* Splash Overlay (effects only, fades out) */
    .splash-overlay {
      position: fixed;
      inset: 0;
      background: var(--bg-deep);
      z-index: 999;
      transition: opacity 0.8s ease, visibility 0.8s ease;
      overflow: hidden;
      pointer-events: none;
      cursor: pointer;
    }

    .splash-overlay--hidden {
      opacity: 0;
      visibility: hidden;
    }

    .splash-overlay--skipped {
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }

    /* Logo Wrapper - slides from center to top position */
    .logo-wrapper {
      position: absolute;
      left: 50%;
      z-index: 1001;
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: logoSlideUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) 2.8s forwards;
      /* Start centered */
      top: 50%;
      transform: translate(-50%, -50%);
    }

    .logo-wrapper--skipped {
      animation: none;
      top: 5px;
      transform: translate(-50%, 0) scale(0.75);
    }

    @keyframes logoSlideUp {
      0% {
        top: 50%;
        transform: translate(-50%, -50%) scale(1);
      }
      100% {
        top: 5px;
        transform: translate(-50%, 0) scale(0.75);
      }
    }

    /* Logo Frame Container */
    .logo-frame-container {
      position: relative;
      width: 200px;
      height: 52px;
    }

    .logo-frame-svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 0 8px rgba(200, 210, 220, 0.15));
    }

    .logo-frame-rect {
      stroke-dasharray: 500;
      stroke-dashoffset: 500;
      animation: drawLogoFrame 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.5s forwards;
    }

    @keyframes drawLogoFrame {
      to {
        stroke-dashoffset: 0;
      }
    }

    .logo-content {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      align-items: center;
      font-family: 'DM Sans', sans-serif;
      font-size: 24px;
      font-weight: 600;
      color: #E6EDF3;
    }

    /* Beams Container - persistent background effect */
    .beams-container {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }

    /* Light Beams - like original, distributed around edges */
    .beam {
      position: absolute;
      width: 2px;
      opacity: 0;
      animation: beamShoot 2.5s ease-out infinite;
    }

    /* Top left area */
    .beam--1 {
      height: 120px;
      background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.15), transparent);
      top: 8%;
      left: 8%;
      transform: rotate(-25deg);
      animation-delay: 0s;
    }

    .beam--2 {
      height: 90px;
      background: linear-gradient(to bottom, transparent, rgba(200, 210, 220, 0.12), transparent);
      top: 15%;
      left: 18%;
      transform: rotate(-15deg);
      animation-delay: 0.4s;
    }

    /* Top right area */
    .beam--3 {
      height: 110px;
      background: linear-gradient(to bottom, transparent, rgba(200, 210, 220, 0.12), transparent);
      top: 5%;
      right: 10%;
      transform: rotate(20deg);
      animation-delay: 0.2s;
    }

    .beam--4 {
      height: 100px;
      background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.15), transparent);
      top: 12%;
      right: 20%;
      transform: rotate(30deg);
      animation-delay: 0.6s;
    }

    /* Left side (avoiding center) */
    .beam--5 {
      height: 80px;
      background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.12), rgba(200, 210, 220, 0.08), transparent);
      top: 35%;
      left: 5%;
      transform: rotate(-20deg);
      animation-delay: 0.8s;
    }

    .beam--6 {
      height: 70px;
      background: linear-gradient(to bottom, transparent, rgba(200, 210, 220, 0.1), transparent);
      top: 65%;
      left: 6%;
      transform: rotate(-10deg);
      animation-delay: 1.4s;
    }

    /* Right side (avoiding center) */
    .beam--7 {
      height: 85px;
      background: linear-gradient(to bottom, transparent, rgba(200, 210, 220, 0.1), rgba(255, 255, 255, 0.12), transparent);
      top: 30%;
      right: 4%;
      transform: rotate(15deg);
      animation-delay: 1.0s;
    }

    .beam--8 {
      height: 75px;
      background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.12), transparent);
      top: 60%;
      right: 7%;
      transform: rotate(25deg);
      animation-delay: 1.6s;
    }

    /* Bottom corners */
    .beam--9 {
      height: 95px;
      background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.12), transparent);
      bottom: 15%;
      left: 12%;
      transform: rotate(-30deg);
      animation-delay: 1.2s;
    }

    .beam--10 {
      height: 85px;
      background: linear-gradient(to bottom, transparent, rgba(200, 210, 220, 0.1), transparent);
      bottom: 10%;
      right: 15%;
      transform: rotate(35deg);
      animation-delay: 1.8s;
    }

    .beam--11 {
      height: 65px;
      background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.1), transparent);
      bottom: 25%;
      left: 3%;
      transform: rotate(-35deg);
      animation-delay: 2.0s;
    }

    .beam--12 {
      height: 70px;
      background: linear-gradient(to bottom, transparent, rgba(200, 210, 220, 0.08), transparent);
      bottom: 20%;
      right: 5%;
      transform: rotate(40deg);
      animation-delay: 2.2s;
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

    /* Version group inside logo frame */
    .version-group {
      display: flex;
    }

    /* Individual characters with staggered animation */
    .char {
      opacity: 0;
      transform: translateY(6px);
      display: inline-block;
    }

    /* Left side: 1 . 0 */
    .version-left .char--1 {
      animation: charReveal 0.25s cubic-bezier(0.4, 0, 0.2, 1) 0.7s forwards;
    }
    .version-left .char--2 {
      animation: charReveal 0.25s cubic-bezier(0.4, 0, 0.2, 1) 0.82s forwards;
    }
    .version-left .char--3 {
      animation: charReveal 0.25s cubic-bezier(0.4, 0, 0.2, 1) 0.94s forwards;
    }

    /* Right side: 1 . 3 (synchronized with left) */
    .version-right .char--1 {
      animation: charReveal 0.25s cubic-bezier(0.4, 0, 0.2, 1) 0.7s forwards;
    }
    .version-right .char--2 {
      animation: charReveal 0.25s cubic-bezier(0.4, 0, 0.2, 1) 0.82s forwards;
    }
    .version-right .char--3 {
      animation: charReveal 0.25s cubic-bezier(0.4, 0, 0.2, 1) 0.94s forwards;
    }

    @keyframes charReveal {
      0% {
        opacity: 0;
        transform: translateY(6px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Divider line - draws from bottom to top */
    .version-divider {
      width: 2px;
      height: 0;
      background: linear-gradient(to top, transparent, #8B949E 20%, #8B949E 80%, transparent);
      margin: 0 12px;
      animation: drawDivider 0.35s cubic-bezier(0.4, 0, 0.2, 1) 1.05s forwards;
    }

    @keyframes drawDivider {
      0% {
        height: 0;
      }
      100% {
        height: 28px;
      }
    }

    /* Logo Title - letter by letter */
    .logo-title {
      margin-top: 12px;
      display: flex;
      font-family: 'DM Sans', sans-serif;
      font-size: 24px;
      font-weight: 500;
      letter-spacing: 3px;
      transition: all 0.5s ease;
      transform: translateY(-4px);
    }

    /* Individual letters */
    .letter {
      opacity: 0;
      transform: translateX(-6px);
      display: inline-block;
      background: rgba(200, 210, 220, 1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Staggered letter appearance with subtle fade to white */
    .letter--1 { animation: letterReveal 0.3s cubic-bezier(0.4, 0, 0.2, 1) 1.2s forwards, letterToWhite 1.2s ease-out 1.5s forwards; }
    .letter--2 { animation: letterReveal 0.3s cubic-bezier(0.4, 0, 0.2, 1) 1.27s forwards, letterToWhite 1.2s ease-out 1.52s forwards; }
    .letter--3 { animation: letterReveal 0.3s cubic-bezier(0.4, 0, 0.2, 1) 1.34s forwards, letterToWhite 1.2s ease-out 1.54s forwards; }
    .letter--4 { animation: letterReveal 0.3s cubic-bezier(0.4, 0, 0.2, 1) 1.41s forwards, letterToWhite 1.2s ease-out 1.56s forwards; }
    .letter--5 { animation: letterReveal 0.3s cubic-bezier(0.4, 0, 0.2, 1) 1.48s forwards, letterToWhite 1.2s ease-out 1.58s forwards; }
    .letter--6 { animation: letterReveal 0.3s cubic-bezier(0.4, 0, 0.2, 1) 1.55s forwards, letterToWhite 1.2s ease-out 1.6s forwards; }
    .letter--7 { animation: letterReveal 0.3s cubic-bezier(0.4, 0, 0.2, 1) 1.62s forwards, letterToWhite 1.2s ease-out 1.62s forwards; }

    @keyframes letterReveal {
      0% {
        opacity: 0;
        transform: translateX(-6px);
      }
      100% {
        opacity: 1;
        transform: translateX(0);
      }
    }

    /* Very subtle fade from light blue to white */
    @keyframes letterToWhite {
      0% {
        background: rgba(200, 210, 220, 1);
        -webkit-background-clip: text;
        background-clip: text;
      }
      100% {
        background: #E6EDF3;
        -webkit-background-clip: text;
        background-clip: text;
      }
    }

    @keyframes fadeIn {
      to {
        opacity: 1;
      }
    }

    /* Login Card Wrapper - appears after logo animation */
    .login-card-wrapper {
      position: relative;
      opacity: 0;
      margin-top: 120px;
      border-radius: 20px;
    }

    .login-card-wrapper.content--visible {
      opacity: 1;
    }

    /* Card frame SVG - draws like logo frame */
    .card-frame-svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
      filter: drop-shadow(0 0 6px rgba(0, 0, 0, 0.3));
      opacity: 0;
    }

    .card-frame-rect {
      stroke-dasharray: 100;
      stroke-dashoffset: 100;
    }

    .content--visible .card-frame-svg {
      opacity: 1;
    }

    .content--visible .card-frame-rect {
      animation: drawCardFrame 1.0s cubic-bezier(0.4, 0, 0.2, 1) 0.8s forwards;
    }

    @keyframes drawCardFrame {
      to {
        stroke-dashoffset: 0;
      }
    }

    .footer-text {
      opacity: 0;
    }

    .footer-text.content--visible {
      animation: fadeInContent 0.4s ease 2.5s forwards;
    }

    /* Login Card – dunkler Innenbereich */
    .login-card {
      background: var(--bg-deep);
      border-radius: 18px;
      padding: var(--spacing-xl);
      position: relative;
      z-index: 2;
      opacity: 0;
      border: 1px solid var(--border-color);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .content--visible .login-card {
      animation: fadeInContent 0.4s ease 2.0s forwards;
    }

    @keyframes fadeInContent {
      to {
        opacity: 1;
      }
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
      opacity: 0;
    }

    .content--visible .form-group label {
      animation: fadeInContent 0.4s ease 2.0s forwards;
    }

    /* Input Wrapper – dunkel, klare Kante */
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      padding: 0 14px;
      height: 52px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      opacity: 0;
    }

    .input-wrapper:focus-within {
      border-color: rgba(200, 210, 220, 0.35);
      box-shadow: 0 0 0 3px rgba(200, 210, 220, 0.06), 0 0 12px rgba(200, 210, 220, 0.04);
    }

    .input-wrapper--filled {
      border-color: rgba(34, 197, 94, 0.4);
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.08), 0 0 16px rgba(34, 197, 94, 0.06);
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
    }

    /* Animated border for inputs (dezent, Theme-Farben) */
    .input-wrapper::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 8px;
      padding: 1px;
      background: linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06), rgba(255,255,255,0.12));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0;
      clip-path: inset(0 100% 0 0);
      pointer-events: none;
      z-index: -1;
    }

    .content--visible .input-wrapper {
      animation: fadeInContent 0.4s ease 2.0s forwards;
    }

    .content--visible .input-wrapper::before {
      opacity: 1;
      clip-path: inset(0 0 0 0);
      transition: clip-path 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes drawBorderInput {
      0% {
        clip-path: inset(0 100% 0 0);
        opacity: 1;
      }
      100% {
        clip-path: inset(0 0 0 0);
        opacity: 1;
      }
    }

    .input-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 10px;
      flex-shrink: 0;
    }

    .input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: 1rem;
      outline: none;
      padding-left: 0;
      box-shadow: none;
    }

    .input:focus {
      outline: none;
      border: none;
      box-shadow: none;
    }

    .input::placeholder {
      color: var(--text-muted);
    }


    .toggle-password {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s ease;
      margin-left: 8px;
      color: var(--text-muted);
    }

    .toggle-password:hover {
      opacity: 0.8;
      color: var(--text-secondary);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background: rgba(var(--color-danger-rgb), 0.12);
      border: 1px solid rgba(var(--color-danger-rgb), 0.35);
      border-radius: 8px;
      color: var(--color-danger);
      font-size: var(--font-size-sm);
      margin-bottom: var(--spacing-md);
    }

    /* Submit Button – dunkel, klare Kante */
    .submit-btn {
      position: relative;
      width: 100%;
      height: 52px;
      margin-top: var(--spacing-lg);
      padding: 0 28px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
      opacity: 0;
    }

    .submit-btn::before {
      display: none;
    }

    .content--visible .submit-btn {
      animation: fadeInContent 0.4s ease 2.0s forwards;
    }

    .submit-btn:hover {
      background: var(--bg-hover);
      border-color: rgba(200, 210, 220, 0.3);
      box-shadow: 0 0 0 2px rgba(200, 210, 220, 0.05), 0 0 12px rgba(200, 210, 220, 0.04);
    }

    .submit-btn:active {
      background: var(--bg-surface);
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-text {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .btn-arrow {
      flex-shrink: 0;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-top-color: rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Demo Info - fades in after frames */
    .demo-info {
      margin-top: var(--spacing-xl);
      opacity: 0;
    }

    .content--visible .demo-info {
      animation: fadeInContent 0.4s ease 2.1s forwards;
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

    .demo-role-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin-bottom: var(--spacing-md);
    }

    .demo-role-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      padding: 0;
      background: var(--bg-elevated);
      border: 1.5px solid var(--border-color);
      border-radius: 10px;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.15s;
    }

    .demo-role-btn .material-icons-outlined {
      font-size: 20px;
    }

    .demo-role-btn:hover {
      transform: translateY(-1px);
      border-width: 2px;
    }

    .demo-role-btn.active {
      border-width: 2px;
      transform: translateY(-1px);
    }

    .demo-role-btn--admin { color: #dc2626; }
    .demo-role-btn--admin:hover, .demo-role-btn--admin.active { border-color: #b91c1c; background: rgba(127, 29, 29, 0.5); box-shadow: 0 0 12px rgba(220, 38, 38, 0.15); }

    .demo-role-btn--hv { color: #16a34a; }
    .demo-role-btn--hv:hover, .demo-role-btn--hv.active { border-color: #15803d; background: rgba(20, 83, 45, 0.5); box-shadow: 0 0 12px rgba(22, 163, 74, 0.15); }

    .demo-role-btn--pa { color: #ca8a04; }
    .demo-role-btn--pa:hover, .demo-role-btn--pa.active { border-color: #a16207; background: rgba(113, 63, 18, 0.5); box-shadow: 0 0 12px rgba(202, 138, 4, 0.15); }

    .demo-role-btn--dozent { color: #9333ea; }
    .demo-role-btn--dozent:hover, .demo-role-btn--dozent.active { border-color: #7e22ce; background: rgba(88, 28, 135, 0.5); box-shadow: 0 0 12px rgba(147, 51, 234, 0.15); }

    .demo-role-btn--student { color: #2563eb; }
    .demo-role-btn--student:hover, .demo-role-btn--student.active { border-color: #1d4ed8; background: rgba(29, 78, 216, 0.35); box-shadow: 0 0 12px rgba(37, 99, 235, 0.15); }

    .demo-picker-trigger {
      width: 100%;
      max-width: 320px;
      margin: 0 auto;
      min-height: 48px;
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      color: var(--text-primary);
      cursor: pointer;
      outline: none;
      text-align: left;
      transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
    }

    .demo-picker-trigger:hover {
      border-color: var(--border-color-light);
      background: var(--bg-hover);
    }

    .demo-picker-trigger:focus {
      border-color: var(--border-color-light);
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.04);
    }

    .demo-picker-trigger__text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .demo-picker-trigger__meta {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      white-space: nowrap;
    }

    .demo-picker-trigger__icon {
      font-size: 18px;
      color: var(--text-muted);
    }

    .demo-picker-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-lg);
    }

    .demo-picker-modal {
      width: min(640px, calc(100vw - 48px));
      max-height: min(70vh, 560px);
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .demo-picker-modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md) var(--spacing-lg);
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-elevated);
    }

    .demo-picker-modal__header h3 {
      margin: 0;
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--text-primary);
    }

    .demo-picker-close {
      background: var(--bg-hover);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
    }

    .demo-picker-close:hover {
      color: var(--text-primary);
      border-color: var(--border-color-light);
      background: var(--bg-surface);
    }

    .demo-picker-search {
      margin: var(--spacing-md) var(--spacing-lg);
      padding: 10px 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      background: var(--bg-deep);
      color: var(--text-primary);
      font-family: var(--font-family);
      font-size: var(--font-size-sm);
      outline: none;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }

    .demo-picker-search::placeholder {
      color: var(--text-muted);
    }

    .demo-picker-search:focus {
      border-color: var(--border-color-light);
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.06);
    }

    .demo-picker-table-wrap {
      overflow: auto;
      padding: 0 var(--spacing-lg) var(--spacing-lg);
    }

    .demo-picker-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-sm);
    }

    .demo-picker-table th,
    .demo-picker-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
      text-align: left;
      vertical-align: middle;
    }

    .demo-picker-table th {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      position: sticky;
      top: 0;
      background: var(--bg-elevated);
      z-index: 1;
    }

    .demo-picker-table tbody tr {
      cursor: pointer;
      transition: background-color var(--transition-fast);
    }

    .demo-picker-table tbody tr:hover {
      background: var(--bg-hover);
    }

    .demo-picker-table tbody tr.active {
      background: rgba(var(--color-primary-rgb), 0.08);
    }

    .demo-picker-empty {
      margin: var(--spacing-md) 0 0;
      padding: var(--spacing-md);
      color: var(--text-muted);
      font-size: var(--font-size-sm);
      text-align: center;
    }

    .demo-hint {
      margin: 8px auto 0;
      max-width: 320px;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      text-align: left;
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

      .demo-role-buttons {
        gap: 8px;
      }

      .demo-role-btn {
        width: 38px;
        height: 38px;
      }

      .demo-role-btn .material-icons-outlined {
        font-size: 18px;
      }

      .demo-picker-trigger {
        grid-template-columns: 1fr auto;
      }

      .demo-picker-trigger__meta {
        display: none;
      }

      .demo-picker-modal {
        width: calc(100vw - 16px);
        max-height: 75vh;
      }

      .demo-picker-table th,
      .demo-picker-table td {
        padding: 9px 8px;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  username = '';
  password = '';
  hidePassword = true;
  isLoading = false;
  errorMessage = '';
  showContent = false;
  isTransitioning = false;
  splashSkipped = false;
  demoFilled = false;
  activeRole: string | null = null;
  demoUsers: DemoUser[] = [];
  selectedDemoUser = '';
  demoPasswordHint = '';
  showDemoPicker = false;
  demoSearch = '';
  private splashTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Animation sequence timing:
    // 0.5s: Frame draws around 1.0 | 1.3
    // 0.7s: Chars appear (1, ., 0 and 1, ., 3)
    // 1.05s: Divider line draws
    // 1.2s: Gradify letters start appearing
    // 1.5s: Subtle fade to white (1.2s duration)
    // 2.8s: Logo slides up, splash fades, login appears

    this.splashTimer = setTimeout(() => {
      this.isTransitioning = true;
      this.showContent = true;
      this.splashTimer = null;
    }, 2800);
  }

  skipSplash(): void {
    if (this.showContent) return; // Already shown
    if (this.splashTimer) {
      clearTimeout(this.splashTimer);
      this.splashTimer = null;
    }
    this.splashSkipped = true;
    this.isTransitioning = true;
    this.showContent = true;
  }

  ngOnInit(): void {
    this.loadDemoUsers();
  }

  /** Fallback-Passwort falls API keine demoPassword liefert */
  private static readonly DEMO_PASSWORD_FALLBACK = 'web00100113!';

  private loadDemoUsers(): void {
    this.http.get<{ success: boolean; data?: DemoApiUser[] | DemoLoginsApiResponse }>('/api/users/demo-logins').subscribe({
      next: (res) => {
        const raw = res?.data;
        let apiUsers: DemoApiUser[];
        let demoPassword: string;

        if (Array.isArray(raw)) {
          apiUsers = raw;
          demoPassword = LoginComponent.DEMO_PASSWORD_FALLBACK;
        } else if (raw && typeof raw === 'object' && Array.isArray(raw.users)) {
          apiUsers = raw.users;
          demoPassword = (raw.demoPassword ?? '').trim() || LoginComponent.DEMO_PASSWORD_FALLBACK;
        } else {
          this.loadDemoUsersFromCsv();
          return;
        }

        if (apiUsers.length === 0) {
          this.loadDemoUsersFromCsv();
          return;
        }

        this.demoUsers = apiUsers.map((u) => ({
          username: u.username,
          password: demoPassword,
          label: (u.label?.trim() || `${u.username} (${u.rolle})`),
          rolle: (u.rolle || '').trim(),
          passwordKnown: true
        }));
      },
      error: () => this.loadDemoUsersFromCsv()
    });
  }

  private loadDemoUsersFromCsv(): void {
    this.http.get('assets/demo-zugaenge.csv', { responseType: 'text' }).subscribe({
      next: (csv) => this.parseDemoCsv(csv),
      error: () => this.demoUsers = []
    });
  }

  private parseDemoCsv(csv: string): void {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return;
    const users: DemoUser[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';');
      if (cols.length >= 4) {
        const rolle = (cols[2] || '').trim();
        const vorname = cols[3] || '';
        const nachname = cols[4] || '';
        const studiengang = cols[6] || '';
        const label = studiengang
          ? `${vorname} ${nachname} (${rolle}) – ${studiengang}`
          : `${vorname} ${nachname} (${rolle})`;
        users.push({
          username: cols[0].trim(),
          password: cols[1].trim(),
          label: label.trim(),
          rolle,
          passwordKnown: true
        });
      }
    }
    this.demoUsers = users;
  }

  onDemoUserSelect(username: string): void {
    const u = this.demoUsers.find(x => x.username === username);
    if (u) {
      this.selectedDemoUser = username;
      this.username = u.username;
      this.errorMessage = '';
      this.demoPasswordHint = '';

      // Visual feedback: green glow on inputs
      this.demoFilled = true;
      setTimeout(() => this.demoFilled = false, 600);

      if (u.passwordKnown) {
        this.password = u.password;
        // Auto-login after short delay so user sees the filled fields
        setTimeout(() => {
          if (this.username && this.password && !this.isLoading) {
            this.onLogin();
          }
        }, 400);
      } else {
        this.password = '';
        this.demoPasswordHint = 'Passwort manuell eingeben (wird aus Sicherheitsgruenden nicht angezeigt).';
      }
    }
  }

  get usersForActiveRole(): DemoUser[] {
    if (!this.activeRole) return [];
    return this.demoUsers.filter(u => u.rolle === this.activeRole);
  }

  get filteredUsersForActiveRole(): DemoUser[] {
    const users = this.usersForActiveRole;
    const term = this.demoSearch.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u =>
      u.username.toLowerCase().includes(term) ||
      u.label.toLowerCase().includes(term)
    );
  }

  get selectedDemoUserLabel(): string {
    if (!this.selectedDemoUser) return '';
    return this.demoUsers.find(u => u.username === this.selectedDemoUser)?.label ?? this.selectedDemoUser;
  }

  toggleDemoPicker(): void {
    if (!this.activeRole) return;
    this.showDemoPicker = !this.showDemoPicker;
    if (this.showDemoPicker) {
      this.demoSearch = '';
    }
  }

  closeDemoPicker(): void {
    this.showDemoPicker = false;
  }

  selectDemoUserFromPicker(username: string): void {
    this.selectedDemoUser = username;
    this.onDemoUserSelect(username);
    this.closeDemoPicker();
  }

  selectRole(rolle: string): void {
    this.activeRole = this.activeRole === rolle ? null : rolle;
    this.selectedDemoUser = '';
    this.demoPasswordHint = '';
    this.demoSearch = '';
    this.showDemoPicker = false;
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

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.isLoading = false;
        // Redirect basierend auf Rolle
        const user = this.authService.currentUser();
        const role = user?.roles[0];
        
        switch (role) {
          case 'ROLE_ADMIN':
            this.router.navigate(['/admin']);
            break;
          case 'ROLE_HOCHSCHUL_VERWALTER':
            this.router.navigate(['/admin/mandanten']);
            break;
          case 'ROLE_LEHRENDER':
            this.router.navigate(['/dashboard']);
            break;
          case 'ROLE_PRUEFUNGSAMT':
            this.router.navigate(['/students']);
            break;
          case 'ROLE_STUDENT':
            this.router.navigate(['/dashboard']);
            break;
          default:
            this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.errorMessage = 'Benutzername oder Passwort falsch';
        } else {
          this.errorMessage = 'Login fehlgeschlagen. Bitte versuchen Sie es erneut.';
        }
        console.error('Login error:', err);
      }
    });
  }
}

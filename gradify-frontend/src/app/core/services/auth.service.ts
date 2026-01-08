import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    vorname: string;
    nachname: string;
    roles: string[];
  };
}

interface LoginRequest {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = '/api/auth';
  
  isAuthenticated = signal(false);
  currentUser = signal<LoginResponse['user'] | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Check for existing token on init
    const token = localStorage.getItem('access_token');
    if (token) {
      this.isAuthenticated.set(true);
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.accessToken);
        localStorage.setItem('refresh_token', response.refreshToken);
        this.isAuthenticated.set(true);
        this.currentUser.set(response.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<{ accessToken: string; expiresIn: number }> {
    const refreshToken = localStorage.getItem('refresh_token');
    return this.http.post<{ accessToken: string; expiresIn: number }>(
      `${this.API_URL}/refresh`,
      { refreshToken }
    ).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.accessToken);
      })
    );
  }
}





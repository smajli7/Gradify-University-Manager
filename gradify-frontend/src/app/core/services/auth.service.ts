import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface UserInfo {
  id: string;
  username: string;
  vorname: string;
  nachname: string;
  roles: string[];
  studentId?: string; // Falls der User ein Student ist
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserInfo;
}

type LoginResponse = ApiResponse<LoginResponseData>;

interface LoginRequest {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = '/api/auth';
  private readonly USER_STORAGE_KEY = 'current_user';
  
  isAuthenticated = signal(false);
  currentUser = signal<UserInfo | null>(null);

  // Computed properties for easy access
  userFullName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.vorname} ${user.nachname}` : '';
  });

  userRole = computed(() => {
    const user = this.currentUser();
    if (!user || !user.roles.length) return '';
    // Return primary role without ROLE_ prefix
    return user.roles[0].replace('ROLE_', '');
  });

  isStudent = computed(() => {
    const user = this.currentUser();
    return user?.roles.includes('ROLE_STUDENT') ?? false;
  });

  isAdmin = computed(() => {
    const user = this.currentUser();
    return user?.roles.includes('ROLE_ADMIN') ?? false;
  });

  isDozent = computed(() => {
    const user = this.currentUser();
    return user?.roles.includes('ROLE_LEHRENDER') ?? false;
  });

  isPruefungsamt = computed(() => {
    const user = this.currentUser();
    return user?.roles.includes('ROLE_PRUEFUNGSAMT') ?? false;
  });

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem(this.USER_STORAGE_KEY);
    
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser) as UserInfo;
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      } catch {
        this.clearStorage();
      }
    }
  }

  private clearStorage(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem(this.USER_STORAGE_KEY);
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => {
        if (response && response.success && response.data) {
          const { accessToken, refreshToken, user } = response.data;
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
          localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
          this.isAuthenticated.set(true);
          this.currentUser.set(user);
        } else {
          console.error('Invalid login response structure:', response);
          throw new Error('Ungültige Antwort vom Server');
        }
      })
    );
  }

  logout(): void {
    this.clearStorage();
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

  hasRole(role: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    const normalizedRole = role.startsWith('ROLE_') ? role : `ROLE_${role}`;
    return user.roles.includes(normalizedRole);
  }

  // Get the student ID for the current user (for filtering data)
  getStudentId(): string | null {
    const user = this.currentUser();
    if (!user || !this.isStudent()) return null;
    return user.studentId || user.id; // studentId if available, otherwise user.id
  }
}





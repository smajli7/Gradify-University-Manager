import { Routes } from '@angular/router';

export const routes: Routes = [
  // Public Routes (ohne Shell)
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent)
  },

  // Protected Routes (mit Shell)
  {
    path: '',
    loadComponent: () => import('./shared/components/shell/shell.component')
      .then(m => m.ShellComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'students',
        loadComponent: () => import('./features/students/students.component')
          .then(m => m.StudentsComponent)
      },
      {
        path: 'grades',
        loadComponent: () => import('./features/grades/grades.component')
          .then(m => m.GradesComponent)
      },
      {
        path: 'grades/validation',
        loadComponent: () => import('./features/grades/validation/validation.component')
          .then(m => m.ValidationComponent)
      },
      {
        path: 'calculation',
        loadComponent: () => import('./features/calculation/calculation.component')
          .then(m => m.CalculationComponent)
      },
      {
        path: 'stats',
        loadComponent: () => import('./features/stats/stats.component')
          .then(m => m.StatsComponent)
      },
      {
        path: 'progress',
        loadComponent: () => import('./features/progress/progress.component')
          .then(m => m.ProgressComponent)
      },
      {
        path: 'admin',
        loadComponent: () => import('./features/admin/admin.component')
          .then(m => m.AdminComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component')
          .then(m => m.ProfileComponent)
      }
    ]
  },

  // Fallback
  {
    path: '**',
    redirectTo: 'login'
  }
];

import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { adminOrHochschulGuard } from './core/guards/admin-or-hochschul-guard';
import { assignmentsGuard } from './core/guards/assignments.guard';
import { authGuard, authGuardChild, authGuardMatch } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleRedirectGuard } from './core/guards/role-redirect.guard';
import { studyPlanGuard } from './core/guards/study-plan.guard';

export const routes: Routes = [
  // Public Routes (ohne Shell)
  {
    path: 'login',
    canMatch: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent)
  },

  // Protected Routes (mit Shell)
  {
    path: '',
    canMatch: [authGuardMatch],
    canActivate: [authGuard],
    canActivateChild: [authGuardChild],
    loadComponent: () => import('./shared/components/shell/shell.component')
      .then(m => m.ShellComponent),
    children: [
      {
        path: '',
        canActivate: [roleRedirectGuard],
        children: []
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
        path: 'grades/audit',
        loadComponent: () => import('./features/grades/audit/audit.component')
          .then(m => m.AuditComponent)
      },
      {
        path: 'grades/entry',
        loadComponent: () => import('./features/grades/entry/grade-entry.component')
          .then(m => m.GradeEntryComponent)
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
        path: 'study-plan',
        canActivate: [studyPlanGuard],
        loadComponent: () => import('./features/study-plan/study-plan.component')
          .then(m => m.StudyPlanComponent)
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/admin.component')
          .then(m => m.AdminComponent)
      },
      {
        path: 'admin/mandanten',
        canActivate: [adminOrHochschulGuard],
        loadComponent: () => import('./features/admin/mandanten/mandanten.component')
          .then(m => m.MandantenComponent)
      },
      {
        path: 'admin/users',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/users/users-admin.component')
          .then(m => m.UsersAdminComponent)
      },
      {
        path: 'admin/assignments',
        canActivate: [assignmentsGuard],
        loadComponent: () => import('./features/admin/assignments/assignments.component')
          .then(m => m.AssignmentsComponent)
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

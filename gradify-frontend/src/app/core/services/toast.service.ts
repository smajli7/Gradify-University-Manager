import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly defaultDuration = 4000;

  constructor(private snackBar: MatSnackBar) {}

  success(message: string, duration = this.defaultDuration): void {
    this.open(message, 'success', duration);
  }

  error(message: string, duration = 5000): void {
    this.open(message, 'error', duration);
  }

  warning(message: string, duration = this.defaultDuration): void {
    this.open(message, 'warning', duration);
  }

  info(message: string, duration = this.defaultDuration): void {
    this.open(message, 'info', duration);
  }

  private open(message: string, type: ToastType, duration: number): void {
    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: ['gradify-toast', `gradify-toast--${type}`],
    };
    this.snackBar.open(message, undefined, config);
  }
}

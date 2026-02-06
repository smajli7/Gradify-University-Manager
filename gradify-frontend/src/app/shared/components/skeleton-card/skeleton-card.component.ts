import { Component, Input } from '@angular/core';
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [NgxSkeletonLoaderComponent],
  template: `
    <div class="skeleton-card card">
      <div class="skeleton-card-header">
        <ngx-skeleton-loader count="1" appearance="line" animation="progress" />
        <ngx-skeleton-loader count="1" appearance="line" animation="progress" />
      </div>
      <div class="skeleton-card-body">
        @for (i of lineCount; track i) {
          <ngx-skeleton-loader count="1" appearance="line" animation="progress" />
        }
      </div>
    </div>
  `,
  styles: [`
    .skeleton-card {
      min-height: 200px;
    }

    .skeleton-card-header ::ng-deep ngx-skeleton-loader:first-child {
      display: block;
      width: 60%;
      height: 20px;
      margin-bottom: var(--spacing-sm);
      border-radius: 6px;
    }

    .skeleton-card-header ::ng-deep ngx-skeleton-loader:last-child {
      display: block;
      width: 40%;
      height: 16px;
      border-radius: 6px;
    }

    .skeleton-card-body ::ng-deep ngx-skeleton-loader {
      display: block;
      width: 100%;
      height: 14px;
      margin-bottom: var(--spacing-sm);
      border-radius: 6px;
    }

    .skeleton-card-body ::ng-deep ngx-skeleton-loader:last-child {
      width: 80%;
    }
  `]
})
export class SkeletonCardComponent {
  @Input() lines = 5;
  get lineCount(): number[] {
    return Array.from({ length: this.lines }, (_, i) => i);
  }
}

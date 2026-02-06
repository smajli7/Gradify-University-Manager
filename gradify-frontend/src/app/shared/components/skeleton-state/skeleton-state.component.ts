import { Component, Input } from '@angular/core';
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader';

@Component({
  selector: 'app-skeleton-state',
  standalone: true,
  imports: [NgxSkeletonLoaderComponent],
  template: `
    <div class="skeleton-state">
      <ngx-skeleton-loader [count]="lineCount" appearance="line" animation="progress" />
    </div>
  `,
  styles: [`
    .skeleton-state {
      padding: var(--spacing-xl);
      min-height: 120px;
    }

    .skeleton-state ::ng-deep ngx-skeleton-loader {
      display: block;
      margin-bottom: var(--spacing-md);
      border-radius: 6px;
    }
  `]
})
export class SkeletonStateComponent {
  @Input() lineCount = 5;
}

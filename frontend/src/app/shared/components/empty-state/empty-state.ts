import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  template: `
    <div class="empty">
      <span class="icon"><app-icon [name]="icon()" [size]="30" /></span>
      <h3>{{ title() }}</h3>
      @if (message()) {
        <p>{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly icon = input<IconName>('compass');
  readonly title = input.required<string>();
  readonly message = input<string>();
}

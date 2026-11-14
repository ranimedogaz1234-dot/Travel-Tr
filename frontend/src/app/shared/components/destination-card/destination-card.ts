import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Destination } from '../../../core/models/destination.model';
import { Icon } from '../icon/icon';
import { Photo } from '../photo/photo';

@Component({
  selector: 'app-destination-card',
  imports: [RouterLink, CurrencyPipe, DecimalPipe, Icon, Photo],
  templateUrl: './destination-card.html',
  styleUrl: './destination-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DestinationCard {
  readonly destination = input.required<Destination>();
}

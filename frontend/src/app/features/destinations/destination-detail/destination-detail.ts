import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { DestinationDetail, Trip } from '../../../core/models/destination.model';
import { AuthService } from '../../../core/services/auth.service';
import { DestinationService } from '../../../core/services/destination.service';
import { toApiError } from '../../../core/utils/api-error';
import { Icon } from '../../../shared/components/icon/icon';
import { Loading } from '../../../shared/components/loading/loading';
import { Photo } from '../../../shared/components/photo/photo';

interface DetailState {
  loading: boolean;
  error: string | null;
  notFound: boolean;
  destination: DestinationDetail | null;
}

@Component({
  selector: 'app-destination-detail',
  imports: [RouterLink, CurrencyPipe, DatePipe, DecimalPipe, Icon, Loading, Photo],
  templateUrl: './destination-detail.html',
  styleUrl: './destination-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DestinationDetailPage {
  private readonly destinationService = inject(DestinationService);
  private readonly title = inject(Title);
  protected readonly auth = inject(AuthService);

  /** Paramètre de route :slug (liaison automatique des entrées). */
  readonly slug = input.required<string>();

  private readonly reloadKey = signal(0);
  protected readonly activeImage = signal(0);

  protected readonly state = toSignal(
    toObservable(computed(() => ({ slug: this.slug(), key: this.reloadKey() }))).pipe(
      switchMap(({ slug }) =>
        this.destinationService.getBySlug(slug).pipe(
          map((destination): DetailState => ({ loading: false, error: null, notFound: false, destination })),
          catchError((err) => {
            const apiError = toApiError(err);
            return of<DetailState>({
              loading: false,
              error: apiError.message,
              notFound: apiError.status === 404,
              destination: null,
            });
          }),
          startWith<DetailState>({ loading: true, error: null, notFound: false, destination: null }),
        ),
      ),
    ),
    { initialValue: { loading: true, error: null, notFound: false, destination: null } as DetailState },
  );

  protected readonly includedActivities = computed(
    () => this.state().destination?.activities.filter((a) => a.included) ?? [],
  );
  protected readonly optionalActivities = computed(
    () => this.state().destination?.activities.filter((a) => !a.included) ?? [],
  );

  constructor() {
    effect(() => {
      const d = this.state().destination;
      if (d) this.title.setTitle(`${d.name} (${d.country}) — Travel TR`);
      this.activeImage.set(0);
    });
  }

  protected reload(): void {
    this.reloadKey.update((k) => k + 1);
  }

  /** Défilement vers la liste des départs sans modifier l'URL (base href). */
  protected scrollToTrips(event: Event): void {
    event.preventDefault();
    document.getElementById('departs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected seatsLabel(trip: Trip): string {
    if (trip.seatsAvailable === 0) return 'Complet';
    if (trip.seatsAvailable <= 5) return `Plus que ${trip.seatsAvailable} place${trip.seatsAvailable > 1 ? 's' : ''}`;
    return `${trip.seatsAvailable} places disponibles`;
  }
}

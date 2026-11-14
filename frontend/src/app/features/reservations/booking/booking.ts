import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { DestinationDetail, Trip } from '../../../core/models/destination.model';
import { DestinationService } from '../../../core/services/destination.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { ToastService } from '../../../core/services/toast.service';
import { toApiError } from '../../../core/utils/api-error';
import { Icon } from '../../../shared/components/icon/icon';
import { Loading } from '../../../shared/components/loading/loading';
import { Photo } from '../../../shared/components/photo/photo';
import { applyServerErrors, fieldError } from '../../../shared/validators/error-messages';

interface DetailState {
  loading: boolean;
  error: string | null;
  destination: DestinationDetail | null;
}

@Component({
  selector: 'app-booking',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe, Icon, Loading, Photo],
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Booking implements OnInit {
  private readonly destinationService = inject(DestinationService);
  private readonly reservationService = inject(ReservationService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** Paramètres d'URL facultatifs : ?destination=slug&depart=id */
  readonly destination = input<string>();
  readonly depart = input<string>();

  protected readonly fieldError = fieldError;
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly form = new FormGroup({
    destination: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tripId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    travelers: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(9)],
    }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });

  protected readonly destinations = toSignal(
    this.destinationService.list({ sort: 'nom' }).pipe(
      map((list) => ({ loading: false, error: null as string | null, list })),
      catchError((err) => of({ loading: false, error: toApiError(err).message, list: [] })),
    ),
    { initialValue: { loading: true, error: null, list: [] } },
  );

  protected readonly rules = toSignal(this.reservationService.getRules().pipe(catchError(() => of(null))), {
    initialValue: null,
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  private readonly selectedSlug = computed(() => this.formValue().destination ?? '');

  protected readonly detail = toSignal(
    toObservable(this.selectedSlug).pipe(
      switchMap((slug) =>
        !slug
          ? of<DetailState>({ loading: false, error: null, destination: null })
          : this.destinationService.getBySlug(slug).pipe(
              map((destination): DetailState => {
                this.preselectTrip(destination);
                return { loading: false, error: null, destination };
              }),
              catchError((err) => of<DetailState>({ loading: false, error: toApiError(err).message, destination: null })),
              startWith<DetailState>({ loading: true, error: null, destination: null }),
            ),
      ),
    ),
    { initialValue: { loading: false, error: null, destination: null } as DetailState },
  );

  protected readonly selectedTrip = computed<Trip | null>(() => {
    const id = this.formValue().tripId;
    return this.detail().destination?.trips.find((t) => t.id === id) ?? null;
  });

  protected readonly maxTravelers = computed(() => Math.min(9, this.selectedTrip()?.seatsAvailable ?? 9));
  protected readonly travelerOptions = computed(() =>
    Array.from({ length: Math.max(1, this.maxTravelers()) }, (_, i) => i + 1),
  );

  protected readonly total = computed(() => {
    const trip = this.selectedTrip();
    return trip ? trip.price * (this.formValue().travelers ?? 1) : 0;
  });

  private initialTripApplied = false;

  ngOnInit(): void {
    // Pré-remplit la destination passée dans l'URL (depuis la page de détails).
    const slug = this.destination();
    if (slug) this.form.controls.destination.setValue(slug);
  }

  protected onDestinationChange(): void {
    this.form.controls.tripId.setValue(null);
    this.form.controls.travelers.setValue(1);
    this.submitError.set(null);
  }

  protected selectTrip(trip: Trip): void {
    if (trip.seatsAvailable === 0) return;
    this.form.controls.tripId.setValue(trip.id);
    if (this.form.controls.travelers.value > Math.min(9, trip.seatsAvailable)) {
      this.form.controls.travelers.setValue(Math.min(9, trip.seatsAvailable));
    }
  }

  protected submit(): void {
    this.submitError.set(null);
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      if (!this.form.controls.tripId.value) this.submitError.set('Veuillez choisir une date de départ.');
      return;
    }
    const { tripId, travelers, notes } = this.form.getRawValue();
    this.submitting.set(true);
    this.reservationService.create({ tripId: tripId!, travelers: Number(travelers), notes: notes.trim() || null }).subscribe({
      next: (reservation) => {
        this.submitting.set(false);
        this.toast.success('Votre réservation est enregistrée. Elle est en attente de paiement.');
        void this.router.navigate(['/mes-reservations'], { queryParams: { nouvelle: reservation.id } });
      },
      error: (err) => {
        this.submitting.set(false);
        const apiError = toApiError(err);
        applyServerErrors(this.form, apiError.fields);
        this.submitError.set(apiError.message);
      },
    });
  }

  private preselectTrip(destination: DestinationDetail): void {
    if (this.initialTripApplied) return;
    this.initialTripApplied = true;
    const wanted = Number(this.depart());
    const trip = destination.trips.find((t) => t.id === wanted && t.seatsAvailable > 0);
    if (trip) queueMicrotask(() => this.selectTrip(trip));
  }
}

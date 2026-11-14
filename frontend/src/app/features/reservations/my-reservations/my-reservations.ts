import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Reservation } from '../../../core/models/reservation.model';
import { ReservationService } from '../../../core/services/reservation.service';
import { ToastService } from '../../../core/services/toast.service';
import { toApiError } from '../../../core/utils/api-error';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Icon } from '../../../shared/components/icon/icon';
import { Loading } from '../../../shared/components/loading/loading';
import { Photo } from '../../../shared/components/photo/photo';
import { fieldError } from '../../../shared/validators/error-messages';

type StatusFilter = 'toutes' | 'en_attente' | 'annulee';

@Component({
  selector: 'app-my-reservations',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe, ConfirmDialog, EmptyState, Icon, Loading, Photo],
  templateUrl: './my-reservations.html',
  styleUrl: './my-reservations.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyReservations {
  private readonly reservationService = inject(ReservationService);
  private readonly toast = inject(ToastService);

  /** ?nouvelle=id : met en évidence la réservation qui vient d'être créée. */
  readonly nouvelle = input<string>();

  protected readonly fieldError = fieldError;
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly filter = signal<StatusFilter>('toutes');

  protected readonly toCancel = signal<Reservation | null>(null);
  protected readonly toEdit = signal<Reservation | null>(null);
  protected readonly busy = signal(false);
  protected readonly dialogError = signal<string | null>(null);

  protected readonly editForm = new FormGroup({
    travelers: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(9)],
    }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });

  protected readonly counts = computed(() => {
    const list = this.reservations();
    return {
      toutes: list.length,
      en_attente: list.filter((r) => r.status === 'en_attente').length,
      annulee: list.filter((r) => r.status === 'annulee').length,
    };
  });

  protected readonly visible = computed(() => {
    const f = this.filter();
    return f === 'toutes' ? this.reservations() : this.reservations().filter((r) => r.status === f);
  });

  protected readonly travelerOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reservationService.list().subscribe({
      next: (list) => {
        this.reservations.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(toApiError(err).message);
        this.loading.set(false);
      },
    });
  }

  protected isNew(r: Reservation): boolean {
    return String(r.id) === this.nouvelle();
  }

  protected openCancel(r: Reservation): void {
    this.dialogError.set(null);
    this.toCancel.set(r);
  }

  protected confirmCancel(): void {
    const r = this.toCancel();
    if (!r || this.busy()) return;
    this.busy.set(true);
    this.reservationService.cancel(r.id).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.busy.set(false);
        this.toCancel.set(null);
        this.toast.success('Votre réservation a été annulée.');
      },
      error: (err) => {
        this.busy.set(false);
        this.dialogError.set(toApiError(err).message);
      },
    });
  }

  protected openEdit(r: Reservation): void {
    this.dialogError.set(null);
    this.editForm.reset({ travelers: r.travelers, notes: r.notes ?? '' });
    this.toEdit.set(r);
  }

  protected confirmEdit(): void {
    const r = this.toEdit();
    if (!r || this.busy()) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const { travelers, notes } = this.editForm.getRawValue();
    this.busy.set(true);
    this.reservationService.update(r.id, { travelers: Number(travelers), notes: notes.trim() || null }).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.busy.set(false);
        this.toEdit.set(null);
        this.toast.success('Votre réservation a été modifiée.');
      },
      error: (err) => {
        this.busy.set(false);
        this.dialogError.set(toApiError(err).message);
      },
    });
  }

  protected closeDialogs(): void {
    if (this.busy()) return;
    this.toCancel.set(null);
    this.toEdit.set(null);
  }

  protected editTotal(): number {
    const r = this.toEdit();
    return r ? r.trip.price * Number(this.editForm.controls.travelers.value) : 0;
  }

  private replace(updated: Reservation): void {
    this.reservations.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
  }
}

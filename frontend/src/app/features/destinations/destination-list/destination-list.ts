import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, map, merge, of, startWith, switchMap, tap } from 'rxjs';
import {
  BudgetValue,
  Destination,
  DestinationFilters,
  DestinationSort,
} from '../../../core/models/destination.model';
import { DestinationService } from '../../../core/services/destination.service';
import { toApiError } from '../../../core/utils/api-error';
import { DestinationCard } from '../../../shared/components/destination-card/destination-card';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Icon } from '../../../shared/components/icon/icon';
import { Loading } from '../../../shared/components/loading/loading';

const BUDGETS: BudgetValue[] = ['economique', 'modere', 'premium'];
const SORTS: DestinationSort[] = ['populaire', 'prix-asc', 'prix-desc', 'note', 'nom'];

interface ListState {
  loading: boolean;
  error: string | null;
  destinations: Destination[];
}

/** Lit les filtres depuis l'URL : les recherches sont partageables et survivent au rafraîchissement. */
function filtersFromParams(params: ParamMap): DestinationFilters {
  const budget = params.get('budget') as BudgetValue | null;
  const sort = params.get('sort') as DestinationSort | null;
  return {
    q: params.get('q') ?? undefined,
    country: params.get('country') ?? undefined,
    type: params.get('type') ?? undefined,
    budget: budget && BUDGETS.includes(budget) ? budget : undefined,
    sort: sort && SORTS.includes(sort) ? sort : undefined,
  };
}

@Component({
  selector: 'app-destination-list',
  imports: [ReactiveFormsModule, DestinationCard, EmptyState, Icon, Loading],
  templateUrl: './destination-list.html',
  styleUrl: './destination-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DestinationList {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destinationService = inject(DestinationService);

  protected readonly filtersOpen = signal(false);
  protected readonly reloadKey = signal(0);

  protected readonly form = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    country: new FormControl('', { nonNullable: true }),
    type: new FormControl('', { nonNullable: true }),
    budget: new FormControl('', { nonNullable: true }),
    sort: new FormControl<DestinationSort>('populaire', { nonNullable: true }),
  });

  protected readonly options = toSignal(this.destinationService.getFilterOptions().pipe(catchError(() => of(null))), {
    initialValue: null,
  });

  protected readonly state = toSignal(
    combineLatest([this.route.queryParamMap, toObservable(this.reloadKey)]).pipe(
      map(([params]) => filtersFromParams(params)),
      tap((f) =>
        this.form.setValue(
          {
            q: f.q ?? '',
            country: f.country ?? '',
            type: f.type ?? '',
            budget: f.budget ?? '',
            sort: f.sort ?? 'populaire',
          },
          { emitEvent: false },
        ),
      ),
      switchMap((filters) =>
        this.destinationService.list(filters).pipe(
          map((destinations): ListState => ({ loading: false, error: null, destinations })),
          catchError((err) => of<ListState>({ loading: false, error: toApiError(err).message, destinations: [] })),
          startWith<ListState>({ loading: true, error: null, destinations: [] }),
        ),
      ),
    ),
    { initialValue: { loading: true, error: null, destinations: [] } as ListState },
  );

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Recherche texte : mise à jour de l'URL après une courte pause de saisie.
    this.form.controls.q.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(destroyRef))
      .subscribe(() => this.applyFilters());

    const c = this.form.controls;
    merge(c.country.valueChanges, c.type.valueChanges, c.budget.valueChanges, c.sort.valueChanges)
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => this.applyFilters());
  }

  protected applyFilters(): void {
    const { q, country, type, budget, sort } = this.form.getRawValue();
    const queryParams = {
      q: q.trim() || null,
      country: country || null,
      type: type || null,
      budget: budget || null,
      sort: sort !== 'populaire' ? sort : null,
    };
    void this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
  }

  protected resetFilters(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  protected retry(): void {
    this.reloadKey.update((k) => k + 1);
  }

  protected hasActiveFilters(): boolean {
    const { q, country, type, budget } = this.form.getRawValue();
    return !!(q || country || type || budget);
  }
}

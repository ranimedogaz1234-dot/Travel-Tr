import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Destination, FilterOptions } from '../../core/models/destination.model';
import { AuthService } from '../../core/services/auth.service';
import { DestinationService } from '../../core/services/destination.service';
import { toApiError } from '../../core/utils/api-error';
import { DestinationCard } from '../../shared/components/destination-card/destination-card';
import { Icon } from '../../shared/components/icon/icon';
import { IconName } from '../../shared/components/icon/icons';
import { Loading } from '../../shared/components/loading/loading';
import { Photo } from '../../shared/components/photo/photo';
import { Reveal } from '../../shared/directives/reveal';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=75';

@Component({
  selector: 'app-home',
  imports: [FormsModule, RouterLink, CurrencyPipe, DestinationCard, Icon, Loading, Photo, Reveal],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly destinationService = inject(DestinationService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly heroImage = HERO_IMAGE;
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly featured = signal<Destination[]>([]);
  protected readonly offers = signal<Destination[]>([]);
  protected readonly options = signal<FilterOptions | null>(null);
  private readonly all = signal<Destination[]>([]);

  protected readonly search = { q: '', type: '', budget: '' };

  protected readonly stats = computed(() => {
    const list = this.all();
    const countries = new Set(list.map((d) => d.country)).size;
    const avg = list.length ? list.reduce((sum, d) => sum + d.rating, 0) / list.length : 0;
    return { destinations: list.length, countries, rating: avg.toFixed(1).replace('.', ',') };
  });

  protected readonly travelTypes: { type: string; icon: IconName; text: string }[] = [
    { type: 'Plage', icon: 'compass', text: 'Sable fin et eaux turquoise' },
    { type: 'Culture', icon: 'award', text: 'Patrimoine et traditions' },
    { type: 'Ville', icon: 'map-pin', text: 'Capitales vibrantes' },
    { type: 'Nature', icon: 'globe', text: 'Paysages préservés' },
    { type: 'Aventure', icon: 'navigation', text: 'Sensations et grands espaces' },
  ];

  protected readonly advantages: { icon: IconName; title: string; text: string }[] = [
    { icon: 'shield', title: 'Réservation sécurisée', text: 'Mots de passe hachés, session protégée et accès limité à vos seules données.' },
    { icon: 'calendar', title: 'Annulation flexible', text: 'Annulez en ligne jusqu’à 48 heures avant le départ.' },
    { icon: 'tag', title: 'Prix transparents', text: 'Le prix affiché par personne est celui que vous réservez.' },
    { icon: 'headphones', title: 'Équipe à votre écoute', text: 'Une question ? Notre formulaire de contact est là pour vous.' },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      all: this.destinationService.list({ sort: 'populaire' }),
      offers: this.destinationService.list({ sort: 'prix-asc' }),
      options: this.destinationService.getFilterOptions(),
    }).subscribe({
      next: ({ all, offers, options }) => {
        this.all.set(all);
        this.featured.set(all.filter((d) => d.featured).slice(0, 6));
        this.offers.set(offers.slice(0, 3));
        this.options.set(options);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(toApiError(err).message);
        this.loading.set(false);
      },
    });
  }

  protected submitSearch(): void {
    const queryParams: Record<string, string> = {};
    if (this.search.q.trim()) queryParams['q'] = this.search.q.trim();
    if (this.search.type) queryParams['type'] = this.search.type;
    if (this.search.budget) queryParams['budget'] = this.search.budget;
    void this.router.navigate(['/destinations'], { queryParams });
  }
}

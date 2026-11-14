import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/components/icon/icon';
import { IconName } from '../../shared/components/icon/icons';
import { Photo } from '../../shared/components/photo/photo';
import { Reveal } from '../../shared/directives/reveal';

@Component({
  selector: 'app-about',
  imports: [RouterLink, Icon, Photo, Reveal],
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  protected readonly image =
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=75';

  protected readonly values: { icon: IconName; title: string; text: string }[] = [
    {
      icon: 'compass',
      title: 'Sélection exigeante',
      text: 'Chaque destination est choisie pour la qualité de son expérience : culture, nature, gastronomie et accueil.',
    },
    {
      icon: 'tag',
      title: 'Transparence',
      text: 'Prix par personne clairs, conditions de modification et d’annulation affichées avant la réservation.',
    },
    {
      icon: 'shield',
      title: 'Respect de vos données',
      text: 'Nous ne collectons que les informations nécessaires à vos réservations, et vous seul y avez accès.',
    },
    {
      icon: 'globe',
      title: 'Voyage responsable',
      text: 'Nous privilégions les séjours longs, les guides locaux et les hébergements à taille humaine.',
    },
  ];
}

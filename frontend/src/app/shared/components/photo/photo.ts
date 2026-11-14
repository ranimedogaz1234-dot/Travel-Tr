import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Icon } from '../icon/icon';
import { resizeImage } from '../../utils/image-url';

/**
 * Image avec chargement progressif et repli élégant : si la photo ne peut pas
 * être chargée (réseau, URL invalide), un dégradé bleu avec le nom du lieu
 * s'affiche à la place d'une image cassée.
 */
@Component({
  selector: 'app-photo',
  imports: [Icon],
  templateUrl: './photo.html',
  styleUrl: './photo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Photo {
  readonly src = input.required<string>();
  readonly alt = input.required<string>();
  readonly width = input(800);
  readonly eager = input(false);
  readonly label = input<string>();
  /** Image de fond : en cas d'échec, simple dégradé sans icône ni texte. */
  readonly plain = input(false);

  protected readonly loaded = signal(false);
  protected readonly failed = signal(false);
  protected readonly url = computed(() => resizeImage(this.src(), this.width()));
  protected readonly srcset = computed(() => {
    const w = this.width();
    return `${resizeImage(this.src(), Math.round(w / 2))} ${Math.round(w / 2)}w, ${this.url()} ${w}w, ${resizeImage(this.src(), w * 2)} ${w * 2}w`;
  });
}

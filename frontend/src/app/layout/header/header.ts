import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, Icon],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly menuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);
  protected readonly scrolled = signal(false);
  protected readonly loggingOut = signal(false);

  protected readonly links = [
    { path: '/', label: 'Accueil', exact: true },
    { path: '/destinations', label: 'Destinations', exact: false },
    { path: '/reservations', label: 'Réservations', exact: true },
    { path: '/a-propos', label: 'À propos', exact: true },
    { path: '/contact', label: 'Contact', exact: true },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => {
        this.menuOpen.set(false);
        this.userMenuOpen.set(false);
      });
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.menuOpen.set(false);
    this.userMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.user-menu')) this.userMenuOpen.set(false);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  protected firstName(fullName: string): string {
    return fullName.split(' ')[0];
  }

  protected logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.auth.logout().subscribe({
      next: () => {
        this.loggingOut.set(false);
        this.toast.success('Vous êtes déconnecté. À bientôt !');
        void this.router.navigateByUrl('/');
      },
      error: () => {
        this.loggingOut.set(false);
        this.toast.error('La déconnexion a échoué. Veuillez réessayer.');
      },
    });
  }
}

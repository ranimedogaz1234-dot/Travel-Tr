import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/** Fait apparaître l'élément en douceur lorsqu'il entre dans la fenêtre. */
@Directive({
  selector: '[appReveal]',
  host: { class: 'reveal' },
})
export class Reveal {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const element = this.el.nativeElement;
      if (typeof IntersectionObserver === 'undefined') {
        element.classList.add('is-visible');
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              element.classList.add('is-visible');
              observer.disconnect();
            }
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

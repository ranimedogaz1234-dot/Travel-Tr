import { TestBed } from '@angular/core/testing';
import { Photo } from './photo';

describe('Photo', () => {
  it('affiche un repli lisible si l’image ne se charge pas', async () => {
    const fixture = TestBed.createComponent(Photo);
    fixture.componentRef.setInput('src', 'https://images.unsplash.com/photo-x?w=1200');
    fixture.componentRef.setInput('alt', 'Kyoto');
    fixture.componentRef.setInput('label', 'Kyoto');
    fixture.componentRef.setInput('width', 400);
    await fixture.whenStable();

    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toContain('w=400');
    img.dispatchEvent(new Event('error'));
    await fixture.whenStable();

    const fallback = fixture.nativeElement.querySelector('.fallback') as HTMLElement;
    expect(fallback.getAttribute('aria-label')).toBe('Kyoto');
    expect(fallback.textContent).toContain('Kyoto');
  });
});

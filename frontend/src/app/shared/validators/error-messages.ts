import { AbstractControl } from '@angular/forms';

const MESSAGES: Record<string, (error: unknown) => string> = {
  required: () => 'Ce champ est obligatoire.',
  email: () => 'Le format de l’adresse e-mail est invalide.',
  minlength: (e) => `Au moins ${(e as { requiredLength: number }).requiredLength} caractères sont requis.`,
  maxlength: (e) => `Maximum ${(e as { requiredLength: number }).requiredLength} caractères.`,
  min: (e) => `La valeur minimale est ${(e as { min: number }).min}.`,
  max: (e) => `La valeur maximale est ${(e as { max: number }).max}.`,
  passwordLength: () => 'Le mot de passe doit contenir au moins 8 caractères.',
  passwordLetter: () => 'Le mot de passe doit contenir au moins une lettre.',
  passwordDigit: () => 'Le mot de passe doit contenir au moins un chiffre.',
  mismatch: () => 'Les mots de passe ne correspondent pas.',
  phone: () => 'Le numéro de téléphone est invalide.',
  server: (e) => String(e),
};

/** Premier message d'erreur (en français) d'un champ touché, ou null. */
export function fieldError(control: AbstractControl | null): string | null {
  if (!control || !control.errors || !(control.touched || control.dirty)) return null;
  for (const [key, value] of Object.entries(control.errors)) {
    const build = MESSAGES[key];
    if (build) return build(value);
  }
  return 'Valeur invalide.';
}

/** Affiche sur le formulaire les erreurs de validation renvoyées par l'API. */
export function applyServerErrors(
  form: { get(path: string): AbstractControl | null },
  fields: Record<string, string>,
): void {
  for (const [name, message] of Object.entries(fields)) {
    const control = form.get(name);
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), server: message });
      control.markAsTouched();
    }
  }
}

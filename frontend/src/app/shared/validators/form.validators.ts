import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Même règle que l'API : au moins 8 caractères, une lettre et un chiffre. */
export const strongPassword: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '');
  if (!value) return null;
  const errors: ValidationErrors = {};
  if (value.length < 8) errors['passwordLength'] = true;
  if (!/[A-Za-z]/.test(value)) errors['passwordLetter'] = true;
  if (!/\d/.test(value)) errors['passwordDigit'] = true;
  return Object.keys(errors).length ? errors : null;
};

/** Vérifie que deux champs d'un groupe sont identiques (erreur posée sur le second). */
export function fieldsMatch(field: string, confirmField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(field)?.value;
    const confirm = group.get(confirmField);
    if (!confirm) return null;
    const mismatch = !!confirm.value && a !== confirm.value;
    const { mismatch: _ignored, ...others } = confirm.errors ?? {};
    if (mismatch) {
      confirm.setErrors({ ...others, mismatch: true });
    } else {
      confirm.setErrors(Object.keys(others).length ? others : null);
    }
    return null;
  };
}

/** Adresse e-mail stricte (le validateur natif d'Angular accepte « a@b »). */
export const strictEmail: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? null : { email: true };
};

export const phoneNumber: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  return /^\+?[0-9 ().-]{6,20}$/.test(value) ? null : { phone: true };
};

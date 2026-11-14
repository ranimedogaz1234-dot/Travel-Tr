import { FormControl, FormGroup } from '@angular/forms';
import { fieldsMatch, phoneNumber, strictEmail, strongPassword } from './form.validators';
import { fieldError } from './error-messages';

describe('Validateurs de formulaire', () => {
  it('strongPassword exige 8 caractères, une lettre et un chiffre', () => {
    expect(strongPassword(new FormControl('court1'))).toEqual({ passwordLength: true });
    expect(strongPassword(new FormControl('12345678'))).toEqual({ passwordLetter: true });
    expect(strongPassword(new FormControl('abcdefgh'))).toEqual({ passwordDigit: true });
    expect(strongPassword(new FormControl('Voyage2026'))).toBeNull();
    expect(strongPassword(new FormControl(''))).toBeNull();
  });

  it('strictEmail refuse les adresses incomplètes', () => {
    expect(strictEmail(new FormControl('a@b'))).toEqual({ email: true });
    expect(strictEmail(new FormControl('pas un email'))).toEqual({ email: true });
    expect(strictEmail(new FormControl('amira@exemple.tn'))).toBeNull();
  });

  it('phoneNumber accepte les formats internationaux', () => {
    expect(phoneNumber(new FormControl('+216 71 123 456'))).toBeNull();
    expect(phoneNumber(new FormControl('abc'))).toEqual({ phone: true });
    expect(phoneNumber(new FormControl(''))).toBeNull();
  });

  it('fieldsMatch signale des mots de passe différents', () => {
    const form = new FormGroup(
      { password: new FormControl('Voyage2026'), confirm: new FormControl('Autre2026') },
      { validators: [fieldsMatch('password', 'confirm')] },
    );
    expect(form.get('confirm')?.hasError('mismatch')).toBe(true);
    form.get('confirm')?.setValue('Voyage2026');
    expect(form.get('confirm')?.hasError('mismatch')).toBe(false);
  });

  it('fieldError renvoie des messages en français pour les champs touchés', () => {
    const control = new FormControl('', { validators: [strictEmail] });
    control.setValue('x@y');
    expect(fieldError(control)).toBeNull(); // pas encore touché
    control.markAsTouched();
    expect(fieldError(control)).toBe('Le format de l’adresse e-mail est invalide.');
  });
});

import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { toApiError } from '../../../core/utils/api-error';
import { safeReturnUrl } from '../../../core/utils/safe-redirect';
import { Icon } from '../../../shared/components/icon/icon';
import { Photo } from '../../../shared/components/photo/photo';
import { applyServerErrors, fieldError } from '../../../shared/validators/error-messages';
import { fieldsMatch, strictEmail, strongPassword } from '../../../shared/validators/form.validators';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, Icon, Photo],
  templateUrl: './register.html',
  styleUrls: ['../auth-layout.scss', './register.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly returnUrl = input<string>();

  protected readonly fieldError = fieldError;
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly image =
    'https://images.unsplash.com/photo-1604999333679-b86d54738315?auto=format&fit=crop&w=1200&q=75';

  protected readonly form = new FormGroup(
    {
      fullName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
      }),
      email: new FormControl('', { nonNullable: true, validators: [Validators.required, strictEmail] }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(128), strongPassword],
      }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: [fieldsMatch('password', 'confirmPassword')] },
  );

  protected passwordChecks(): { label: string; ok: boolean }[] {
    const value = this.form.controls.password.value;
    return [
      { label: '8 caractères minimum', ok: value.length >= 8 },
      { label: 'Une lettre', ok: /[A-Za-z]/.test(value) },
      { label: 'Un chiffre', ok: /\d/.test(value) },
    ];
  }

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const { fullName, email, password, confirmPassword } = this.form.getRawValue();
    this.auth.register({ fullName: fullName.trim(), email: email.trim(), password, confirmPassword }).subscribe({
      next: (user) => {
        this.submitting.set(false);
        this.toast.success(`Bienvenue chez Travel TR, ${user.fullName.split(' ')[0]} ! Votre compte est créé.`);
        void this.router.navigateByUrl(safeReturnUrl(this.returnUrl(), '/destinations'));
      },
      error: (err) => {
        this.submitting.set(false);
        const apiError = toApiError(err);
        applyServerErrors(this.form, apiError.fields);
        if (apiError.status === 409) {
          applyServerErrors(this.form, { email: apiError.message });
        }
        this.error.set(apiError.message);
      },
    });
  }
}

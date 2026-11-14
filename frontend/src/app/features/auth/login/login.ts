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
import { strictEmail } from '../../../shared/validators/form.validators';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Icon, Photo],
  templateUrl: './login.html',
  styleUrls: ['../auth-layout.scss', './login.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** ?returnUrl=… : page demandée avant la redirection vers la connexion. */
  readonly returnUrl = input<string>();

  protected readonly fieldError = fieldError;
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly image =
    'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?auto=format&fit=crop&w=1200&q=75';

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, strictEmail] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login({ email: email.trim(), password }).subscribe({
      next: (user) => {
        this.submitting.set(false);
        this.toast.success(`Bienvenue, ${user.fullName.split(' ')[0]} !`);
        void this.router.navigateByUrl(safeReturnUrl(this.returnUrl(), '/mes-reservations'));
      },
      error: (err) => {
        this.submitting.set(false);
        const apiError = toApiError(err);
        applyServerErrors(this.form, apiError.fields);
        this.error.set(apiError.message);
        this.form.controls.password.reset();
      },
    });
  }
}

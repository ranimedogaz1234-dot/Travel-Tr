import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UserService } from '../../core/services/user.service';
import { toApiError } from '../../core/utils/api-error';
import { Icon } from '../../shared/components/icon/icon';
import { applyServerErrors, fieldError } from '../../shared/validators/error-messages';
import { fieldsMatch, phoneNumber, strictEmail, strongPassword } from '../../shared/validators/form.validators';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, Icon],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  protected readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);

  protected readonly fieldError = fieldError;
  protected readonly savingProfile = signal(false);
  protected readonly profileError = signal<string | null>(null);
  protected readonly savingPassword = signal(false);
  protected readonly passwordError = signal<string | null>(null);

  protected readonly profileForm = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
    }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, strictEmail] }),
    phone: new FormControl('', { nonNullable: true, validators: [phoneNumber, Validators.maxLength(20)] }),
  });

  protected readonly passwordForm = new FormGroup(
    {
      currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(128), strongPassword],
      }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: [fieldsMatch('newPassword', 'confirmPassword')] },
  );

  constructor() {
    this.resetProfileForm();
    // Recharge le profil depuis l'API pour afficher les données les plus récentes.
    this.userService.getProfile().subscribe({
      next: (user) => {
        this.auth.setUser(user);
        this.resetProfileForm();
      },
      error: () => undefined,
    });
  }

  protected resetProfileForm(): void {
    const user = this.auth.user();
    this.profileError.set(null);
    this.profileForm.reset({
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    });
  }

  protected saveProfile(): void {
    this.profileError.set(null);
    if (this.profileForm.invalid || this.savingProfile()) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const { fullName, email, phone } = this.profileForm.getRawValue();
    this.savingProfile.set(true);
    this.userService
      .updateProfile({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() || null })
      .subscribe({
        next: () => {
          this.savingProfile.set(false);
          this.resetProfileForm();
          this.toast.success('Vos informations ont été mises à jour.');
        },
        error: (err) => {
          this.savingProfile.set(false);
          const apiError = toApiError(err);
          applyServerErrors(this.profileForm, apiError.fields);
          if (apiError.status === 409) applyServerErrors(this.profileForm, { email: apiError.message });
          this.profileError.set(apiError.message);
        },
      });
  }

  protected changePassword(): void {
    this.passwordError.set(null);
    if (this.passwordForm.invalid || this.savingPassword()) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    this.userService.changePassword(this.passwordForm.getRawValue()).subscribe({
      next: (message) => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.toast.success(message);
      },
      error: (err) => {
        this.savingPassword.set(false);
        const apiError = toApiError(err);
        applyServerErrors(this.passwordForm, apiError.fields);
        this.passwordError.set(apiError.message);
      },
    });
  }
}

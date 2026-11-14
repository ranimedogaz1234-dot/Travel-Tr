import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ContactService } from '../../core/services/contact.service';
import { toApiError } from '../../core/utils/api-error';
import { Icon } from '../../shared/components/icon/icon';
import { applyServerErrors, fieldError } from '../../shared/validators/error-messages';
import { strictEmail } from '../../shared/validators/form.validators';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  private readonly contactService = inject(ContactService);
  private readonly auth = inject(AuthService);

  protected readonly fieldError = fieldError;
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected readonly subjects = [
    'Question sur une destination',
    'Question sur une réservation',
    'Demande de devis de groupe',
    'Autre demande',
  ];

  protected readonly form = new FormGroup({
    name: new FormControl(this.auth.user()?.fullName ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
    }),
    email: new FormControl(this.auth.user()?.email ?? '', {
      nonNullable: true,
      validators: [Validators.required, strictEmail],
    }),
    subject: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(120)],
    }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(2000)],
    }),
  });

  protected submit(): void {
    this.error.set(null);
    this.success.set(null);
    if (this.form.invalid || this.sending()) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    const v = this.form.getRawValue();
    this.contactService
      .send({ name: v.name.trim(), email: v.email.trim(), subject: v.subject.trim(), message: v.message.trim() })
      .subscribe({
        next: (message) => {
          this.sending.set(false);
          this.success.set(message);
          this.form.reset({
            name: this.auth.user()?.fullName ?? '',
            email: this.auth.user()?.email ?? '',
            subject: '',
            message: '',
          });
        },
        error: (err) => {
          this.sending.set(false);
          const apiError = toApiError(err);
          applyServerErrors(this.form, apiError.fields);
          this.error.set(apiError.message);
        },
      });
  }
}

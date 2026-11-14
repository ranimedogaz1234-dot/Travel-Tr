export type ReservationStatus = 'en_attente' | 'annulee';
export type PaymentStatus = 'non_payee';

export interface Reservation {
  id: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  travelers: number;
  totalPrice: number;
  notes: string | null;
  createdAt: string;
  cancelledAt: string | null;
  canModify: boolean;
  canCancel: boolean;
  trip: {
    id: number;
    title: string;
    departureDate: string;
    returnDate: string;
    price: number;
  };
  destination: {
    slug: string;
    name: string;
    country: string;
    imageUrl: string;
  };
}

export interface CreateReservationPayload {
  tripId: number;
  travelers: number;
  notes: string | null;
}

export interface UpdateReservationPayload {
  travelers: number;
  notes: string | null;
}

export interface BookingRules {
  minDaysBeforeBooking: number;
  minDaysBeforeModification: number;
  minHoursBeforeCancellation: number;
}

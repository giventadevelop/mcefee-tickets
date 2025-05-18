export interface UserTaskDTO {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string; // ISO date-time string
  completed: boolean;
  userId: number; // int64 per OpenAPI
  eventId?: number; // int64
  assigneeName?: string;
  assigneeContactPhone?: string;
  assigneeContactEmail?: string;
  createdAt: string; // ISO date-time string
  updatedAt: string; // ISO date-time string
  user?: UserProfileDTO;
  event?: EventDTO;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  completed: boolean;
  priority: string;
}

export interface UserProfileDTO {
  id?: number;
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  familyName?: string;
  cityTown?: string;
  district?: string;
  educationalInstitution?: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscriptionDTO {
  id?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeCurrentPeriodEnd?: string;
  status: string;
  userProfile?: UserProfileDTO;
}

/**
 * DTO for event data exchanged with the backend.
 */
export interface EventDTO {
  id?: number;
  title: string;
  caption?: string;
  description?: string;
  event_type_id: number;
  start_date: string; // ISO date string
  end_date: string;   // ISO date string
  start_time: string; // HH:mm:ss
  end_time: string;   // HH:mm:ss
  location?: string;
  directions_to_venue?: string;
  capacity?: number;
  admission_type: 'free' | 'ticketed';
  is_active?: boolean;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * DTO for event type data exchanged with the backend.
 */
export interface EventTypeDTO {
  id: number;
  name: string;
  description?: string;
}
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
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  startTime: string; // e.g. '06:00 PM'
  endTime: string;   // e.g. '08:00 PM'
  location?: string;
  directionsToVenue?: string;
  capacity?: number;
  admissionType: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: UserProfileDTO;
  eventType?: EventTypeDTO;
}

/**
 * DTO for event type data exchanged with the backend.
 */
export interface EventTypeDTO {
  id: number;
  name: string;
  description?: string;
}

export interface EventMediaDTO {
  id?: number;
  title: string;
  description?: string;
  eventMediaType: string;
  storageType: string;
  fileUrl?: string;
  preSignedUrl?: string;
  fileData?: string[];
  fileDataContentType?: string;
  contentType?: string;
  fileSize?: number;
  isPublic?: boolean;
  eventFlyer?: boolean;
  isEventManagementOfficialDocument?: boolean;
  createdAt: string;
  updatedAt: string;
  event?: EventDTO;
  uploadedBy?: UserProfileDTO;
}

export interface CalendarEventDTO {
  id?: number;
  calendarProvider: string;
  externalEventId?: string;
  calendarLink: string;
  createdAt: string;
  updatedAt: string;
  event?: EventDTO;
  createdBy?: UserProfileDTO;
}

export interface EventWithMedia extends EventDTO {
  thumbnailUrl?: string;
  startTime?: string;
  endTime?: string;
}

/**
 * DTO for ticket type data exchanged with the backend.
 * Matches backend OpenAPI schema.
 */
export interface TicketTypeDTO {
  id: number;
  name: string;
  code: string;
  price: number;
  createdAt: string; // ISO date-time string
  updatedAt: string; // ISO date-time string
  availableQuantity?: number;
  isActive?: boolean;
  description?: string;
  event?: EventDTO;
}
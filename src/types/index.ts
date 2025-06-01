export interface UserTaskDTO {
  id: number;
  tenantId?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string; // ISO date-time string
  completed: boolean;
  assigneeName?: string;
  assigneeContactPhone?: string;
  assigneeContactEmail?: string;
  createdAt: string;
  updatedAt: string;
  user?: UserProfileDTO;
  event?: EventDetailsDTO;
}

export interface UserProfileDTO {
  id?: number;
  tenantId?: string;
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
  userStatus?: string; // varchar(50)
  userRole?: string;   // varchar(50)
  reviewedByAdminAt?: string; // ISO date string (date)
  reviewedByAdminId?: number; // int8, references admin user id
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscriptionDTO {
  id?: number;
  tenantId?: string;
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
export interface EventDetailsDTO {
  id?: number;
  tenantId?: string;
  title: string;
  caption?: string;
  description?: string;
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  startTime: string;
  endTime: string;
  location?: string;
  directionsToVenue?: string;
  capacity?: number;
  admissionType: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserProfileDTO;
  eventType?: EventTypeDetailsDTO;
}

/**
 * DTO for event type data exchanged with the backend.
 */
export interface EventTypeDetailsDTO {
  id?: number;
  tenantId?: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventMediaDTO {
  id?: number;
  tenantId?: string;
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
  event?: EventDetailsDTO;
  uploadedBy?: UserProfileDTO;
}

export interface EventCalendarEntryDTO {
  id?: number;
  tenantId?: string;
  calendarProvider: string;
  externalEventId?: string;
  calendarLink: string;
  createdAt: string;
  updatedAt: string;
  event?: EventDetailsDTO;
  createdBy?: UserProfileDTO;
}

export interface EventWithMedia extends EventDetailsDTO {
  thumbnailUrl?: string;
  startTime: string;
  endTime: string;
}

/**
 * DTO for ticket type data exchanged with the backend.
 * Matches backend OpenAPI schema.
 */
export interface EventTicketTypeDTO {
  id?: number;
  tenantId?: string;
  name: string;
  description?: string;
  price: number;
  code: string;
  availableQuantity?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  event?: EventDetailsDTO;
}

export interface EventAttendeeDTO {
  id?: number;
  tenantId?: string;
  registrationStatus: string;
  registrationDate: string;
  confirmationDate?: string;
  cancellationDate?: string;
  cancellationReason?: string;
  attendeeType?: string;
  specialRequirements?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  checkInStatus?: string;
  checkInTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  event?: EventDetailsDTO;
  attendee?: UserProfileDTO;
}

export interface EventPollDTO {
  id?: number;
  tenantId?: string;
  title: string;
  description?: string;
  isActive?: boolean;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  event?: EventDetailsDTO;
  createdBy?: UserProfileDTO;
}

export interface EventPollOptionDTO {
  id?: number;
  tenantId?: string;
  optionText: string;
  createdAt: string;
  updatedAt: string;
  poll?: EventPollDTO;
}

export interface BulkOperationLogDTO {
  id?: number;
  tenantId?: string;
  operationType: string;
  targetCount: number;
  successCount?: number;
  errorCount?: number;
  operationDetails?: string;
  createdAt: string;
  performedBy?: UserProfileDTO;
}

export interface EventAdminAuditLogDTO {
  id?: number;
  tenantId?: string;
  action: string;
  tableName: string;
  recordId: string;
  changes?: string;
  createdAt: string;
  admin?: UserProfileDTO;
}

export interface EventAdminDTO {
  id?: number;
  tenantId?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  user?: UserProfileDTO;
  createdBy?: UserProfileDTO;
}

export interface EventOrganizerDTO {
  id?: number;
  tenantId?: string;
  title: string;
  designation?: string;
  contactEmail?: string;
  contactPhone?: string;
  isPrimary?: boolean;
  createdAt: string;
  updatedAt: string;
  event?: EventDetailsDTO;
  organizer?: UserProfileDTO;
}

export interface EventPollResponseDTO {
  id?: number;
  tenantId?: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  poll?: EventPollDTO;
  pollOption?: EventPollOptionDTO;
  user?: UserProfileDTO;
}

export interface EventTicketTransactionDTO {
  id?: number;
  tenantId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  status: string;
  purchaseDate: string;
  createdAt: string;
  updatedAt: string;
  event?: EventDetailsDTO;
  ticketType?: EventTicketTypeDTO;
  user?: UserProfileDTO;
}

export interface QrCodeUsageDTO {
  id?: number;
  tenantId?: string;
  qrCodeData: string;
  generatedAt: string;
  usedAt?: string;
  usageCount?: number;
  lastScannedBy?: string;
  createdAt: string;
  attendee?: EventAttendeeDTO;
}

export interface TenantOrganizationDTO {
  id?: number;
  tenantId: string;
  organizationName: string;
  domain?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  contactEmail: string;
  contactPhone?: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  monthlyFeeUsd?: number;
  stripeCustomerId?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettingsDTO {
  id?: number;
  tenantId: string;
  allowUserRegistration?: boolean;
  requireAdminApproval?: boolean;
  enableWhatsappIntegration?: boolean;
  enableEmailMarketing?: boolean;
  whatsappApiKey?: string;
  emailProviderConfig?: string;
  customCss?: string;
  customJs?: string;
  createdAt: string;
  updatedAt: string;
  tenantOrganization?: TenantOrganizationDTO;
}

export interface UserPaymentTransactionDTO {
  id?: number;
  tenantId: string;
  transactionType: string;
  amount: number;
  currency: string;
  stripePaymentIntentId?: string;
  stripeTransferGroup?: string;
  platformFeeAmount?: number;
  tenantAmount?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  event?: EventDetailsDTO;
  ticketTransaction?: EventTicketTransactionDTO;
}

export interface UserRegistrationRequestDTO {
  id?: number;
  tenantId: string;
  requestId: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  familyName?: string;
  cityTown?: string;
  district?: string;
  educationalInstitution?: string;
  profileImageUrl?: string;
  requestReason?: string;
  status: string;
  adminComments?: string;
  submittedAt: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: UserProfileDTO;
}
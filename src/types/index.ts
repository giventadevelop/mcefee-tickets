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
  id: number;
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
 * DTO for event details, matches backend OpenAPI schema.
 */
export interface EventDetailsDTO {
  /** Unique event ID */
  id?: number;
  /** Tenant ID */
  tenantId?: string;
  /** Event title */
  title: string;
  /** Event caption */
  caption?: string;
  /** Event description */
  description?: string;
  /** Event start date (YYYY-MM-DD) */
  startDate: string;
  /** Event end date (YYYY-MM-DD) */
  endDate: string;
  /** Event start time (e.g., 18:00) */
  startTime: string;
  /** Event end time (e.g., 21:00) */
  endTime: string;
  /** IANA timezone name (e.g., 'America/New_York') */
  timezone: string;
  /** Event location */
  location?: string;
  /** Directions to venue */
  directionsToVenue?: string;
  /** Event capacity */
  capacity?: number;
  /** Admission type */
  admissionType?: string;
  /** Is event active */
  isActive?: boolean;
  /** Max guests per attendee */
  maxGuestsPerAttendee?: number;
  /** Allow guests */
  allowGuests?: boolean;
  /** Require guest approval */
  requireGuestApproval?: boolean;
  /** Enable guest pricing */
  enableGuestPricing?: boolean;
  /** Enable QR code */
  enableQrCode?: boolean;
  /** Is registration required */
  isRegistrationRequired?: boolean;
  /** Is sports event */
  isSportsEvent?: boolean;
  /** Is event live */
  isLive?: boolean;
  /** Created at (ISO date-time) */
  createdAt: string;
  /** Updated at (ISO date-time) */
  updatedAt: string;
  /** Created by user profile */
  createdBy?: UserProfileDTO;
  /** Event type details */
  eventType?: EventTypeDetailsDTO;
  /** Discount codes */
  discountCodes?: DiscountCodeDTO[];
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

/**
 * DTO for event media data exchanged with the backend.
 * Matches backend OpenAPI schema.
 */
export interface EventMediaDTO {
  id?: number;
  tenantId?: string;
  title: string;
  description?: string;
  eventMediaType: string;
  storageType: string;
  fileUrl?: string;
  fileData?: Uint8Array;
  fileDataContentType?: string;
  contentType?: string;
  fileSize?: number;
  isPublic?: boolean;
  eventFlyer?: boolean;
  isEventManagementOfficialDocument?: boolean;
  preSignedUrl?: string;
  preSignedUrlExpiresAt?: string;
  altText?: string;
  displayOrder?: number;
  downloadCount?: number;
  isFeaturedVideo?: boolean;
  featuredVideoUrl?: string;
  isFeaturedImage?: boolean;
  isHeroImage?: boolean;
  isActiveHeroImage?: boolean;
  eventId?: number;
  uploadedById?: number;
  createdAt: string;
  updatedAt: string;
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
 * DTO for event ticket type, matches backend schema.
 */
export interface EventTicketTypeDTO {
  id: number;
  tenantId: string;
  name: string;
  description?: string;
  isServiceFeeIncluded?: boolean;
  serviceFee?: number;
  price: number;
  code: string;
  availableQuantity?: number;
  soldQuantity?: number;
  remainingQuantity?: number;
  isActive?: boolean;
  saleStartDate?: string;
  saleEndDate?: string;
  minQuantityPerOrder?: number;
  maxQuantityPerOrder?: number;
  requiresApproval?: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
  event?: EventDetailsDTO;
}

/**
 * DTO for the event ticket type creation form.
 * Omits fields that are auto-generated or supplied by the system.
 */
export type EventTicketTypeFormDTO = Omit<EventTicketTypeDTO, 'id' | 'event' | 'tenantId' | 'createdAt' | 'updatedAt'>;

/**
 * DTO for event attendee, matches backend OpenAPI schema.
 */
export type EventAttendeeDTO = {
  id?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  isMember?: boolean;
  eventId: number;
  userId?: number;
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
  totalNumberOfGuests?: number;
  numberOfGuestsCheckedIn?: number;
  notes?: string;
  qrCodeData?: string;
  qrCodeGenerated?: boolean;
  qrCodeGeneratedAt?: string;
  dietaryRestrictions?: string;
  accessibilityNeeds?: string;
  emergencyContactRelationship?: string;
  checkOutTime?: string;
  attendanceRating?: number;
  feedback?: string;
  registrationSource?: string;
  waitListPosition?: number;
  priorityScore?: number;
  createdAt: string;
  updatedAt: string;
  event?: EventDetailsDTO;
};

/**
 * DTO for event attendee guest management.
 * Matches backend OpenAPI schema.
 */
export type EventAttendeeGuestDTO = {
  id?: number;
  tenantId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  ageGroup?: string;
  relationship?: string;
  specialRequirements?: string;
  registrationStatus?: string;
  checkInStatus?: string;
  checkInTime?: string;
  createdAt: string;
  updatedAt: string;
  primaryAttendee?: EventAttendeeDTO;
};

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

/**
 * DTO for event ticket transactions, matches backend OpenAPI schema.
 */
export interface EventTicketTransactionDTO {
  id?: number;
  tenantId?: string;
  transactionReference?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  taxAmount?: number;
  platformFeeAmount?: number;
  discountCodeId?: number;
  discountAmount?: number;
  finalAmount: number;
  status: string;
  paymentMethod?: string;
  paymentReference?: string;
  purchaseDate: string;
  confirmationSentAt?: string;
  refundAmount?: number;
  refundDate?: string;
  refundReason?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  stripePaymentStatus?: string;
  stripeCustomerEmail?: string;
  stripePaymentCurrency?: string;
  stripeAmountDiscount?: number;
  stripeAmountTax?: number;
  stripeFeeAmount?: number;
  eventId?: number;
  userId?: number;
  createdAt: string;
  updatedAt: string;
  event?: EventDetailsDTO;
  user?: UserProfileDTO;
  /** New check-in fields */
  checkInStatus?: string;
  numberOfGuestsCheckedIn?: number;
  checkInTime?: string;
  checkOutTime?: string;
}

export interface EventTicketTransactionItemDTO {
  id?: number;
  tenantId?: string;
  transactionId: number;
  ticketTypeId: number;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  discountAmount?: number;
  serviceFee?: number;
  createdAt: string;
  updatedAt: string;
  transaction?: EventTicketTransactionDTO;
  ticketType?: EventTicketTypeDTO;
}

/**
 * DTO for QR code usage, matches backend OpenAPI schema.
 */
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
  transaction?: EventTicketTransactionDTO;
  items?: EventTicketTransactionItemDTO[];
  eventDetails?: EventDetailsDTO;
  eventTicketTypes?: EventTicketTypeDTO[];
}

/**
 * DTO for tenant organization details.
 * Matches backend OpenAPI schema.
 */
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
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionStartDate?: string; // date (YYYY-MM-DD)
  subscriptionEndDate?: string;   // date (YYYY-MM-DD)
  monthlyFeeUsd?: number;
  stripeCustomerId?: string;
  isActive?: boolean;
  createdAt: string; // date-time
  updatedAt: string; // date-time
}

/**
 * DTO for tenant settings.
 * Matches backend OpenAPI schema.
 */
export interface TenantSettingsDTO {
  id?: number;
  tenantId: string;
  allowUserRegistration?: boolean;
  requireAdminApproval?: boolean;
  enableWhatsappIntegration?: boolean;
  enableEmailMarketing?: boolean;
  whatsappApiKey?: string;
  emailProviderConfig?: string;
  maxEventsPerMonth?: number;
  maxAttendeesPerEvent?: number;
  enableGuestRegistration?: boolean;
  maxGuestsPerAttendee?: number;
  defaultEventCapacity?: number;
  platformFeePercentage?: number;
  customCss?: string;
  customJs?: string;
  createdAt: string; // date-time
  updatedAt: string; // date-time
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

/**
 * DTO for discount codes, matches backend schema.
 */
export interface DiscountCodeDTO {
  id?: number;
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  maxUses?: number;
  usesCount?: number;
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  eventId: number;
  tenantId: string;
}

/**
 * DTO for event ticket transaction statistics, matches backend OpenAPI schema.
 * Used for /api/event-ticket-transactions/statistics/{eventId} endpoint.
 */
export interface EventTicketTransactionStatisticsDTO {
  /** Event ID for which statistics are calculated */
  eventId: number;
  /** Total number of tickets sold for the event */
  totalTicketsSold: number;
  /** Total amount collected for the event */
  totalAmount: number;

  netAmount: number;
  /** Map of ticket status to count (e.g., { COMPLETED: 26 }) */
  ticketsByStatus: Record<string, number>;
  /** Map of ticket status to total amount (e.g., { COMPLETED: 444 }) */
  amountByStatus: Record<string, number>;
}

/**
 * DTO for sending promotion emails, matches backend OpenAPI schema.
 * Required fields: bodyHtml, tenantId
 */
export interface PromotionEmailRequestDTO {
  /** Tenant ID (required) */
  tenantId: string;
  /** Recipient email address */
  to?: string;

  isTestEmail?: boolean;
  /** Email subject */
  subject?: string;
  /** Promo code to include in the email */
  promoCode?: string;
  /** HTML body of the email (required) */
  bodyHtml: string;
  /** Path to header image (optional) */
  headerImagePath?: string;
  /** Path to footer image or content (optional) */
  footerPath?: string;
  /** Email host URL prefix for email context */
  emailHostUrlPrefix?: string;
}
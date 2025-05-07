export interface UserTaskDTO {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  completed: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
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
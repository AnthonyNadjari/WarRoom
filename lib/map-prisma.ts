import type {
  InteractionStatus as PrismaInteractionStatus,
  CompanyType as PrismaCompanyType,
  InteractionType as PrismaInteractionType,
  InteractionSourceType as PrismaInteractionSourceType,
  ProcessStatus as PrismaProcessStatus,
  InteractionStage as PrismaInteractionStage,
} from "@prisma/client";

export function interactionStatusToApi(
  status: PrismaInteractionStatus
): string {
  if (status === "FollowUp") return "Follow-up";
  return status;
}

export function interactionStatusFromApi(
  status: string
): PrismaInteractionStatus {
  if (status === "Follow-up") return "FollowUp";
  return status as PrismaInteractionStatus;
}

const COMPANY_TYPE_API_TO_PRISMA: Record<string, PrismaCompanyType> = {
  "Hedge Fund": "HedgeFund",
  "Asset Manager": "AssetManager",
  "Private Equity": "PrivateEquity",
  "Prop Shop": "PropShop",
  Recruiter: "Recruiter",
  Bank: "Bank",
  Other: "Other",
};

export function companyTypeToPrisma(
  type: string
): PrismaCompanyType {
  return (COMPANY_TYPE_API_TO_PRISMA[type] ?? type) as PrismaCompanyType;
}

const COMPANY_TYPE_PRISMA_TO_API: Record<PrismaCompanyType, string> = {
  Bank: "Bank",
  HedgeFund: "Hedge Fund",
  AssetManager: "Asset Manager",
  PrivateEquity: "Private Equity",
  PropShop: "Prop Shop",
  Recruiter: "Recruiter",
  Other: "Other",
};

export function companyTypeToApi(type: PrismaCompanyType): string {
  return COMPANY_TYPE_PRISMA_TO_API[type] ?? type;
}

const INTERACTION_TYPE_PRISMA_TO_API: Record<PrismaInteractionType, string> = {
  OfficialApplication: "Official Application",
  LinkedInMessage: "LinkedIn Message",
  ColdEmail: "Cold Email",
  Call: "Call",
  Referral: "Referral",
};

const INTERACTION_TYPE_API_TO_PRISMA: Record<string, PrismaInteractionType> = {
  "Official Application": "OfficialApplication",
  "LinkedIn Message": "LinkedInMessage",
  "Cold Email": "ColdEmail",
  Call: "Call",
  Referral: "Referral",
};

export function interactionTypeToApi(type: PrismaInteractionType): string {
  return INTERACTION_TYPE_PRISMA_TO_API[type] ?? type;
}

export function interactionTypeFromApi(
  type: string
): PrismaInteractionType {
  return (INTERACTION_TYPE_API_TO_PRISMA[type] ?? type) as PrismaInteractionType;
}

const SOURCE_TYPE_PRISMA_TO_API: Record<PrismaInteractionSourceType, string> = {
  Direct: "Direct",
  ViaRecruiter: "Via Recruiter",
};

const SOURCE_TYPE_API_TO_PRISMA: Record<string, PrismaInteractionSourceType> = {
  Direct: "Direct",
  "Via Recruiter": "ViaRecruiter",
};

export function sourceTypeToApi(type: PrismaInteractionSourceType): string {
  return SOURCE_TYPE_PRISMA_TO_API[type] ?? type;
}

export function sourceTypeFromApi(type: string): PrismaInteractionSourceType {
  return (SOURCE_TYPE_API_TO_PRISMA[type] ?? type) as PrismaInteractionSourceType;
}

// ---- ProcessStatus ----
// ProcessStatus enum values are the same in Prisma and API (no @map needed)
// so these are simple pass-through functions for consistency.

export function processStatusToApi(status: PrismaProcessStatus): string {
  return status;
}

export function processStatusFromApi(status: string): PrismaProcessStatus {
  return status as PrismaProcessStatus;
}

// ---- InteractionStage ----

const STAGE_PRISMA_TO_API: Record<PrismaInteractionStage, string> = {
  Application: "Application",
  Screening: "Screening",
  PhoneInterview: "Phone Interview",
  Technical: "Technical",
  FinalRound: "Final Round",
  OfferStage: "Offer Stage",
  Other: "Other",
};

const STAGE_API_TO_PRISMA: Record<string, PrismaInteractionStage> = {
  Application: "Application",
  Screening: "Screening",
  "Phone Interview": "PhoneInterview",
  Technical: "Technical",
  "Final Round": "FinalRound",
  "Offer Stage": "OfferStage",
  Other: "Other",
};

export function interactionStageToApi(stage: PrismaInteractionStage): string {
  return STAGE_PRISMA_TO_API[stage] ?? stage;
}

export function interactionStageFromApi(stage: string): PrismaInteractionStage {
  return (STAGE_API_TO_PRISMA[stage] ?? stage) as PrismaInteractionStage;
}

export type WorkspaceRole = 'admin' | 'editor' | 'viewer';

export type WorkspacePlan = 'free' | 'team_starter' | 'team_pro';

export type WorkspaceAction =
  | 'workspace:read'
  | 'workspace:update'
  | 'members:read'
  | 'members:update'
  | 'invitations:create'
  | 'invitations:revoke'
  | 'brand-kit:read'
  | 'brand-kit:update'
  | 'billing:read'
  | 'billing:manage'
  | 'sso:read'
  | 'sso:manage';

export const WORKSPACE_ROLES: WorkspaceRole[] = ['admin', 'editor', 'viewer'];

export const WORKSPACE_PLANS: WorkspacePlan[] = ['free', 'team_starter', 'team_pro'];

export const MAX_MEMBERS_TEAM_STARTER = 5;

export const MAX_MEMBERS_FREE = 1;

const ROLE_PERMISSIONS: Record<WorkspaceRole, ReadonlySet<WorkspaceAction>> = {
  admin: new Set([
    'workspace:read',
    'workspace:update',
    'members:read',
    'members:update',
    'invitations:create',
    'invitations:revoke',
    'brand-kit:read',
    'brand-kit:update',
    'billing:read',
    'billing:manage',
    'sso:read',
    'sso:manage',
  ]),
  editor: new Set(['workspace:read', 'members:read', 'brand-kit:read']),
  viewer: new Set(['workspace:read', 'members:read', 'brand-kit:read']),
};

export function can(role: WorkspaceRole, action: WorkspaceAction): boolean {
  return ROLE_PERMISSIONS[role]?.has(action) ?? false;
}

export function isWorkspaceRole(value: string): value is WorkspaceRole {
  return (WORKSPACE_ROLES as readonly string[]).includes(value);
}

export function isWorkspacePlan(value: string): value is WorkspacePlan {
  return (WORKSPACE_PLANS as readonly string[]).includes(value);
}

export function isPaidPlan(plan: WorkspacePlan): boolean {
  return plan === 'team_starter' || plan === 'team_pro';
}

export function maxMembersForPlan(plan: WorkspacePlan): number | null {
  switch (plan) {
    case 'free':
      return MAX_MEMBERS_FREE;
    case 'team_starter':
      return MAX_MEMBERS_TEAM_STARTER;
    case 'team_pro':
      return null;
  }
}

export function canAddMember(plan: WorkspacePlan, currentMemberCount: number): boolean {
  const max = maxMembersForPlan(plan);
  if (max === null) {
    return true;
  }
  return currentMemberCount < max;
}

export function isMemberLimitReached(plan: WorkspacePlan, currentMemberCount: number): boolean {
  return !canAddMember(plan, currentMemberCount);
}

const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

export function hasMinRole(role: WorkspaceRole, minRole: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export function computeInvitationExpiresAt(now = new Date()): Date {
  return invitationExpiresAt(now);
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  auth0OrgId?: string | null;
  memberCount: number;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
}

export interface MemberResponse {
  userId: string;
  email: string | null;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface InvitationResponse {
  id: string;
  email: string | null;
  role: WorkspaceRole;
  token: string;
  inviteUrl: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface BrandKitColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
}

export interface BrandKitFonts {
  heading?: string;
  body?: string;
}

export interface BrandKitWatermark {
  enabled?: boolean;
  displayName?: string | null;
  url?: string | null;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity?: number;
}

export interface BrandKitConfig {
  colors: BrandKitColors;
  fonts: BrandKitFonts;
  watermark: BrandKitWatermark;
  logoUrl: string | null;
  updatedAt: string | null;
}

export interface BillingStatusResponse {
  plan: WorkspacePlan;
  status: string | null;
  seatCount: number;
  memberCount: number;
  seatMismatch: boolean;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
}

export interface CheckoutSessionResponse {
  url: string;
}

export interface SsoStatusResponse {
  enabled: boolean;
  auth0OrgId: string | null;
  setupUrl: string | null;
}

export const INVITATION_EXPIRY_DAYS = 7;

export function invitationExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

export function isInvitationExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function stripePriceForPlan(
  plan: Extract<WorkspacePlan, 'team_starter' | 'team_pro'>,
  prices: { teamStarter: string; teamPro: string }
): string {
  return plan === 'team_starter' ? prices.teamStarter : prices.teamPro;
}

import type { CollabDocumentState } from '@snapglow/collab-core';
import type { TemplateStyle } from '@snapglow/marketplace-core';
import type { BrandKitColors, BrandKitFonts, BrandKitWatermark } from '@snapglow/team-core';
import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const workspacePlanEnum = pgEnum('workspace_plan', ['free', 'team_starter', 'team_pro']);
export const workspaceRoleEnum = pgEnum('workspace_role', ['admin', 'editor', 'viewer']);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'past_due',
  'canceled',
  'trialing',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'comment',
  'mention',
  'invitation',
]);

export const templateStatusEnum = pgEnum('template_status', ['pending', 'approved', 'rejected']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    auth0Sub: text('auth0_sub').notNull(),
    email: text('email'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('users_auth0_sub_idx').on(table.auth0Sub)]
);

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    plan: workspacePlanEnum('plan').default('free').notNull(),
    auth0OrgId: text('auth0_org_id'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('workspaces_slug_idx').on(table.slug)]
);

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: workspaceRoleEnum('role').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index('workspace_members_user_id_idx').on(table.userId),
  ]
);

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text('email'),
    role: workspaceRoleEnum('role').notNull(),
    token: text('token').notNull(),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('invitations_token_idx').on(table.token),
    index('invitations_workspace_id_idx').on(table.workspaceId),
  ]
);

export const brandKits = pgTable('brand_kits', {
  workspaceId: uuid('workspace_id')
    .primaryKey()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  colors: jsonb('colors').$type<BrandKitColors>().default({}).notNull(),
  fonts: jsonb('fonts').$type<BrandKitFonts>().default({}).notNull(),
  logoStorageKey: text('logo_storage_key'),
  watermark: jsonb('watermark').$type<BrandKitWatermark>().default({}).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceSubscriptions = pgTable('workspace_subscriptions', {
  workspaceId: uuid('workspace_id')
    .primaryKey()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  status: subscriptionStatusEnum('status'),
  seatCount: integer('seat_count').default(1).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  /** `created` of the last Stripe event applied, so a late older event cannot undo a newer one. */
  lastEventCreated: timestamp('last_event_created', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const shares = pgTable(
  'shares',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
    token: text('token').notNull(),
    storageKey: text('storage_key').notNull(),
    mimeType: text('mime_type').notNull(),
    byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
    title: text('title'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('shares_token_idx').on(table.token),
    index('shares_expires_at_idx').on(table.expiresAt).where(sql`${table.expiresAt} IS NOT NULL`),
  ]
);

export const libraryItems = pgTable(
  'library_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
    storageKey: text('storage_key').notNull(),
    mimeType: text('mime_type').notNull(),
    byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
    ocrText: text('ocr_text'),
    title: text('title'),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    localId: text('local_id'),
    syncVersion: integer('sync_version').default(1).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('library_items_user_local_id_idx').on(table.userId, table.localId),
    index('library_items_user_created_idx').on(table.userId, table.createdAt),
    index('library_items_workspace_created_idx').on(table.workspaceId, table.createdAt.desc()),
    index('library_items_ocr_text_idx').using(
      'gin',
      sql`to_tsvector('english', coalesce(${table.ocrText}, ''))`
    ),
  ]
);

export const collections = pgTable(
  'collections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('collections_user_name_idx').on(table.userId, table.name)]
);

export const libraryItemCollections = pgTable(
  'library_item_collections',
  {
    libraryItemId: uuid('library_item_id')
      .notNull()
      .references(() => libraryItems.id, { onDelete: 'cascade' }),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.libraryItemId, table.collectionId] })]
);

export const collabDocuments = pgTable(
  'collab_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    libraryItemId: uuid('library_item_id').references(() => libraryItems.id, {
      onDelete: 'set null',
    }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    title: text('title'),
    screenshotStorageKey: text('screenshot_storage_key').notNull(),
    screenshotMimeType: text('screenshot_mime_type').notNull(),
    screenshotByteSize: bigint('screenshot_byte_size', { mode: 'number' }).notNull(),
    documentState: jsonb('document_state')
      .$type<CollabDocumentState>()
      .default({} as CollabDocumentState)
      .notNull(),
    version: bigint('version', { mode: 'number' }).default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('collab_documents_workspace_id_idx').on(table.workspaceId)]
);

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => collabDocuments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, {
      onDelete: 'set null',
    }),
    body: text('body').notNull(),
    anchor: jsonb('anchor').$type<{ x: number; y: number } | null>(),
    mentionUserIds: jsonb('mention_user_ids').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('comments_document_id_idx').on(table.documentId)]
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().default({}).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('notifications_user_id_idx').on(table.userId)]
);

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    keyHash: text('key_hash').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('api_keys_key_hash_idx').on(table.keyHash),
    index('api_keys_workspace_id_idx').on(table.workspaceId),
  ]
);

export const userSettings = pgTable(
  'user_settings',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.key] }),
    index('user_settings_updated_at_idx').on(table.updatedAt),
  ]
);

export const templateListings = pgTable(
  'template_listings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: templateStatusEnum('status').default('pending').notNull(),
    style: jsonb('style').$type<TemplateStyle>().notNull(),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    previewUrl: text('preview_url'),
    downloadCount: integer('download_count').default(0).notNull(),
    featured: boolean('featured').default(false).notNull(),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('template_listings_slug_idx').on(table.slug),
    index('template_listings_status_idx').on(table.status),
    index('template_listings_featured_idx').on(table.featured),
  ]
);

export const apiCaptures = pgTable(
  'api_captures',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    apiKeyId: uuid('api_key_id')
      .notNull()
      .references(() => apiKeys.id, { onDelete: 'restrict' }),
    storageKey: text('storage_key').notNull(),
    exportStorageKey: text('export_storage_key'),
    documentState: jsonb('document_state')
      .$type<CollabDocumentState>()
      .default({} as CollabDocumentState)
      .notNull(),
    mimeType: text('mime_type').notNull(),
    byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
    title: text('title'),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('api_captures_workspace_id_idx').on(table.workspaceId),
    index('api_captures_created_at_idx').on(table.createdAt.desc()),
  ]
);

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type BrandKit = typeof brandKits.$inferSelect;
export type WorkspaceSubscription = typeof workspaceSubscriptions.$inferSelect;
export type Share = typeof shares.$inferSelect;
export type LibraryItem = typeof libraryItems.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type CollabDocument = typeof collabDocuments.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type ApiCapture = typeof apiCaptures.$inferSelect;
export type TemplateListing = typeof templateListings.$inferSelect;

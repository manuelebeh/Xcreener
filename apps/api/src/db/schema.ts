import { bigint, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

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

export const shares = pgTable(
  'shares',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    storageKey: text('storage_key').notNull(),
    mimeType: text('mime_type').notNull(),
    byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('shares_token_idx').on(table.token)]
);

export const libraryItems = pgTable(
  'library_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull(),
    mimeType: text('mime_type').notNull(),
    byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
    ocrText: text('ocr_text'),
    title: text('title'),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    localId: text('local_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('library_items_user_local_id_idx').on(table.userId, table.localId)]
);

export const collections = pgTable(
  'collections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
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

export type User = typeof users.$inferSelect;
export type Share = typeof shares.$inferSelect;
export type LibraryItem = typeof libraryItems.$inferSelect;
export type Collection = typeof collections.$inferSelect;

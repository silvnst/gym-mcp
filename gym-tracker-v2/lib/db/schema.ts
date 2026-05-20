import { pgTable, text, integer, numeric, timestamp, date, uuid } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const planExercises = pgTable('plan_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
  targetSets: integer('target_sets').notNull(),
  targetReps: integer('target_reps').notNull(),
  targetWeightKg: numeric('target_weight_kg', { precision: 8, scale: 2 }),
  notes: text('notes'),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  planId: uuid('plan_id').references(() => plans.id, { onDelete: 'set null' }),
  date: date('date').notNull(),
  name: text('name').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const sessionExercises = pgTable('session_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  planExerciseId: uuid('plan_exercise_id').references(() => planExercises.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
  targetSets: integer('target_sets'),
  targetReps: integer('target_reps'),
  targetWeightKg: numeric('target_weight_kg', { precision: 8, scale: 2 }),
})

export const sets = pgTable('sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionExerciseId: uuid('session_exercise_id').notNull().references(() => sessionExercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),
  reps: integer('reps'),
  weightKg: numeric('weight_kg', { precision: 8, scale: 2 }),
})

export const oauthCodes = pgTable('oauth_codes', {
  code: text('code').primaryKey(),
  userId: uuid('user_id').notNull(),
  codeChallenge: text('code_challenge').notNull(),
  redirectUri: text('redirect_uri').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
})

export const oauthTokens = pgTable('oauth_tokens', {
  token: text('token').primaryKey(),
  userId: uuid('user_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
})

// Relations
export const plansRelations = relations(plans, ({ many }) => ({
  planExercises: many(planExercises),
  sessions: many(sessions),
}))

export const planExercisesRelations = relations(planExercises, ({ one, many }) => ({
  plan: one(plans, { fields: [planExercises.planId], references: [plans.id] }),
  sessionExercises: many(sessionExercises),
}))

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  plan: one(plans, { fields: [sessions.planId], references: [plans.id] }),
  sessionExercises: many(sessionExercises),
}))

export const sessionExercisesRelations = relations(sessionExercises, ({ one, many }) => ({
  session: one(sessions, { fields: [sessionExercises.sessionId], references: [sessions.id] }),
  planExercise: one(planExercises, { fields: [sessionExercises.planExerciseId], references: [planExercises.id] }),
  sets: many(sets),
}))

export const setsRelations = relations(sets, ({ one }) => ({
  sessionExercise: one(sessionExercises, { fields: [sets.sessionExerciseId], references: [sessionExercises.id] }),
}))

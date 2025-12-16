import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const appUsers = pgTable("app_users", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  avatarSvg: text("avatar_svg"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const connectionRequests = pgTable("connection_requests", {
  id: serial("id").primaryKey(),
  fromUserId: varchar("from_user_id").notNull(),
  fromUserName: text("from_user_name").notNull(),
  fromUserRole: varchar("from_user_role", { length: 20 }).notNull(),
  fromUserAvatar: text("from_user_avatar"),
  toUserId: varchar("to_user_id").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deviceTokens = pgTable("device_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  token: text("token").notNull().unique(),
  platform: varchar("platform", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const familyConnections = pgTable("family_connections", {
  id: serial("id").primaryKey(),
  parentId: varchar("parent_id").notNull(),
  childId: varchar("child_id").notNull(),
  childName: varchar("child_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  itemId: varchar("item_id").notNull(),
  itemSvgData: text("item_svg_data").notNull(),
  itemName: text("item_name"),
  quantity: integer("quantity").notNull().default(1),
  note: text("note"),
  assignedToId: varchar("assigned_to_id").notNull(),
  assignedToName: text("assigned_to_name").notNull(),
  assignedById: varchar("assigned_by_id").notNull(),
  assignedByName: text("assigned_by_name").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDeviceTokenSchema = createInsertSchema(deviceTokens).pick({
  userId: true,
  token: true,
  platform: true,
});

export const insertFamilyConnectionSchema = createInsertSchema(familyConnections).pick({
  parentId: true,
  childId: true,
  childName: true,
});

export const insertAppUserSchema = createInsertSchema(appUsers).pick({
  id: true,
  name: true,
  role: true,
  avatarSvg: true,
});

export const insertConnectionRequestSchema = createInsertSchema(connectionRequests).pick({
  fromUserId: true,
  fromUserName: true,
  fromUserRole: true,
  fromUserAvatar: true,
  toUserId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type DeviceToken = typeof deviceTokens.$inferSelect;
export type InsertDeviceToken = z.infer<typeof insertDeviceTokenSchema>;
export type FamilyConnection = typeof familyConnections.$inferSelect;
export type InsertFamilyConnection = z.infer<typeof insertFamilyConnectionSchema>;
export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = z.infer<typeof insertAppUserSchema>;
export type ConnectionRequest = typeof connectionRequests.$inferSelect;
export type InsertConnectionRequest = z.infer<typeof insertConnectionRequestSchema>;

export const insertTaskSchema = createInsertSchema(tasks).pick({
  itemId: true,
  itemSvgData: true,
  itemName: true,
  quantity: true,
  note: true,
  assignedToId: true,
  assignedToName: true,
  assignedById: true,
  assignedByName: true,
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

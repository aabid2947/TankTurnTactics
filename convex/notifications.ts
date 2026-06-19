import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** The caller's notifications, newest first (capped at 50), plus the unread count. */
export const getMyNotifications = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { items: [], unread: 0 };
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
    const unread = items.filter((n) => n.readAt === undefined).length;
    return { items, unread };
  },
});

/** Mark one of the caller's notifications read. */
export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const n = await ctx.db.get(notificationId);
    if (n && n.userId === userId && n.readAt === undefined) {
      await ctx.db.patch(notificationId, { readAt: Date.now() });
    }
  },
});

/** Mark all of the caller's unread notifications read. */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("readAt"), undefined))
      .collect();
    const now = Date.now();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { readAt: now })));
  },
});

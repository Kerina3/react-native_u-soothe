import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// 註冊新使用者
export const register = mutation({
  args: {
    Password: v.string(),
    Role: v.string(), // 患者端、照護者端
    Age: v.union(v.string(), v.number()),
    Gender: v.string(),
    Name: v.string(),
    Gmail: v.string(),
  },
  handler: async (ctx, args) => {
    // 檢查信箱是否已存在
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_gmail", (q) => q.eq("Gmail", args.Gmail))
      .first();

    if (existingUser) {
      throw new Error("此信箱已被註冊");
    }

    // 寫入 Users 資料表
    const userId = await ctx.db.insert("users", {
      Password: args.Password,
      Role: args.Role,
      Age: args.Age,
      Gender: args.Gender,
      Name: args.Name,
      Gmail: args.Gmail,
    });

    const newUser = await ctx.db.get(userId);
    return newUser;
  },
});

// 儲存或更新 Clerk 使用者資料 (不含密碼，提升安全性)
export const storeUser = mutation({
  args: {
    Role: v.string(),
    Age: v.union(v.string(), v.number()),
    Gender: v.string(),
    Name: v.string(),
    Gmail: v.string(),
    ClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_gmail", (q) => q.eq("Gmail", args.Gmail))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        Name: args.Name,
        Role: args.Role,
        Age: args.Age,
        Gender: args.Gender,
        ClerkId: args.ClerkId, // 儲存 ClerkId!
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      Name: args.Name,
      Gmail: args.Gmail,
      Role: args.Role,
      Age: args.Age,
      Gender: args.Gender,
      Password: "clerk-authenticated", // 實際驗證由 Clerk 負責
      ClerkId: args.ClerkId, // 儲存 ClerkId!
    });
  },
});

// 使用者登入驗證
export const login = mutation({
  args: {
    Gmail: v.string(),
    Password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_gmail", (q) => q.eq("Gmail", args.Gmail))
      .first();

    if (!user) {
      throw new Error("找不到此帳號，請先註冊");
    }

    if (user.Password !== args.Password && user.Password !== "clerk-authenticated") {
      throw new Error("密碼錯誤");
    }

    return user;
  },
});

// 根據信箱獲取使用者資料
export const getUserByEmail = query({
  args: {
    Gmail: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_gmail", (q) => q.eq("Gmail", args.Gmail))
      .first();
  },
});

// Webhook 專用：建立或同步 Clerk 使用者
export const upsertUserFromClerk = mutation({
  args: {
    ClerkId: v.string(),
    Gmail: v.string(),
    Name: v.string(),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_gmail", (q) => q.eq("Gmail", args.Gmail))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        ClerkId: args.ClerkId,
        Name: args.Name,
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      ClerkId: args.ClerkId,
      Gmail: args.Gmail,
      Name: args.Name,
      Password: "clerk-authenticated",
      Role: "患者端", // 預設值，後續可在 App 修改
      Age: 0,
      Gender: "男",
    });
  },
});

// Webhook 專用：刪除 Clerk 使用者
export const deleteUserFromClerk = mutation({
  args: {
    ClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("ClerkId", args.ClerkId))
      .first();

    if (user) {
      await ctx.db.delete(user._id);
      console.log(`Successfully deleted user with ClerkId: ${args.ClerkId}`);
      return true;
    }
    console.log(`User with ClerkId: ${args.ClerkId} not found`);
    return false;
  },
});


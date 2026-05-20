import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    body: v.string(),
    author: v.string(), // 確保這一行存在
  }),
  users: defineTable({
    Password: v.string(),
    Role: v.string(), // 患者端、照護者端
    Age: v.union(v.string(), v.number()), // 支援字串或數字格式的年齡
    Gender: v.string(),
    Name: v.string(),
    Gmail: v.string(),
  }).index("by_gmail", ["Gmail"]),
});

import { Context } from "grammy";
import { User } from "./user.model";

// Extend context to include user
export interface BotContext extends Context {
  user?: User;
}

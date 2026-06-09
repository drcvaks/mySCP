import { UserProfile } from "./types";

export function isGlobalAdmin(user: UserProfile) {
  return user.role === "global_admin";
}

export function isRabbi(user: UserProfile) {
  return user.role === "local_rabbi";
}

export function isAdmin(user: UserProfile) {
  return user.role === "local_admin";
}

import { ChaburahMembership, UserProfile } from "./types";

export function chaburahToolAccess(
  user: Pick<UserProfile, "id" | "role"> | null | undefined,
  memberships: ChaburahMembership[],
  chaburahId?: string
) {
  if (user?.role === "global_admin") return { rabbiHub: true, admin: true };
  const currentMemberships = user && chaburahId
    ? memberships.filter(member => member.userId === user.id && member.chaburahId === chaburahId && member.status === "active")
    : [];
  const rabbiHub = currentMemberships.some(member => member.memberRole === "rabbi");
  return { rabbiHub, admin: rabbiHub || currentMemberships.some(member => member.memberRole === "admin") };
}

export function isGlobalAdmin(user: UserProfile) {
  return user.role === "global_admin";
}

export function isRabbi(user: UserProfile) {
  return user.role === "local_rabbi";
}

export function isAdmin(user: UserProfile) {
  return user.role === "local_admin";
}

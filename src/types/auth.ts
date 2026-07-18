import type { UserRoleValue } from "@/types/domain";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRoleValue;
  teamId: string | null;
};

export type SessionResponse = {
  user: SessionUser | null;
};

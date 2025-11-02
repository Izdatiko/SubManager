import { User } from "./user.model";
import { Room } from "./room.model";

// RoomMember model type based on Prisma schema
export interface RoomMember {
  id: number;
  userId: number;
  roomId: number;
  joinedAt: Date;
  isActive: boolean;
}

// RoomMember with user relation
export interface RoomMemberWithUser extends RoomMember {
  user: User;
}

// RoomMember with room relation
export interface RoomMemberWithRoom extends RoomMember {
  room: Room;
}

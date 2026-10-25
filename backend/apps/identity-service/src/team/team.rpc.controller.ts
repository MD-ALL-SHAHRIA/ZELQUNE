import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  type AuthUser,
  type CreateTeamMemberInput,
  RPC_PATTERNS,
  type RpcRequest,
  type TeamMember,
  type UpdateTeamMemberInput,
} from '@zelqune/contracts';
import { z } from 'zod';
import { TeamService } from './team.service';

const T = RPC_PATTERNS.identity.team;
const id = z.uuid();

@Controller()
export class TeamRpcController {
  constructor(private readonly team: TeamService) {}

  @MessagePattern(T.list)
  list(): Promise<{ items: TeamMember[] }> {
    return this.team.list();
  }

  @MessagePattern(T.create)
  create(@Payload() req: RpcRequest<CreateTeamMemberInput>): Promise<TeamMember> {
    return this.team.create(req.data);
  }

  @MessagePattern(T.update)
  update(
    @Payload() req: RpcRequest<{ actorId: string; id: string; changes: UpdateTeamMemberInput }>,
  ): Promise<TeamMember> {
    return this.team.update(id.parse(req.data.actorId), id.parse(req.data.id), req.data.changes);
  }

  @MessagePattern(T.resetPassword)
  resetPassword(@Payload() req: RpcRequest<{ id: string; password: string }>) {
    return this.team.resetPassword(id.parse(req.data.id), { password: req.data.password });
  }

  @MessagePattern(T.changePassword)
  changePassword(
    @Payload() req: RpcRequest<{ userId: string; currentPassword: string; newPassword: string }>,
  ) {
    const { userId, ...rest } = req.data;
    return this.team.changePassword(id.parse(userId), rest);
  }

  @MessagePattern(T.updateProfile)
  updateProfile(
    @Payload() req: RpcRequest<{ userId: string; name: string; email: string | null }>,
  ): Promise<AuthUser> {
    const { userId, ...rest } = req.data;
    return this.team.updateProfile(id.parse(userId), rest);
  }
}

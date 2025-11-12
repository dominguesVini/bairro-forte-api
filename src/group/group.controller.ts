import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  BadRequestException,
  Delete,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GroupService } from './group.service';
import { AddUserToGroupDto } from './dto/add-user-to-group.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { SecurityGroup } from './entities/group.entity';
import { InviteUserByPhoneDto } from './dto/invite-user-by-phone.dto';
import { CreateGroupWithUsersDto } from './dto/create-group-with-users.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { LeaveGroupDto } from './dto/leave-group.dto';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { OptionalFirebaseAuthGuard } from 'src/auth/optional-firebase-auth.guard';

@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post('add/user')
  addUserToGroup(@Body() dto: AddUserToGroupDto) {
    return this.groupService.addUserToGroup(dto);
  }

  @Get('with/users')
  listGroupsWithUsers() {
    return this.groupService.findAllGroupsWithUsers();
  }

  @Post(':groupId/remove/users')
  async removeUsersFromGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body('userIds') userIds: number[],
    @Req() req: any,
  ) {
    if (!userIds || userIds.length === 0) {
      throw new BadRequestException('Nenhum usuário fornecido para remoção.');
    }

    const requesterEmail = req.user?.email;
    return this.groupService.removeUsersIfOwner(
      groupId,
      userIds,
      requesterEmail,
    );
  }

  @Get('user/:userId')
  listGroupsByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.groupService.findAllGroupsByUserId(userId);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('me')
  listMyGroups(@Req() req: any) {
    const email = req.user?.email;
    return this.groupService.findMyGroups(email);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('available')
  listAvailableGroups(@Req() req: any) {
    const email = req.user?.email;
    return this.groupService.findAvailableGroups(email);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post()
  createGroup(@Body() dto: CreateGroupDto, @Req() req: any) {
    const creatorEmail = req.user?.email;
    return this.groupService.createGroup(dto, creatorEmail);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('with-users')
  createGroupWithUsers(@Body() dto: CreateGroupWithUsersDto, @Req() req: any) {
    const creatorEmail = req.user?.email;
    return this.groupService.createGroupWithUsers(dto, creatorEmail);
  }

  @UseGuards(OptionalFirebaseAuthGuard)
  @Put(':groupId')
  async updateGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() updateData: UpdateGroupDto,
    @Req() req: any,
  ) {
    const email = req.user?.email;
    return this.groupService.updateGroup(groupId, updateData, email);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('invite/by-phone')
  async inviteUserByPhone(@Body() dto: InviteUserByPhoneDto, @Req() req: any) {
    const email = req.user?.email;
    return this.groupService.inviteUserByPhone(dto, email);
  }

  @UseGuards(OptionalFirebaseAuthGuard)
  @Get()
  async getGroups(@Req() req: any) {
    // Verifica se tem token de autenticação
    const email = req.user?.email;
    const cityId = req.user?.city?.city_id;

    // Se tiver email, retorna os grupos do usuário com a propriedade isDono
    if (email) {
      return this.groupService.findMyGroups(email);
    }

    // Se não tiver email, retorna apenas os grupos públicos
    return this.groupService.publicGroups();
  }

  @UseGuards(OptionalFirebaseAuthGuard)
  @Get(':groupId')
  async getGroupDetails(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Req() req: any,
  ) {
    // Verifica se o usuário está autenticado para determinar se é o dono
    const email = req.user?.email;
    return this.groupService.findGroupDetails(groupId, email);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('leave')
  async leaveGroup(@Body() dto: LeaveGroupDto, @Req() req: any) {
    const email = req.user?.email;
    return this.groupService.leaveGroup(dto.group_id, email);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post(':groupId/join')
  async joinGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Req() req: any,
  ) {
    const email = req.user?.email;
    return this.groupService.joinGroup(groupId, email);
  }
}

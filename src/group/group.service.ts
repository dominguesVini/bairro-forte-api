import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { In, Repository } from 'typeorm';
import { AddUserToGroupDto } from './dto/add-user-to-group.dto';
import { SecurityGroup } from './entities/group.entity';
import { UserSecurityGroup } from './entities/user_security_groups';
import { CreateGroupDto } from './dto/create-group.dto';
import { OneSignalService } from 'src/notifications/onesignal.service';
import { InviteUserByPhoneDto } from './dto/invite-user-by-phone.dto';
import { CreateGroupWithUsersDto } from './dto/create-group-with-users.dto';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(SecurityGroup)
    private groupRepo: Repository<SecurityGroup>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(UserSecurityGroup)
    private userGroupRepo: Repository<UserSecurityGroup>,

    private readonly oneSignalService: OneSignalService,
  ) {}

  async addUserToGroup(dto: AddUserToGroupDto): Promise<string> {
    // Carrega também a cidade do usuário
    const user = await this.userRepo.findOne({
      where: { user_id: dto.user_id },
      relations: ['city'],
    });
    const group = await this.groupRepo.findOne({
      where: { group_id: dto.group_id },
      relations: ['city'],
    });

    if (!user || !group)
      throw new NotFoundException('Usuário ou grupo não encontrado.');

    // Verifica cidade: usuário só pode entrar em grupo da mesma cidade (se ambas existirem)
    if (user.city && group.city && user.city.city_id !== group.city.city_id) {
      throw new ForbiddenException(
        'Usuário não pode entrar em grupo de outra cidade.',
      );
    }

    const alreadyExists = await this.userGroupRepo.findOne({
      where: { user_id: dto.user_id, group_id: dto.group_id },
    });

    if (alreadyExists) return 'Usuário já está no grupo.';

    const userGroup = this.userGroupRepo.create({
      user_id: dto.user_id,
      group_id: dto.group_id,
    });
    await this.userGroupRepo.save(userGroup);
    return 'Usuário adicionado ao grupo com sucesso.';
  }
  async findAllGroupsWithUsers() {
    const groups = await this.groupRepo
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.userSecurityGroups', 'userSecurityGroup')
      .leftJoinAndSelect('userSecurityGroup.user', 'user')
      .select([
        'group.group_id',
        'group.name',
        'group.created_at',
        'group.created_by',
        'userSecurityGroup.user_id',
        'userSecurityGroup.group_id',
        'user.user_id',
        'user.name',
        'user.email',
        'user.role',
        'user.gender',
        'user.show_info_in_groups',
        'user.share_reported_info',
        'user.notification_token',
      ])
      .getMany();

    return groups;
  }
  async publicGroups() {
    return this.groupRepo.query(`
SELECT 
  sg.group_id,
  sg.name,
  sg.created_at,
  sg.created_by,
  sg.private,
  sg.city_id
FROM security_groups AS sg
WHERE sg.private = 0;
      `);
    const groups = await this.groupRepo
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.userSecurityGroups', 'userSecurityGroup')
      .leftJoinAndSelect('userSecurityGroup.user', 'user')
      .select([
        'group.group_id',
        'group.name',
        'group.created_at',
        'group.created_by',
        'userSecurityGroup.user_id',
        'userSecurityGroup.group_id',
        'user.user_id',
        'user.name',
        'user.email',
        'user.role',
        'user.gender',
        'user.show_info_in_groups',
        'user.share_reported_info',
        'user.notification_token',
      ])
      .getMany();

    return groups;
  }
  async listGroupsWithUsers(): Promise<SecurityGroup[]> {
    return this.groupRepo.find({
      relations: ['userSecurityGroups', 'userSecurityGroups.user'],
    });
  }

  async findGroupDetails(groupId: number, userEmail?: string): Promise<any> {
    // Busca o grupo com todos os relacionamentos
    const group = await this.groupRepo
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.userSecurityGroups', 'userSecurityGroup')
      .leftJoinAndSelect('userSecurityGroup.user', 'user')
      .leftJoinAndSelect('group.created_by', 'creator')
      .leftJoinAndSelect('group.city', 'city')
      .where('group.group_id = :groupId', { groupId })
      .select([
        'group.group_id',
        'group.name',
        'group.created_at',
        'group.private',
        'group.created_by',
        'group.city_id',
        'creator.user_id',
        'creator.name',
        'creator.email',
        'creator.role',
        'creator.gender',
        'userSecurityGroup.user_id',
        'userSecurityGroup.group_id',
        'user.user_id',
        'user.name',
        'user.email',
        'user.role',
        'user.gender',
        'user.phone',
        'user.show_info_in_groups',
        'user.share_reported_info',
      ])
      .getOne();

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    // Verificar se o usuário atual é o dono
    let isDono = false;
    if (userEmail) {
      const user = await this.userRepo.findOne({ where: { email: userEmail } });
      if (user) {
        isDono = group.created_by?.user_id === user.user_id;
      }
    }

    // Formatar os usuários para excluir informações sensíveis
    const users = group.userSecurityGroups.map((usg) => {
      // Se o usuário não quer mostrar informações em grupos, retornamos apenas o ID e o nome
      if (!usg.user.show_info_in_groups) {
        return {
          user_id: usg.user.user_id,
          name: usg.user.name,
          privacy_restricted: true,
        };
      }

      // Para usuários que permitem compartilhamento de informações, retornamos detalhes completos
      return {
        user_id: usg.user.user_id,
        name: usg.user.name,
        email: usg.user.email,
        role: usg.user.role,
        gender: usg.user.gender,
        phone: usg.user.phone,
        share_reported_info: usg.user.share_reported_info,
        show_info_in_groups: true,
      };
    });

    // Prepara as informações do criador do grupo
    const creatorInfo = group.created_by
      ? {
          user_id: group.created_by.user_id,
          name: group.created_by.name,
          email: group.created_by.email,
          role: group.created_by.role,
          gender: group.created_by.gender,
        }
      : null;

    // Retorna o grupo formatado com a lista de usuários
    return {
      group_id: group.group_id,
      name: group.name,
      created_at: group.created_at,
      private: group.private,
      city_id: (group as any).city_id,
      isDono,
      created_by: creatorInfo,
      users,
      total_users: users.length,
    };
  }

  async findAllGroupsByUserId(userId: number) {
    const groups = await this.groupRepo
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.userSecurityGroups', 'userSecurityGroup')
      .leftJoinAndSelect('userSecurityGroup.user', 'user')
      .leftJoinAndSelect('group.created_by', 'creator')
      .where('user.user_id = :userId', { userId })
      .select([
        'group.group_id',
        'group.name',
        'group.created_at',
        'group.created_by',
        'creator.user_id',
        'creator.name',
        'creator.email',
        'userSecurityGroup.user_id',
        'userSecurityGroup.group_id',
        'user.user_id',
        'user.name',
        'user.email',
        'user.role',
        'user.gender',
        'user.show_info_in_groups',
        'user.share_reported_info',
        'user.notification_token',
      ])
      .getMany();

    return groups;
  }

  /**
   * Busca todos os grupos do usuário pelo email e adiciona a informação
   * se o usuário é dono do grupo ou não (isDono)
   */
  async findMyGroups(email: string) {
    // Busca o usuário com a cidade
    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['city'],
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const qb = this.groupRepo
      .createQueryBuilder('g')
      .innerJoin(
        'g.userSecurityGroups',
        'usgMembership',
        'usgMembership.user_id = :uid',
        { uid: user.user_id },
      )
      .leftJoin('g.userSecurityGroups', 'usgAll')
      .leftJoin('usgAll.user', 'member')
      .leftJoin('g.created_by', 'creator')
      .leftJoin('g.city', 'city')
      .select([
        'g.group_id as group_id',
        'g.name as name',
        'g.created_at as created_at',
        'g.private as private',
        'g.city_id as city_id',
        'creator.user_id as creator_user_id',
        'creator.name as creator_name',
        'creator.email as creator_email',
      ])
      .addSelect('COUNT(DISTINCT usgAll.user_id)', 'total_users')
      .groupBy('g.group_id');

    // Aplica filtro de cidade apenas se usuário tem cidade
    if (user.city?.city_id) {
      qb.andWhere('(g.city_id IS NULL OR g.city_id = :cityId)', {
        cityId: user.city.city_id,
      });
    }

    const raw = await qb.getRawMany();

    // Determinar propriedade e formatar saída
    return raw.map((r) => ({
      group_id: Number(r.group_id),
      name: r.name,
      created_at: r.created_at,
      private: !!r.private,
      city_id: r.city_id !== null ? Number(r.city_id) : null,
      isDono: Number(r.creator_user_id) === user.user_id,
      created_by: r.creator_user_id
        ? {
            user_id: Number(r.creator_user_id),
            name: r.creator_name,
            email: r.creator_email,
          }
        : null,
      total_users: Number(r.total_users),
    }));
  }

  async removeUsersIfOwner(
    groupId: number,
    userIds: number[],
    requesterEmail: string,
  ) {
    const group = await this.groupRepo
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.created_by', 'creator')
      .addSelect([
        'creator.user_id',
        'creator.name',
        'creator.email',
        'creator.role',
        'creator.gender',
        'ST_X(creator.location) AS longitude',
        'ST_Y(creator.location) AS latitude',
        'creator.show_info_in_groups',
        'creator.share_reported_info',
        'creator.notification_token',
      ])
      .where('group.group_id = :groupId', { groupId })
      .getOne();

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    // Verifica se quem está fazendo a requisição é o criador do grupo
    if (group.created_by.email !== requesterEmail) {
      throw new ForbiddenException(
        'Você não tem permissão para remover usuários deste grupo',
      );
    }

    // Remove os usuários vinculados ao grupo
    await this.groupRepo
      .createQueryBuilder()
      .delete()
      .from(UserSecurityGroup)
      .where('group_id = :groupId', { groupId })
      .andWhere('user_id IN (:...userIds)', { userIds })
      .execute();

    return { message: 'Usuários removidos com sucesso' };
  }

  async updateGroup(groupId: number, updateData: any, requesterEmail?: string) {
    // Busca o grupo com seu criador para verificações de permissão
    const group = await this.groupRepo.findOne({
      where: { group_id: groupId },
      relations: ['created_by'],
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    // Verifica se o usuário tem permissão para atualizar o grupo, se o email for fornecido
    if (requesterEmail && group.created_by?.email !== requesterEmail) {
      throw new ForbiddenException(
        'Você não tem permissão para atualizar este grupo',
      );
    }

    // Extrair e remover os dados de usuários antes de atualizar o grupo
    const { users, ...groupUpdateData } = updateData;

    // Atualizar os dados básicos do grupo
    if (Object.keys(groupUpdateData).length > 0) {
      Object.assign(group, groupUpdateData);
      await this.groupRepo.save(group);
    }

    // Processar adição e remoção de usuários, se fornecidos
    const results: {
      added: Array<{
        user_id: number;
        name: string;
        email: string;
        phone: string;
      }>;
      removed: Array<{ user_id: number }>;
      errors: Array<{ identifier: string | number; message: string }>;
    } = {
      added: [],
      removed: [],
      errors: [],
    };

    // Adicionar usuários por telefone
    if (users?.add_phones && users.add_phones.length > 0) {
      for (const phone of users.add_phones) {
        try {
          // Normaliza o telefone (remove espaços, parênteses, traços)
          const normalizedPhone = phone.replace(/[\s()-]/g, '');

          // Verifica se o usuário existe pelo telefone
          const user = await this.userRepo.findOne({
            where: { phone: normalizedPhone },
          });
          if (!user) {
            results.errors.push({
              identifier: phone,
              message: 'Usuário não encontrado com este telefone',
            });
            continue;
          }

          // Verifica se o usuário já está no grupo
          const alreadyExists = await this.userGroupRepo.findOne({
            where: { user_id: user.user_id, group_id: groupId },
          });

          if (alreadyExists) {
            results.errors.push({
              identifier: phone,
              message: 'Usuário já está no grupo',
            });
            continue;
          }

          // Adiciona o usuário ao grupo
          const userGroup = this.userGroupRepo.create({
            user_id: user.user_id,
            group_id: groupId,
          });
          await this.userGroupRepo.save(userGroup);

          // Adiciona ao resultado
          results.added.push({
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            phone: normalizedPhone,
          });

          // Envia notificação ao usuário adicionado
          if (user.notification_token && requesterEmail) {
            // Obtém informações do usuário que está fazendo a atualização
            const requester = await this.userRepo.findOne({
              where: { email: requesterEmail },
            });
            const requesterName = requester ? requester.name : 'Alguém';

            await this.oneSignalService.sendNotification({
              title: 'Você foi adicionado a um grupo',
              message: `${requesterName} adicionou você ao grupo "${group.name}"`,
              data: {
                type: 'group_invitation',
                group_id: group.group_id,
                group_name: group.name,
              },
              include_external_user_ids: [user.email],
              channel_for_external_user_ids: 'push',
            });
          }
        } catch (error) {
          results.errors.push({ identifier: phone, message: error.message });
        }
      }
    }

    // Remover usuários
    if (users?.remove && users.remove.length > 0) {
      for (let userId of users.remove) {
        try {
          // Garantir que userId seja um número
          userId = Number(userId);

          if (isNaN(userId)) {
            results.errors.push({
              identifier: userId,
              message: 'ID de usuário inválido',
            });
            continue;
          }

          // Verifica se o vínculo existe
          const userGroup = await this.userGroupRepo.findOne({
            where: { user_id: userId, group_id: groupId },
          });

          if (!userGroup) {
            results.errors.push({
              identifier: userId,
              message: 'Usuário não está no grupo',
            });
            continue;
          }

          // Remove o usuário do grupo
          await this.userGroupRepo.remove(userGroup);

          // Adiciona ao resultado
          results.removed.push({ user_id: userId });
        } catch (error) {
          results.errors.push({ identifier: userId, message: error.message });
        }
      }
    }

    // Busca o grupo atualizado com os usuários
    const updatedGroup = await this.findGroupDetails(groupId, requesterEmail);

    return {
      message: 'Grupo atualizado com sucesso',
      group: updatedGroup,
      operations: results,
    };
  }

  async removeUsersFromGroup(groupId: number, userIds: number[]) {
    await this.groupRepo
      .createQueryBuilder()
      .delete()
      .from(UserSecurityGroup)
      .where('group_id = :groupId', { groupId })
      .andWhere('user_id IN (:...userIds)', { userIds })
      .execute();

    return { message: 'Usuários removidos do grupo com sucesso' };
  }

  async leaveGroup(groupId: number, userEmail: string): Promise<any> {
    // Buscar o usuário pelo email
    const user = await this.userRepo.findOne({ where: { email: userEmail } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se o usuário está no grupo
    const userGroup = await this.userGroupRepo.findOne({
      where: {
        group_id: groupId,
        user_id: user.user_id,
      },
    });

    if (!userGroup) {
      throw new NotFoundException('Você não faz parte deste grupo');
    }

    // Verificar se o usuário é o dono do grupo
    const group = await this.groupRepo.findOne({
      where: { group_id: groupId },
      relations: ['created_by'],
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    if (group.created_by?.user_id === user.user_id) {
      throw new ForbiddenException(
        'Você é o dono deste grupo e não pode sair. Para excluir o grupo ou transferir a propriedade, use outra função.',
      );
    }

    // Remover o usuário do grupo
    await this.userGroupRepo.remove(userGroup);

    return {
      success: true,
      message: 'Você saiu do grupo com sucesso',
    };
  }

  async listGroupsByUser(userId: number): Promise<SecurityGroup[]> {
    const userGroups = await this.userGroupRepo.find({
      where: { user_id: userId },
      relations: ['group'],
    });

    return userGroups.map((ug) => ug.group);
  }

  /**
   * Usuário autenticado entra em um grupo público da mesma cidade (ou sem cidade)
   */
  async joinGroup(groupId: number, userEmail: string) {
    const user = await this.userRepo.findOne({
      where: { email: userEmail },
      relations: ['city'],
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const group = await this.groupRepo.findOne({
      where: { group_id: groupId },
      relations: ['city'],
    });
    if (!group) throw new NotFoundException('Grupo não encontrado');

    // Bloqueia se grupo for privado
    if (group.private)
      throw new ForbiddenException(
        'Grupo privado. Envio de convite necessário.',
      );

    // Valida cidade (se ambos possuem)
    if (
      user.city &&
      group.city &&
      user.city.city_id !== (group.city as any).city_id
    ) {
      throw new ForbiddenException('Grupo de outra cidade.');
    }

    // Verifica se já está no grupo
    const existing = await this.userGroupRepo.findOne({
      where: { user_id: user.user_id, group_id: groupId },
    });
    if (existing) {
      return { message: 'Usuário já está no grupo', status: true };
    }

    const link = this.userGroupRepo.create({
      user_id: user.user_id,
      group_id: groupId,
    });
    await this.userGroupRepo.save(link);

    return {
      message: 'Entrada realizada com sucesso',
      status: true,
      group_id: groupId,
    };
  }

  /**
   * Lista grupos públicos na mesma cidade do usuário (ou sem cidade) que ele ainda não participa
   */
  async findAvailableGroups(userEmail: string) {
    const user = await this.userRepo.findOne({
      where: { email: userEmail },
      relations: ['city'],
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const params: any = { userId: user.user_id };
    let cityFilterSql = '1=1';
    if (user.city?.city_id) {
      params.cityId = user.city.city_id;
      cityFilterSql = '(group.city_id IS NULL OR group.city_id = :cityId)';
    }

    const groups = await this.groupRepo
      .createQueryBuilder('group')
      .leftJoin(
        UserSecurityGroup,
        'usg',
        'usg.group_id = group.group_id AND usg.user_id = :userId',
        params,
      )
      .leftJoinAndSelect('group.created_by', 'creator')
      .where('group.private = :priv', { priv: false })
      .andWhere(cityFilterSql, params)
      .andWhere('usg.user_id IS NULL')
      .select([
        'group.group_id',
        'group.name',
        'group.created_at',
        'group.private',
        'group.city_id',
        'creator.user_id',
        'creator.name',
      ])
      .getMany();

    return groups;
  }

  async createGroup(
    dto: CreateGroupDto,
    creatorEmail?: string,
  ): Promise<SecurityGroup> {
    // Busca o usuário criador com a cidade (se existir)
    let user: any = null;
    if (creatorEmail) {
      user = await this.userRepo.findOne({
        where: { email: creatorEmail },
        relations: ['city'],
      });
    } else if (dto.created_by) {
      user = await this.userRepo.findOne({
        where: { user_id: dto.created_by },
        relations: ['city'],
      });
    }

    if (!user) {
      throw new NotFoundException('Usuário criador não encontrado');
    }

    // Define cidade: se dto.city_id vier usamos ela, senão usamos a cidade do usuario
    let cityRelation = undefined;
    if (dto.city_id) {
      cityRelation = { city_id: dto.city_id } as any;
    } else if (user.city) {
      cityRelation = { city_id: user.city.city_id } as any;
    }

    const group = this.groupRepo.create({
      name: dto.name,
      private: dto.private,
      created_by: user,
      city: cityRelation,
    });

    return this.groupRepo.save(group);
  }

  async inviteUserByPhone(
    dto: InviteUserByPhoneDto,
    inviterEmail?: string,
  ): Promise<any> {
    // Normaliza o telefone (remove espaços, parênteses, traços)
    const normalizedPhone = dto.phone.replace(/[\s()-]/g, '');

    // Busca o grupo
    const group = await this.groupRepo.findOne({
      where: { group_id: dto.group_id },
      relations: ['created_by', 'city'],
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    // Busca o usuário pelo telefone
    const user = await this.userRepo.findOne({
      where: { phone: normalizedPhone },
      relations: ['city'],
    });

    // Se o usuário não existir, retorna mensagem
    if (!user) {
      return {
        status: false,
        message:
          'Usuário não encontrado. Este número de telefone não está cadastrado no app.',
      };
    }

    // Verifica cidade
    if (user.city && group.city && user.city.city_id !== group.city.city_id) {
      return {
        status: false,
        message: 'Usuário de outra cidade não pode ser adicionado.',
      };
    }

    // Verifica se o usuário já está no grupo
    const alreadyInGroup = await this.userGroupRepo.findOne({
      where: {
        user_id: user.user_id,
        group_id: dto.group_id,
      },
    });

    if (alreadyInGroup) {
      return {
        status: true,
        message: 'Usuário já faz parte deste grupo.',
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
        },
      };
    }

    // Adiciona o usuário ao grupo
    const userGroup = this.userGroupRepo.create({
      user_id: user.user_id,
      group_id: dto.group_id,
    });

    await this.userGroupRepo.save(userGroup);

    // Busca informações do convidador se o email for fornecido
    let inviterName = 'Alguém';
    if (inviterEmail) {
      const inviter = await this.userRepo.findOne({
        where: { email: inviterEmail },
      });

      if (inviter) {
        inviterName = inviter.name;
      }
    }

    // Envia notificação ao usuário convidado
    if (user.notification_token) {
      await this.oneSignalService.sendNotification({
        title: 'Novo convite de grupo',
        message: `${inviterName} adicionou você ao grupo "${group.name}"`,
        data: {
          type: 'group_invitation',
          group_id: group.group_id,
          group_name: group.name,
        },
        include_external_user_ids: [user.email],
        channel_for_external_user_ids: 'push',
      });
    }

    return {
      status: true,
      message: 'Usuário adicionado ao grupo com sucesso.',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async createGroupWithUsers(
    dto: CreateGroupWithUsersDto,
    creatorEmail: string,
  ): Promise<any> {
    try {
      // Verificar se o email do criador foi fornecido
      if (!creatorEmail) {
        throw new NotFoundException('Email do usuário criador não fornecido');
      }

      // Buscar o usuário criador pelo email
      const creator = await this.userRepo.findOne({
        where: { email: creatorEmail },
      });

      if (!creator) {
        throw new NotFoundException(
          'Usuário criador não encontrado com este email',
        );
      }

      // Criar o grupo
      // Define cidade: se dto tiver city_id usa, senão cidade do criador
      let cityRelation = undefined;
      if ((dto as any).city_id) {
        cityRelation = { city_id: (dto as any).city_id } as any;
      } else if ((creator as any).city) {
        cityRelation = { city_id: (creator as any).city.city_id } as any;
      }

      const group = this.groupRepo.create({
        name: dto.name,
        private: dto.private,
        created_by: creator,
        city: cityRelation,
      });

      // Salvar o grupo
      const savedGroup = await this.groupRepo.save(group);

      // Normalizar os telefones e remover duplicados
      const uniquePhones = Array.from(
        new Set(dto.phones.map((phone) => phone.replace(/[\s()-]/g, ''))),
      );

      // Lista para armazenar os resultados do processamento de cada telefone
      const results: Array<{
        phone: string;
        status: boolean;
        message: string;
        user?: {
          user_id: number;
          name: string;
          email: string;
        };
      }> = [];

      // Lista para armazenar os usuários encontrados para notificação em lote
      const usersToNotify: Array<{
        user_id: number;
        email: string;
        notification_token?: string;
      }> = [];

      // Para cada telefone, buscar o usuário e adicionar ao grupo
      for (const phone of uniquePhones) {
        const user = await this.userRepo.findOne({
          where: { phone },
          relations: ['city'],
        });

        if (!user) {
          results.push({
            phone,
            status: false,
            message: 'Usuário não encontrado com este telefone',
          });
          continue;
        }

        // Verifica cidade
        if (
          user.city &&
          group.city &&
          user.city.city_id !== (group.city as any).city_id
        ) {
          results.push({
            phone,
            status: false,
            message: 'Usuário de outra cidade',
          });
          continue;
        }

        // Verificar se já existe no grupo (não deve ocorrer em um grupo novo, mas por segurança)
        const alreadyInGroup = await this.userGroupRepo.findOne({
          where: {
            user_id: user.user_id,
            group_id: savedGroup.group_id,
          },
        });

        if (alreadyInGroup) {
          results.push({
            phone,
            status: true,
            message: 'Usuário já está no grupo',
            user: {
              user_id: user.user_id,
              name: user.name,
              email: user.email,
            },
          });
          continue;
        }

        // Adicionar o usuário ao grupo
        const userGroup = this.userGroupRepo.create({
          user_id: user.user_id,
          group_id: savedGroup.group_id,
        });
        await this.userGroupRepo.save(userGroup);

        // Adicionar à lista de usuários para notificar
        if (user.notification_token) {
          usersToNotify.push({
            user_id: user.user_id,
            email: user.email,
            notification_token: user.notification_token,
          });
        }

        results.push({
          phone,
          status: true,
          message: 'Usuário adicionado ao grupo',
          user: {
            user_id: user.user_id,
            name: user.name,
            email: user.email,
          },
        });
      }

      // Enviar notificações em lote
      if (usersToNotify.length > 0) {
        await this.oneSignalService.sendNotification({
          title: 'Novo grupo criado',
          message: `Você foi adicionado ao grupo "${savedGroup.name}"`,
          data: {
            type: 'group_created',
            group_id: savedGroup.group_id,
            group_name: savedGroup.name,
          },
          include_external_user_ids: usersToNotify.map((u) => u.email),
          channel_for_external_user_ids: 'push',
        });
      }

      // Adicionar também o criador ao grupo
      const creatorGroup = this.userGroupRepo.create({
        user_id: creator.user_id,
        group_id: savedGroup.group_id,
      });
      await this.userGroupRepo.save(creatorGroup);

      return {
        status: true,
        message: 'Grupo criado com sucesso',
        group: {
          group_id: savedGroup.group_id,
          name: savedGroup.name,
          private: savedGroup.private,
          created_at: savedGroup.created_at,
          created_by: {
            user_id: creator.user_id,
            name: creator.name,
            email: creator.email,
          },
        },
        users: results,
      };
    } catch (error) {
      console.error('Erro ao criar grupo com usuários:', error);
      return {
        status: false,
        message: 'Erro ao criar grupo com usuários',
        error: error.message,
      };
    }
  }
}

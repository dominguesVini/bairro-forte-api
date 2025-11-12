import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationRecipient } from './entities/notification-recipient.entity';
import { User } from 'src/user/entities/user.entity';
import { UserSecurityGroup } from 'src/group/entities/user_security_groups';
import { UserSetting } from 'src/user-settings/entities/user-setting.entity';
import { OneSignalService } from './onesignal.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,

    @InjectRepository(NotificationRecipient)
    private readonly recipientRepository: Repository<NotificationRecipient>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,

    @InjectRepository(UserSecurityGroup)
    private readonly userSecurityGroupRepository: Repository<UserSecurityGroup>,

    private readonly dataSource: DataSource,

    private readonly oneSignalService: OneSignalService,

    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async createNotification(
    type: string,
    message: string,
    options: {
      recipientIds?: number[];
      incidentId?: number;
      cameraId?: number;
      forUserPrivateId?: number;
      latitude?: number;
      longitude?: number;
      reportType?: 'incident' | 'camera';
      reporterUserId?: number;
    },
  ): Promise<Notification> {
    try {
      const {
        recipientIds = [],
        incidentId,
        cameraId,
        forUserPrivateId,
        latitude,
        longitude,
        reportType,
        reporterUserId,
      } = options || {};

      // Criar a notificação primeiro sem a localização
      const notification = this.notificationRepository.create({
        type,
        message,
        incident_id: incidentId,
        camera_id: cameraId,
        for_user_private_id: forUserPrivateId,
        report_type: reportType,
      });

      const savedNotification =
        await this.notificationRepository.save(notification);

      // Adicionar a localização após salvar usando SQL nativo
      if (latitude !== undefined && longitude !== undefined) {
        await this.dataSource.query(
          `UPDATE Notifications SET location = ST_GeomFromText('POINT(${latitude} ${longitude})', 4326) WHERE notification_id = ?`,
          [savedNotification.notification_id],
        );
      }

      // Determinar quais usuários devem receber a notificação
      let finalRecipientIds: number[] = [];

      // Se o usuário que está reportando foi informado, precisamos verificar
      // as preferências dos destinatários e grupos em comum
      if (reporterUserId) {
        // Verificar para cada destinatário
        for (const userId of recipientIds) {
          // Não enviar notificação para o próprio criador do incidente/câmera
          if (userId === reporterUserId) {
            console.log(
              `Pulando notificação para o próprio criador (userId: ${userId})`,
            );
            continue;
          }

          // Buscar configuração de privacidade do usuário
          const userSetting = await this.userSettingRepository.findOne({
            where: { user: { user_id: userId } },
          });

          // Se o usuário não foi encontrado ou não tem preferências definidas, usar valor padrão (false)
          const groupOnlyPreference = userSetting?.group_only ?? false;

          // Se o usuário aceita notificações apenas de membros do mesmo grupo
          if (groupOnlyPreference) {
            // Verificar se o reporter e o recipient têm grupos em comum
            const commonGroups = await this.userSecurityGroupRepository
              .createQueryBuilder('usg1')
              .innerJoin(
                'user_security_groups',
                'usg2',
                'usg1.group_id = usg2.group_id AND usg2.user_id = :reporterId',
                { reporterId: reporterUserId },
              )
              .where('usg1.user_id = :recipientId', { recipientId: userId })
              .getCount();

            // Se não têm grupos em comum, pular este destinatário
            if (commonGroups === 0) continue;
          }

          // Se passou por todas as verificações, adicionar à lista final
          finalRecipientIds.push(userId);
        }
      } else {
        // Se não temos informação do reporter, filtrar apenas o criador se o ID for conhecido
        finalRecipientIds = reporterUserId
          ? recipientIds.filter((id) => id !== reporterUserId)
          : [...recipientIds];
      }

      // Se após as verificações não temos destinatários, retornar
      if (finalRecipientIds.length === 0) {
        return savedNotification;
      }

      // Criar registros de destinatários
      const recipients: NotificationRecipient[] = [];
      for (const userId of finalRecipientIds) {
        const recipient = this.recipientRepository.create({
          notification_id: savedNotification.notification_id,
          user_id: userId,
        });
        recipients.push(recipient);
      }

      if (recipients.length > 0) {
        await this.recipientRepository.save(recipients);
      }

      // Buscar tokens de notificação dos usuários e enviar via OneSignal
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select(['user.user_id', 'user.email', 'user.notification_token'])
        .where('user.user_id IN (:...ids)', { ids: finalRecipientIds })
        .andWhere('user.notification_token IS NOT NULL')
        .getMany();

      const externalIds = users
        .filter((user) => user.email)
        .map((user) => user.email);

      if (externalIds.length > 0) {
        await this.oneSignalService.sendNotification({
          title: `Alerta: ${type}`,
          message: message,
          data: {
            notification_id: savedNotification.notification_id,
            incident_id: incidentId,
            camera_id: cameraId,
            type: type,
            report_type: reportType,
          },
          include_external_user_ids: externalIds,
          channel_for_external_user_ids: 'push',
        });
      }

      return savedNotification;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }
  }

  async findUserNotifications(
    userId: number,
    limit = 20,
    offset = 0,
  ): Promise<any> {
    // Usar dataSource para consulta SQL nativa para obter coordenadas de localização
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .innerJoin(
        'notification.recipients',
        'recipient',
        'recipient.user_id = :userId',
        { userId },
      )
      .leftJoinAndSelect('notification.incident', 'incident')
      .leftJoinAndSelect('notification.camera', 'camera')
      .select([
        'notification.notification_id',
        'notification.type',
        'notification.message',
        'notification.report_type',
        'notification.created_at',
        'ST_X(notification.location) as longitude',
        'ST_Y(notification.location) as latitude',
        'recipient.read',
        'recipient.read_at',
        'incident.incident_id',
        'incident.type as incident_type',
        'incident.description as incident_description',
        'camera.camera_id',
        'camera.description as camera_description',
      ])
      .orderBy('notification.created_at', 'DESC')
      .limit(limit)
      .offset(offset);

    const [notifications, total] = await query.getManyAndCount();

    return {
      notifications,
      total,
      limit,
      offset,
    };
  }

  /**
   * Marca uma notificação como lida para um usuário específico
   * @param notificationId ID da notificação
   * @param userId ID do usuário
   */
  async markAsRead(notificationId: number, userId: number): Promise<void> {
    const now = new Date();
    await this.recipientRepository.update(
      { notification_id: notificationId, user_id: userId },
      { read: true, read_at: now },
    );
  }

  /**
   * Marca todas as notificações de um usuário como lidas
   * @param userId ID do usuário
   */
  async markAllAsRead(userId: number): Promise<void> {
    const now = new Date();
    await this.recipientRepository.update(
      { user_id: userId, read: false },
      { read: true, read_at: now },
    );
  }

  /**
   * Conta o número de notificações não lidas de um usuário
   * @param userId ID do usuário
   * @returns Número de notificações não lidas
   */
  async countUnread(userId: number): Promise<number> {
    const result = await this.recipientRepository
      .createQueryBuilder('recipient')
      .where('recipient.user_id = :userId', { userId })
      .andWhere('recipient.read = :read', { read: false })
      .getCount();

    return result;
  }

  async findNearbyUsers(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    excludeUserIds: number[] = [],
  ) {
    try {
      // Busca usuários dentro do raio especificado (em km)
      // ST_Distance_Sphere calcula a distância em metros entre dois pontos geográficos
      const query = this.dataSource
        .createQueryBuilder()
        .select([
          'u.user_id AS user_id',
          'u.name AS name',
          'u.email AS email',
          'u.notification_token AS notification_token',
          'ST_X(u.location) AS longitude',
          'ST_Y(u.location) AS latitude',
          'ST_Distance_Sphere(u.location, ST_GeomFromText(:point, 4326)) / 1000 AS distance_km',
        ])
        .from(User, 'u')
        .where(
          'ST_Distance_Sphere(u.location, ST_GeomFromText(:point, 4326)) / 1000 <= :radius',
          {
            point: `POINT(${longitude} ${latitude})`,
            radius: radiusKm,
          },
        )
        .andWhere('u.notification_token IS NOT NULL');

      // Adiciona condição para excluir usuários específicos
      if (excludeUserIds.length > 0) {
        query.andWhere('u.user_id NOT IN (:...excludeIds)', {
          excludeIds: excludeUserIds,
        });
      }

      // Ordena por distância (mais próximos primeiro)
      query.orderBy('distance_km', 'ASC');

      const nearbyUsers = await query.getRawMany();

      // Converter valores numéricos corretamente
      return nearbyUsers.map((user) => ({
        ...user,
        longitude: Number(user.longitude),
        latitude: Number(user.latitude),
        distance_km: Number(user.distance_km),
      }));
    } catch (error) {
      console.error('Erro ao buscar usuários próximos:', error);
      throw error;
    }
  }

  /**
   * Envia notificação baseada em localização para usuários próximos
   * Usa as preferências de localização dos usuários para determinar quem recebe a notificação
   *
   * @param type Tipo da notificação
   * @param message Mensagem da notificação
   * @param options Opções da notificação
   * @returns A notificação criada e o número de destinatários
   */
  async createLocationBasedNotification(
    type: string,
    message: string,
    options: {
      latitude: number;
      longitude: number;
      incidentId?: number;
      cameraId?: number;
      reportType?: 'incident' | 'camera';
      reporterUserId?: number;
      maxDistanceKm?: number;
    },
  ) {
    try {
      const {
        latitude,
        longitude,
        incidentId,
        cameraId,
        reportType,
        reporterUserId,
        maxDistanceKm = 5,
      } = options;

      // Criar a notificação com localização
      const notification = this.notificationRepository.create({
        type,
        message,
        incident_id: incidentId,
        camera_id: cameraId,
        report_type: reportType,
      });

      const savedNotification =
        await this.notificationRepository.save(notification);

      // Adicionar a localização após salvar usando SQL nativo
      await this.dataSource.query(
        `UPDATE Notifications SET location = ST_GeomFromText('POINT(${longitude} ${latitude})', 4326) WHERE notification_id = ?`,
        [savedNotification.notification_id],
      );

      // Buscar usuários próximos diretamente
      const nearbyUsers = await this.findNearbyUsers(
        latitude,
        longitude,
        maxDistanceKm,
        reporterUserId ? [reporterUserId] : [], // Excluir o próprio reporter
      );

      if (!nearbyUsers || nearbyUsers.length === 0) {
        console.log('Nenhum usuário próximo encontrado para notificar');
        return {
          notification: savedNotification,
          recipientCount: 0,
        };
      }

      // Filtrar usuários com base nas preferências de configuração
      const eligibleUsers: Array<{
        user_id: number;
        email: string;
        notification_token: string;
        longitude: number;
        latitude: number;
        distance_km: number;
      }> = [];

      for (const user of nearbyUsers) {
        // Buscar configurações do usuário
        const userSetting = await this.userSettingRepository.findOne({
          where: { user: { user_id: user.user_id } },
        });

        // Pular usuários sem configurações
        if (!userSetting) continue;

        // Verificar se o usuário aceita notificações apenas de membros do grupo
        if (userSetting.group_only && reporterUserId) {
          // Verificar se o reporter e o recipient têm grupos em comum
          const commonGroups = await this.userSecurityGroupRepository
            .createQueryBuilder('usg1')
            .innerJoin(
              'user_security_groups',
              'usg2',
              'usg1.group_id = usg2.group_id AND usg2.user_id = :reporterId',
              { reporterId: reporterUserId },
            )
            .where('usg1.user_id = :recipientId', { recipientId: user.user_id })
            .getCount();

          // Se não têm grupos em comum, pular este usuário
          if (commonGroups === 0) continue;
        }

        // Verificar se o usuário está dentro do raio configurado
        const userRadiusKm = userSetting.radius_km || 5; // Usar o raio padrão se não configurado
        if (user.distance_km > userRadiusKm) continue;

        // Se passou por todas as verificações, adicionar à lista final
        eligibleUsers.push(user);
      }

      if (eligibleUsers.length === 0) {
        console.log(
          'Nenhum usuário elegível para receber notificação após filtros',
        );
        return {
          notification: savedNotification,
          recipientCount: 0,
        };
      }

      // Criar registros de destinatários
      const recipients = eligibleUsers.map((user) =>
        this.recipientRepository.create({
          notification_id: savedNotification.notification_id,
          user_id: user.user_id,
        }),
      );

      await this.recipientRepository.save(recipients);

      // Enviar notificações pelo OneSignal
      const externalIds = eligibleUsers
        .filter((user) => user.email)
        .map((user) => user.email);

      if (externalIds.length > 0) {
        await this.oneSignalService.sendNotification({
          title: `Alerta: ${type}`,
          message,
          data: {
            notification_id: savedNotification.notification_id,
            incident_id: incidentId,
            camera_id: cameraId,
            type,
            report_type: reportType,
            latitude,
            longitude,
          },
          include_external_user_ids: externalIds,
          channel_for_external_user_ids: 'push',
        });
      }

      return {
        notification: savedNotification,
        recipientCount: eligibleUsers.length,
      };
    } catch (error) {
      console.error('Erro ao criar notificação baseada em localização:', error);
      throw error;
    }
  }
}

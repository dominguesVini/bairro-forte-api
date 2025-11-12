import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cameras } from './entities/camera.entity';
import { CreateCameraDto } from './dto/create-camera.dto';
import { DataSource } from 'typeorm';
import { EditCameraDto } from './dto/edit-camera.dto';
import { User } from 'src/user/entities/user.entity';
import { NotificationService } from 'src/notifications/notification.service';
import { UserSetting } from 'src/user-settings/entities/user-setting.entity';
@Injectable()
export class CameraService {
  constructor(
    @InjectRepository(Cameras)
    private readonly cameraRepository: Repository<Cameras>,
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,
    private readonly notificationService: NotificationService,
  ) {}

  findUserCamera(email: any) {
    return this.cameraRepository.query(
      `
      SELECT 
        c.camera_id,
        c.description,
        ST_X(c.location) AS longitude,
        ST_Y(c.location) AS latitude,
        CASE WHEN c.shared = 1 THEN true ELSE false END AS shared,
        c.created_at
      FROM cameras c
      LEFT JOIN users u ON c.created_by = u.user_id
      WHERE u.email = ?
    `,
      [email],
    );
  }

  findAll() {
    return this.cameraRepository.query(`
      SELECT 
        camera_id,
        description,
        ST_X(location) AS longitude,
        ST_Y(location) AS latitude,
        CASE WHEN shared = 1 THEN true ELSE false END AS shared,
        created_at
      FROM cameras
    `);
  }

  async create(data: CreateCameraDto, email?: string) {
    try {
      const {
        description,
        camera_description,
        latitude,
        longitude,
        shared,
        camera_shared,
      } = data as any;

      const finalDescription = description || camera_description;
      // se nenhum campo informado, considerar true
      let finalShared = shared;
      if (finalShared === undefined) finalShared = camera_shared;
      if (finalShared === undefined) finalShared = true;

      if (!finalDescription) {
        throw new NotFoundException('Campo de descrição é obrigatório');
      }

      let userRef: any = null;
      if (email) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
          throw new NotFoundException('Usuário do token não encontrado');
        }
        userRef = { user_id: user.user_id };
      }

      // Converter shared para 0 ou 1, tratando diferentes tipos de input
      const sharedValue =
        finalShared === undefined
          ? 1
          : typeof finalShared === 'boolean'
            ? finalShared
              ? 1
              : 0
            : finalShared === 'true' || finalShared === '1' || finalShared === 1
              ? 1
              : 0;

      const result = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(Cameras)
        .values({
          description,
          shared: sharedValue as any,
          location: () =>
            `ST_GeomFromText('POINT(${longitude} ${latitude})', 4326)`,
          created_by: userRef,
        })
        .execute();

      if (result.identifiers.length > 0) {
        // Se a câmera for compartilhada, enviar notificações
        const camera_id =
          result.identifiers?.[0]?.camera_id || result.raw?.insertId;

        // Se a câmera for compartilhada, notificar outros usuários
        if (sharedValue === 1 && camera_id) {
          try {
            // Buscar câmera criada com coordenadas
            const cameraRow: any = await this.dataSource
              .createQueryBuilder()
              .select([
                'camera_id',
                'description',
                'ST_X(location) as longitude',
                'ST_Y(location) as latitude',
              ])
              .from(Cameras, 'c')
              .where('c.camera_id = :id', { id: camera_id })
              .getRawOne();

            if (cameraRow) {
              // Notificar usuários próximos
              // Buscar configurações de usuários que desejam receber notificações de câmeras
              const candidates = await this.userSettingRepository
                .createQueryBuilder('s')
                .leftJoinAndSelect('s.user', 'user')
                .where("FIND_IN_SET('camera', s.category)")
                .andWhere('user.email IS NOT NULL')
                .getMany();

              if (candidates && candidates.length > 0) {
                const recipientIds: number[] = [];

                for (const setting of candidates) {
                  const u: any = setting.user;
                  if (!u || !u.email) continue;

                  // Não notificar o próprio criador
                  if (userRef && u.user_id === userRef.user_id) {
                    continue;
                  }

                  recipientIds.push(u.user_id);
                }

                if (recipientIds.length > 0) {
                  // Enviar notificação
                  await this.notificationService.createNotification(
                    'camera',
                    `Nova câmera compartilhada: ${finalDescription || 'Sem descrição'}`,
                    {
                      recipientIds,
                      cameraId: camera_id,
                      reportType: 'camera',
                      latitude: cameraRow.latitude
                        ? Number(cameraRow.latitude)
                        : undefined,
                      longitude: cameraRow.longitude
                        ? Number(cameraRow.longitude)
                        : undefined,
                      reporterUserId: userRef?.user_id,
                    },
                  );
                }
              }
            }
          } catch (err) {
            console.warn('Erro ao enviar notificações de câmera:', err);
          }
        }

        return { message: 'Câmera adicionada com sucesso!', status: true };
      } else {
        return {
          message:
            'Ocorreu um erro ao tentar adicionar a câmera, tente novamente!',
          status: false,
        };
      }
    } catch (error) {
      return {
        message:
          'Ocorreu um erro ao tentar adicionar a câmera, tente novamente!',
        status: false,
        error: error.message,
      };
    }
  }

  async findAllCamerasByUserId(userId: number) {
    const cameras = await this.cameraRepository
      .createQueryBuilder('camera')
      .leftJoinAndSelect('camera.created_by', 'creator')
      .where('camera.created_by = :userId', { userId })
      .select([
        'camera.camera_id',
        'camera.description',
        'ST_X(camera.location) AS longitude',
        'ST_Y(camera.location) AS latitude',
        'CASE WHEN camera.shared = 1 THEN true ELSE false END AS shared',
        'camera.created_at',
        'camera.created_by',
        'creator.user_id',
        'creator.name',
        'creator.email',
      ])
      .getRawMany();

    // Garantir que shared seja boolean
    return cameras.map((camera) => ({
      ...camera,
      shared:
        typeof camera.shared === 'boolean'
          ? camera.shared
          : camera.shared === 'true' || Boolean(Number(camera.shared)),
    }));
  }

  async findAllCamerasByEmail(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) return [];
    return this.findAllCamerasByUserId(user.user_id);
  }

  async update(cameraId: number, data: Partial<EditCameraDto>, email?: string) {
    try {
      const {
        description,
        camera_description,
        latitude,
        longitude,
        shared,
        camera_shared,
        owner_id,
      } = data as any;

      const finalDescription =
        description !== undefined ? description : camera_description;
      const finalShared = shared !== undefined ? shared : camera_shared;

      const updateFields: any = {};

      if (finalDescription !== undefined)
        updateFields.description = finalDescription;
      if (finalShared !== undefined) {
        // Converter shared para 0 ou 1, tratando diferentes tipos de input
        updateFields.shared =
          typeof finalShared === 'boolean'
            ? finalShared
              ? 1
              : 0
            : finalShared === 'true' || finalShared === '1' || finalShared === 1
              ? 1
              : 0;
      }
      if (longitude !== undefined && latitude !== undefined) {
        updateFields.location = () =>
          `ST_GeomFromText('POINT(${longitude} ${latitude})', 4326)`;
      }

      if (Object.keys(updateFields).length === 0) {
        return {
          message: 'Nenhum dado válido fornecido para atualização.',
          status: false,
        };
      }

      if (email) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) return { message: 'Usuário não encontrado.', status: false };
        const ownerCheck = await this.dataSource
          .createQueryBuilder()
          .select('c.created_by', 'created_by')
          .from(Cameras, 'c')
          .where('c.camera_id = :id', { id: cameraId })
          .getRawOne();
        const ownerId = ownerCheck?.created_by ?? null;
        if (ownerId !== user.user_id) {
          return {
            message:
              'Permissão negada: câmera não pertence ao usuário do token.',
            status: false,
          };
        }
      }

      const result = await this.dataSource
        .createQueryBuilder()
        .update(Cameras)
        .set(updateFields)
        .where('camera_id = :id', { id: cameraId })
        .execute();

      if (result.affected === 1) {
        const updated: any = await this.dataSource
          .createQueryBuilder()
          .select([
            'c.camera_id',
            'c.description',
            'ST_X(c.location) as longitude',
            'ST_Y(c.location) as latitude',
            'CASE WHEN c.shared = 1 THEN true ELSE false END as shared',
            'c.created_at',
          ])
          .from(Cameras, 'c')
          .where('c.camera_id = :id', { id: cameraId })
          .getRawOne();

        if (!updated)
          return { message: 'Câmera atualizada com sucesso!', status: true };

        const sharedValue =
          typeof updated.shared === 'boolean'
            ? updated.shared
            : Boolean(Number(updated.shared));

        const responseData = {
          camera_id: updated.camera_id,
          description: updated.description,
          // Incluir os dois formatos para compatibilidade
          camera_description: updated.description,
          longitude:
            updated.longitude !== undefined ? Number(updated.longitude) : null,
          latitude:
            updated.latitude !== undefined ? Number(updated.latitude) : null,
          shared: sharedValue,
          camera_shared: sharedValue,
          created_at: updated.created_at
            ? new Date(updated.created_at).toISOString()
            : null,
        };

        console.log('Camera updated - response data:', responseData);

        return {
          message: 'Câmera atualizada com sucesso!',
          status: true,
          data: responseData,
        };
      } else {
        return {
          message:
            'Ocorreu um erro ao tentar atualizar câmera, tente novamente!',
          status: false,
        };
      }
    } catch (error) {
      return {
        message:
          'Ocorreu um erro ao tentar atualizar a câmera, tente novamente!',
        status: false,
        error: error.message,
      };
    }
  }

  async delete(cameraId: number, email?: string) {
    try {
      if (email) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) return { message: 'Usuário não encontrado.', status: false };
        const ownerCheck = await this.dataSource
          .createQueryBuilder()
          .select('c.created_by', 'created_by')
          .from(Cameras, 'c')
          .where('c.camera_id = :id', { id: cameraId })
          .getRawOne();
        const ownerId = ownerCheck?.created_by ?? null;
        if (ownerId !== user.user_id) {
          return {
            message:
              'Permissão negada: câmera não pertence ao usuário do token.',
            status: false,
          };
        }
      }

      const result = await this.dataSource
        .createQueryBuilder()
        .delete()
        .from(Cameras)
        .where('camera_id = :id', { id: cameraId })
        .execute();

      if (result.affected && result.affected > 0) {
        return { message: 'Câmera removida com sucesso!', status: true };
      }
      return { message: 'Câmera não encontrada.', status: false };
    } catch (error) {
      return {
        message: 'Erro ao remover câmera.',
        status: false,
        error: error.message,
      };
    }
  }
}

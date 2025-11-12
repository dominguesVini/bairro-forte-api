import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async create(data: CreateUserDto) {
    try {
      const {
        name,
        email,
        role,
        gender,
        latitude,
        longitude,
        show_info_in_groups,
        share_reported_info,
        notification_token,
        phone,
        city_id,
      } = data;

      // Normaliza o telefone se fornecido (remove espaços, parênteses, traços)
      const normalizedPhone = phone ? phone.replace(/[\s()-]/g, '') : undefined;

      const values: any = {
        name,
        email,
        role,
        gender,
        location: () =>
          `ST_GeomFromText('POINT(${longitude} ${latitude})', 4326)`,
        show_info_in_groups,
        share_reported_info,
        notification_token,
      };

      // Só inclui o telefone se foi fornecido
      if (normalizedPhone) {
        values.phone = normalizedPhone;
      }

      // Se cidade foi informada, vincula a foreign key
      if (city_id) {
        values.city = { city_id } as any;
      }

      const result = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(User)
        .values(values)
        .execute();

      if (result.identifiers.length > 0) {
        const insertedId =
          result.identifiers[0].user_id || result.raw?.insertId;

        // Buscar o usuário criado com latitude/longitude
        const user = await this.dataSource
          .createQueryBuilder()
          .select([
            'user.user_id AS user_id',
            'user.name AS name',
            'user.email AS email',
            'user.role AS role',
            'user.gender AS gender',
            'user.show_info_in_groups AS show_info_in_groups',
            'user.share_reported_info AS share_reported_info',
            'user.notification_token AS notification_token',
            'ST_X(user.location) AS longitude',
            'ST_Y(user.location) AS latitude',
          ])
          .from(User, 'user')
          .where('user.user_id = :id', { id: insertedId })
          .getRawOne();

        if (user) {
          user.show_info_in_groups = !!user.show_info_in_groups;
          user.share_reported_info = !!user.share_reported_info;
          if (user.longitude !== undefined && user.longitude !== null)
            user.longitude = Number(user.longitude);
          if (user.latitude !== undefined && user.latitude !== null)
            user.latitude = Number(user.latitude);
        }

        return { message: 'Usuário criado com sucesso!', status: true, user };
      } else {
        return {
          message: 'Ocorreu um erro ao tentar criar o usuário.',
          status: false,
        };
      }
    } catch (error) {
      console.log(error);
      return {
        message: 'Erro ao criar usuário.',
        status: false,
        error: error.message,
      };
    }
  }

  async updateUser(userId: number, updateData: Partial<CreateUserDto>) {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    Object.assign(user, updateData);
    await this.userRepository.save(user);

    return { message: 'Dados atualizados com sucesso!', user };
  }

  async updateUserProfile(email: string, updateData: any) {
    try {
      // Busca o usuário pelo email
      const user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // Se telefone foi fornecido, normaliza
      if (updateData.phone) {
        updateData.phone = updateData.phone.replace(/[\s()-]/g, '');
      }

      // Cria uma cópia dos dados para evitar modificar o objeto original
      const dataToUpdate = { ...updateData };

      // Remove os campos de latitude e longitude para tratamento especial
      const { latitude, longitude, ...otherData } = dataToUpdate;

      // Atualiza os outros campos
      Object.assign(user, otherData);

      // Se ambos latitude e longitude foram fornecidos, atualiza o ponto geográfico
      if (latitude !== undefined && longitude !== undefined) {
        await this.dataSource
          .createQueryBuilder()
          .update(User)
          .set({
            location: () =>
              `ST_GeomFromText('POINT(${longitude} ${latitude})', 4326)`,
          })
          .where('user_id = :id', { id: user.user_id })
          .execute();
      }

      // Salva as alterações dos outros campos
      await this.userRepository.save(user);

      // Busca o usuário atualizado com as coordenadas
      const updatedUser = await this.dataSource
        .createQueryBuilder()
        .select([
          'user.user_id',
          'user.name',
          'user.email',
          'user.role',
          'user.gender',
          'user.phone',
          'user.show_info_in_groups',
          'user.share_reported_info',
          'user.notification_token',
          'ST_X(user.location) AS longitude',
          'ST_Y(user.location) AS latitude',
        ])
        .from(User, 'user')
        .where('user.user_id = :id', { id: user.user_id })
        .getRawOne();

      // Converte os valores para os tipos corretos
      if (updatedUser) {
        updatedUser.show_info_in_groups = !!updatedUser.show_info_in_groups;
        updatedUser.share_reported_info = !!updatedUser.share_reported_info;
        if (
          updatedUser.longitude !== undefined &&
          updatedUser.longitude !== null
        ) {
          updatedUser.longitude = Number(updatedUser.longitude);
        }
        if (
          updatedUser.latitude !== undefined &&
          updatedUser.latitude !== null
        ) {
          updatedUser.latitude = Number(updatedUser.latitude);
        }
      }

      return {
        message: 'Perfil atualizado com sucesso',
        status: true,
        user: updatedUser,
      };
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return {
        message: 'Erro ao atualizar perfil',
        status: false,
        error: error.message,
      };
    }
  }

  async updatePrivacySettings(
    userId: number,
    settings: { show_info_in_groups: boolean; share_reported_info: boolean },
  ) {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
      select: [
        'user_id',
        'name',
        'email',
        'role',
        'gender',
        'show_info_in_groups',
        'share_reported_info',
        'notification_token',
        'phone',
      ],
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Atualiza apenas os campos de privacidade
    user.show_info_in_groups = settings.show_info_in_groups;
    user.share_reported_info = settings.share_reported_info;

    await this.userRepository.save(user);

    return {
      message: 'Configurações de privacidade atualizadas com sucesso!',
      privacy_settings: {
        show_info_in_groups: user.show_info_in_groups,
        share_reported_info: user.share_reported_info,
      },
      user_id: user.user_id,
    };
  }

  findAll() {
    return this.userRepository.query(`
      SELECT 
        user_id,
        name,
        email,
        role,
        gender,
        show_info_in_groups,
        share_reported_info,
        notification_token,
        ST_X(location) AS longitude,
        ST_Y(location) AS latitude
      FROM users
    `);
  }

  findOne(email: string) {
    const emailLowerCase = email.toLowerCase();
    return this.userRepository.findOne({ where: { email: emailLowerCase } });
  }

  async updateLocation(
    userId: number,
    locationData: { latitude: number; longitude: number; accuracy?: number },
  ) {
    try {
      const { latitude, longitude, accuracy } = locationData;

      // Verifica se o usuário existe
      const user = await this.userRepository.findOne({
        where: { user_id: userId },
        select: ['user_id'],
      });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // Atualiza a localização do usuário usando SQL nativo para o tipo Point
      await this.dataSource
        .createQueryBuilder()
        .update(User)
        .set({
          location: () =>
            `ST_GeomFromText('POINT(${longitude} ${latitude})', 4326)`,
        })
        .where('user_id = :id', { id: userId })
        .execute();

      // Retorna os dados atualizados
      return {
        message: 'Localização atualizada com sucesso',
        status: true,
        location: {
          latitude,
          longitude,
          accuracy: accuracy || null,
        },
      };
    } catch (error) {
      console.error('Erro ao atualizar localização:', error);
      return {
        message: 'Erro ao atualizar localização',
        status: false,
        error: error.message,
      };
    }
  }
}

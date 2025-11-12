import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserSetting,
  NotificationCategory,
} from './entities/user-setting.entity';
import { CreateUserSettingDto } from './dto/create-user-setting.dto';
import { UpdateUserSettingDto } from './dto/update-user-setting.dto';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class UserSettingsService {
  constructor(
    @InjectRepository(UserSetting)
    private userSettingRepository: Repository<UserSetting>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  private hhmmssToIsoAndEpoch(value: string | null) {
    if (value === null || value === undefined)
      return { iso: null, epoch: null };
    const today = new Date();
    const [hh, mm, ss] = String(value)
      .split(':')
      .map((n) => parseInt(n || '0', 10));
    const d = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
        hh,
        mm,
        ss,
      ),
    );
    return { iso: d.toISOString(), epoch: d.getTime() };
  }

  async findAllByUser(userId: number): Promise<UserSetting[]> {
    const rows = await this.userSettingRepository.find({
      where: { user: { user_id: userId } },
      relations: ['user'],
    });
    return rows.map(
      (r) =>
        ({
          ...r,
          period_start_iso: this.hhmmssToIsoAndEpoch(r.period_start).iso,
          period_start_epoch: this.hhmmssToIsoAndEpoch(r.period_start).epoch,
          period_end_iso: this.hhmmssToIsoAndEpoch(r.period_end).iso,
          period_end_epoch: this.hhmmssToIsoAndEpoch(r.period_end).epoch,
        }) as any,
    );
  }

  async findOne(settingId: number): Promise<UserSetting> {
    const setting = await this.userSettingRepository.findOne({
      where: { setting_id: settingId },
      relations: ['user'],
    });

    if (!setting) {
      throw new HttpException(
        `Configuração com ID ${settingId} não encontrada`,
        HttpStatus.NOT_FOUND,
      );
    }

    const augmented: any = {
      ...setting,
      period_start_iso: this.hhmmssToIsoAndEpoch(setting.period_start).iso,
      period_start_epoch: this.hhmmssToIsoAndEpoch(setting.period_start).epoch,
      period_end_iso: this.hhmmssToIsoAndEpoch(setting.period_end).iso,
      period_end_epoch: this.hhmmssToIsoAndEpoch(setting.period_end).epoch,
    };
    return augmented;
  }

  async create(
    createUserSettingDto: CreateUserSettingDto,
    email?: string,
  ): Promise<UserSetting> {
    const { period_start, period_end, ...restData } =
      createUserSettingDto as any;

    if (!email) {
      throw new HttpException(
        'Email do usuário ausente no token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Verificar se o usuário existe a partir do email do token
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new HttpException(
        `Usuário com email ${email} não encontrado`,
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      // Se já existir uma configuração para este usuário, atualize em vez de criar uma nova
      const existing = await this.userSettingRepository.findOne({
        where: { user: { user_id: user.user_id } },
      });
      if (existing) {
        if (restData.radius_km !== undefined)
          existing.radius_km = restData.radius_km;
        if (restData.category !== undefined)
          existing.category = restData.category;
        if (restData.group_only !== undefined)
          existing.group_only = restData.group_only;
        existing.period_start =
          period_start === undefined ? existing.period_start : period_start;
        existing.period_end =
          period_end === undefined ? existing.period_end : period_end;

        await this.userSettingRepository.save(existing);
        return this.findOne(existing.setting_id);
      }

      const newSetting = new UserSetting();
      newSetting.user = user;
      newSetting.radius_km = restData.radius_km;
      newSetting.category = restData.category;
      newSetting.group_only = restData.group_only;
      newSetting.period_start = period_start || null;
      newSetting.period_end = period_end || null;

      return await this.userSettingRepository.save(newSetting);
    } catch (error) {
      throw new HttpException(
        {
          message: 'Erro ao criar a configuração',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async update(
    settingId: number,
    updateUserSettingDto: UpdateUserSettingDto,
    email?: string,
  ): Promise<UserSetting> {
    // Verificar se a configuração existe
    const setting = await this.userSettingRepository.findOne({
      where: { setting_id: settingId },
    });

    if (!setting) {
      throw new HttpException(
        `Configuração com ID ${settingId} não encontrada`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!email) {
      throw new HttpException(
        'Email do usuário ausente no token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new HttpException(
        `Usuário com email ${email} não encontrado`,
        HttpStatus.NOT_FOUND,
      );
    }

    // validar posse da configuração
    if (setting.user && setting.user.user_id !== user.user_id) {
      throw new HttpException(
        'Você não tem permissão para atualizar esta configuração',
        HttpStatus.FORBIDDEN,
      );
    }

    try {
      const { period_start, period_end, ...restData } =
        updateUserSettingDto as any;

      if (period_start !== undefined) setting.period_start = period_start;
      if (period_end !== undefined) setting.period_end = period_end;

      Object.assign(setting, restData);

      await this.userSettingRepository.save(setting);
      return this.findOne(settingId);
    } catch (error) {
      throw new HttpException(
        {
          message: 'Erro ao atualizar a configuração',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async remove(settingId: number, email?: string): Promise<void> {
    if (!email) {
      throw new HttpException(
        'Email do usuário ausente no token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new HttpException(
        `Usuário com email ${email} não encontrado`,
        HttpStatus.NOT_FOUND,
      );
    }

    const setting = await this.userSettingRepository.findOne({
      where: { setting_id: settingId },
      relations: ['user'],
    });
    if (!setting) {
      throw new HttpException(
        `Configuração com ID ${settingId} não encontrada`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (setting.user && setting.user.user_id !== user.user_id) {
      throw new HttpException(
        'Você não tem permissão para remover esta configuração',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.userSettingRepository.remove(setting);
  }

  async findAllByEmail(email: string): Promise<UserSetting[]> {
    if (!email) {
      throw new HttpException(
        'Email do usuário ausente no token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new HttpException(
        `Usuário com email ${email} não encontrado`,
        HttpStatus.NOT_FOUND,
      );
    }

    const rows = await this.userSettingRepository.find({
      where: { user: { user_id: user.user_id } },
      relations: ['user'],
    });
    return rows.map(
      (r) =>
        ({
          ...r,
          period_start_iso: this.hhmmssToIsoAndEpoch(r.period_start).iso,
          period_start_epoch: this.hhmmssToIsoAndEpoch(r.period_start).epoch,
          period_end_iso: this.hhmmssToIsoAndEpoch(r.period_end).iso,
          period_end_epoch: this.hhmmssToIsoAndEpoch(r.period_end).epoch,
        }) as any,
    );
  }
}

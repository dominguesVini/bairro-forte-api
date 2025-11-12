import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Incidents,
  IncidentStatus,
  IncidentType,
} from './entities/incidente.entity';
import { DataSource } from 'typeorm';
import { Repository } from 'typeorm';
import { Incidente } from './dto/create-incidente.dto';
import { User } from 'src/user/entities/user.entity';
import { OneSignalService } from 'src/notifications/onesignal.service';
import { NotificationService } from 'src/notifications/notification.service';
import { UserSetting } from 'src/user-settings/entities/user-setting.entity';

@Injectable()
export class IncidenteService {
  constructor(
    @InjectRepository(Incidents)
    private readonly incidenteRepository: Repository<Incidents>,
    private readonly datasource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly oneSignal: OneSignalService,
    private readonly notificationService: NotificationService,
    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,
  ) {}

  findAll() {
    return this.incidenteRepository
      .query(
        `
        SELECT 
            incident_id,
            type,
            description,
            ST_AsText(location) as location,
            status,
            created_at
        FROM Incidents
       `,
      )
      .then((rows: any[]) =>
        rows.map((r) => ({
          ...r,
          created_at: r.created_at
            ? new Date(r.created_at).toISOString()
            : null,
        })),
      );
  }

  async filtrarRegistros(query: any) {
    const {
      raio,
      latitude,
      longitude,
      type: typeFilter,
      de,
      ate,
      somenteGrupo,
    } = query;

    const qb = this.incidenteRepository
      .createQueryBuilder('Incidents')
      .select([
        'Incidents.incident_id AS incident_id',
        'Incidents.type AS type',
        'Incidents.description AS description',
        'Incidents.status AS status',
        'Incidents.created_at AS created_at',
      ]);

    if (typeFilter !== undefined && typeFilter !== null) {
      let typesArray: string[] = [];
      if (Array.isArray(typeFilter)) {
        typesArray = typeFilter as string[];
      } else if (typeof typeFilter === 'string') {
        try {
          const parsed = JSON.parse(typeFilter);
          if (Array.isArray(parsed)) typesArray = parsed;
          else typesArray = [typeFilter];
        } catch (e) {
          typesArray = [typeFilter];
        }
      } else {
        typesArray = [String(typeFilter)];
      }

      typesArray = typesArray.map((t) => String(t).toLowerCase());

      if (typesArray.length === 1) {
        qb.andWhere('Incidents.type = :type', { type: typesArray[0] });
      } else if (typesArray.length > 1) {
        qb.andWhere('Incidents.type IN (:...types)', { types: typesArray });
      }
    }

    // Filtro por horário (hora do created_at)
    if (de !== undefined && ate !== undefined && de !== null && ate !== null) {
      const parseHour = (val: any): number | null => {
        if (val === null || val === undefined) return null;
        if (typeof val === 'string' && val.includes(':')) {
          const n = parseInt(val.split(':')[0], 10);
          return isNaN(n) ? null : n;
        }

        const asNumber = typeof val === 'number' ? val : Number(val);
        if (!isNaN(asNumber)) {
          const d = new Date(asNumber);
          if (!isNaN(d.getTime())) return d.getHours();
        }

        try {
          const d = new Date(String(val));
          if (!isNaN(d.getTime())) return d.getHours();
        } catch (e) {
          return null;
        }
        return null;
      };

      const horaDe = parseHour(de);
      const horaAte = parseHour(ate);
      if (horaDe !== null && horaAte !== null) {
        qb.andWhere('HOUR(Incidents.created_at) BETWEEN :horaDe AND :horaAte', {
          horaDe,
          horaAte,
        });
      }
    }

    // Filtro por "grupo"
    if (somenteGrupo === 'true' || somenteGrupo === true) {
      qb.andWhere('Incidents.nome LIKE :grupo', { grupo: '%Grupo%' });
    }

    // Filtro de raio (latitude/longitude) usando ST_Distance_Sphere (em metros)
    if (latitude && longitude && raio) {
      qb.andWhere(
        `ST_Distance_Sphere(
              Incidents.location,
              ST_SRID(POINT(:lat,:lng), 4326)
            ) <= :distance`,
        {
          lat: latitude,
          lng: longitude,
          distance: Number(raio) * 1000,
        },
      );
    }

    // Adicionando latitude e longitude ao resultado
    qb.addSelect('ST_X(Incidents.location)', 'longitude');
    qb.addSelect('ST_Y(Incidents.location)', 'latitude');

    const resultados = await qb.getRawMany();
    const incidents = resultados.map((r: any) => ({
      ...r,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
    }));

    let cameras: any[] | null = null;
    if (latitude !== undefined && longitude !== undefined) {
      const camRows: any[] = await this.datasource
        .createQueryBuilder()
        .select([
          'camera_id',
          'description',
          'ST_X(location) as longitude',
          'ST_Y(location) as latitude',
          'CASE WHEN shared = 1 THEN true ELSE false END as shared',
          'created_at',
        ])
        .from('Cameras', 'c')
        .where(
          `ST_Distance_Sphere(c.location, ST_SRID(POINT(:lat,:lng),4326)) <= :distance AND c.shared = 1`,
          { lat: latitude, lng: longitude, distance: 30000 },
        )
        .getRawMany();
      cameras = camRows.map((c: any) => ({
        camera_id: c.camera_id,
        description: c.description,
        longitude: c.longitude,
        latitude: c.latitude,
        shared:
          typeof c.shared === 'boolean' ? c.shared : Boolean(Number(c.shared)),
        created_at: c.created_at ? new Date(c.created_at).toISOString() : null,
      }));

      if (cameras.length === 0) cameras = null;
    }

    const incidentsOut = incidents.length === 0 ? null : incidents;
    return { incidents: incidentsOut, cameras };
  }

  async create(data: Incidente, email?: string) {
    const { type, latitude, longitude, description, status, created_at } =
      data as any;

    // Validação dos valores de latitude e longitude
    if (latitude < -90 || latitude > 90) {
      throw new HttpException(
        {
          message: `Latitude inválida: ${latitude}. Deve estar entre -90 e 90.`,
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (longitude < -180 || longitude > 180) {
      throw new HttpException(
        {
          message: `Longitude inválida: ${longitude}. Deve estar entre -180 e 180.`,
          statusCode: HttpStatus.BAD_REQUEST,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    console.log('🌍 Coordenadas recebidas:');
    console.log('Latitude:', latitude, '(deve estar entre -90 e 90)');
    console.log('Longitude:', longitude, '(deve estar entre -180 e 180)');
    console.log('POINT SQL:', `POINT(${latitude} ${longitude})`);

    try {
      let userRef: any = undefined;
      if (email) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
          throw new HttpException(
            'Usuário do token não encontrado',
            HttpStatus.NOT_FOUND,
          );
        }
        userRef = { user_id: user.user_id };
      }
      const values: any = {
        description,
        location: () =>
          `ST_GeomFromText('POINT(${latitude} ${longitude})', 4326)`,
        status: status as IncidentStatus,
        type: type as IncidentType,
        created_by: userRef ? { user_id: userRef.user_id } : null,
      };

      if (created_at !== undefined && created_at !== null) {
        const parsed = new Date(created_at);
        if (isNaN(parsed.getTime())) {
          throw new HttpException(
            'created_at inválido',
            HttpStatus.BAD_REQUEST,
          );
        }
        values.created_at = parsed;
      }

      const result = await this.datasource
        .createQueryBuilder()
        .insert()
        .into(Incidents)
        .values(values)
        .execute();

      // Caso a inserção seja bem-sucedida
      (async () => {
        try {
          const insertedId =
            result.identifiers?.[0]?.incident_id || result.raw?.insertId;

          const incidentRow: any = await this.datasource
            .createQueryBuilder()
            .select([
              'incident_id',
              'type',
              'description',
              'ST_X(location) as longitude',
              'ST_Y(location) as latitude',
            ])
            .from(Incidents, 'i')
            .where('i.incident_id = :id', { id: insertedId })
            .getRawOne();

          if (!incidentRow) return;

          const incidentType = String(incidentRow.type).toLowerCase();
          const lat = Number(incidentRow.latitude);
          const lng = Number(incidentRow.longitude);

          const candidates = await this.userSettingRepository
            .createQueryBuilder('s')
            .leftJoinAndSelect('s.user', 'user')
            .where('FIND_IN_SET(:type, s.category)', { type: incidentType })
            .andWhere('user.email IS NOT NULL')
            .andWhere('COALESCE(s.group_only, 0) = 0')
            .andWhere(
              '(s.radius_km IS NULL OR (user.location IS NOT NULL AND ST_Distance_Sphere(user.location, ST_SRID(POINT(:lng,:lat), 4326)) <= s.radius_km * 1000))',
              { lat: lat, lng: lng },
            )
            .getMany();

          const recipientIdsSet = new Set<number>();
          const externalIdsSet = new Set<string>();
          // Map para saber a origem (settings | group)
          const recipientOrigin = new Map<number, 'settings' | 'group'>();

          for (const s of candidates) {
            const u: any = s.user as any;
            if (!u || !u.email) continue;
            // Não notificar o próprio criador
            if (userRef && u.user_id === userRef.user_id) continue;
            if (!recipientIdsSet.has(u.user_id)) {
              recipientIdsSet.add(u.user_id);
              externalIdsSet.add(u.email);
              recipientOrigin.set(u.user_id, 'settings');
            }
          }

          if (userRef && userRef.user_id) {
            const groupMembers: Array<{
              user_id: number;
              email: string | null;
            }> = await this.datasource.query(
              `
              SELECT DISTINCT
                usg2.user_id AS user_id,
                u.email AS email
              FROM user_security_groups usg1
              INNER JOIN user_security_groups usg2 ON usg1.group_id = usg2.group_id
              INNER JOIN users u ON u.user_id = usg2.user_id
              WHERE usg1.user_id = ?
                AND usg2.user_id <> ?
              `,
              [userRef.user_id, userRef.user_id],
            );

            for (const gm of groupMembers) {
              if (!gm.email) continue;
              // Sempre notificar membros de grupos, independente de distância/configs; dedup mantém única entrada
              if (recipientIdsSet.has(gm.user_id)) continue;
              recipientIdsSet.add(gm.user_id);
              externalIdsSet.add(gm.email);
              recipientOrigin.set(gm.user_id, 'group');
            }
          }

          const recipientIds = Array.from(recipientIdsSet.values());
          const externalIds = Array.from(externalIdsSet.values());

          // Registra a notificação no banco de dados
          if (recipientIds.length > 0) {
            try {
              // Usar o método atualizado que suporta localização e reporterUserId
              await this.notificationService.createNotification(
                incidentType,
                incidentRow.description || 'Novo incidente',
                {
                  recipientIds,
                  incidentId: insertedId,
                  reportType: 'incident',
                  latitude: Number(incidentRow.latitude),
                  longitude: Number(incidentRow.longitude),
                  reporterUserId: userRef?.user_id,
                },
              );
            } catch (err) {
              console.warn(
                'Erro ao registrar notificação:',
                err.message || err,
              );
            }
          }

          const BATCH = 1000;
          const templateFromEnv =
            process.env.ONESIGNAL_INCIDENT_TEMPLATE_ID || null;

          for (let i = 0; i < externalIds.length; i += BATCH) {
            const batch = externalIds.slice(i, i + BATCH);
            await this.oneSignal.sendNotification({
              template_id: templateFromEnv || undefined,
              channel_for_external_user_ids: 'push',
              data: { incidentId: insertedId },
              include_external_user_ids: batch,
              title: templateFromEnv
                ? undefined
                : `Alerta: ${incidentRow.type}`,
              message: templateFromEnv
                ? undefined
                : incidentRow.description || 'Novo incidente',
            });
          }
        } catch (err) {
          console.warn('Notify failed', err.message || err);
        }
      })();

      return {
        message: 'Registro criado com sucesso!',
        statusCode: HttpStatus.CREATED, // Status HTTP 201
        data: result.raw, // Informações adicionais da criação
      };
    } catch (error) {
      throw new HttpException(
        {
          message: 'Erro ao criar o registro',
          statusCode: HttpStatus.BAD_REQUEST,
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async delete(incidentId: number) {
    const result = this.incidenteRepository
      .createQueryBuilder()
      .delete()
      .where('Incidents.incident_id = :incidentId', { incidentId })
      .execute();
    console.log(result);
    return result;
  }

  async generateUserReport(email: string, start: string, end: string) {
    if (!email) {
      throw new Error('Email required');
    }
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return {
        cameras_count: 0,
        incidents_count: 0,
        daily: null,
      };
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid start or end date');
    }

    const camsRes: any = await this.datasource
      .createQueryBuilder()
      .select('COUNT(*) as cnt')
      .from('Cameras', 'c')
      .where(
        'c.created_by = :uid AND c.shared = 1 AND DATE(c.created_at) BETWEEN :start AND :end',
        {
          uid: user.user_id,
          start: startDate.toISOString().slice(0, 10),
          end: endDate.toISOString().slice(0, 10),
        },
      )
      .getRawOne();

    const cameras_count = Number(camsRes?.cnt || 0);

    const incRes: any = await this.datasource
      .createQueryBuilder()
      .select('COUNT(*) as cnt')
      .from('Incidents', 'i')
      .where(
        'i.created_by = :uid AND DATE(i.created_at) BETWEEN :start AND :end',
        {
          uid: user.user_id,
          start: startDate.toISOString().slice(0, 10),
          end: endDate.toISOString().slice(0, 10),
        },
      )
      .getRawOne();

    const incidents_count = Number(incRes?.cnt || 0);

    const dowMap = {
      2: 'Segunda',
      3: 'Terça',
      4: 'Quarta',
      5: 'Quinta',
      6: 'Sexta',
      7: 'Sábado',
      1: 'Domingo',
    } as any;
    const orderedKeys = [2, 3, 4, 5, 6, 7, 1];

    type DailyReportItem = {
      day: string;
      incidents: {
        count: number;
        percent: number;
      };
      cameras: {
        count: number;
        percent: number;
      };
    };

    const dailyIncidentsRows: any[] = await this.datasource
      .createQueryBuilder()
      .select('DAYOFWEEK(i.created_at) as dow')
      .addSelect('COUNT(*) as cnt')
      .from('Incidents', 'i')
      .where(
        'i.created_by = :uid AND DATE(i.created_at) BETWEEN :start AND :end',
        {
          uid: user.user_id,
          start: startDate.toISOString().slice(0, 10),
          end: endDate.toISOString().slice(0, 10),
        },
      )
      .groupBy('dow')
      .getRawMany();

    const dailyCamerasRows: any[] = await this.datasource
      .createQueryBuilder()
      .select('DAYOFWEEK(c.created_at) as dow')
      .addSelect('COUNT(*) as cnt')
      .from('Cameras', 'c')
      .where(
        'c.created_by = :uid AND c.shared = 1 AND DATE(c.created_at) BETWEEN :start AND :end',
        {
          uid: user.user_id,
          start: startDate.toISOString().slice(0, 10),
          end: endDate.toISOString().slice(0, 10),
        },
      )
      .groupBy('dow')
      .getRawMany();

    let incidentsTotal = 0;
    for (const r of dailyIncidentsRows) {
      incidentsTotal += Number(r.cnt || 0);
    }

    let camerasTotal = 0;
    for (const r of dailyCamerasRows) {
      camerasTotal += Number(r.cnt || 0);
    }

    const dailyReport: DailyReportItem[] = [];

    for (const k of orderedKeys) {
      const dayName = dowMap[k];

      const incidentRow = dailyIncidentsRows.find((d) => Number(d.dow) === k);
      const incidentCount = incidentRow ? Number(incidentRow.cnt) : 0;
      const incidentPercent =
        incidentsTotal === 0
          ? 0
          : Math.round((incidentCount / incidentsTotal) * 100);

      const cameraRow = dailyCamerasRows.find((d) => Number(d.dow) === k);
      const cameraCount = cameraRow ? Number(cameraRow.cnt) : 0;
      const cameraPercent =
        camerasTotal === 0 ? 0 : Math.round((cameraCount / camerasTotal) * 100);

      dailyReport.push({
        day: dayName,
        incidents: {
          count: incidentCount,
          percent: incidentPercent,
        },
        cameras: {
          count: cameraCount,
          percent: cameraPercent,
        },
      });
    }

    return {
      cameras_count,
      incidents_count,
      daily: dailyReport,
    };
  }

  async update(incidentId: number, data: Partial<Incidente>) {
    try {
      const { description, latitude, longitude } = data;

      const updateFields: any = {};

      if (description !== undefined) updateFields.description = description;
      if (longitude && latitude) {
        updateFields.location = () =>
          `ST_GeomFromText('POINT(${latitude} ${longitude})', 4326)`;
      }

      if (Object.keys(updateFields).length === 0) {
        return {
          message: 'Nenhum dado válido fornecido para atualização.',
          status: false,
        };
      }

      const result = await this.datasource
        .createQueryBuilder()
        .update(Incidents)
        .set(updateFields)
        .where('incident_id = :id', { id: incidentId })
        .execute();

      if (result.affected === 1) {
        return { message: 'Incidente atualizado com sucesso!', status: true };
      } else {
        return {
          message:
            'Ocorreu um erro ao tentar atualizar incidente, tente novamente!',
          status: false,
        };
      }
    } catch (error) {
      return {
        message:
          'Ocorreu um erro ao tentar atualizar o incidente, tente novamente!',
        status: false,
        error: error.message,
      };
    }
  }

  async findMine(email?: string) {
    if (!email) {
      throw new HttpException(
        'E-mail do usuário é obrigatório',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    const rows: any[] = await this.datasource
      .createQueryBuilder()
      .select([
        'i.incident_id as incident_id',
        'i.type as type',
        'i.description as description',
        'i.status as status',
        'i.created_at as created_at',
        'ST_X(i.location) as longitude',
        'ST_Y(i.location) as latitude',
      ])
      .from(Incidents, 'i')
      .where('i.created_by = :uid', { uid: user.user_id })
      .orderBy('i.created_at', 'DESC')
      .getRawMany();

    return rows.map((r) => ({
      ...r,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
    }));
  }

  async findById(incidentId: number) {
    const row: any = await this.datasource
      .createQueryBuilder()
      .select([
        'i.incident_id as incident_id',
        'i.type as type',
        'i.description as description',
        'i.status as status',
        'i.created_at as created_at',
        'ST_X(i.location) as longitude',
        'ST_Y(i.location) as latitude',
        'u.user_id as created_by_id',
        'u.name as created_by_name',
        'u.email as created_by_email',
      ])
      .from(Incidents, 'i')
      .leftJoin(User, 'u', 'u.user_id = i.created_by')
      .where('i.incident_id = :id', { id: incidentId })
      .getRawOne();

    if (!row) {
      throw new HttpException('Incidente não encontrado', HttpStatus.NOT_FOUND);
    }
    let createdIso: string | null = null;
    let createdBr: string | null = null;
    if (row.created_at) {
      let isoBase: string | null = null;
      if (row.created_at instanceof Date) {
        isoBase = row.created_at.toISOString();
      } else if (typeof row.created_at === 'string') {
        if (row.created_at.includes('T')) {
          isoBase = new Date(row.created_at).toISOString();
        } else {
          const onlyDate = row.created_at.slice(0, 10);
          isoBase = `${onlyDate}T00:00:00.000Z`;
        }
      }
      if (isoBase) {
        createdIso = isoBase;
        const datePart = isoBase.slice(0, 10);
        const [yyyy, mm, dd] = datePart.split('-');
        createdBr = `${dd}/${mm}/${yyyy}`;
      }
    }
    return {
      ...row,
      created_at: createdIso,
      created_at_br: createdBr,
    };
  }

  async cancelIncident(incidentId: number, email?: string) {
    if (!email) {
      throw new HttpException(
        'E-mail do usuário é obrigatório',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    const incident = await this.incidenteRepository.findOne({
      where: { incident_id: incidentId },
      relations: ['created_by'],
    });
    if (!incident) {
      throw new HttpException('Incidente não encontrado', HttpStatus.NOT_FOUND);
    }
    const ownerId = (incident.created_by as any)?.user_id;
    if (!ownerId || ownerId !== user.user_id) {
      throw new HttpException(
        'Você não tem permissão para cancelar este incidente',
        HttpStatus.FORBIDDEN,
      );
    }

    const result = await this.incidenteRepository.delete({
      incident_id: incidentId,
    });
    return { success: result.affected === 1 };
  }
}

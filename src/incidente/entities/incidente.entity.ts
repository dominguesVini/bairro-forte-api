import { User } from 'src/user/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum IncidentType {
  ROUBO = 'roubo',
  FURTO = 'furto',
  VANDALISMO = 'vandalismo',
  OUTROS = 'outros',
}

export enum IncidentStatus {
  ABERTO = 'aberto',
  EM_ANALISE = 'em análise',
  RESOLVIDO = 'resolvido',
}

@Entity('Incidents')
export class Incidents {
  @PrimaryGeneratedColumn()
  incident_id: number;

  @Column({
    type: 'enum',
    enum: IncidentType,
  })
  type: IncidentType;

  @Column({ length: 250 })
  description: string;

  @Column({
    type: 'point',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: object;

  @Column({
    type: 'enum',
    enum: IncidentStatus,
    default: IncidentStatus.ABERTO,
  })
  status: IncidentStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
  
  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  created_by: User;
}

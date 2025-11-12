import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

export enum NotificationCategory {
  Vandalismo = 'Vandalismo',
  Outros = 'Outros',
  Furto = 'Furto',
  Roubo = 'Roubo',
}

@Entity('user_settings')
export class UserSetting {
  @PrimaryGeneratedColumn()
  setting_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('decimal', { precision: 5, scale: 2, default: 5.00 })
  @Column('decimal', {
    precision: 5,
    scale: 2,
    default: 5.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => {
        if (value === null || value === undefined) return null;
        const n = typeof value === 'number' ? value : parseFloat(String(value));
        return Number(n.toFixed(2));
      },
    },
  })
  radius_km: number;

  @Column({
    type: 'simple-array',
  })
  category: NotificationCategory[];

  @Column({ type: 'time', nullable: true })
  period_start: string | null;

  @Column({ type: 'time', nullable: true })
  period_end: string | null;

  @Column('boolean', { default: false })
  group_only: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}

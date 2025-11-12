import { User } from 'src/user/entities/user.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Notification } from './notification.entity';

@Entity('NotificationRecipients')
export class NotificationRecipient {
  @PrimaryColumn()
  notification_id: number;

  @PrimaryColumn()
  user_id: number;
  
  @ManyToOne(() => Notification, notification => notification.recipients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ default: false })
  read: boolean;

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date;

  @CreateDateColumn()
  created_at: Date;
}

import { User } from 'src/user/entities/user.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { NotificationRecipient } from './notification-recipient.entity';
import { Incidents } from 'src/incidente/entities/incidente.entity';
import { Cameras } from 'src/cameras/entities/camera.entity';

@Entity('Notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  notification_id: number;

  @Column({ type: 'varchar', length: 255 })
  type: string;

  @Column({ type: 'text', nullable: true })
  message: string;
  
  @Column({ type: 'enum', enum: ['incident', 'camera'], nullable: true })
  report_type: string;
  
  @Column({ type: 'point', nullable: true, spatialFeatureType: 'Point' })
  location: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'for_user_private_id' })
  for_user_private: User;

  @Column({ nullable: true })
  for_user_private_id: number;

  @ManyToOne(() => Incidents, { nullable: true })
  @JoinColumn({ name: 'incident_id' })
  incident: Incidents;

  @Column({ nullable: true })
  incident_id: number;
  
  @ManyToOne(() => Cameras, { nullable: true })
  @JoinColumn({ name: 'camera_id' })
  camera: Cameras;

  @Column({ nullable: true })
  camera_id: number;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => NotificationRecipient, (recipient: NotificationRecipient) => recipient.notification)
  recipients: NotificationRecipient[];
}

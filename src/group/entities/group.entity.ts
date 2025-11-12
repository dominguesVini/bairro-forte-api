import { User } from 'src/user/entities/user.entity';
import { City } from 'src/cities/city.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserSecurityGroup } from './user_security_groups';

@Entity('security_groups')
export class SecurityGroup {
  @PrimaryGeneratedColumn()
  group_id: number;

  @Column()
  name: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'boolean', default: () => 'true' })
  private: boolean;

  @OneToMany(() => UserSecurityGroup, (usg) => usg.group)
  userSecurityGroups: UserSecurityGroup[];

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'created_by' })
  created_by: User;

  @ManyToOne(() => City, { nullable: true, eager: false })
  @JoinColumn({ name: 'city_id' })
  city?: City;
}

import { User } from 'src/user/entities/user.entity';
import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { SecurityGroup } from './group.entity';

@Entity('user_security_groups')
export class UserSecurityGroup {
  @PrimaryColumn()
  user_id: number;

  @PrimaryColumn()
  group_id: number;

  @ManyToOne(() => User, (user) => user.userSecurityGroups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => SecurityGroup, (group) => group.userSecurityGroups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: SecurityGroup;
}

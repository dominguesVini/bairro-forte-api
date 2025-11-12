import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToMany,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SecurityGroup } from 'src/group/entities/group.entity';
import { UserSecurityGroup } from 'src/group/entities/user_security_groups';
import { Cameras } from 'src/cameras/entities/camera.entity';
import { City } from 'src/cities/city.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  user_id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  role: 'Morador' | 'Segurança privada';

  @Column()
  gender: 'Masculino' | 'Feminino' | 'Prefiro não dizer';

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: string;

  @Column({ default: false })
  show_info_in_groups: boolean;

  @Column({ default: false })
  share_reported_info: boolean;
  
  @Column({ default: false })
  group_only_notifications: boolean;

  @Column({ nullable: true })
  notification_token: string;
  
  @Column({ nullable: true, unique: true })
  phone: string;

  @OneToMany(() => UserSecurityGroup, (usg) => usg.user)
  userSecurityGroups: UserSecurityGroup[];

   // Relacionamento com as câmeras
   @OneToMany(() => Cameras, (camera) => camera.created_by)
   cameras: Cameras[]; 

  // Cidade (código/IBGE) associada ao usuário
  @ManyToOne(() => City, (city) => city.users, { nullable: true })
  @JoinColumn({ name: 'city_id' })
  city?: City;
}

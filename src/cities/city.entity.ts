import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Uf } from './uf.entity';

@Entity({ name: 'cities' })
export class City {
  // Código da cidade
  @PrimaryColumn('int')
  city_id: number;

  // Relacionamento com UF
  @ManyToOne(() => Uf, (uf) => uf.cities, { nullable: false })
  @JoinColumn({ name: 'uf_id' })
  uf: Uf;

  @Column({ length: 150 })
  name: string;

  @OneToMany(() => User, (user) => user.city)
  users: User[];
}

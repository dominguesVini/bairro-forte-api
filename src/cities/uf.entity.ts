import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { City } from './city.entity';

@Entity({ name: 'ufs' })
export class Uf {
  @PrimaryColumn('int')
  uf_id: number;
  @Column({ length: 2 })
  sigla: string;

  @Column({ length: 100 })
  name: string;

  @OneToMany(() => City, (city) => city.uf)
  cities: City[];
}

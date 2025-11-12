-- Cria tabela de cidades
CREATE TABLE IF NOT EXISTS `cities` (
  `city_id` INT NOT NULL,
  `uf` CHAR(2) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  PRIMARY KEY (`city_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Adiciona coluna de vínculo na tabela users
ALTER TABLE `users`
  ADD COLUMN `city_id` INT NULL;

-- Cria índice e FK
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_city`
    FOREIGN KEY (`city_id`) REFERENCES `cities`(`city_id`)
    ON UPDATE CASCADE ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS `ufs` (
  `uf_id` INT NOT NULL,        
  `sigla` CHAR(2) NOT NULL,      
  `name` VARCHAR(100) NOT NULL,   
  PRIMARY KEY (`uf_id`),
  UNIQUE KEY `uk_ufs_sigla` (`sigla`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX `idx_ufs_name` ON `ufs` (`name`);

ALTER TABLE `cities` ADD COLUMN `uf_id` INT NULL;

ALTER TABLE `cities` MODIFY `uf_id` INT NOT NULL;

CREATE INDEX `idx_cities_uf_id` ON `cities`(`uf_id`);

ALTER TABLE `cities`
  ADD CONSTRAINT `fk_cities_uf_id`
  FOREIGN KEY (`uf_id`) REFERENCES `ufs`(`uf_id`)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE `cities` DROP FOREIGN KEY `fk_cities_uf_sigla`;
ALTER TABLE `cities` DROP COLUMN `uf`;
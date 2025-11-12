-- Adiciona coluna city_id e FK à tabela security_groups
ALTER TABLE security_groups
  ADD COLUMN city_id INT NULL AFTER private;

-- Garante que cities.city_id exista
ALTER TABLE security_groups
  ADD CONSTRAINT fk_security_groups_city
    FOREIGN KEY (city_id) REFERENCES cities(city_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

--  Index para filtro por cidade
CREATE INDEX idx_security_groups_city_id ON security_groups(city_id);
=
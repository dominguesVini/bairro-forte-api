
START TRANSACTION;

ALTER TABLE user_settings
  ADD COLUMN category_new VARCHAR(255) NOT NULL DEFAULT 'Outros';


UPDATE user_settings
SET category_new = CASE
  WHEN category IN ('Roubo','Furto','Vandalismo','Outros') THEN category
  WHEN category IN ('EVENTOS','PROMOCOES','NOTICIAS','GERAL') THEN 'Outros'
  ELSE 'Outros'
END;


ALTER TABLE user_settings DROP COLUMN category;
ALTER TABLE user_settings CHANGE COLUMN category_new category VARCHAR(255) NOT NULL DEFAULT 'Outros';

COMMIT;

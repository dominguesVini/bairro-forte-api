-- Adicionar campo de tipo de relatório na tabela de notificações
ALTER TABLE `Notifications` 
ADD COLUMN `report_type` ENUM('incident', 'camera') NULL AFTER `message`;

-- Adicionar referência para a tabela de câmeras
ALTER TABLE `Notifications` 
ADD COLUMN `camera_id` INT NULL AFTER `incident_id`;

-- Adicionar constraint de chave estrangeira para câmeras
ALTER TABLE `Notifications` 
ADD CONSTRAINT `fk_notification_camera` 
FOREIGN KEY (`camera_id`) 
REFERENCES `Cameras` (`camera_id`) 
ON DELETE CASCADE 
ON UPDATE CASCADE;


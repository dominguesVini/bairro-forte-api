-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS `Notifications` (
  `notification_id` INT NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(50) NOT NULL,
  `message` TEXT NOT NULL,
  `incident_id` INT NULL,
  `for_user_private_id` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  INDEX `idx_notification_incident` (`incident_id`),
  INDEX `idx_notification_user` (`for_user_private_id`),
  CONSTRAINT `fk_notification_incident` 
    FOREIGN KEY (`incident_id`) 
    REFERENCES `Incidents` (`incident_id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_notification_user` 
    FOREIGN KEY (`for_user_private_id`) 
    REFERENCES `User` (`user_id`) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de destinatários de notificações
CREATE TABLE IF NOT EXISTS `NotificationRecipients` (
  `notification_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `read` BOOLEAN NOT NULL DEFAULT FALSE,
  `read_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`, `user_id`),
  INDEX `idx_notification_recipient_user` (`user_id`),
  INDEX `idx_notification_recipient_read` (`read`),
  CONSTRAINT `fk_notification_recipient_notification` 
    FOREIGN KEY (`notification_id`) 
    REFERENCES `Notifications` (`notification_id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_notification_recipient_user` 
    FOREIGN KEY (`user_id`) 
    REFERENCES `User` (`user_id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

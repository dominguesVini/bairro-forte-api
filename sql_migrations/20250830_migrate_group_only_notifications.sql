
START TRANSACTION;

UPDATE user_settings us
JOIN users u ON us.user_id = u.user_id
SET us.group_only = u.group_only_notifications;

INSERT INTO user_settings (user_id, radius_km, category, group_only)
SELECT 
    u.user_id, 
    5.0 AS radius_km, 
    'Outros' AS category, 
    u.group_only_notifications AS group_only
FROM users u
LEFT JOIN user_settings us ON u.user_id = us.user_id
WHERE us.setting_id IS NULL;


COMMIT;


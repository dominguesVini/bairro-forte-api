
START TRANSACTION;

ALTER TABLE users
ADD SPATIAL INDEX idx_user_location (location);

COMMIT;

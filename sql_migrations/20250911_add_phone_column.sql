-- Adiciona coluna phone à tabela users
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL;

-- Adiciona índice único para evitar duplicações
ALTER TABLE users ADD UNIQUE INDEX idx_users_phone (phone);

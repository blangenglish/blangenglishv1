-- Inserta el administrador en la tabla admin_users
-- (el usuario de Auth debe crearse manualmente o ya existir)
INSERT INTO admin_users (email, role)
VALUES ('blangenglishlearning@blangenglish.com', 'super_admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';

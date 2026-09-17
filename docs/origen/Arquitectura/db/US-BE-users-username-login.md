# Usuarios: creación segura y acceso por username o email

## Cambio de contrato

La colección `users` incorpora `username` como identificador opcional para los
registros históricos y obligatorio para los usuarios creados desde el panel.
Se normaliza a minúsculas y admite entre 3 y 30 caracteres alfanuméricos, punto,
guion y guion bajo.

El índice `ux_users_username` es único y `sparse`, de modo que la migración no
invalida usuarios existentes que todavía no tengan el campo. El índice de email
continúa siendo único.

## Seguridad de contraseña

`POST /api/users` y `PATCH /api/users/:id` reciben `password`; la capa de
aplicación la convierte a Argon2 antes de llamar al repositorio. `password_hash`
no forma parte de ningún DTO público ni se devuelve en las respuestas.

## Autenticación

`POST /api/auth/login` acepta `identifier` con username o email. El campo
histórico `email` se conserva temporalmente como alias compatible para clientes
existentes.

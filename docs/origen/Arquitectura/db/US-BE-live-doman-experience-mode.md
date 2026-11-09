# Modo de experiencia en salas Live Doman

Cada documento de `doman_live_sessions` persiste `experience_mode` con uno de estos valores:

- `standard`: el estudiante ve la tarjeta sin abrir la cámara.
- `vr`: el cliente habilita la experiencia inmersiva WebAR durante la presentación.

El campo pertenece a la sesión, se fija al crearla y forma parte de la proyección segura enviada al estudiante por REST y Ably. La migración `20261108-live-doman-experience-mode.js` asigna `standard` a las sesiones históricas antes de volver obligatorio el campo en el validador Mongo.

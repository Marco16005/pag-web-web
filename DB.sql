-- Crear tablas solo si no existen
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='usuarios' AND xtype='U')
CREATE TABLE usuarios (
    id_usuario INT IDENTITY(1,1) PRIMARY KEY,
    nombre_usuario VARCHAR(255) NOT NULL UNIQUE,
    correo VARCHAR(255) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'user' CHECK (rol IN ('user', 'admin')),
    fecha_registro DATETIME DEFAULT GETDATE(),
    genero VARCHAR(50),
    fecha_nacimiento DATE
);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='objetos' AND xtype='U')
CREATE TABLE objetos (
    id_objeto INT IDENTITY(1,1) PRIMARY KEY,
    nombre_objeto VARCHAR(255) NOT NULL,
    descripcion TEXT,
    calidad INT 
);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='npcs' AND xtype='U')
CREATE TABLE npcs (
    id_npc INT IDENTITY(1,1) PRIMARY KEY,
    nombre_npc VARCHAR(255) NOT NULL,
    es_teu BIT DEFAULT 0 -- 0 for false, 1 for true
);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='misiones' AND xtype='U')
CREATE TABLE misiones (
    id_mision INT IDENTITY(1,1) PRIMARY KEY,
    nombre_mision VARCHAR(255) NOT NULL,
    descripcion TEXT,
    recompensa_xp INT,
    recompensa_objeto_id INT,
    npc_id INT, -- NPC que da la mision
    FOREIGN KEY (recompensa_objeto_id) REFERENCES objetos(id_objeto),
    FOREIGN KEY (npc_id) REFERENCES npcs(id_npc)
);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='usuarios_misiones' AND xtype='U')
CREATE TABLE usuarios_misiones (
    id_usuario_mision INT IDENTITY(1,1) PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_mision INT NOT NULL,
    fecha_completada DATETIME,
    estado VARCHAR(50) DEFAULT 'pendiente', -- pendiente, completada
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_mision) REFERENCES misiones(id_mision)
);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='inventario' AND xtype='U')
CREATE TABLE inventario (
    id_inventario INT IDENTITY(1,1) PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_objeto INT NOT NULL,
    cantidad INT DEFAULT 1,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_objeto) REFERENCES objetos(id_objeto)
);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='estadisticas' AND xtype='U')
CREATE TABLE estadisticas (
    id_estadistica INT IDENTITY(1,1) PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    misiones_completadas INT DEFAULT 0,
    objetos_obtenidos INT DEFAULT 0,
    enemigos_neutralizados INT DEFAULT 0,
    tiempo_total_juego BIGINT DEFAULT 0, 
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='leaderboard' AND xtype='U')
CREATE TABLE leaderboard (
    id_leaderboard INT IDENTITY(1,1) PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    puntuacion_total INT DEFAULT 0,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='contact_messages' AND xtype='U')
CREATE TABLE contact_messages (
    id_contact_message INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    submission_date DATETIME DEFAULT GETDATE(),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived'))
);
GO

-- Tabla de Bitacora (Log Table) 
IF OBJECT_ID('bitacora_log', 'U') IS NULL
BEGIN
    CREATE TABLE bitacora_log (
        id_log INT IDENTITY(1,1) PRIMARY KEY,
        nombre_tabla_afectada VARCHAR(100) NOT NULL,
        id_registro_afectado VARCHAR(255),
        nombre_usuario_modificador VARCHAR(100),
        pantalla_origen VARCHAR(255),
        descripcion_accion NVARCHAR(MAX),
        tipo_operacion VARCHAR(50) NOT NULL,
        fecha_operacion DATETIME DEFAULT GETDATE(),
        estatus_operacion VARCHAR(50) DEFAULT 'SUCCESS',
        datos_viejos NVARCHAR(MAX),
        datos_nuevos NVARCHAR(MAX)
    );
END;
GO

-- PROCEDURES PARA REGISTRO Y LOGIN 
CREATE OR ALTER PROCEDURE registrar_usuario
    @p_correo VARCHAR(255),
    @p_nombre_usuario VARCHAR(255),
    @p_contrasena_hash VARCHAR(255),
    @p_genero VARCHAR(50),
    @p_fecha_nacimiento DATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar edad mínima (13 años)
    IF DATEDIFF(year, @p_fecha_nacimiento, GETDATE()) < 13
    BEGIN
        SELECT 'AGE_BELOW_MINIMUM' AS status;
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM usuarios WHERE correo = @p_correo)
    BEGIN
        SELECT 'EXISTE' AS status;
        RETURN;
    END
    IF EXISTS (SELECT 1 FROM usuarios WHERE nombre_usuario = @p_nombre_usuario)
    BEGIN
        SELECT 'USERNAME_EXISTS' AS status;
        RETURN;
    END
    INSERT INTO usuarios (correo, nombre_usuario, contrasena_hash, rol, genero, fecha_nacimiento)
    VALUES (@p_correo, @p_nombre_usuario, @p_contrasena_hash, 'user', @p_genero, @p_fecha_nacimiento);
    
    DECLARE @new_user_id INT;
    SET @new_user_id = SCOPE_IDENTITY();

    IF @new_user_id IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM estadisticas WHERE id_usuario = @new_user_id)
        BEGIN
            INSERT INTO estadisticas (id_usuario) VALUES (@new_user_id);
        END
        IF NOT EXISTS (SELECT 1 FROM leaderboard WHERE id_usuario = @new_user_id)
        BEGIN
            INSERT INTO leaderboard (id_usuario, puntuacion_total) VALUES (@new_user_id, 0);
        END
    END
    
    SELECT 'OK' AS status;
END;
GO

CREATE OR ALTER PROCEDURE login_usuario
    @p_correo_param VARCHAR(255)
AS
BEGIN
    SELECT
        u.id_usuario,
        u.nombre_usuario,
        u.correo,
        u.rol,
        u.contrasena_hash
    FROM usuarios u
    WHERE u.correo = @p_correo_param;
END;
GO

CREATE OR ALTER PROCEDURE eliminar_usuario_admin
    @p_id_usuario INT
AS
BEGIN
    DECLARE @v_rol VARCHAR(50);
    DECLARE @v_admin_count INT;

    SELECT @v_rol = rol FROM usuarios WHERE id_usuario = @p_id_usuario;

    IF @v_rol IS NULL
    BEGIN
        SELECT 'NOT_FOUND' AS status;
        RETURN;
    END

    -- Verificar si es el último administrador
    IF @v_rol = 'admin'
    BEGIN
        SELECT @v_admin_count = COUNT(*) FROM usuarios WHERE rol = 'admin';
        IF @v_admin_count <= 1
        BEGIN
            SELECT 'NO_DELETE_LAST_ADMIN' AS status;
            RETURN;
        END
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        DELETE FROM estadisticas WHERE id_usuario = @p_id_usuario;
        DELETE FROM leaderboard WHERE id_usuario = @p_id_usuario;
        DELETE FROM inventario WHERE id_usuario = @p_id_usuario;
        DELETE FROM usuarios_misiones WHERE id_usuario = @p_id_usuario;
        
        DELETE FROM usuarios WHERE id_usuario = @p_id_usuario;
        COMMIT TRANSACTION;
        SELECT 'OK' AS status;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW; 
        SELECT 'ERROR' AS status; 
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE actualizar_usuario_admin
    @p_id_usuario INT,
    @p_nombre_usuario VARCHAR(255),
    @p_correo VARCHAR(255),
    @p_rol VARCHAR(50)
AS
BEGIN
    DECLARE @v_current_rol VARCHAR(50);
    DECLARE @v_admin_count INT;

    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = @p_id_usuario)
    BEGIN
        SELECT 'NOT_FOUND' AS status;
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM usuarios WHERE correo = @p_correo AND id_usuario != @p_id_usuario)
    BEGIN
        SELECT 'EMAIL_EXISTS' AS status;
        RETURN;
    END
    
    IF EXISTS (SELECT 1 FROM usuarios WHERE nombre_usuario = @p_nombre_usuario AND id_usuario != @p_id_usuario)
    BEGIN
        SELECT 'USERNAME_EXISTS' AS status; 
        RETURN;
    END

    SELECT @v_current_rol = rol FROM usuarios WHERE id_usuario = @p_id_usuario;

    IF @v_current_rol = 'admin' AND @p_rol = 'user'
    BEGIN
        SELECT @v_admin_count = COUNT(*) FROM usuarios WHERE rol = 'admin';
        IF @v_admin_count <= 1
        BEGIN
            SELECT 'CANNOT_DEMOTE_LAST_ADMIN' AS status;
            RETURN;
        END
    END

    UPDATE usuarios
    SET nombre_usuario = @p_nombre_usuario,
        correo = @p_correo,
        rol = @p_rol
    WHERE id_usuario = @p_id_usuario;
    SELECT 'OK' AS status;
END;
GO

CREATE OR ALTER PROCEDURE insert_contact_message
    @p_name VARCHAR(255),
    @p_email VARCHAR(255),
    @p_message NVARCHAR(MAX)
AS
BEGIN
    INSERT INTO contact_messages (name, email, message)
    VALUES (@p_name, @p_email, @p_message);
    SELECT SCOPE_IDENTITY() AS new_id;
END;
GO

CREATE OR ALTER PROCEDURE get_contact_messages_admin
AS
BEGIN
    SELECT
        cm.id_contact_message,
        cm.name,
        cm.email,
        cm.message,
        cm.submission_date,
        cm.status
    FROM contact_messages cm
    ORDER BY cm.submission_date DESC;
END;
GO

CREATE OR ALTER PROCEDURE update_contact_message_status_admin
    @p_id_contact_message INT,
    @p_new_status VARCHAR(50)
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM contact_messages WHERE id_contact_message = @p_id_contact_message)
    BEGIN
        SELECT 'NOT_FOUND' AS status_update_result;
        RETURN;
    END

    UPDATE contact_messages
    SET status = @p_new_status
    WHERE id_contact_message = @p_id_contact_message;
    SELECT 'OK' AS status_update_result;
END;
GO

CREATE OR ALTER PROCEDURE get_global_leaderboard
    @p_limit INT
AS
BEGIN
    SELECT TOP (@p_limit)
        ROW_NUMBER() OVER (ORDER BY l.puntuacion_total DESC) as rank,
        u.nombre_usuario,
        l.puntuacion_total
    FROM leaderboard l
    JOIN usuarios u ON l.id_usuario = u.id_usuario
    ORDER BY l.puntuacion_total DESC;
END;
GO

CREATE OR ALTER PROCEDURE get_user_score
    @p_user_id INT
AS
BEGIN
    SELECT
        l.puntuacion_total
    FROM leaderboard l
    WHERE l.id_usuario = @p_user_id;
END;
GO

CREATE OR ALTER PROCEDURE get_all_users_admin
AS
BEGIN
    SELECT id_usuario, nombre_usuario, correo, rol, fecha_registro 
    FROM usuarios 
    ORDER BY id_usuario ASC;
END;
GO

CREATE OR ALTER PROCEDURE get_statistics_admin
AS
BEGIN
    SELECT 
        s.id_usuario, 
        u.nombre_usuario, 
        s.misiones_completadas, 
        s.objetos_obtenidos, 
        s.enemigos_neutralizados, 
        s.tiempo_total_juego 
    FROM estadisticas s
    JOIN usuarios u ON s.id_usuario = u.id_usuario
    ORDER BY u.nombre_usuario ASC;
END;
GO

-- Stored Procedure to Add a Log Entry Manually
CREATE OR ALTER PROCEDURE sp_add_log_entry
    @p_nombre_tabla_afectada VARCHAR(100),
    @p_id_registro_afectado VARCHAR(255),
    @p_nombre_usuario_modificador VARCHAR(100),
    @p_pantalla_origen VARCHAR(255),
    @p_descripcion_accion NVARCHAR(MAX),
    @p_tipo_operacion VARCHAR(50),
    @p_estatus_operacion VARCHAR(50) = 'SUCCESS',
    @p_datos_viejos NVARCHAR(MAX) = NULL,
    @p_datos_nuevos NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO bitacora_log (
        nombre_tabla_afectada,
        id_registro_afectado,
        nombre_usuario_modificador,
        pantalla_origen,
        descripcion_accion,
        tipo_operacion,
        fecha_operacion,
        estatus_operacion,
        datos_viejos,
        datos_nuevos
    ) VALUES (
        @p_nombre_tabla_afectada,
        @p_id_registro_afectado,
        @p_nombre_usuario_modificador,
        @p_pantalla_origen,
        @p_descripcion_accion,
        @p_tipo_operacion,
        GETDATE(),
        @p_estatus_operacion,
        @p_datos_viejos,
        @p_datos_nuevos
    );
END;
GO

-- Stored Procedure to Get Log Entries 
CREATE OR ALTER PROCEDURE sp_get_log_entries
    @p_nombre_tabla VARCHAR(100) = NULL,
    @p_tipo_operacion_filter VARCHAR(50) = NULL,
    @p_fecha_inicio DATETIME = NULL,
    @p_fecha_fin DATETIME = NULL,
    @p_limit INT = 100,
    @p_offset INT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        bl.id_log,
        bl.nombre_tabla_afectada,
        bl.id_registro_afectado,
        bl.nombre_usuario_modificador,
        bl.pantalla_origen,
        bl.descripcion_accion,
        bl.tipo_operacion,
        bl.fecha_operacion,
        bl.estatus_operacion,
        bl.datos_viejos,
        bl.datos_nuevos
    FROM bitacora_log bl
    WHERE (@p_nombre_tabla IS NULL OR bl.nombre_tabla_afectada = @p_nombre_tabla)
      AND (@p_tipo_operacion_filter IS NULL OR bl.tipo_operacion = @p_tipo_operacion_filter)
      AND (@p_fecha_inicio IS NULL OR bl.fecha_operacion >= @p_fecha_inicio)
      AND (@p_fecha_fin IS NULL OR bl.fecha_operacion <= @p_fecha_fin)
    ORDER BY bl.fecha_operacion DESC
    OFFSET @p_offset ROWS
    FETCH NEXT @p_limit ROWS ONLY;
END;
GO

-- Trigger on 'usuarios' 
CREATE OR ALTER TRIGGER trg_audit_usuarios_changes
ON usuarios
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @v_nombre_usuario_modificador VARCHAR(100);
    DECLARE @v_pantalla_origen VARCHAR(255) = 'System - Usuarios Table Trigger';
    DECLARE @v_tipo_operacion VARCHAR(50);
    DECLARE @TableName VARCHAR(100) = 'usuarios';

    -- Attempt to get current user performing the action
    SET @v_nombre_usuario_modificador = SUSER_SNAME(); 
    IF @v_nombre_usuario_modificador IS NULL 
        SET @v_nombre_usuario_modificador = 'Unknown';

    -- Handle INSERT operations
    IF EXISTS (SELECT * FROM inserted) AND NOT EXISTS (SELECT * FROM deleted)
    BEGIN
        SET @v_tipo_operacion = 'INSERT';
        INSERT INTO bitacora_log (
            nombre_tabla_afectada,
            id_registro_afectado,
            nombre_usuario_modificador,
            pantalla_origen,
            descripcion_accion,
            tipo_operacion,
            datos_nuevos 
        )
        SELECT
            @TableName,
            CAST(i.id_usuario AS VARCHAR(255)), 
            @v_nombre_usuario_modificador,
            @v_pantalla_origen,
            'Nuevo usuario creado: ' + ISNULL(i.nombre_usuario, 'N/A'),
            @v_tipo_operacion,
            (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) 
        FROM inserted i;
    END

    -- Handle DELETE operations
    ELSE IF EXISTS (SELECT * FROM deleted) AND NOT EXISTS (SELECT * FROM inserted)
    BEGIN
        SET @v_tipo_operacion = 'DELETE';
        INSERT INTO bitacora_log (
            nombre_tabla_afectada,
            id_registro_afectado,
            nombre_usuario_modificador,
            pantalla_origen,
            descripcion_accion,
            tipo_operacion,
            datos_viejos
        )
        SELECT
            @TableName,
            CAST(d.id_usuario AS VARCHAR(255)),
            @v_nombre_usuario_modificador,
            @v_pantalla_origen,
            'Usuario eliminado: ID ' + CAST(d.id_usuario AS VARCHAR(255)) + ', Nombre: ' + ISNULL(d.nombre_usuario, 'N/A'),
            @v_tipo_operacion,
            (SELECT d.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
        FROM deleted d;
    END

    -- Handle UPDATE operations
    ELSE IF EXISTS (SELECT * FROM inserted) AND EXISTS (SELECT * FROM deleted)
    BEGIN
        SET @v_tipo_operacion = 'UPDATE';
        INSERT INTO bitacora_log (
            nombre_tabla_afectada,
            id_registro_afectado,
            nombre_usuario_modificador,
            pantalla_origen,
            descripcion_accion,
            tipo_operacion,
            datos_viejos,
            datos_nuevos
        )
        SELECT
            @TableName,
            CAST(i.id_usuario AS VARCHAR(255)), 
            @v_nombre_usuario_modificador,
            @v_pantalla_origen,
            'Usuario actualizado: ID ' + CAST(i.id_usuario AS VARCHAR(255)) +
            '. Nombre: ' + ISNULL(d.nombre_usuario, 'N/A') + ' -> ' + ISNULL(i.nombre_usuario, 'N/A') +
            '. Correo: ' + ISNULL(d.correo, 'N/A') + ' -> ' + ISNULL(i.correo, 'N/A') +
            '. Rol: ' + ISNULL(d.rol, 'N/A') + ' -> ' + ISNULL(i.rol, 'N/A'),
            @v_tipo_operacion, -- Added missing tipo_operacion
            (SELECT d.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER), -- datos_viejos
            (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)  -- datos_nuevos
        FROM inserted i
        INNER JOIN deleted d ON i.id_usuario = d.id_usuario; 
    END
END;
GO

-- View for Bitacora Log
CREATE OR ALTER VIEW vw_bitacora_log_full
AS
SELECT
    id_log,
    nombre_tabla_afectada,
    id_registro_afectado,
    nombre_usuario_modificador,
    pantalla_origen,
    descripcion_accion,
    tipo_operacion,
    fecha_operacion,
    estatus_operacion,
    datos_viejos,
    datos_nuevos
FROM bitacora_log;
GO

-- New View for User Action Summary Log
CREATE OR ALTER VIEW vw_user_action_summary_log
AS
SELECT
    bl.id_log,
    bl.fecha_operacion AS action_timestamp,
    bl.tipo_operacion AS operation_type,
    bl.nombre_tabla_afectada AS table_affected,
    SUBSTRING(bl.descripcion_accion, 1, 150) AS action_summary, -- Shorter summary
    bl.descripcion_accion AS full_action_description, -- For modal
    bl.nombre_usuario_modificador AS raw_modifier_identity, -- Raw value from log
    modifier_user.nombre_usuario AS modifier_app_username,
    modifier_user.correo AS modifier_app_email,
    CASE
        WHEN bl.nombre_tabla_afectada = 'usuarios' AND TRY_CAST(bl.id_registro_afectado AS INT) IS NOT NULL
        THEN affected_user.nombre_usuario
        ELSE NULL
    END AS affected_entity_name, -- e.g., name of the user whose record was changed
    bl.id_registro_afectado AS affected_record_id,
    bl.estatus_operacion AS operation_status
FROM
    bitacora_log bl
LEFT JOIN
    usuarios modifier_user ON bl.nombre_usuario_modificador = modifier_user.nombre_usuario -- Assumes nombre_usuario_modificador stores an app username
LEFT JOIN
    usuarios affected_user ON bl.nombre_tabla_afectada = 'usuarios' AND TRY_CAST(bl.id_registro_afectado AS INT) = affected_user.id_usuario;
GO

-- POPULATE TEST DATA --

-- Call registrar_usuario to create users (this will also populate estadisticas and leaderboard)
EXEC registrar_usuario @p_correo = 'admin@example.com', @p_nombre_usuario = 'AdminUser', @p_contrasena_hash = 'hashed_admin_password', @p_genero = 'Other', @p_fecha_nacimiento = '1990-01-01';
EXEC registrar_usuario @p_correo = 'playerone@example.com', @p_nombre_usuario = 'PlayerOne', @p_contrasena_hash = 'hashed_player_password', @p_genero = 'Male', @p_fecha_nacimiento = '2005-05-10';
EXEC registrar_usuario @p_correo = 'playertwo@example.com', @p_nombre_usuario = 'PlayerTwo', @p_contrasena_hash = 'hashed_player2_password', @p_genero = 'Female', @p_fecha_nacimiento = '2003-11-20';
GO

-- Update AdminUser to be an admin 
UPDATE usuarios SET rol = 'admin' WHERE correo = 'admin@example.com';
GO

-- Objetos
INSERT INTO objetos (nombre_objeto, descripcion, calidad) VALUES
('Espada de Principiante', 'Una espada básica para empezar.', 1),
('Poción de Salud Pequeña', 'Restaura una pequeña cantidad de salud.', 2),
('Mapa del Tesoro Antiguo', 'Un fragmento de mapa que podría llevar a una fortuna.', 5),
('Llave Oxidada', 'Abre una puerta desconocida.', 3);
GO

-- NPCs
INSERT INTO npcs (nombre_npc, es_teu) VALUES
('Viejo Sabio', 0),
('Mercader Ambulante', 0),
('Guardia del Pueblo', 0),
('Profesor Turing', 1);
GO

-- Misiones (Ensure recompensa_objeto_id and npc_id exist)
INSERT INTO misiones (nombre_mision, descripcion, recompensa_xp, recompensa_objeto_id, npc_id) VALUES
('La Primera Lección', 'Habla con el Viejo Sabio para aprender lo básico.', 100, 1, 1),
('Entrega Especial', 'Lleva un paquete al Mercader Ambulante.', 150, 2, 2),
('El Secreto del Campus', 'Investiga los rumores sobre un tesoro escondido con el Profesor Turing.', 500, 3, 4);
GO

-- Asignar misiones a usuarios (Ensure id_usuario and id_mision exist)
INSERT INTO usuarios_misiones (id_usuario, id_mision, estado) VALUES
(1, 1, 'completada'), -- AdminUser completed 'La Primera Lección'
(2, 1, 'pendiente'),  -- PlayerOne has 'La Primera Lección'
(2, 2, 'pendiente');  -- PlayerOne has 'Entrega Especial'
GO

-- Inventario de usuarios (Ensure id_usuario and id_objeto exist)
INSERT INTO inventario (id_usuario, id_objeto, cantidad) VALUES
(2, 2, 5); -- PlayerOne has 5 small health potions
GO

-- Actualizar algunas estadísticas y leaderboard manualmente para tener más datos visibles
UPDATE estadisticas 
SET misiones_completadas = 1, objetos_obtenidos = 2, enemigos_neutralizados = 5, tiempo_total_juego = 3600 -- 1 hour
WHERE id_usuario = 2;

UPDATE leaderboard
SET puntuacion_total = 250
WHERE id_usuario = 2;


UPDATE estadisticas
SET misiones_completadas = 10, objetos_obtenidos = 20, enemigos_neutralizados = 50, tiempo_total_juego = 108000 
WHERE id_usuario = 1;

UPDATE leaderboard
SET puntuacion_total = 1500
WHERE id_usuario = 1;
GO


-- Contact Messages
INSERT INTO contact_messages (name, email, message, status) VALUES
('Juan Perez', 'juan.perez@email.com', 'Tengo un problema con mi cuenta, no puedo acceder.', 'new'),
('Ana Lopez', 'ana.lopez@email.com', '¡Gran juego! Me gustaría sugerir una nueva característica...', 'read'),
('Carlos Ruiz', 'carlos.ruiz@email.com', 'Encontré un bug en la misión X.', 'new');
GO

-- Sample manual log entry using the stored procedure
EXEC sp_add_log_entry
    @p_nombre_tabla_afectada = 'objetos',
    @p_id_registro_afectado = '4',
    @p_nombre_usuario_modificador = 'AdminUser',
    @p_pantalla_origen = 'Admin Panel - Item Management',
    @p_descripcion_accion = 'Calidad del objeto "Llave Oxidada" actualizada manualmente.',
    @p_tipo_operacion = 'UPDATE',
    @p_estatus_operacion = 'SUCCESS',
    @p_datos_viejos = '{"calidad": 3}',
    @p_datos_nuevos = '{"calidad": 4}';
GO

SELECT '-- TEST DATA POPULATED --' AS Status;
GO
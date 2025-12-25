-- Script para agregar columnas de contacto del conductor
-- Ejecutar en Neon Database Console

-- Agregar columna de teléfono
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) DEFAULT '';

-- Agregar preferencia de permitir llamadas
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS allow_calls BOOLEAN DEFAULT false;

-- Agregar preferencia de permitir mensajes (siempre activo por defecto)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS allow_messages BOOLEAN DEFAULT true;

-- Actualizar conductores existentes con valores por defecto
UPDATE drivers SET
  phone_number = COALESCE(phone_number, ''),
  allow_calls = COALESCE(allow_calls, false),
  allow_messages = COALESCE(allow_messages, true)
WHERE phone_number IS NULL OR allow_calls IS NULL OR allow_messages IS NULL;

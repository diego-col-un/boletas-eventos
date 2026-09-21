CREATE TABLE rol (
  id      SMALLSERIAL PRIMARY KEY,
  nombre  VARCHAR(30) NOT NULL UNIQUE
);
INSERT INTO rol (nombre) VALUES ('admin'), ('vendedor'), ('portero');

CREATE TABLE usuario (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  rol_id         SMALLINT NOT NULL REFERENCES rol(id),
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE evento (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(150) NOT NULL,
  descripcion    TEXT,
  lugar          VARCHAR(150),
  fecha_inicio   TIMESTAMPTZ NOT NULL,
  aforo          INTEGER CHECK (aforo > 0),
  precio_base    NUMERIC(12,0) NOT NULL CHECK (precio_base >= 0),
  precio_minimo  NUMERIC(12,0) NOT NULL CHECK (precio_minimo >= 0),
  estado         VARCHAR(20) NOT NULL DEFAULT 'borrador'
                 CHECK (estado IN ('borrador','activo','cerrado','cancelado')),
  creado_por     INTEGER REFERENCES usuario(id),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (precio_minimo <= precio_base)
);

CREATE TABLE persona (
  id      SERIAL PRIMARY KEY,
  cedula  VARCHAR(15) NOT NULL UNIQUE,
  nombre  VARCHAR(150) NOT NULL
);

CREATE TABLE venta (
  id               SERIAL PRIMARY KEY,
  evento_id        INTEGER NOT NULL REFERENCES evento(id),
  vendido_por      INTEGER NOT NULL REFERENCES usuario(id),
  monto_total      NUMERIC(12,0) NOT NULL CHECK (monto_total >= 0),
  num_personas     SMALLINT NOT NULL CHECK (num_personas > 0),
  metodo_pago      VARCHAR(20) NOT NULL DEFAULT 'efectivo',
  idempotency_key  UUID UNIQUE,
  fecha_venta      TIMESTAMPTZ NOT NULL DEFAULT now(),
  anulada_en       TIMESTAMPTZ,
  anulada_por      INTEGER REFERENCES usuario(id)
);

CREATE TABLE entrada (
  id            SERIAL PRIMARY KEY,
  evento_id     INTEGER NOT NULL REFERENCES evento(id),
  persona_id    INTEGER NOT NULL REFERENCES persona(id),
  venta_id      INTEGER NOT NULL REFERENCES venta(id),
  monto_pagado  NUMERIC(12,0) NOT NULL CHECK (monto_pagado >= 0),
  checkin_en    TIMESTAMPTZ,
  checkin_por   INTEGER REFERENCES usuario(id),
  anulada       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX uq_entrada_vigente
  ON entrada (evento_id, persona_id) WHERE NOT anulada;

CREATE INDEX idx_entrada_evento ON entrada (evento_id) WHERE NOT anulada;
CREATE INDEX idx_venta_evento   ON venta (evento_id);
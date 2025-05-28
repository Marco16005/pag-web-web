// src/db.ts
import sql, { ConnectionPool, config as MSSQLConfig } from 'mssql';

// Configuración de la conexión a DB
const poolConfig: MSSQLConfig = {
  user: process.env.DB_USER || 'admin09', 
  password: process.env.DB_PASSWORD || 'ChangeMe05',
  server: process.env.DB_HOST || 'retoo.database.windows.net', 
  database: process.env.DB_NAME || 'campus_chaos', 
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: true, 
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'false' ? false : true,
    connectTimeout: 15000 
  },
};

const pool = new ConnectionPool(poolConfig);
const poolConnect = pool.connect();

pool.on('error', err => {
  console.error('MSSQL Pool Error:', err);
});

export { sql, pool, poolConnect };
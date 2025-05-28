"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.poolConnect = exports.pool = exports.sql = void 0;
// src/db.ts
const mssql_1 = __importStar(require("mssql"));
exports.sql = mssql_1.default;
// Configuración de la conexión a DB
const poolConfig = {
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
const pool = new mssql_1.ConnectionPool(poolConfig);
exports.pool = pool;
const poolConnect = pool.connect();
exports.poolConnect = poolConnect;
pool.on('error', err => {
    console.error('MSSQL Pool Error:', err);
});

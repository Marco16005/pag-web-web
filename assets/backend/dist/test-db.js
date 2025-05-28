"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mssql_1 = require("mssql");
// Configuration similar to your db.ts
const testPoolConfig = {
    user: process.env.DB_USER || 'admin09', // Update with your MSSQL user
    password: process.env.DB_PASSWORD || 'ChangeMe05', // Update with your MSSQL password
    server: process.env.DB_HOST || 'retoo.database.windows.net', // MSSQL server address
    database: process.env.DB_NAME || 'campus_chaos', // Update with your database name
    port: parseInt(process.env.DB_PORT || '1433', 10),
    options: {
        encrypt: true, // MODIFIED: Set to true for Azure SQL Database
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'false' ? false : true, // For Azure, it's generally fine to trust the server certificate as it's from a trusted CA. Or set to false if you have specific needs.
        connectTimeout: 15000 // Connection timeout in milliseconds
    },
    pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 30000
    }
};
async function runTest() {
    console.log('Attempting to connect to SQL Server with config:');
    // Log config without password for security
    const { password, ...configToLog } = testPoolConfig;
    console.log(JSON.stringify(configToLog, null, 2));
    let pool;
    try {
        pool = new mssql_1.ConnectionPool(testPoolConfig);
        await pool.connect();
        console.log('Successfully connected to SQL Server!');
        // Test a simple query
        const result = await pool.request().query('SELECT @@SERVERNAME as serverName, DB_NAME() as dbName');
        console.log('Query successful. Server:', result.recordset[0].serverName, 'Database:', result.recordset[0].dbName);
    }
    catch (err) {
        console.error('Connection or query failed:');
        if (err instanceof mssql_1.ConnectionError) {
            console.error(`ConnectionError Code: ${err.code}, Message: ${err.message}`);
        }
        else if (err instanceof Error) {
            console.error(`Error Name: ${err.name}, Message: ${err.message}`);
            console.error(`Error Code (if any): ${err.code}`);
        }
        else {
            console.error('An unknown error occurred:', err);
        }
        // console.error('Full error object:', err); // Uncomment for more details if needed
    }
    finally {
        if (pool && pool.connected) {
            console.log('Closing connection pool.');
            await pool.close();
        }
    }
}
runTest();

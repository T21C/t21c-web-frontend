const sql = require('mssql');

// Configuration for your SQL Server connection
const config = {
    user: 'your_username',
    password: 'your_password',
    server: 'your_server_name', // e.g., 'localhost' or '127.0.0.1'
    database: 'your_database_name',
    options: {
        encrypt: true, // Use this if you're connecting to Azure
        trustServerCertificate: true, // Change to false in production
    },
};

// Function to run a query
async function runQuery() {
    try {
        // Establish connection
        await sql.connect(config);

        // Run a query
        const result = await sql.query`SELECT * FROM your_table_name`;

        console.log(result.recordset); // Handle the results
    } catch (err) {
        console.error('SQL error', err);
    } finally {
        // Close the connection
        await sql.close();
    }
}

// Call the function
runQuery();

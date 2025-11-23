const express = require("express");
const bodyParser = require("body-parser");
const app = express();

const mysql = require("mysql2/promise");
require('dotenv').config();

app.use(bodyParser.json());
app.use(express.static("front"));


const pool = mysql.createPool({
  host: process.env.DB_HOST,       // e.g., 'your-db-host.aivencloud.com'
  user: process.env.DB_USER,       // your DB username
  password: process.env.DB_PASSWORD, // your DB password
  database: process.env.DB_NAME,   // the database name you created
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

(async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS people (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        allergies JSON
      )
    `;
    await pool.query(createTableQuery);
    console.log("Table 'people' is ready");
  } catch (err) {
    console.error("Error creating table:", err);
  }
})();

app.post("/addPerson", async (req, res) => {
  const { name, allergies } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO people (name, allergies) VALUES (?, ?)",
      [name, JSON.stringify(allergies)]
    );
    res.json({ id: result.insertId, name, allergies });
  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/people", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM people");
    
    const formatted = rows.map(row => ({
      id: row.id,
      name: row.name,
      allergies: Array.isArray(row.allergies) ? row.allergies : [],
    }));

    res.json(formatted);
  } catch (err) {
    console.error("DB fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/clearPeople", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM people");
    res.json({ message: "Database cleared", deletedRows: result.affectedRows });
  } catch (err) {
    console.error("DB clear error:", err);
    res.status(500).json({ error: err.message });
  }
});

const serverless = require('serverless-http');
module.exports.handler = serverless(app);
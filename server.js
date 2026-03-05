const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose(); // sqlite3 추가
const app = express();

app.use(bodyParser.json());
app.use(express.static("front"));

// 1. 로컬 sql.db 파일 연결 (없으면 자동 생성)
const db = new sqlite3.Database("./sql.db", (err) => {
  if (err) return console.error("DB 연결 실패:", err.message);
  console.log("로컬 SQLite DB(sql.db)에 연결되었습니다.");
});

// 2. 테이블 초기화
db.serialize(() => {
  db.run(
    `
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      allergies TEXT -- SQLite는 JSON 타입 대신 TEXT로 저장 후 파싱합니다.
    )
  `,
    (err) => {
      if (err) console.error("테이블 생성 에러:", err.message);
      else console.log("Table 'people' 준비 완료");
    },
  );
});

// 3. 데이터 추가 (POST)
app.post("/addPerson", (req, res) => {
  const { name, allergies } = req.body;
  const sql = "INSERT INTO people (name, allergies) VALUES (?, ?)";

  // 배열을 문자열로 변환하여 저장
  db.run(sql, [name, JSON.stringify(allergies)], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, allergies });
  });
});

// 4. 데이터 조회 (GET)
app.get("/people", (req, res) => {
  const sql = "SELECT * FROM people";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // 저장된 문자열을 다시 JSON 객체(배열)로 변환
    const formatted = rows.map((row) => ({
      id: row.id,
      name: row.name,
      allergies: JSON.parse(row.allergies || "[]"),
    }));
    res.json(formatted);
  });
});

// 5. 데이터 초기화 (DELETE)
app.delete("/clearPeople", (req, res) => {
  db.run("DELETE FROM people", function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Database cleared", deletedRows: this.changes });
  });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));

// const express = require("express");
// const bodyParser = require("body-parser");
// const app = express();

// const mysql = require("mysql2/promise");
// const fs = require("fs");
// require('dotenv').config();

// app.use(bodyParser.json());
// app.use(express.static("front"));

// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   ssl: {
//     rejectUnauthorized: true,
//     ca: fs.readFileSync("./ca.pem")
//   }
// });

// (async () => {
//   try {
//     const createTableQuery = `
//       CREATE TABLE IF NOT EXISTS people (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         name VARCHAR(255),
//         allergies JSON
//       )
//     `;
//     await pool.query(createTableQuery);
//     console.log("Table 'people' is ready");
//   } catch (err) {
//     console.error("Error creating table:", err);
//   }
// })();

// app.post("/addPerson", async (req, res) => {
//   const { name, allergies } = req.body;
//   try {
//     const [result] = await pool.query(
//       "INSERT INTO people (name, allergies) VALUES (?, ?)",
//       [name, JSON.stringify(allergies)]
//     );
//     res.json({ id: result.insertId, name, allergies });
//   } catch (err) {
//     console.error("DB insert error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// app.get("/people", async (req, res) => {
//   try {
//     const [rows] = await pool.query("SELECT * FROM people");

//     const formatted = rows.map(row => ({
//       id: row.id,
//       name: row.name,
//       allergies: Array.isArray(row.allergies) ? row.allergies : [],
//     }));

//     res.json(formatted);
//   } catch (err) {
//     console.error("DB fetch error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// app.delete("/clearPeople", async (req, res) => {
//   try {
//     const [result] = await pool.query("DELETE FROM people");
//     res.json({ message: "Database cleared", deletedRows: result.affectedRows });
//   } catch (err) {
//     console.error("DB clear error:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// app.listen(3000, () => console.log("Server running on port 3000"));

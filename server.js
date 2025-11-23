const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.json());
app.use(express.static("front"));

const db = new sqlite3.Database("./sql.db");

db.run(`CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    allergies TEXT
    )
`);

app.post("/addPerson", (req, res) => {
    const { name, allergies } = req.body;
    const allergiesJson = JSON.stringify(allergies);

    db.run(
        "INSERT INTO people (name, allergies) VALUES (?, ?)",
        [name, allergiesJson],
        function (err) {
            if (err) {
                console.error("DB insert error:", err); // <-- log the actual error
                return res.status(500).json({ error: err.message });
            }

            res.json({ id: this.lastID, name, allergies });
        }
    );
});

app.get("/people", (req, res) => {
    db.all("SELECT * FROM people", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // JSON 문자열을 진짜 배열로 변환
        const formatted = rows.map(row => ({
            id: row.id,
            name: row.name,
            allergies: JSON.parse(row.allergies || "[]")
        }));

        res.json(formatted);
    });
});

app.delete("/clearPeople", (req, res) => {
    db.run("DELETE FROM people", [], function(err) {
        if (err) {
            console.error("DB clear error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Database cleared", deletedRows: this.changes });
    });
});

app.listen(3000, () => console.log("Server running on port 3000"));
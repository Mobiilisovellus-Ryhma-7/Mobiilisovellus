import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "app",
  host: "localhost",
  database: "booking_app",
  password: "password",
  port: 5432,
});

app.get("/", async (req, res) => {
  const result = await pool.query("SELECT NOW()");
  res.json(result.rows);
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(cors()); // erlaubt alle Origins
app.use(express.json());

app.get("/api/questions", async (req, res) => {
    try {
        const questions = await prisma.question.findMany();
        res.json(questions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Fehler beim Laden der Fragen" });
    }
});

app.listen(3000, () => {
    console.log("Server läuft auf http://localhost:3000");
});

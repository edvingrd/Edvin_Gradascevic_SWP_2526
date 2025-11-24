import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET = parseInt(process.env.SEED_TARGET || process.argv[2] || '4738', 10);
const BATCH = parseInt(process.env.SEED_BATCH || '50', 10);
const MAX_CONSECUTIVE_NO_NEW = 5;

async function delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

async function main() {
    console.log(`Seeding target: ${TARGET} questions (batch ${BATCH})`);

    let consecutiveNoNew = 0;

    while (true) {
        const total = await prisma.question.count();
        console.log(`Current DB total: ${total}`);
        if (total >= TARGET) {
            console.log(`Reached target ${TARGET}. Done.`);
            break;
        }

        const toFetch = Math.min(BATCH, TARGET - total);
        const url = `https://opentdb.com/api.php?amount=${toFetch}`;

        let res;
        try {
            res = await axios.get(url);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('Failed to fetch from OpenTDB:', msg);
            // back off a bit then retry
            await delay(1000);
            continue;
        }

        if (!res.data || res.data.response_code !== 0) {
            console.error('OpenTDB returned an error or no data', res.data);
            break;
        }

        const questions = res.data.results || [];
        let addedThisRound = 0;

        for (const q of questions) {
            // Use question text as uniqueness key (same as before)
            const exists = await prisma.question.findFirst({ where: { question: q.question } });
            if (exists) continue;

            await prisma.question.create({
                data: {
                    question: q.question,
                    category: q.category,
                    type: q.type,
                    difficulty: q.difficulty,
                    correct_answer: q.correct_answer,
                    incorrect_answers: q.incorrect_answers,
                },
            });
            addedThisRound++;
        }

        if (addedThisRound === 0) {
            consecutiveNoNew++;
            console.log(`No new questions added this round (consecutive: ${consecutiveNoNew}).`);
        } else {
            consecutiveNoNew = 0;
            console.log(`Added ${addedThisRound} new questions this round.`);
        }

        if (consecutiveNoNew >= MAX_CONSECUTIVE_NO_NEW) {
            console.warn(
                `Stopped after ${consecutiveNoNew} consecutive rounds with no new questions. ` +
                    'You may have reached the available unique questions from the API.'
            );
            break;
        }

        // small delay to be polite to the API
        await delay(300);
    }

    const finalTotal = await prisma.question.count();
    console.log(`Seeding finished. Total questions in DB: ${finalTotal}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.question.count();
    console.log(`Questions in DB: ${count}`);

    const sample = await prisma.question.findMany({ take: 1 });
    console.log('Sample questions:');
    sample.forEach((q, i) => {
        console.log(`${i + 1}. ${q.question} (answer: ${q.correct_answer})`);
    });
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

#!/usr/bin/env tsx
import { Command } from 'commander';
const program = new Command();
program.name('solo').description('SoloOS CLI').version('0.1.0');
program
    .command('capture [content]')
    .alias('c')
    .description('Capture a new entry')
    .option('-p, --pillar <pillar>', 'Pillar tag (input|output|audience|financial|energy)')
    .action(async (content, opts) => {
    const text = content ?? (await readStdin());
    if (!text.trim()) {
        console.error('Error: content is required');
        process.exit(1);
    }
    const body = { content: text, source: 'cli' };
    if (opts.pillar) {
        body.content = `${text} #${opts.pillar.toLowerCase()}`;
    }
    try {
        const res = await fetch('http://localhost:3000/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok)
            throw new Error(`Server error: ${res.status}`);
        const entry = await res.json();
        console.log(`✓ Captured [${entry.status}] — ${entry.id.slice(0, 8)}`);
    }
    catch (err) {
        console.error('Error: SoloOS server not running. Start it with: pnpm dev');
        process.exit(1);
    }
});
program.parse();
async function readStdin() {
    if (process.stdin.isTTY)
        return '';
    const chunks = [];
    for await (const chunk of process.stdin)
        chunks.push(chunk);
    return Buffer.concat(chunks).toString().trim();
}

import { Router } from 'express';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const rawHome = process.env.CLAUDE_HOME || join(process.env.HOME, '.claude');
const CLAUDE_HOME = rawHome.startsWith('~') ? join(process.env.HOME, rawHome.slice(1)) : rawHome;

function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return { meta: {}, body: content.trim() };

    const meta = {};
    for (const line of match[1].split('\n')) {
        const idx = line.indexOf(':');
        if (idx > 0) {
            const key = line.slice(0, idx).trim();
            const val = line.slice(idx + 1).trim();
            meta[key] = val;
        }
    }
    return { meta, body: match[2].trim() };
}

export function createMemoryRouter() {
    const router = Router();

    router.get('/', (req, res) => {
        const projectsDir = join(CLAUDE_HOME, 'projects');
        const memories = [];

        if (!existsSync(projectsDir)) {
            return res.json({ success: true, data: [] });
        }

        try {
            for (const dir of readdirSync(projectsDir)) {
                const memoryDir = join(projectsDir, dir, 'memory');
                if (!existsSync(memoryDir)) continue;

                // Derive project path from directory name
                const projectPath = dir.replace(/^-/, '/').replace(/-/g, '/');

                try {
                    const files = readdirSync(memoryDir).filter((f) => f.endsWith('.md') && f !== 'MEMORY.md');
                    for (const file of files) {
                        try {
                            const content = readFileSync(join(memoryDir, file), 'utf-8');
                            const { meta, body } = parseFrontmatter(content);
                            memories.push({
                                file,
                                project: projectPath,
                                project_dir: dir,
                                name: meta.name || file.replace('.md', ''),
                                description: meta.description || '',
                                type: meta.type || 'unknown',
                                body,
                            });
                        } catch {
                            // skip unreadable files
                        }
                    }
                } catch {
                    // skip unreadable dirs
                }
            }
        } catch {
            // skip if projects dir unreadable
        }

        memories.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
        res.json({ success: true, data: memories });
    });

    return router;
}

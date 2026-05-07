import { Hono } from 'hono';
import { deleteGithubConfig, getGithubConfig, getGithubTokenRaw, upsertGithubConfig } from '../github/github-config-service';
export function githubConfigRouter(db) {
    const app = new Hono();
    app.get('/', async (c) => {
        const config = await getGithubConfig(db);
        return c.json(config);
    });
    app.put('/', async (c) => {
        let body;
        try {
            body = await c.req.json();
        }
        catch {
            return c.json({ error: 'invalid JSON' }, 400);
        }
        const token = body.token?.trim();
        if (!token)
            return c.json({ error: 'token is required' }, 400);
        const config = await upsertGithubConfig(db, token);
        return c.json(config);
    });
    app.delete('/', async (c) => {
        await deleteGithubConfig(db);
        return c.json({ ok: true });
    });
    app.post('/test', async (c) => {
        const token = await getGithubTokenRaw(db);
        if (!token)
            return c.json({ ok: false, error: 'not_configured' }, 400);
        const result = await testGithubToken(token);
        return c.json(result);
    });
    app.get('/repos', async (c) => {
        const token = await getGithubTokenRaw(db);
        if (!token)
            return c.json({ error: 'not_configured' }, 400);
        try {
            const repos = await listGithubRepos(token);
            return c.json({ repos });
        }
        catch (err) {
            return c.json({ error: err instanceof Error ? err.message : 'failed_to_list_repos' }, 500);
        }
    });
    return app;
}
async function testGithubToken(token) {
    try {
        const res = await fetch('https://api.github.com/user', {
            headers: githubHeaders(token),
        });
        if (!res.ok) {
            return { ok: false, error: `GitHub API error ${res.status}` };
        }
        const data = await res.json();
        const scopes = res.headers.get('x-oauth-scopes') ?? '';
        const reposRes = await fetch('https://api.github.com/user/repos?per_page=1&sort=updated&direction=desc&affiliation=owner,collaborator,organization_member', { headers: githubHeaders(token) });
        if (!reposRes.ok) {
            return { ok: false, login: data.login, scopes, error: `repo_list_failed_${reposRes.status}` };
        }
        return { ok: true, login: data.login, scopes };
    }
    catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'network_error' };
    }
}
async function listGithubRepos(token) {
    const repos = [];
    let page = 1;
    while (page <= 5) {
        const res = await fetch(`https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&direction=desc&affiliation=owner,collaborator,organization_member`, { headers: githubHeaders(token) });
        if (!res.ok)
            throw new Error(`GitHub API error ${res.status}`);
        const pageRepos = await res.json();
        if (!Array.isArray(pageRepos) || pageRepos.length === 0)
            break;
        repos.push(...pageRepos.map((r) => ({
            id: r.id,
            name: r.name,
            full_name: r.full_name,
            private: r.private,
            pushed_at: r.pushed_at,
        })));
        if (pageRepos.length < 100)
            break;
        page += 1;
    }
    return repos;
}
function githubHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    };
}

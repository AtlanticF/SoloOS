import { Hono } from 'hono'
import type { DB } from '../db/index'
import { getGithubTokenRaw } from '../github/github-config-service'
import { fetchUserRepoSocials, recordSocialSnapshot } from '../audience/audience-service'

export function audienceRouter(db: DB) {
  const app = new Hono()

  // Manual sync: snapshot the user's repo social counts and emit AUDIENCE
  // events for any growth since the last snapshot.
  app.post('/sync', async (c) => {
    const token = (await getGithubTokenRaw(db)) ?? process.env.GITHUB_TOKEN ?? null
    if (!token) {
      return c.json({ error: 'github token not configured' }, 400)
    }

    const repos = await fetchUserRepoSocials(token)
    let eventsCreated = 0
    for (const repo of repos) {
      const result = await recordSocialSnapshot(db, repo.full_name, {
        stars: repo.stars,
        watchers: repo.watchers,
        forks: repo.forks,
      })
      if (result.event_created) eventsCreated += 1
    }

    return c.json({ synced: repos.length, events_created: eventsCreated })
  })

  return app
}

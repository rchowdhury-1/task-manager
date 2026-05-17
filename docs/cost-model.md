# Personal OS — Cost Model

## OpenAI (gpt-4o-mini)

Pricing: $0.15/1M input tokens, $0.60/1M output tokens

Per-prompt average usage observed: ~500 input, ~200 output tokens (with tool calls, up to 5x)
Estimated cost per prompt: ~$0.0001–0.001 depending on tools called

Daily cap per user: 100 prompts (configurable via `AI_PROMPTS_PER_DAY_LIMIT` env var)
Max daily cost per user: ~$0.10 worst case (all 100 prompts with tool calls)

| Scale | Avg usage | Monthly cost |
|-------|-----------|-------------|
| 10 users, 10 prompts/day | ~3,000 prompts/mo | ~$0.30 |
| 100 users, 10 prompts/day | ~30,000 prompts/mo | ~$3.00 |
| 1,000 users, 10 prompts/day | ~300,000 prompts/mo | ~$30.00 |
| 1,000 users hitting cap | ~3M prompts/mo | ~$300 worst case |

## Neon Postgres

Current: free tier (0.5 GB storage, 100 active connections)
Upgrade triggers: > 0.5 GB data, > 100 concurrent connections
Estimated upgrade cost: ~$19/mo (Launch plan)

## Vercel

Current: hobby tier (included with deployment)
Upgrade triggers: > 100 GB bandwidth, > 100 GB-hours compute, team collaboration
Estimated upgrade cost: ~$20/mo (Pro plan)

## Action items before launch

- [ ] Set up OpenAI usage alerts at $5, $20, $50 monthly thresholds
- [ ] Monitor ai_usage table daily for first week of public launch
- [ ] If average user > 20 prompts/day, consider reducing daily cap
- [ ] Set up Neon usage alerts for storage approaching 0.5 GB
- [ ] Review Vercel analytics for bandwidth usage after launch

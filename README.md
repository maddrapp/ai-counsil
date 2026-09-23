# Council

A three-model collaborative reasoning app using Vercel AI Gateway.

## Models

- GPT: `openai/gpt-5.6-sol`
- Claude: `anthropic/claude-sonnet-5`
- Gemini: `google/gemini-3.1-pro-preview`

## How it works

### Quick
1. GPT, Claude, and Gemini answer independently in parallel.
2. A synthesizer creates one final answer.

### Council
1. Three independent answers in parallel.
2. Each model critiques the other two.
3. Gemini performs a shared-assumption red-team pass.
4. All three revise in parallel.
5. GPT synthesizes the revised answers into one final response.

## Deploy on Vercel

1. Put this folder in a GitHub repository.
2. In Vercel, choose **Add New → Project**, import the repository, and deploy.
3. Open the Vercel project and enable **AI Gateway**.
4. Redeploy if Vercel asks you to after enabling Gateway.

On Vercel, AI Gateway can use Vercel OIDC, so provider-specific OpenAI, Anthropic, and Google API keys are not required for this setup.

## Local development

Install dependencies:

```bash
npm install
```

If the project is already linked to Vercel:

```bash
vercel link
vercel env pull .env.local
npm run dev
```

Or create an AI Gateway API key and put it in `.env.local` as `AI_GATEWAY_API_KEY`.

## Cost guardrails

The API currently limits the user's question and optional context to 12,000 characters each. Quick mode uses 4 model calls. Council mode uses 11 model calls.

Before making a production URL widely public, add authentication or Vercel Deployment Protection so strangers cannot consume your AI Gateway credits.

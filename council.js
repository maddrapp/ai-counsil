import { ToolLoopAgent } from 'ai';

const MODELS = {
  gpt: 'openai/gpt-5.6-sol',
  claude: 'anthropic/claude-sonnet-5',
  gemini: 'google/gemini-3.1-pro-preview',
};

const COMMON = `
You are one seat on a three-model collaborative reasoning council.
Your job is to improve the user's answer, not to win a debate.

Rules:
- Give conclusions and concise reasoning summaries, not hidden chain-of-thought.
- Separate established facts from assumptions and inference.
- Flag claims that require current external verification rather than pretending they were verified.
- Actively look for missing constraints, counterexamples, edge cases, and false precision.
- Do not agree merely to create consensus and do not disagree merely to be different.
- If another model is stronger on a point, say so and incorporate it.
- Preserve meaningful uncertainty.
- For high-stakes topics, be conservative about unsupported claims.
- For political topics, remain neutral and factual; do not recommend a political choice.
`;

function agent(model, identity, roleTag) {
  return new ToolLoopAgent({
    model,
    instructions: `${COMMON}\n${identity}`,
    tools: {},
    maxOutputTokens: 2400,
    maxRetries: 2,
    providerOptions: {
      gateway: {
        tags: ['app:ai-council', `role:${roleTag}`],
      },
    },
  });
}

const gpt = agent(
  MODELS.gpt,
  'You are the GPT seat. Emphasize decomposition, systems thinking, technical reasoning, implementation, and edge cases.',
  'gpt',
);

const claude = agent(
  MODELS.claude,
  'You are the Claude seat. Emphasize logical critique, hidden assumptions, alternative interpretations, nuance, and internal consistency.',
  'claude',
);

const gemini = agent(
  MODELS.gemini,
  'You are the Gemini seat. Emphasize alternative framing, missing dimensions, broad synthesis, and challenges to shared assumptions.',
  'gemini',
);

const synthesizer = agent(
  MODELS.gpt,
  `You are the Council Orchestrator. Build one new answer from the strongest surviving ideas.
Do not pick a winner by model identity. Resolve disagreements in this order: verified evidence, logical validity, stronger assumptions, relevance, then consensus. If a disagreement cannot be resolved, preserve it clearly.`,
  'synthesizer',
);

function taskPrompt(question, style, context) {
  return `MODE: ${style}\n\nUSER CONTEXT (may be empty):\n${context || '(none supplied)'}\n\nUSER QUESTION:\n${question}\n\nProduce your best independent answer before seeing any other model's work. Include: answer, key assumptions, uncertainty, and anything that should be verified.`;
}

async function run(agentInstance, prompt) {
  const result = await agentInstance.generate({ prompt });
  return {
    text: result.text,
    usage: result.usage ?? null,
  };
}

function block(label, text) {
  return `\n--- ${label} ---\n${text}\n`;
}

export async function runCouncil({ question, depth = 'council', style = 'standard', context = '' }) {
  const independentPrompt = taskPrompt(question, style, context);

  const [gptInitial, claudeInitial, geminiInitial] = await Promise.all([
    run(gpt, independentPrompt),
    run(claude, independentPrompt),
    run(gemini, independentPrompt),
  ]);

  const initial = {
    gpt: gptInitial.text,
    claude: claudeInitial.text,
    gemini: geminiInitial.text,
  };

  if (depth === 'quick') {
    const synthesis = await run(
      synthesizer,
      `USER QUESTION:\n${question}\n\nMODE: ${style}\n\nThree independent answers follow.${block('GPT', initial.gpt)}${block('CLAUDE', initial.claude)}${block('GEMINI', initial.gemini)}\nCreate one polished answer. Do not merely concatenate. Resolve differences by reasoning and evidence. Mention meaningful uncertainty.`,
    );

    return {
      answer: synthesis.text,
      models: MODELS,
      depth,
      stages: { initial },
    };
  }

  const [gptCritique, claudeCritique, geminiCritique] = await Promise.all([
    run(
      gpt,
      `USER QUESTION:\n${question}\n\nYour original answer:${block('GPT ORIGINAL', initial.gpt)}\nCritique the other two answers. Identify factual risks, unsupported assumptions, missing constraints, stronger ideas worth adopting, and claims requiring verification.${block('CLAUDE ANSWER', initial.claude)}${block('GEMINI ANSWER', initial.gemini)}`,
    ),
    run(
      claude,
      `USER QUESTION:\n${question}\n\nYour original answer:${block('CLAUDE ORIGINAL', initial.claude)}\nCritique the other two answers. Identify factual risks, unsupported assumptions, missing constraints, stronger ideas worth adopting, and claims requiring verification.${block('GPT ANSWER', initial.gpt)}${block('GEMINI ANSWER', initial.gemini)}`,
    ),
    run(
      gemini,
      `USER QUESTION:\n${question}\n\nYour original answer:${block('GEMINI ORIGINAL', initial.gemini)}\nCritique the other two answers. Identify factual risks, unsupported assumptions, missing constraints, stronger ideas worth adopting, and claims requiring verification.${block('GPT ANSWER', initial.gpt)}${block('CLAUDE ANSWER', initial.claude)}`,
    ),
  ]);

  const critiques = {
    gpt: gptCritique.text,
    claude: claudeCritique.text,
    gemini: geminiCritique.text,
  };

  const redTeam = await run(
    gemini,
    `RED TEAM TASK\n\nUSER QUESTION:\n${question}\n\nAssume the emerging consensus could be wrong. Identify the most plausible shared mistake or blind spot across the three responses. Look for hidden assumptions, ambiguous definitions, outdated facts, false precision, ignored alternatives, missing base rates, or conclusions that depend on unknown facts. Do not invent objections just to disagree.${block('GPT', initial.gpt)}${block('CLAUDE', initial.claude)}${block('GEMINI', initial.gemini)}${block('GPT CRITIQUE', critiques.gpt)}${block('CLAUDE CRITIQUE', critiques.claude)}${block('GEMINI CRITIQUE', critiques.gemini)}`,
  );

  const revisionPacket = `\nUSER QUESTION:\n${question}\n\nMODE: ${style}${block('GPT INITIAL', initial.gpt)}${block('CLAUDE INITIAL', initial.claude)}${block('GEMINI INITIAL', initial.gemini)}${block('GPT CRITIQUE', critiques.gpt)}${block('CLAUDE CRITIQUE', critiques.claude)}${block('GEMINI CRITIQUE', critiques.gemini)}${block('SHARED-ASSUMPTION RED TEAM', redTeam.text)}\nRevise your own answer. Correct mistakes, adopt valid criticism, resist unsupported consensus, and preserve uncertainty. Return a complete answer, not a discussion of the process.`;

  const [gptRevision, claudeRevision, geminiRevision] = await Promise.all([
    run(gpt, revisionPacket),
    run(claude, revisionPacket),
    run(gemini, revisionPacket),
  ]);

  const revisions = {
    gpt: gptRevision.text,
    claude: claudeRevision.text,
    gemini: geminiRevision.text,
  };

  const final = await run(
    synthesizer,
    `USER QUESTION:\n${question}\n\nMODE: ${style}\n\nThe council has completed independent analysis, cross-critique, red-team review, and revision. Construct one final answer for the user from the revised responses. Do not name a winner. Prefer evidence and reasoning over consensus. Preserve unresolved uncertainty where it matters.${block('GPT REVISED', revisions.gpt)}${block('CLAUDE REVISED', revisions.claude)}${block('GEMINI REVISED', revisions.gemini)}${block('RED TEAM FINDINGS', redTeam.text)}`,
  );

  return {
    answer: final.text,
    models: MODELS,
    depth,
    stages: {
      initial,
      critiques,
      redTeam: redTeam.text,
      revisions,
    },
  };
}

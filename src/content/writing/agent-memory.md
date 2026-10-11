---
title: Giving agents a memory that lasts
subtitle: What the hippocampus can teach a vector database.
date: "2026-10-08"
category: engineering
tags: [agents, memory, ai]
cover: /writing/agent-memory/cover.svg
draft: true
---

Most AI agents have the memory of a goldfish with a filing cabinet. They either forget everything when the conversation ends, or they remember everything with equal weight and drown in it. Neither is how a brain works.

## The problem with "just store it"

The first instinct is to embed every message and throw it into a vector store. Retrieval then becomes "find the five most similar chunks." It works for a demo and falls apart in week two: the store fills with near-duplicates, stale facts outrank fresh ones, and nothing ever gets forgotten.

> A memory system that never forgets isn't a memory system. It's a log.

## Borrowing from the brain

The brain splits the job in two. The hippocampus captures experiences quickly and in detail. Later, mostly during sleep, the important parts get replayed and folded into slower, more general knowledge in the cortex. The rest fades.

![A fast store feeding a slow one](/writing/agent-memory/cover.svg "Fast capture, slow consolidation: the shape I'm copying.")

That gives a useful blueprint for agents:

1. **Capture** everything cheaply, with timestamps and context.
2. **Consolidate** on a schedule: merge duplicates, extract facts, update what changed.
3. **Decay** what is never recalled, so retrieval stays sharp.

## A first sketch

Here is roughly what the consolidation step looks like:

```ts
type Memory = { id: string; text: string; lastRecalled: number; strength: number };

function decay(memories: Memory[], now: number, halfLifeDays = 14) {
  const day = 86_400_000;
  return memories
    .map((m) => ({ ...m, strength: m.strength * 0.5 ** ((now - m.lastRecalled) / (halfLifeDays * day)) }))
    .filter((m) => m.strength > 0.05); // forgotten
}
```

Recall bumps `strength` back up, exactly like retrieval practice does for us.

## What's next

The open question is what to consolidate *into*. Facts are easy. Habits, preferences and "how this person likes to work" are much harder, and that's where I'm spending my time now.

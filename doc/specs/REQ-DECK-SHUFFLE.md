---
id: REQ-DECK-SHUFFLE
module: deck
status: draft
agent: unassigned
owns_paths:
  - src/contracts/deck/**
  - src/deck/**
  - tests/deck/**
  - tests/contracts/deck/**
  - doc/specs/REQ-DECK-SHUFFLE.md
blocked_by: []
blocked_reason: ""
last_updated: 2026-08-18
---

# Spec: REQ-DECK-SHUFFLE

## Intention
52 张牌可复现洗牌；按街发出底牌与公共牌。

## In
- `ShuffleRequest { seed?: number }`
- `DealHoleRequest { seats: number[] }`
- `DealBoardRequest { count: 3 | 1 | 1 }`

## Out
- `DeckShuffled`
- `HoleDealt { seat: number; cards: Card[2] }`
- `BoardDealt { cards: Card[] }`

## Deps
- `contracts` only（出度 = 1 ≤ K=2）

## Out of Scope
- 下注合法性 → REQ-BETTING-LEGAL
- 摊牌比牌 → REQ-EVALUATE-RANK
- 宿主 MCP → REQ-HOST-*

## Acceptance
- [ ] 同 seed 两次 shuffle 顺序一致
- [ ] 同一手内无重复牌
- [ ] `py scripts/adl_check.py` exit 0
- [ ] 本 plugin 不 import `src/hosts/**`

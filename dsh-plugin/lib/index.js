/**
 * DeepSeek Harness host plugin — tools for remote holdem at kuroneko.chat.
 * Runtime deps (peer): @deepseek-ai/cordis, @deepseek-ai/dsh-tools
 */
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'shinjiyu-holdem'
export const inject = ['tools']

const identityParams = {
  githubLogin: { type: 'string', required: true, description: 'GitHub login from table token' },
  tableId: { type: 'string', required: true, description: 'Table id from token' },
  seat: { type: 'number', required: true, description: 'Seat index from token' },
  token: { type: 'string', required: true, description: 'Table token from H5 复制 AI 令牌' },
}

function jsonText(value) {
  return [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }]
}

async function postJson(baseUrl, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status} ${path}`)
  }
  return data
}

export function apply(ctx, config = {}) {
  const baseUrl = String(config.baseUrl || 'https://kuroneko.chat/holdem').replace(/\/$/, '')

  const idBody = (args) => ({
    githubLogin: args.githubLogin,
    tableId: args.tableId,
    seat: args.seat,
    token: args.token,
  })

  ctx.tools.register(defineTool({
    name: 'holdem_open_table',
    description: 'Return the public H5 lobby URL for holdem (human sits here, then copies AI token).',
    parameters: {},
    output: {
      schema: { type: 'object' },
      render: (_args, value) => jsonText(value),
    },
    async execute() {
      return { tableUrl: `${baseUrl}/`, hint: 'Login with GitHub, sit, click 复制 AI 令牌' }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'holdem_hand_state',
    description: 'Fetch current seat view for a hosted holdem seat (street, hole, pot, actorsSeat, control).',
    parameters: { ...identityParams },
    output: {
      schema: { type: 'object' },
      render: (_args, value) => jsonText(value),
    },
    async execute(args) {
      return postJson(baseUrl, '/api/agent/hand_state', idBody(args))
    },
  }))

  ctx.tools.register(defineTool({
    name: 'holdem_legal_actions',
    description: 'List legal ActionIntents. Empty unless control=hosted and it is this seat\'s turn.',
    parameters: { ...identityParams },
    output: {
      schema: { type: 'object' },
      render: (_args, value) => jsonText(value),
    },
    async execute(args) {
      return postJson(baseUrl, '/api/agent/legal_actions', idBody(args))
    },
  }))

  ctx.tools.register(defineTool({
    name: 'holdem_set_control',
    description: 'Set seat control to hosted (AI acts) or manual (human H5 clicks).',
    parameters: {
      ...identityParams,
      control: {
        type: 'string',
        required: true,
        description: 'hosted | manual',
      },
    },
    output: {
      schema: { type: 'object' },
      render: (_args, value) => jsonText(value),
    },
    async execute(args) {
      return postJson(baseUrl, '/api/agent/set_control', {
        ...idBody(args),
        control: args.control,
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'holdem_act',
    description: 'Submit a poker action: fold|check|call|bet|raise|allin. For bet/raise set amount (chips to put in).',
    parameters: {
      ...identityParams,
      kind: {
        type: 'string',
        required: true,
        description: 'fold|check|call|bet|raise|allin',
      },
      amount: {
        type: 'number',
        required: false,
        description: 'Chips to put in for bet/raise',
      },
    },
    output: {
      schema: { type: 'object' },
      render: (_args, value) => jsonText(value),
    },
    async execute(args) {
      const intent = { kind: args.kind }
      if (args.amount != null) intent.amount = args.amount
      return postJson(baseUrl, '/api/agent/act', {
        ...idBody(args),
        intent,
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'holdem_result',
    description: 'Fetch showdown HandResult when the hand is over; null/empty if still playing.',
    parameters: { ...identityParams },
    output: {
      schema: { type: 'object' },
      render: (_args, value) => jsonText(value),
    },
    async execute(args) {
      return postJson(baseUrl, '/api/agent/result', idBody(args))
    },
  }))

  ctx.effect(() => {
    console.log(`[shinjiyu-holdem] mounted baseUrl=${baseUrl}`)
    return () => console.log('[shinjiyu-holdem] unmounted')
  })
}

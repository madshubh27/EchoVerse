/**
 * POST /api/chat
 * Chat endpoint for the browser client.
 * - OPENAI_API_KEY set → calls GPT-4o-mini (key stays server-side, never exposed).
 * - No key → returns smart demo responses.
 *
 * Request body: { messages: [{role, content}], session_id?: string }
 * Response:     { response: string, model: string }
 */

const MAX_CHAT_HISTORY = 20
const MAX_MSG_LEN = 2000
const TIMEOUT_MS = 28_000 // 28s — under Vercel's 30s serverless limit

// ---------- Demo responses ----------
const DEMO_RESPONSES = {
    hello: "Hello! I'm EchoVerse, your AI voice assistant. I can help you post Slack messages, create Jira tickets, send emails, and update status pages. What would you like to do?",
    hi: "Hi there! I'm EchoVerse. How can I assist you today? I can help with Slack, Jira, email, and status page updates.",
    help: "I can help you with: 1) Posting messages to Slack channels, 2) Creating Jira tickets for incidents, 3) Sending email notifications, 4) Updating your status page. Just tell me what you need!",
    slack: "Sure! I can post a message to Slack. Which channel would you like me to post to, and what should the message say?",
    jira: "I can create a Jira ticket for you. What should the title be, and how would you describe the issue?",
    email: "I can send an email. Who should I send it to, what's the subject, and what should the message say?",
    status: "I can update your status page. Which component needs to be updated, and what's the new status?",
    default: "I understand. As EchoVerse, I can help you with Slack messages, Jira tickets, emails, and status page updates. Could you tell me more about what you need?",
}

function getDemoResponse(userMessage) {
    const msg = userMessage.toLowerCase().trim()
    for (const [key, response] of Object.entries(DEMO_RESPONSES)) {
        if (key !== 'default' && msg.includes(key)) return response
    }
    return DEMO_RESPONSES.default
}

// ---------- Helpers ----------
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function withTimeout(promise, ms) {
    let timer
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Request timed out')), ms)
    })
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// ---------- Handler ----------
export default async function handler(req, res) {
    setCorsHeaders(res)

    if (req.method === 'OPTIONS') return res.status(204).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    // --- Input validation ---
    const { messages, session_id = '' } = req.body || {}

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required' })
    }

    // Sanitise messages
    const safeMessages = messages
        .slice(-MAX_CHAT_HISTORY)
        .filter((m) => m && typeof m.role === 'string' && typeof m.content === 'string')
        .map((m) => ({
            role: m.role,
            content: String(m.content).slice(0, MAX_MSG_LEN).trim(),
        }))

    // Find last user message
    const lastUser = [...safeMessages].reverse().find((m) => m.role === 'user')
    if (!lastUser) {
        return res.status(400).json({ error: 'No user message found' })
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY

    // --- OpenAI mode ---
    if (OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-')) {
        const systemPrompt = {
            role: 'system',
            content:
                'You are EchoVerse, an AI voice assistant for on-call engineers. ' +
                'Keep responses SHORT (1-3 sentences) since this is a voice conversation. ' +
                'You can help with: posting Slack messages, creating Jira tickets, ' +
                'sending emails, and updating status pages. ' +
                'Always confirm actions before executing them.',
        }

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const response = await withTimeout(
                    fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${OPENAI_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o-mini',
                            messages: [systemPrompt, ...safeMessages],
                            max_tokens: 200,
                            temperature: 0.7,
                        }),
                    }),
                    TIMEOUT_MS
                )

                if (response.status === 429 && attempt < 2) {
                    // Rate limited — exponential back-off
                    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
                    continue
                }

                if (!response.ok) {
                    const errBody = await response.text()
                    console.error(`[chat] OpenAI ${response.status}:`, errBody.slice(0, 200))
                    break // Fall through to demo mode
                }

                const data = await response.json()
                const aiText = data.choices?.[0]?.message?.content?.trim()

                if (!aiText) {
                    console.error('[chat] OpenAI returned empty content')
                    break
                }

                console.log(
                    `[chat] OpenAI OK — ${data.usage?.prompt_tokens}in / ${data.usage?.completion_tokens}out`
                )

                return res.status(200).json({ response: aiText, model: 'gpt-4o-mini' })
            } catch (err) {
                console.error(`[chat] OpenAI attempt ${attempt + 1} error:`, err.message)
                if (attempt < 2) {
                    await new Promise((r) => setTimeout(r, 1000))
                    continue
                }
                // Fall through to demo mode after all retries
            }
        }
    }

    // --- Demo mode fallback ---
    console.log('[chat] Using demo mode (no valid OPENAI_API_KEY or OpenAI failed)')
    return res.status(200).json({
        response: getDemoResponse(lastUser.content),
        model: 'demo',
    })
}

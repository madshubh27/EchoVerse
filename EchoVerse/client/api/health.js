/**
 * GET /api/health
 * Health-check endpoint — confirms the deployment is alive.
 */
export default function handler(req, res) {
  // Allow CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  return res.status(200).json({
    status: 'ok',
    service: 'echoverse-vercel',
    version: '2.0.0',
    timestamp: Date.now(),
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'demo',
  })
}

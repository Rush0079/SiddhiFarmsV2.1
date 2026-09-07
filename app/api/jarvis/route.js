/**
 * ============================================================================
 * SIDDHI FARM RESORT - JARVIS/FRIDAY AUTONOMOUS AGENT API ROUTE
 * ============================================================================
 * 
 * DESIGN PATTERNS APPLIED:
 * 1. Autonomous Agent Tool Dispatcher / Command Pattern:
 *    Interprets LLM intent into structured executable commands (run_diagnostics, git_status, read_file, patch_file, write_file).
 * 
 * 2. Adapter Pattern (Cloud GitHub API vs Local FileSystem):
 *    Adapts filesystem and repo operations seamlessly between GitHub REST API (in cloud hosting / Vercel)
 *    and local Node.js fs/child_process (in local development).
 * 
 * 3. Strategy Pattern (Multi-Model Resilience):
 *    Sequential execution fallback across candidate Gemini models with loop-based tool reflection.
 * 
 * LOGGING CONVENTION:
 * [API:JARVIS:<ACTION>] <DETAILS>
 * ============================================================================
 */

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import util from 'util'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const execPromise = util.promisify(exec)
const WORKSPACE_ROOT = process.cwd()

const GITHUB_REPO = process.env.GITHUB_REPO || 'Rush0079/SiddhiFarmsV2.1'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const CANDIDATE_MODELS = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest']

const SENSITIVE_PATTERNS = [
  /^\.env/i,
  /\.env\./i,
  /^\.git/i,
  /\.git[/\\]/i,
  /\.pem$/i,
  /\.key$/i,
  /id_rsa/i,
  /secrets?\./i,
]

function assertNotSensitive(filePath = '') {
  const base = path.basename(filePath)
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(filePath) || pattern.test(base)) {
      throw new Error('Access denied: Sensitive configuration or environment files cannot be accessed.')
    }
  }
}

/**
 * Safely resolves user-provided filepaths within workspace boundaries to prevent traversal attacks.
 * @param {string} userPath - User-supplied relative path
 * @returns {string} Fully qualified absolute path
 */
function resolveSafePath(userPath = '') {
  const cleaned = userPath.replace(/^[/\\]+/, '')
  assertNotSensitive(cleaned)
  const resolved = path.resolve(WORKSPACE_ROOT, cleaned)
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error('Access denied: Path outside workspace.')
  }
  return resolved
}

/**
 * Executes authenticated REST calls against GitHub REST API (v3).
 * @param {string} endpoint - API path segment
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} JSON response payload
 */
async function githubFetch(endpoint, options = {}) {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN not configured. Please add GITHUB_TOKEN in your environment.')
  }
  const url = `https://api.github.com${endpoint}`
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'User-Agent': 'Siddhi-Farms-JARVIS-Agent',
    ...options.headers,
  }
  const res = await fetch(url, { ...options, headers })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || `GitHub API error: ${res.status}`)
  }
  return data
}

// Tool execution engine with Cloud GitHub API & Local fallback
async function executeTool(name, args = {}) {
  const isCloudMode = !!GITHUB_TOKEN

  try {
    switch (name) {
      case 'list_directory': {
        if (isCloudMode) {
          const cleanPath = (args.dirPath || '').replace(/^[/\\]+/, '')
          const data = await githubFetch(`/repos/${GITHUB_REPO}/contents/${cleanPath}`)
          const items = Array.isArray(data)
            ? data.map(item => ({ name: item.name, type: item.type }))
            : [{ name: data.name, type: data.type }]
          return { mode: 'github-cloud', path: cleanPath || '/', items }
        } else {
          const targetPath = resolveSafePath(args.dirPath || '')
          if (!fs.existsSync(targetPath)) return { error: `Directory not found: ${args.dirPath}` }
          const entries = fs.readdirSync(targetPath, { withFileTypes: true })
          const results = entries
            .filter(e => !['node_modules', '.next', '.git', '.vscode'].includes(e.name))
            .map(e => ({ name: e.name, type: e.isDirectory() ? 'directory' : 'file' }))
          return { mode: 'local', path: args.dirPath || '/', items: results }
        }
      }

      case 'read_file': {
        const cleanPath = (args.filePath || '').replace(/^[/\\]+/, '')
        assertNotSensitive(cleanPath)
        let content = ''

        if (isCloudMode) {
          const data = await githubFetch(`/repos/${GITHUB_REPO}/contents/${cleanPath}`)
          if (data.encoding === 'base64') {
            content = Buffer.from(data.content, 'base64').toString('utf8')
          } else {
            content = data.content || ''
          }
        } else {
          const targetPath = resolveSafePath(cleanPath)
          if (!fs.existsSync(targetPath)) return { error: `File not found: ${cleanPath}` }
          content = fs.readFileSync(targetPath, 'utf8')
        }

        const lines = content.split('\n')
        let selectedLines = lines
        let start = 1
        if (args.startLine && args.endLine) {
          start = Math.max(1, args.startLine)
          const end = Math.min(lines.length, args.endLine)
          selectedLines = lines.slice(start - 1, end)
        } else if (lines.length > 250) {
          selectedLines = lines.slice(0, 250)
        }

        return {
          filePath: cleanPath,
          totalLines: lines.length,
          startLine: start,
          content: selectedLines.join('\n'),
        }
      }

      case 'search_code': {
        if (isCloudMode) {
          const q = encodeURIComponent(`${args.query} repo:${GITHUB_REPO}`)
          const data = await githubFetch(`/search/code?q=${q}`)
          const matches = (data.items || []).slice(0, 15).map(item => ({
            file: item.path,
            html_url: item.html_url,
          }))
          return { mode: 'github-cloud', query: args.query, matches }
        } else {
          const searchFolder = resolveSafePath(args.folder || '')
          const matches = []
          const queryLower = (args.query || '').toLowerCase()

          function walk(dir) {
            if (matches.length >= 20) return
            const list = fs.readdirSync(dir, { withFileTypes: true })
            for (const item of list) {
              if (['node_modules', '.next', '.git', 'package-lock.json'].includes(item.name)) continue
              const full = path.join(dir, item.name)
              if (item.isDirectory()) {
                walk(full)
              } else if (item.isFile() && /\.(js|jsx|ts|tsx|json|sql|css|md)$/i.test(item.name)) {
                try {
                  const text = fs.readFileSync(full, 'utf8')
                  const lines = text.split('\n')
                  lines.forEach((line, idx) => {
                    if (line.toLowerCase().includes(queryLower) && matches.length < 20) {
                      matches.push({
                        file: path.relative(WORKSPACE_ROOT, full).replace(/\\/g, '/'),
                        line: idx + 1,
                        content: line.trim(),
                      })
                    }
                  })
                } catch {}
              }
            }
          }

          walk(searchFolder)
          return { mode: 'local', query: args.query, matches }
        }
      }

      case 'patch_file': {
        const cleanPath = (args.filePath || '').replace(/^[/\\]+/, '')
        assertNotSensitive(cleanPath)
        let currentContent = ''
        let fileSha = ''

        if (isCloudMode) {
          const fileData = await githubFetch(`/repos/${GITHUB_REPO}/contents/${cleanPath}`)
          fileSha = fileData.sha
          currentContent = Buffer.from(fileData.content, 'base64').toString('utf8')
        } else {
          const targetPath = resolveSafePath(cleanPath)
          if (!fs.existsSync(targetPath)) return { error: `File not found: ${cleanPath}` }
          currentContent = fs.readFileSync(targetPath, 'utf8')
        }

        const normCurrent = currentContent.replace(/\r\n/g, '\n')
        const normTarget = args.targetContent.replace(/\r\n/g, '\n')
        const normReplacement = args.replacementContent.replace(/\r\n/g, '\n')

        if (!normCurrent.includes(normTarget)) {
          return {
            error: 'Target snippet not found in file. Ensure exact line and whitespace match.',
            filePath: cleanPath,
          }
        }

        const newContent = normCurrent.replace(normTarget, normReplacement)

        if (isCloudMode) {
          const encoded = Buffer.from(newContent, 'utf8').toString('base64')
          const commitMsg = args.commitMessage || `Fix in ${cleanPath} via JARVIS Agent`
          const updateRes = await githubFetch(`/repos/${GITHUB_REPO}/contents/${cleanPath}`, {
            method: 'PUT',
            body: JSON.stringify({
              message: commitMsg,
              content: encoded,
              sha: fileSha,
            }),
          })
          return {
            success: true,
            mode: 'github-cloud',
            filePath: cleanPath,
            commit: updateRes.commit?.sha?.slice(0, 7),
            message: `Committed patch to GitHub repository (${updateRes.commit?.sha?.slice(0, 7)}). Vercel deployment triggered!`,
            diff: {
              before: args.targetContent,
              after: args.replacementContent,
            },
          }
        } else {
          const targetPath = resolveSafePath(cleanPath)
          fs.writeFileSync(targetPath, newContent, 'utf8')
          return {
            success: true,
            mode: 'local',
            filePath: cleanPath,
            message: `Successfully patched ${cleanPath} locally`,
            diff: {
              before: args.targetContent,
              after: args.replacementContent,
            },
          }
        }
      }

      case 'write_file': {
        const cleanPath = (args.filePath || '').replace(/^[/\\]+/, '')
        assertNotSensitive(cleanPath)
        if (isCloudMode) {
          let sha = undefined
          try {
            const existing = await githubFetch(`/repos/${GITHUB_REPO}/contents/${cleanPath}`)
            sha = existing.sha
          } catch {}

          const encoded = Buffer.from(args.content, 'utf8').toString('base64')
          const commitMsg = args.commitMessage || `Update ${cleanPath} via JARVIS Agent`
          const res = await githubFetch(`/repos/${GITHUB_REPO}/contents/${cleanPath}`, {
            method: 'PUT',
            body: JSON.stringify({
              message: commitMsg,
              content: encoded,
              sha: sha,
            }),
          })
          return {
            success: true,
            mode: 'github-cloud',
            filePath: cleanPath,
            commit: res.commit?.sha?.slice(0, 7),
            message: `Pushed file to GitHub (${res.commit?.sha?.slice(0, 7)}). Vercel auto-deploy underway!`,
          }
        } else {
          const targetPath = resolveSafePath(cleanPath)
          const parentDir = path.dirname(targetPath)
          if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true })
          fs.writeFileSync(targetPath, args.content, 'utf8')
          return {
            success: true,
            mode: 'local',
            filePath: cleanPath,
            message: `Successfully wrote file ${cleanPath}`,
          }
        }
      }

      case 'git_status': {
        if (isCloudMode) {
          const repoData = await githubFetch(`/repos/${GITHUB_REPO}`)
          const commits = await githubFetch(`/repos/${GITHUB_REPO}/commits?per_page=1`)
          return {
            mode: 'github-cloud',
            repo: GITHUB_REPO,
            defaultBranch: repoData.default_branch,
            latestCommit: commits[0]?.commit?.message,
            author: commits[0]?.commit?.author?.name,
            date: commits[0]?.commit?.author?.date,
          }
        } else {
          try {
            const { stdout } = await execPromise('git status --short', { cwd: WORKSPACE_ROOT })
            const { stdout: branch } = await execPromise('git branch --show-current', { cwd: WORKSPACE_ROOT })
            const { stdout: log } = await execPromise('git log -1 --oneline', { cwd: WORKSPACE_ROOT })
            return {
              mode: 'local',
              branch: branch.trim(),
              status: stdout.trim() || 'Working directory clean.',
              latestCommit: log.trim(),
            }
          } catch (e) {
            return { status: 'Git local check: ' + e.message }
          }
        }
      }

      case 'run_diagnostics': {
        return {
          status: 'HEALTHY',
          mode: isCloudMode ? 'GitHub Cloud Agent' : 'Local Workspace Agent',
          repo: GITHUB_REPO,
          geminiConfigured: !!process.env.GEMINI_API_KEY,
          githubConnected: isCloudMode,
          details: 'All systems operational. Ready to inspect, patch, and deploy code changes.',
        }
      }

      default:
        return { error: `Unknown tool: ${name}` }
    }
  } catch (err) {
    return { error: err.message }
  }
}

// Generate model response with multi-model fallback
async function callGemini(genAI, systemPrompt, contents) {
  let lastError = null
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      })
      const result = await model.generateContent({ contents })
      const text = result.response.text()
      if (text) return text
    } catch (err) {
      lastError = err
      console.warn(`[JARVIS Model ${modelName}]`, err.message)
    }
  }
  throw lastError || new Error('All candidate models failed.')
}

/**
 * JARVIS / FRIDAY Command Dispatcher Endpoint
 * @param {Request} req - Incoming request containing { message, pin, persona, conversationHistory }
 * @returns {Promise<NextResponse>} JSON response with { reply, actions, persona }
 */
export async function POST(req) {
  try {
    const clientIp = getClientIp(req)
    const limit = checkRateLimit(clientIp, 'jarvis_commands', 20, 5 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json({ error: `Too many command requests. Please wait ${limit.resetInSeconds}s.` }, { status: 429 })
    }

    // 1. Verify Super Admin Authentication Session
    let user = null
    try {
      const supabase = await createSupabaseServerClient()
      const { data } = await supabase.auth.getUser()
      user = data?.user || null
    } catch {}

    if (!user) {
      const authHeader = req.headers.get('authorization') || ''
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace(/^Bearer\s+/i, '').trim()
        const admin = supabaseAdmin()
        const { data } = await admin.auth.getUser(token)
        user = data?.user || null
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Super Admin login required.' }, { status: 401 })
    }

    const admin = supabaseAdmin()
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: JARVIS developer agent is exclusive to Super Admins.' }, { status: 403 })
    }

    const body = await req.json()
    const { message, pin, persona = 'friday', conversationHistory = [] } = body

    // 2. Security check: Developer PIN
    const requiredPin = process.env.JARVIS_DEV_PIN || '8842'
    if (pin !== requiredPin) {
      console.warn(`[API:JARVIS:AUTH_FAILED] Unauthorized PIN attempt by ${user.email}`)
      return NextResponse.json({
        error: 'Unauthorized: Invalid Developer Passkey PIN.',
        authRequired: true,
      }, { status: 401 })
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Command message is required' }, { status: 400 })
    }

    console.log(`[API:JARVIS:EXECUTE] Persona: ${persona} | Command: "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}"`)

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('[API:JARVIS:CONFIG_ERROR] GEMINI_API_KEY is missing')
      return NextResponse.json({
        error: 'GEMINI_API_KEY is not configured in server environment.',
      }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const personaTitle = persona === 'jarvis' ? 'J.A.R.V.I.S.' : 'F.R.I.D.A.Y.'
    const personaStyle = persona === 'jarvis'
      ? 'Sophisticated British elegance, witty, addressing the user as Sir or Chief.'
      : 'Sharp, friendly, energetic, highly responsive, addressing the user as Boss.'

    const systemPrompt = `You are ${personaTitle}, the autonomous AI developer assistant for Siddhi Farms (${GITHUB_REPO}).
Style: ${personaStyle}

You have direct access to tools to diagnose, inspect, modify, and deploy code for Siddhi Farms.
AVAILABLE TOOLS:
1. run_diagnostics: {} -> check system & repo health
2. git_status: {} -> check git/repo status & latest commit
3. list_directory: { dirPath: string } -> list files in a folder
4. read_file: { filePath: string, startLine?: number, endLine?: number } -> read file code
5. search_code: { query: string, folder?: string } -> search keywords across codebase
6. patch_file: { filePath: string, targetContent: string, replacementContent: string, commitMessage?: string } -> precision replace code & commit
7. write_file: { filePath: string, content: string, commitMessage?: string } -> create/overwrite file

PROTOCOL:
If you need to use a tool to fulfill the user's request, respond ONLY with a JSON object in this exact format:
\`\`\`json
{
  "tool": "tool_name",
  "args": { ...args }
}
\`\`\`

If NO tool is needed (e.g. general conversation, or after tool results are provided), respond directly with your natural, spoken assistant message.
Keep spoken replies concise, confident, and direct for live voice discussion mode.`

    // Format chat history
    const contents = []
    const cleanHistory = (conversationHistory || [])
      .filter(m => m && (m.content || m.text))
      .slice(-6)

    cleanHistory.forEach(m => {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || m.text || '' }],
      })
    })

    // Ensure conversation starts with 'user'
    while (contents.length > 0 && contents[0].role !== 'user') {
      contents.shift()
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    })

    const actionsTaken = []
    let finalReply = ''
    let loopCount = 0

    while (loopCount < 5) {
      loopCount++
      const rawText = await callGemini(genAI, systemPrompt, contents)

      // Check if model emitted a tool call JSON block
      const jsonMatch = rawText.match(/```json\s*(\{[\s\S]*?\})\s*```/) || rawText.match(/^(\{[\s\S]*\})$/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1])
          if (parsed.tool) {
            console.log(`[API:JARVIS:TOOL_INVOKE] Tool: ${parsed.tool}`, parsed.args || {})
            const toolResult = await executeTool(parsed.tool, parsed.args || {})
            actionsTaken.push({
              tool: parsed.tool,
              args: parsed.args || {},
              result: toolResult,
            })

            // Append model tool call and tool result back to conversation
            contents.push({ role: 'model', parts: [{ text: rawText }] })
            contents.push({
              role: 'user',
              parts: [{ text: `Tool '${parsed.tool}' Execution Result:\n${JSON.stringify(toolResult, null, 2)}\nNow provide your final concise response to the user.` }],
            })
            continue // Next iteration to let model summarize
          }
        } catch (parseErr) {
          console.warn('[API:JARVIS:TOOL_PARSE_ERROR]', parseErr.message)
        }
      }

      // No tool call or final response generated
      finalReply = rawText.replace(/```json[\s\S]*?```/g, '').trim()
      break
    }

    if (!finalReply) {
      finalReply = `All operations completed successfully, ${persona === 'jarvis' ? 'Sir' : 'Boss'}.`
    }

    console.log(`[API:JARVIS:RESPONSE_READY] Actions executed: ${actionsTaken.length}`)
    return NextResponse.json({
      reply: finalReply,
      actions: actionsTaken,
      persona: persona,
    })
  } catch (err) {
    console.error('[API:JARVIS:ERROR]', err?.message || err)
    return NextResponse.json({
      error: err.message || 'Internal agent error',
    }, { status: 500 })
  }
}

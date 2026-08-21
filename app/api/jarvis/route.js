import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec)
const WORKSPACE_ROOT = process.cwd()

const GITHUB_REPO = process.env.GITHUB_REPO || 'Rush0079/SiddhiFarmsV2.1'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''

// Helper: Safely resolve local workspace path
function resolveSafePath(userPath = '') {
  const cleaned = userPath.replace(/^[/\\]+/, '')
  const resolved = path.resolve(WORKSPACE_ROOT, cleaned)
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error('Access denied: Path outside workspace.')
  }
  return resolved
}

// GitHub API Client Helper (for Zero-PC Cloud Mode)
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

// Tool definitions for Gemini Agent
const jarvisToolDeclarations = [
  {
    name: 'list_directory',
    description: 'Lists files and directories in the repository (works locally or directly on GitHub in cloud mode).',
    parameters: {
      type: 'OBJECT',
      properties: {
        dirPath: {
          type: 'STRING',
          description: 'Relative path to list, e.g. "app", "components", "supabase", or "" for root.',
        },
      },
      required: ['dirPath'],
    },
  },
  {
    name: 'read_file',
    description: 'Reads content of a file from the repository with optional line range.',
    parameters: {
      type: 'OBJECT',
      properties: {
        filePath: {
          type: 'STRING',
          description: 'Relative path to the file, e.g. "app/page.js", "components/navbar.jsx".',
        },
        startLine: {
          type: 'NUMBER',
          description: 'Optional 1-indexed start line number.',
        },
        endLine: {
          type: 'NUMBER',
          description: 'Optional 1-indexed end line number.',
        },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'search_code',
    description: 'Search for text or function names across codebase files.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'The search query or keyword (e.g. "booking", "Aadhaar", "price").',
        },
        folder: {
          type: 'STRING',
          description: 'Optional folder to restrict search to.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'patch_file',
    description: 'Replaces target content with replacement code and updates the file (commits to GitHub in cloud mode or edits locally).',
    parameters: {
      type: 'OBJECT',
      properties: {
        filePath: {
          type: 'STRING',
          description: 'Relative path to the file to modify.',
        },
        targetContent: {
          type: 'STRING',
          description: 'Exact text or lines of code in the existing file to be replaced.',
        },
        replacementContent: {
          type: 'STRING',
          description: 'New replacement code.',
        },
        commitMessage: {
          type: 'STRING',
          description: 'Descriptive commit message for the change.',
        },
      },
      required: ['filePath', 'targetContent', 'replacementContent'],
    },
  },
  {
    name: 'write_file',
    description: 'Creates a new file or completely overwrites an existing file with provided code.',
    parameters: {
      type: 'OBJECT',
      properties: {
        filePath: {
          type: 'STRING',
          description: 'Relative path to the new/existing file.',
        },
        content: {
          type: 'STRING',
          description: 'Full code content of the file.',
        },
        commitMessage: {
          type: 'STRING',
          description: 'Descriptive commit message for this file creation.',
        },
      },
      required: ['filePath', 'content'],
    },
  },
  {
    name: 'git_status',
    description: 'Checks current git/repository status, latest commits, and branch info.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'run_diagnostics',
    description: 'Runs project structure and configuration diagnostics.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
]

// Tool execution engine with Cloud GitHub API & Local fallback
async function executeTool(name, args) {
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
        } else if (lines.length > 300) {
          selectedLines = lines.slice(0, 300)
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
            error: 'Target snippet not found in file. Check exact whitespace.',
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
            message: `Successfully committed patch directly to GitHub repo (${updateRes.commit?.sha?.slice(0, 7)}). Vercel auto-deploy initiated!`,
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
            message: `Pushed file to GitHub (${res.commit?.sha?.slice(0, 7)}). Auto deploy triggered!`,
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
        }
      }

      default:
        return { error: `Unknown tool: ${name}` }
    }
  } catch (err) {
    return { error: err.message }
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { message, pin, persona = 'friday', conversationHistory = [] } = body

    // Security check: Developer PIN
    const requiredPin = process.env.JARVIS_DEV_PIN || '3000'
    if (pin !== requiredPin) {
      return NextResponse.json({
        error: 'Unauthorized: Invalid Developer Passkey PIN.',
        authRequired: true,
      }, { status: 401 })
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Command message is required' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'GEMINI_API_KEY is not configured in server environment.',
      }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const personaPrompt = persona === 'jarvis'
      ? `You are J.A.R.V.I.S., the sophisticated, witty, high-tech developer AI assistant for Siddhi Farms. Speak with British elegance and precision. Address the user as "Sir" or "Chief".`
      : `You are F.R.I.D.A.Y., the sharp, highly efficient, responsive developer AI assistant for Siddhi Farms. Speak with confidence, speed, and warmth. Address the user as Boss.`

    const systemInstruction = `${personaPrompt}
You are operating as a Cloud-Native Developer AI Assistant managing the Siddhi Farms repository (${GITHUB_REPO}).
You can inspect files, search codebase, make code patches, and push commits directly to GitHub without needing a local PC running.

AVAILABLE TOOLS:
- list_directory: inspect repository directories
- read_file: inspect source code
- search_code: find functions, variables, strings across the codebase
- patch_file: make precision line/block replacements to fix bugs and commit to GitHub
- write_file: create or overwrite complete files on GitHub
- git_status: check repository branch, commits, and status
- run_diagnostics: check health status

WORKFLOW RULES:
1. Always inspect or search the file first before applying patches.
2. Keep spoken responses engaging, crisp, and informative for live voice discussion mode.
3. When you make a code change via patch_file, give a quick confirmation of what was fixed and mention that Vercel auto-deployment is underway.`

    const candidateModels = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest']

    let formattedHistory = (conversationHistory || [])
      .filter(msg => msg && msg.content && typeof msg.content === 'string')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content || '' }],
      }))

    // Google Gemini API strictly requires that the first history entry must have role 'user'
    while (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
      formattedHistory.shift()
    }

    let chat = null
    let result = null
    let lastError = null

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: jarvisToolDeclarations }],
        })

        const testChat = model.startChat({
          history: formattedHistory,
        })

        result = await testChat.sendMessage(message)
        chat = testChat
        break
      } catch (err) {
        lastError = err
        console.warn(`[JARVIS Model Fallback] Model ${modelName} error:`, err.message)
      }
    }

    if (!result || !chat) {
      throw lastError || new Error('Failed to connect with any candidate Gemini model.')
    }

    let functionCalls = result.response.functionCalls()
    const actionsTaken = []

    // Agentic Tool Loop
    let loopCount = 0
    while (functionCalls && functionCalls.length > 0 && loopCount < 6) {
      loopCount++
      const call = functionCalls[0]
      const toolName = call.name
      const toolArgs = call.args

      const toolResult = await executeTool(toolName, toolArgs)
      actionsTaken.push({
        tool: toolName,
        args: toolArgs,
        result: toolResult,
      })

      result = await chat.sendMessage([
        {
          functionResponse: {
            name: toolName,
            response: toolResult,
          },
        },
      ])

      functionCalls = result.response.functionCalls()
    }

    const finalReply = result.response.text()

    return NextResponse.json({
      reply: finalReply,
      actions: actionsTaken,
      persona: persona,
    })
  } catch (err) {
    console.error('[JARVIS Agent Error]', err)
    return NextResponse.json({
      error: err.message || 'Internal agent error',
    }, { status: 500 })
  }
}

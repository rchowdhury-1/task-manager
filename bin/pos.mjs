#!/usr/bin/env node
// Personal OS CLI -- a thin client over the same REST API the web app and
// AI command bar already use. `pos "free text"` forwards straight to
// POST /api/v1/ai, the exact tool-calling agent the web UI runs, so
// log_project_update/create_task/etc. all work from the terminal with zero
// new natural-language parsing here.

import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import readline from 'node:readline';

const API_URL = process.env.POS_API_URL || 'https://task-manager-nine-lake-56.vercel.app';
const CONFIG_DIR = join(homedir(), '.config', 'pos');
const TOKEN_PATH = join(CONFIG_DIR, 'token');

// --- Token storage ------------------------------------------------------

function loadToken() {
  if (!existsSync(TOKEN_PATH)) return null;
  return readFileSync(TOKEN_PATH, 'utf8').trim() || null;
}

function saveToken(token) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(TOKEN_PATH, token, { mode: 0o600 });
  chmodSync(TOKEN_PATH, 0o600); // belt and braces -- some platforms ignore the write-time mode
}

function clearToken() {
  if (existsSync(TOKEN_PATH)) unlinkSync(TOKEN_PATH);
}

// --- API client -----------------------------------------------------------

async function apiRequest(path, options = {}) {
  const token = loadToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, { ...options, headers });
  } catch {
    throw new Error(`Couldn't reach ${API_URL} -- check your connection or POS_API_URL.`);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `Request failed (${res.status})`);
  }
  return body;
}

// --- Prompts -------------------------------------------------------------
//
// Both helpers below read from ONE shared readline async iterator (created
// once by the caller, e.g. cmdLogin) rather than calling rl.question()
// per-prompt. Verified by hand: two sequential rl.question() calls on the
// same interface hang forever the second time when stdin is piped
// (non-TTY) -- confirmed on this exact Node version, not a hypothetical.
// Reading via the interface's async iterator (rl[Symbol.asyncIterator]())
// instead does not have this problem and works identically for piped and
// real-terminal input.

function nextLine(lines, query) {
  process.stdout.write(query);
  return lines.next().then(({ value, done }) => (done ? '' : value));
}

// Masked input via the standard readline trick: temporarily suppress the
// interface's own output-echo while the line is being read, so keystrokes
// never appear on screen, then restore normal echoing. On piped/non-TTY
// stdin there's no terminal echo to suppress in the first place, so this
// is a harmless no-op there and the read behaves like nextLine.
function nextLineHidden(rl, lines, query) {
  const originalWriteToOutput = rl._writeToOutput?.bind(rl);
  let muted = false;
  if (originalWriteToOutput) {
    rl._writeToOutput = (stringToWrite) => {
      if (!muted) originalWriteToOutput(stringToWrite);
    };
  }
  process.stdout.write(query);
  muted = true;
  return lines.next().then(({ value, done }) => {
    if (originalWriteToOutput) rl._writeToOutput = originalWriteToOutput;
    process.stdout.write('\n');
    return done ? '' : value;
  });
}

// --- Commands ----------------------------------------------------------

async function cmdLogin() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const lines = rl[Symbol.asyncIterator]();
  try {
    const email = await nextLine(lines, 'Email: ');
    const password = await nextLineHidden(rl, lines, 'Password: ');
    const { user, token } = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveToken(token);
    console.log(`Logged in as ${user.email}`);
  } finally {
    rl.close();
  }
}

function cmdLogout() {
  clearToken();
  console.log('Logged out.');
}

async function cmdWhoami() {
  const { user } = await apiRequest('/auth/me');
  console.log(`${user.email}${user.name ? ` (${user.name})` : ''}`);
}

async function cmdProjects() {
  const projects = await apiRequest('/projects');
  if (projects.length === 0) {
    console.log('No projects yet. Try: pos "shipped the landing page for glassgardens"');
    return;
  }
  const nameWidth = Math.min(32, Math.max(...projects.map((p) => p.name.length)));
  for (const p of projects) {
    const client = p.clientName ? `  (${p.clientName})` : '';
    console.log(`${p.status.padEnd(9)} ${p.name.padEnd(nameWidth)}${client}`);
  }
}

async function cmdToday() {
  const day = await apiRequest('/today');
  console.log(`Today -- ${day.date}\n`);

  const openTasks = day.tasks.filter((t) => t.status !== 'done');
  if (openTasks.length === 0) {
    console.log('Tasks: (none open)');
  } else {
    console.log(`Tasks (${openTasks.length}):`);
    for (const t of openTasks) {
      const time = t.scheduledTime ? ` ${t.scheduledTime}` : '';
      console.log(`  [P${t.priority}]${time} ${t.title} (${t.category})`);
    }
  }

  const completedHabitIds = new Set(day.completions.map((c) => c.habit_id));
  if (day.habits.length > 0) {
    console.log(`\nHabits (${day.habits.length}):`);
    for (const h of day.habits) {
      const done = completedHabitIds.has(h.id) ? 'x' : '.';
      console.log(`  ${done} ${h.name}`);
    }
  }
}

async function cmdAsk(message) {
  const result = await apiRequest('/ai', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  console.log(result.summary);
  for (const w of result.warnings ?? []) {
    console.warn(`Warning: ${w}`);
  }
}

function requireAuth() {
  if (!loadToken()) {
    console.error('Not logged in. Run: pos login');
    process.exit(1);
  }
}

function printHelp() {
  console.log(`pos -- Personal OS CLI

Usage:
  pos login                  Log in (prompts for email and password)
  pos logout                 Clear the stored session
  pos whoami                 Show the logged-in account
  pos projects               List your projects
  pos today                  Show today's open tasks and habits
  pos "free text"            Send a natural-language command to the AI agent
                              e.g. pos "shipped the auth flow for glassgardens"
                              e.g. pos "create a task to renew hosting tomorrow"

Env:
  POS_API_URL   API base URL (default: ${API_URL})
`);
}

// --- Entry point -------------------------------------------------------

async function main() {
  const [, , cmd, ...rest] = process.argv;

  if (!cmd || cmd === '--help' || cmd === '-h') {
    printHelp();
    return;
  }

  try {
    switch (cmd) {
      case 'login':
        await cmdLogin();
        break;
      case 'logout':
        cmdLogout();
        break;
      case 'whoami':
        requireAuth();
        await cmdWhoami();
        break;
      case 'projects':
        requireAuth();
        await cmdProjects();
        break;
      case 'today':
        requireAuth();
        await cmdToday();
        break;
      default:
        requireAuth();
        await cmdAsk([cmd, ...rest].join(' '));
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();

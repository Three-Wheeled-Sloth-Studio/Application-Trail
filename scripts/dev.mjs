import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = new Set();
let shuttingDown = false;

function spawnChild(command, args, options = {}) {
  const child = spawn(command, args, { stdio: 'inherit', ...options });
  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawnChild(command, args);
    child.once('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}.`));
    });
    child.once('error', reject);
  });
}

function waitForPort(host, port, timeoutMs = 20000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = createConnection({ host, port });
      socket.once('connect', () => {
        socket.end();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}.`));
          return;
        }
        setTimeout(attempt, 300);
      });
    };
    attempt();
  });
}

function startTunnel(databaseUrl) {
  const sshHost = process.env.APPLICATION_TRAIL_SSH_HOST;
  if (!sshHost) return null;

  const localPort = Number(process.env.APPLICATION_TRAIL_SSH_LOCAL_PORT ?? databaseUrl.port ?? 55432);
  const remoteHost = process.env.APPLICATION_TRAIL_SSH_REMOTE_HOST ?? '127.0.0.1';
  const remotePort = Number(process.env.APPLICATION_TRAIL_SSH_REMOTE_PORT ?? 5432);
  const args = ['-N', '-o', 'ExitOnForwardFailure=yes', '-L', `${localPort}:${remoteHost}:${remotePort}`];
  const identityFile = process.env.APPLICATION_TRAIL_SSH_IDENTITY_FILE;
  if (identityFile) args.push('-i', identityFile);
  args.push(sshHost);

  console.log(`Opening Application Trail database tunnel on 127.0.0.1:${localPort}...`);
  const child = spawnChild('ssh', args);
  child.once('error', error => {
    console.error('Could not start SSH tunnel:', error.message);
  });
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(exitCode), 100).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const databaseUrlValue = process.env.DATABASE_URL;
if (!databaseUrlValue) throw new Error('DATABASE_URL is required in .env.local.');
const databaseUrl = new URL(databaseUrlValue);
const databaseHost = databaseUrl.hostname;
const databasePort = Number(databaseUrl.port || 5432);

try {
  console.log('Building Application Trail...');
  await run(npmCommand, ['run', 'build']);

  const tunnel = startTunnel(databaseUrl);
  if (tunnel) {
    const tunnelFailure = new Promise((_, reject) => {
      tunnel.once('exit', code => reject(new Error(`SSH tunnel exited before startup completed (${code ?? 'unknown'}).`)));
    });
    await Promise.race([waitForPort(databaseHost, databasePort), tunnelFailure]);
  } else {
    await waitForPort(databaseHost, databasePort);
  }

  console.log('Applying database migrations...');
  await run(npmCommand, ['run', 'migrate']);

  const api = spawnChild(npmCommand, ['run', 'start:api']);
  const web = spawnChild(npmCommand, ['run', 'start:web']);
  const failIfUnexpected = name => code => {
    if (!shuttingDown) {
      console.error(`${name} exited unexpectedly with code ${code ?? 'unknown'}.`);
      shutdown(code || 1);
    }
  };
  api.once('exit', failIfUnexpected('API'));
  web.once('exit', failIfUnexpected('Web'));

  console.log(`Application Trail ready at ${process.env.APPLICATION_TRAIL_PUBLIC_URL ?? 'http://127.0.0.1:4320'}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  shutdown(1);
}

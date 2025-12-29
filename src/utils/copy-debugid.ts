import fs from 'fs';
import { logger } from './logger';

export function copyDebugId(packagerSourceMapPath: string, hermesSourceMapPath: string) {
  if (!packagerSourceMapPath) {
    return;
  }
  if (!hermesSourceMapPath) {
    return;
  }
  if (!fs.existsSync(packagerSourceMapPath)) {
    return;
  }
  if (!fs.existsSync(hermesSourceMapPath)) {
    return;
  }

  const from = fs.readFileSync(packagerSourceMapPath, 'utf8');
  const to = fs.readFileSync(hermesSourceMapPath, 'utf8');

  const fromParsed = JSON.parse(from);
  const toParsed = JSON.parse(to);

  if (!fromParsed.debugId && !fromParsed.debug_id) {
    return;
  }

  if (toParsed.debugId || toParsed.debug_id) {
    return;
  }

  if (fromParsed.debugId) {
    toParsed.debugId = fromParsed.debugId;
    toParsed.debug_id = fromParsed.debugId;
  } else if (fromParsed.debug_id) {
    toParsed.debugId = fromParsed.debug_id;
    toParsed.debug_id = fromParsed.debug_id;
  }

  fs.writeFileSync(hermesSourceMapPath, JSON.stringify(toParsed));
}

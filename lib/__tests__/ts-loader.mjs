import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    // Fallback to TypeScript files when extension is omitted
    if (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')) {
      const parentDir = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd();
      const tsPath = path.resolve(parentDir, `${specifier}${specifier.endsWith('.ts') ? '' : '.ts'}`);
      try {
        await access(tsPath);
        return { url: pathToFileURL(tsPath).href, shortCircuit: true };
      } catch {
        // Fall through to original error
      }
    }

    throw error;
  }
}

export async function load(url, context, nextLoad) {
  if (!url.endsWith('.ts')) {
    return nextLoad(url, context);
  }

  const source = await readFile(new URL(url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      esModuleInterop: true,
    },
    fileName: url,
  });

  return {
    format: 'module',
    source: outputText,
    shortCircuit: true,
  };
}

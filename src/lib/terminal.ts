import type { TerminalScenario } from "@/content/terminal";

export interface ExecResult {
  output: string;
  cwd: string;
  cleared?: boolean;
}

function normalize(cwd: string, arg?: string): string {
  if (!arg || arg === "") return cwd;
  let path = arg.startsWith("/") ? arg : `${cwd}/${arg}`;
  const parts = path.split("/");
  const stack: string[] = [];
  for (const p of parts) {
    if (p === "" || p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(p);
  }
  return "/" + stack.join("/");
}

function allPaths(scn: TerminalScenario): string[] {
  return Object.keys(scn.files);
}

function isFile(scn: TerminalScenario, path: string): boolean {
  return path in scn.files;
}

function dirEntries(scn: TerminalScenario, dir: string): string[] {
  const prefix = dir === "/" ? "/" : dir + "/";
  const set = new Set<string>();
  for (const p of allPaths(scn)) {
    if (p.startsWith(prefix)) {
      const rest = p.slice(prefix.length);
      const first = rest.split("/")[0];
      if (first) set.add(first + (rest.includes("/") ? "/" : ""));
    }
  }
  return [...set].sort();
}

function isDir(scn: TerminalScenario, path: string): boolean {
  if (path === "/") return true;
  const prefix = path + "/";
  return allPaths(scn).some((p) => p.startsWith(prefix));
}

export function runCommand(scn: TerminalScenario, cwd: string, line: string): ExecResult {
  const trimmed = line.trim();
  if (!trimmed) return { output: "", cwd };

  const tokens = trimmed.split(/\s+/);
  const cmd = tokens[0];
  const args = tokens.slice(1);

  switch (cmd) {
    case "clear":
      return { output: "", cwd, cleared: true };
    case "pwd":
      return { output: cwd, cwd };
    case "whoami":
      return { output: scn.user, cwd };
    case "hostname":
      return { output: scn.host, cwd };
    case "echo":
      return { output: args.join(" "), cwd };
    case "help":
      return {
        output:
          "Available: pwd, ls, cd, cat, grep, find, echo, clear, whoami, hostname, help\n" +
          "Plus scenario tools (try the commands hinted in the mission, e.g. kubectl, dig, curl, ss, redis-cli, docker...).\n" +
          "Investigate, then answer the diagnosis question on the right.",
        cwd,
      };
    case "ls": {
      const target = normalize(cwd, args.find((a) => !a.startsWith("-")));
      if (isFile(scn, target)) return { output: target.split("/").pop() ?? target, cwd };
      if (!isDir(scn, target)) return { output: `ls: cannot access '${args[0] ?? ""}': No such file or directory`, cwd };
      const entries = dirEntries(scn, target);
      return { output: entries.length ? entries.join("  ") : "", cwd };
    }
    case "cd": {
      const target = normalize(cwd, args[0] ?? "/home/" + scn.user);
      if (isDir(scn, target)) return { output: "", cwd: target };
      if (isFile(scn, target)) return { output: `cd: not a directory: ${args[0]}`, cwd };
      return { output: `cd: no such file or directory: ${args[0]}`, cwd };
    }
    case "cat": {
      if (!args.length) return { output: "cat: missing operand", cwd };
      const target = normalize(cwd, args[0]);
      if (isFile(scn, target)) return { output: scn.files[target], cwd };
      if (isDir(scn, target)) return { output: `cat: ${args[0]}: Is a directory`, cwd };
      return { output: `cat: ${args[0]}: No such file or directory`, cwd };
    }
    case "grep": {
      // grep [-n] [-c] pattern path
      const flags = args.filter((a) => a.startsWith("-"));
      const rest = args.filter((a) => !a.startsWith("-"));
      const pattern = rest[0];
      const pathArg = rest[1];
      if (!pattern || !pathArg) {
        // maybe a scenario canned grep (e.g. grep -c rebalance file)
        break;
      }
      const target = normalize(cwd, pathArg);
      if (!isFile(scn, target)) {
        // fall through to canned commands
        break;
      }
      const lines = scn.files[target].split("\n");
      const showNum = flags.includes("-n");
      const count = flags.includes("-c");
      const matched = lines
        .map((l, i) => ({ l, i: i + 1 }))
        .filter((x) => x.l.toLowerCase().includes(pattern.toLowerCase()));
      if (count) return { output: String(matched.length), cwd };
      return {
        output: matched.map((m) => (showNum ? `${m.i}:${m.l}` : m.l)).join("\n") || "",
        cwd,
      };
    }
    case "find": {
      const base = normalize(cwd, args.find((a) => !a.startsWith("-")) ?? cwd);
      const nameIdx = args.indexOf("-name");
      const namePat = nameIdx >= 0 ? args[nameIdx + 1]?.replace(/[*'"]/g, "") : undefined;
      const prefix = base === "/" ? "/" : base + "/";
      let paths = allPaths(scn).filter((p) => p === base || p.startsWith(prefix));
      if (namePat) paths = paths.filter((p) => p.split("/").pop()?.includes(namePat));
      return { output: paths.sort().join("\n") || "", cwd };
    }
    default:
      break;
  }

  // Scenario-specific canned commands (kubectl, dig, curl, ss, redis-cli, ...)
  const canned = scn.commands.find((c) => trimmed.startsWith(c.match));
  if (canned) return { output: canned.output, cwd };

  return { output: `${cmd}: command not found`, cwd };
}

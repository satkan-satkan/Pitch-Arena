import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
const files = [
  ...new Set(
    execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { encoding: "utf8" },
    )
      .split("\0")
      .filter(Boolean),
  ),
];
const problems = [];
for (const file of files) {
  if (
    (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith(".env.example")) ||
    /^\.data\//.test(file) ||
    /\.(pem|key|p12|pfx|dump|backup)$/.test(file)
  ) {
    problems.push(file);
    continue;
  }
  try {
    if (statSync(file).size > 2_000_000) continue;
    const source = readFileSync(file, "utf8");
    if (source.includes("\0")) continue;
    if (
      /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}\b|\bxkeysib-[A-Za-z0-9_-]{20,}\b|\bgh[pousr]_[A-Za-z0-9]{30,}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|postgres(?:ql)?:\/\/[^\s/:]+:[^\s/@]+@/i.test(
        source,
      )
    )
      problems.push(file);
  } catch {}
}
if (problems.length) {
  console.error(
    "Possible credentials found. Review locally; values are not printed.\n" +
      problems.join("\n"),
  );
  process.exitCode = 1;
} else
  console.log(
    "No tracked data files or recognizable credential patterns found. This check is a guardrail, not a complete secret audit.",
  );

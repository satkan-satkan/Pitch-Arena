import ffmpeg from "ffmpeg-static";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
mkdirSync("public/audio", { recursive: true });
const result = spawnSync(
  ffmpeg,
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    "sounds/main theme/Inquisitive Groove.m4a",
    "-vn",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "public/audio/inquisitive-groove.mp3",
  ],
  { stdio: "inherit" },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);

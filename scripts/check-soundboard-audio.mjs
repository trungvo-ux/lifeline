import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = readFileSync("components/soundboard.tsx", "utf8")
const samples = [...source.matchAll(/sample: "([^"]+)"/g)].map((match) => match[1])
assert.equal(samples.length, 16)
assert.equal(new Set(samples).size, 16)

for (const sample of [...samples, "beat"]) {
  const file = readFileSync(`public/audio/daftpunkonsole/${sample}.mp3`)
  assert.ok(file.length > 500, `${sample} is empty`)
  assert.ok(file.subarray(0, 3).toString() === "ID3" || (file[0] === 0xff && (file[1] & 0xe0) === 0xe0), `${sample} is not MP3`)
}

console.log("Soundboard: 16 samples and instrumental present")

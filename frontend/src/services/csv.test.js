import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "./csv.js";

test("CSV metadata does not shift named sensor columns", () => {
  assert.deepEqual(parseCsv('\uFEFFmachine,sensor_2,sensor_3\r\n"Engine, A",642.8,1593.2\r\n'), {
    headers: ["machine", "sensor_2", "sensor_3"],
    rows: [["Engine, A", "642.8", "1593.2"]],
  });
});
test("CSV preserves empty values and quoted multiline metadata", () => {
  assert.deepEqual(parseCsv('note,sensor_2\n"line 1\nline ""2""",\n').rows,
    [['line 1\nline "2"', ""]]);
  assert.throws(() => parseCsv('note\n"unfinished'), /unclosed/);
});

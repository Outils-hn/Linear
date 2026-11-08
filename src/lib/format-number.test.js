import { expect, test } from "bun:test";
import { formatNombre } from "./format-number";

test("jamais -0, apostrophe suisse pour les milliers", () => {
  expect(formatNombre(-0.001, 1)).toBe("0,0");
  expect(formatNombre(-0, 0)).toBe("0");
  expect(formatNombre(1200)).toBe("1'200");
  expect(formatNombre(-1250.5, 1)).toBe("-1'250,5");
});

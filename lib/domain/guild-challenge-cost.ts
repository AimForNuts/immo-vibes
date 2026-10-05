export type GuildChallengeCostLine = {
  name: string;
  quantity: number;
};

export type GuildChallengeCostParseResult = {
  lines: GuildChallengeCostLine[];
  errors: string[];
};

const LINE_PATTERN = /^(.+?)\s*x\s*([\d,]+)$/i;

export function parseGuildChallengeCostInput(input: string): GuildChallengeCostParseResult {
  const lines: GuildChallengeCostLine[] = [];
  const errors: string[] = [];

  input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      const match = line.match(LINE_PATTERN);

      if (!match) {
        errors.push(`Line ${index + 1}: use "Item Name x123".`);
        return;
      }

      const name = match[1]?.trim() ?? "";
      const quantity = Number.parseInt((match[2] ?? "").replaceAll(",", ""), 10);

      if (!name || !Number.isFinite(quantity) || quantity <= 0) {
        errors.push(`Line ${index + 1}: quantity must be a positive number.`);
        return;
      }

      lines.push({ name, quantity });
    });

  return { lines, errors };
}

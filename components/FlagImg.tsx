const SPECIAL: Record<string, string> = {
  "🏴󠁧󠁢󠁳󠁣󠁴󠁿": "gb-sct",
  "🏴󠁧󠁢󠁥󠁮󠁧󠁿": "gb-eng",
  "🏴󠁧󠁢󠁷󠁬󠁳󠁿": "gb-wls",
};

export default function FlagImg({ flag, size = 24 }: { flag?: string | null; size?: number }) {
  if (!flag) return null;

  // Special flags (Scotland, England, Wales)
  if (SPECIAL[flag]) {
    return (
      <img
        src={`https://flagcdn.com/w40/${SPECIAL[flag]}.png`}
        width={size}
        height={Math.round(size * 0.67)}
        alt={flag}
        className="inline-block rounded-sm object-cover"
      />
    );
  }

  // Standard emoji flags (two regional indicator letters)
  const chars = [...flag];
  if (chars.length >= 2) {
    const c1 = (chars[0].codePointAt(0) ?? 0) - 0x1f1e6;
    const c2 = (chars[1].codePointAt(0) ?? 0) - 0x1f1e6;
    if (c1 >= 0 && c1 <= 25 && c2 >= 0 && c2 <= 25) {
      const code = String.fromCharCode(97 + c1) + String.fromCharCode(97 + c2);
      return (
        <img
          src={`https://flagcdn.com/w40/${code}.png`}
          width={size}
          height={Math.round(size * 0.67)}
          alt={flag}
          className="inline-block rounded-sm object-cover"
        />
      );
    }
  }

  return <span>{flag}</span>;
}

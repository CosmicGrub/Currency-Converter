import { useEffect, useState } from "react";
import { colors, fonts } from "../styles/tokens.js";
import { loadJSON, saveJSON } from "../lib/storage.js";
import { buildQuestion, recordAnswer } from "../lib/currencyQuiz.js";
import type { QuizQuestion, QuizStats } from "../lib/currencyQuiz.js";

const STATS_KEY = "quizStats";

/** "Currency IQ" -- a lightweight learning/observation tool: name-the-
 *  currency multiple choice, with a simple adaptive weighting (see
 *  lib/currencyQuiz.ts) that resurfaces codes you've missed before more
 *  often than ones you already know. Entirely local: stats persist to
 *  localStorage under the existing exchangeboard: namespace, nothing is
 *  sent anywhere. */
export default function CurrencyQuiz() {
  const [stats, setStats] = useState<QuizStats>(() => loadJSON(STATS_KEY, {}));
  const [question, setQuestion] = useState<QuizQuestion>(() => buildQuestion(loadJSON(STATS_KEY, {})));
  const [selected, setSelected] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    saveJSON(STATS_KEY, stats);
  }, [stats]);

  const answer = (option: string) => {
    if (selected) return; // one answer per question
    setSelected(option);
    const correct = option === question.correctName;
    setStats((s) => recordAnswer(s, question.code, correct));
    setStreak((s) => (correct ? s + 1 : 0));
  };

  const next = () => {
    setSelected(null);
    setQuestion(buildQuestion(stats));
  };

  return (
    <div
      style={{
        background: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: 20,
        marginTop: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label
          style={{ fontSize: 11, letterSpacing: "0.1em", color: colors.textSecondary, fontWeight: 600 }}
        >
          CURRENCY IQ
        </label>
        <span style={{ fontSize: 11, color: colors.textTertiary, fontFamily: fonts.mono }}>
          streak {streak}
        </span>
      </div>
      <p style={{ fontSize: 14, color: colors.textPrimary, marginTop: 10, marginBottom: 0 }}>
        Which currency uses the code{" "}
        <strong style={{ color: colors.accent, fontFamily: fonts.mono }}>{question.code}</strong>?
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
        {question.options.map((opt) => {
          const isCorrect = opt === question.correctName;
          const isPicked = opt === selected;
          const revealed = selected !== null;
          const borderColor = revealed && isCorrect ? "#4CAF7D" : revealed && isPicked ? colors.error : colors.borderAlt;
          const bg =
            revealed && isCorrect
              ? "rgba(76,175,125,0.12)"
              : revealed && isPicked
                ? "rgba(227,104,104,0.12)"
                : colors.panelAlt;
          return (
            <button
              key={opt}
              onClick={() => answer(opt)}
              disabled={revealed}
              style={{
                textAlign: "left",
                padding: "9px 12px",
                borderRadius: 8,
                border: `1px solid ${borderColor}`,
                background: bg,
                color: colors.textPrimary,
                fontSize: 13,
                cursor: revealed ? "default" : "pointer",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {selected && (
        <button
          onClick={next}
          style={{
            marginTop: 12,
            background: colors.accent,
            color: colors.bg,
            border: "none",
            borderRadius: 8,
            padding: "7px 14px",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Next →
        </button>
      )}
    </div>
  );
}

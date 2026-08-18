import { colors, fonts } from "../styles/tokens.js";
import { rateBetween } from "../lib/convert.js";
import type { RateTable } from "../types/index.js";

export interface MatrixProps {
  rates: RateTable | null;
  favorites: string[];
}

/** N x N comparative exchange matrix for every currency in the user's
 *  favorites list -- row = 1 unit of that currency, column = converted
 *  value, so matrix[row][col] reads as "1 ROW = matrix[row][col] COL". */
export default function Matrix({ rates, favorites }: MatrixProps) {
  const codes = [...new Set(favorites)];

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
      <label
        style={{ fontSize: 11, letterSpacing: "0.1em", color: colors.textSecondary, fontWeight: 600 }}
      >
        FAVORITES MATRIX
      </label>

      {codes.length < 2 ? (
        <p style={{ color: colors.textTertiary, fontSize: 13, marginTop: 10, marginBottom: 0 }}>
          Star at least 2 currencies (tap ☆ in either picker) to see them compared side by side.
        </p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              minWidth: codes.length * 84 + 70,
              fontFamily: fonts.mono,
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    padding: "6px 10px",
                    textAlign: "left",
                    color: colors.textTertiary,
                    borderBottom: `1px solid ${colors.borderAlt}`,
                  }}
                >
                  {/* corner cell: row = from, column = to */}
                </th>
                {codes.map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: "6px 10px",
                      textAlign: "right",
                      color: colors.accent,
                      fontWeight: 700,
                      borderBottom: `1px solid ${colors.borderAlt}`,
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map((row) => (
                <tr key={row}>
                  <th
                    style={{
                      padding: "6px 10px",
                      textAlign: "left",
                      color: colors.accent,
                      fontWeight: 700,
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    {row}
                  </th>
                  {codes.map((col) => {
                    const rate = rates ? rateBetween(rates, row, col) : null;
                    const isDiagonal = row === col;
                    return (
                      <td
                        key={col}
                        style={{
                          padding: "6px 10px",
                          textAlign: "right",
                          color: isDiagonal ? colors.textTertiary : colors.textPrimary,
                          borderBottom: `1px solid ${colors.border}`,
                        }}
                      >
                        {rate !== null ? rate.toFixed(4) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

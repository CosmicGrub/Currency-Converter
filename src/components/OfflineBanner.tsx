import { colors, fonts } from "../styles/tokens.js";

export interface OfflineBannerProps {
  /** True when the browser reports no network connection at all. */
  offline: boolean;
}

/** Fixed top-of-page indicator shown whenever the network is unreachable --
 *  distinct from the per-result "cached rates" badge, this covers the
 *  general "you have no connection at all" case for any request, not just
 *  the rate fetch (history chart, matrix, manual refresh, etc). */
export default function OfflineBanner({ offline }: OfflineBannerProps) {
  if (!offline) return null;

  return (
    <div
      role="status"
      style={{
        background: colors.error,
        color: colors.bg,
        fontFamily: fonts.sans,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textAlign: "center",
        padding: "6px 12px",
      }}
    >
      OFFLINE — showing cached data. The app keeps working from its local cache.
    </div>
  );
}

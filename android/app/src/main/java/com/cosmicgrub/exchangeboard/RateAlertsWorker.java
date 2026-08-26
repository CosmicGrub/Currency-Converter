package com.cosmicgrub.exchangeboard;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

/**
 * Background counterpart to src/lib/alerts.ts + src/components/Alerts.tsx --
 * runs on WorkManager's own schedule (RateAlertsScheduler, ~15 min minimum)
 * instead of only while the WebView is open, so a threshold crossing still
 * notifies the user with the app fully closed. Deliberately mirrors the JS
 * side's own logic (same USD-indexed rate math, same hysteresis rule: only
 * notify on the armed->triggered transition, silently re-arm on the way
 * back) rather than sharing code with it -- there's no code-sharing path
 * between a WebView's JS bundle and a WorkManager Worker.
 *
 * Alert configs arrive from BackgroundAlertsPlugin.syncAlerts(), written to
 * SharedPreferences as a plain JSON array (id/base/target/direction/
 * threshold/enabled) every time the JS-side alert list changes.
 */
public class RateAlertsWorker extends Worker {

    private static final String PREFS = "exchangeboard_alerts";
    private static final String KEY_ALERTS_JSON = "alerts_json";
    private static final String KEY_TRIGGERED_IDS = "triggered_ids";
    private static final String RATES_URL = "https://open.er-api.com/v6/latest/USD";
    private static final String CHANNEL_ID = "rate-alerts";

    public RateAlertsWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        JSONArray alerts = readAlerts(prefs);
        if (alerts.length() == 0) {
            // Nothing to check -- BackgroundAlertsPlugin should have
            // cancelled this job already once the last alert was removed/
            // disabled, but doing nothing here is still correct if a stale
            // run slips through the cancellation.
            return Result.success();
        }

        JSONObject rates = fetchRates();
        if (rates == null) {
            // No connectivity or the API is down this cycle -- try again
            // at the next scheduled run rather than retrying immediately;
            // matches the app's own "keep last known state, don't spam
            // retries" offline philosophy elsewhere (widget, foreground
            // alerts panel).
            return Result.success();
        }

        Set<String> triggeredIds = new HashSet<>(prefs.getStringSet(KEY_TRIGGERED_IDS, new HashSet<>()));
        boolean triggeredIdsChanged = false;
        ensureNotificationChannel(context);

        for (int i = 0; i < alerts.length(); i++) {
            JSONObject alert = alerts.optJSONObject(i);
            if (alert == null || !alert.optBoolean("enabled", false)) continue;

            String id = alert.optString("id", null);
            String base = alert.optString("base", null);
            String target = alert.optString("target", null);
            String direction = alert.optString("direction", null);
            double threshold = alert.optDouble("threshold", Double.NaN);
            if (id == null || base == null || target == null || direction == null
                    || Double.isNaN(threshold)) continue;

            double baseRate = rates.optDouble(base, Double.NaN);
            double targetRate = rates.optDouble(target, Double.NaN);
            if (Double.isNaN(baseRate) || Double.isNaN(targetRate) || baseRate == 0) continue;
            // Same USD-indexed rate math as src/lib/convert.ts's rateBetween().
            double rate = targetRate / baseRate;

            boolean crossed = "above".equals(direction) ? rate >= threshold : rate <= threshold;
            boolean wasTriggered = triggeredIds.contains(id);

            if (crossed && !wasTriggered) {
                triggeredIds.add(id);
                triggeredIdsChanged = true;
                notifyAlert(context, id, base, target, direction, threshold, rate);
            } else if (!crossed && wasTriggered) {
                triggeredIds.remove(id); // silent re-arm, matches Alerts.tsx
                triggeredIdsChanged = true;
            }
        }

        if (triggeredIdsChanged) {
            prefs.edit().putStringSet(KEY_TRIGGERED_IDS, triggeredIds).apply();
        }
        return Result.success();
    }

    private JSONArray readAlerts(SharedPreferences prefs) {
        try {
            return new JSONArray(prefs.getString(KEY_ALERTS_JSON, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    /** Same open.er-api.com fetch RateWidgetProvider uses, but keeping the
     *  whole rates object (every alert can reference a different pair)
     *  instead of pulling out three fixed codes. */
    private JSONObject fetchRates() {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(RATES_URL);
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            conn.setRequestMethod("GET");

            StringBuilder body = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) body.append(line);
            }
            return new JSONObject(body.toString()).getJSONObject("rates");
        } catch (Exception e) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private void ensureNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Rate alerts", NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Notifies when a currency pair crosses your alert threshold");
        manager.createNotificationChannel(channel);
    }

    private void notifyAlert(Context context, String id, String base, String target,
                              String direction, double threshold, double rate) {
        // POST_NOTIFICATIONS is a runtime permission on API 33+
        // (BackgroundAlertsPlugin.requestPermission asks for it); without
        // it, skip silently -- same "notification is a bonus channel"
        // rule as the foreground panel's src/lib/notify.ts. The in-app
        // panel remains the reliable channel whenever the app is opened.
        if (Build.VERSION.SDK_INT >= 33 && ActivityCompat.checkSelfPermission(
                context, android.Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        String body = String.format(java.util.Locale.US,
                "1 %s = %.4f %s (%s %s)", base, rate, target, direction, trimThreshold(threshold));

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                // Reuses the launcher icon -- Android auto-masks/tints
                // notification small icons regardless of source, so this
                // renders as a plain silhouette rather than the full-color
                // launcher art; a dedicated flat icon would be a nice
                // follow-up, not required for a correct notification.
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("ExchangeBoard rate alert")
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true);

        try {
            NotificationManagerCompat.from(context).notify(id.hashCode(), builder.build());
        } catch (SecurityException e) {
            // Permission revoked between the check above and this call --
            // fail silently, same rule as everywhere else in this method.
        }
    }

    private static String trimThreshold(double threshold) {
        // Matches Alerts.tsx's plain threshold display (e.g. "0.9", not
        // "0.9000") -- thresholds are user-typed numbers, not currency
        // amounts, so no fixed decimal formatting.
        if (threshold == Math.floor(threshold) && !Double.isInfinite(threshold)) {
            return String.valueOf((long) threshold);
        }
        return String.valueOf(threshold);
    }
}

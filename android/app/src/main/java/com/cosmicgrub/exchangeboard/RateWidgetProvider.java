package com.cosmicgrub.exchangeboard;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Home-screen widget: glanceable USD/EUR, USD/GBP, USD/JPY rates.
 *
 * Deliberately independent of the WebView app's rate cache -- widgets run
 * in the launcher process on their own update schedule, so this does its
 * own lightweight fetch straight from open.er-api.com (same source as the
 * app) rather than trying to bridge into the app's localStorage. Falls
 * back to the last successfully rendered values (kept in SharedPreferences)
 * if a fetch fails, mirroring the app's own offline-cache behavior.
 */
public class RateWidgetProvider extends AppWidgetProvider {

    private static final String PREFS = "exchangeboard_widget";
    private static final String RATES_URL = "https://open.er-api.com/v6/latest/USD";
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();
    private static final String[] QUICK_CODES = {"EUR", "GBP", "JPY"};

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            renderCachedThenRefresh(context, appWidgetManager, appWidgetId);
        }
    }

    private void renderCachedThenRefresh(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        // Paint immediately from cache (or a loading placeholder) so the
        // widget never looks broken while the network call is in flight.
        pushViews(context, appWidgetManager, appWidgetId, readCache(context));

        EXECUTOR.execute(() -> {
            String[] fresh = fetchRates();
            Handler main = new Handler(Looper.getMainLooper());
            if (fresh != null) {
                writeCache(context, fresh);
                main.post(() -> pushViews(context, appWidgetManager, appWidgetId, fresh));
            }
            // On failure, the cached/placeholder render from above stands --
            // matches the app's "keep showing last-known rates" behavior.
        });
    }

    private void pushViews(Context context, AppWidgetManager appWidgetManager, int appWidgetId, String[] lines) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_rates);
        views.setTextViewText(R.id.widget_row_1, lines[0]);
        views.setTextViewText(R.id.widget_row_2, lines[1]);
        views.setTextViewText(R.id.widget_row_3, lines[2]);
        views.setTextViewText(R.id.widget_updated, lines[3]);

        Intent launch = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    /** Returns {row1, row2, row3, updatedLabel}, or null on failure/no connectivity. */
    private String[] fetchRates() {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(RATES_URL);
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            conn.setRequestMethod("GET");

            StringBuilder body = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) body.append(line);
            }

            JSONObject json = new JSONObject(body.toString());
            JSONObject rates = json.getJSONObject("rates");

            String[] lines = new String[4];
            for (int i = 0; i < QUICK_CODES.length; i++) {
                String code = QUICK_CODES[i];
                double rate = rates.optDouble(code, Double.NaN);
                lines[i] = Double.isNaN(rate)
                        ? ("USD/" + code + "  --")
                        : String.format(Locale.US, "USD/%s  %.4f", code, rate);
            }
            String time = new SimpleDateFormat("h:mm a", Locale.US).format(new Date());
            lines[3] = "Updated " + time;
            return lines;
        } catch (Exception e) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private String[] readCache(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return new String[]{
                prefs.getString("row1", "USD/EUR  --"),
                prefs.getString("row2", "USD/GBP  --"),
                prefs.getString("row3", "USD/JPY  --"),
                prefs.getString("updated", "Tap to load")
        };
    }

    private void writeCache(Context context, String[] lines) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString("row1", lines[0])
                .putString("row2", lines[1])
                .putString("row3", lines[2])
                .putString("updated", lines[3])
                .apply();
    }

    /** Force an immediate refresh of every placed instance -- used by tests/adb, and could be wired to a manual-refresh tap. */
    public static void requestUpdate(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, RateWidgetProvider.class);
        int[] ids = mgr.getAppWidgetIds(provider);
        Intent intent = new Intent(context, RateWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);
    }
}

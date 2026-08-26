package com.cosmicgrub.exchangeboard;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Bridges the JS-side alert list (src/lib/alerts.ts / Alerts.tsx / the
 * `alerts` field in AppPrefs) to the native background check
 * (RateAlertsScheduler + RateAlertsWorker), so a threshold crossing still
 * notifies the user with the app fully closed -- not just foreground/
 * open-app, which is all the WebView-only alerts panel can ever do on its
 * own. See docs/FEATURE_ALERTS_AND_PRESETS.md for the scope this closes.
 *
 * JS side: src/lib/backgroundAlerts.ts. Deliberately dumb on this side --
 * this plugin only persists whatever alert list JS hands it and (re)arms
 * or disarms one WorkManager job; all the actual threshold/hysteresis
 * logic lives in RateAlertsWorker, run independently on WorkManager's own
 * schedule.
 */
@CapacitorPlugin(
    name = "BackgroundAlerts",
    permissions = {
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
    }
)
public class BackgroundAlertsPlugin extends Plugin {

    private static final String PREFS = "exchangeboard_alerts";
    private static final String KEY_ALERTS_JSON = "alerts_json";

    /** Persists the current alert list and (re)schedules or cancels the
     *  background check to match -- called from JS every time the alert
     *  list changes (add/remove/toggle), see backgroundAlerts.ts. */
    @PluginMethod
    public void syncAlerts(PluginCall call) {
        JSArray alertsArray = call.getArray("alerts", new JSArray());
        Context context = getContext();

        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_ALERTS_JSON, alertsArray.toString())
                .apply();

        boolean hasEnabledAlert = false;
        for (int i = 0; i < alertsArray.length(); i++) {
            org.json.JSONObject alert = alertsArray.optJSONObject(i);
            if (alert != null && alert.optBoolean("enabled", false)) {
                hasEnabledAlert = true;
                break;
            }
        }

        if (hasEnabledAlert) {
            RateAlertsScheduler.schedule(context);
        } else {
            RateAlertsScheduler.cancel(context);
        }

        call.resolve();
    }

    /** Requests POST_NOTIFICATIONS (API 33+ only -- a no-op-success below
     *  that, where notification posting needs no runtime grant). Without
     *  this granted, RateAlertsWorker still runs and updates hysteresis
     *  state correctly, it just skips showing the system notification
     *  (see its own permission check) -- background alerts silently
     *  degrade to "tracked but not shown" rather than crashing. */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED) {
            resolveGranted(call, true);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationPermsCallback");
    }

    @PermissionCallback
    private void notificationPermsCallback(PluginCall call) {
        resolveGranted(call, getPermissionState("notifications") == PermissionState.GRANTED);
    }

    /** Read-only check, no prompt -- used for the initial UI state before
     *  the user has interacted with anything. */
    @PluginMethod
    public void checkPermission(PluginCall call) {
        boolean granted = Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED;
        resolveGranted(call, granted);
    }

    private void resolveGranted(PluginCall call, boolean granted) {
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }
}

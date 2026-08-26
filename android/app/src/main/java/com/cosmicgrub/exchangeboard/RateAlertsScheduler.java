package com.cosmicgrub.exchangeboard;

import android.content.Context;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;

/**
 * Schedules/cancels the periodic background rate-alerts check
 * (RateAlertsWorker) as a single named WorkManager job. Split out from
 * BackgroundAlertsPlugin so it can be exercised directly by an
 * instrumented test (RateAlertsSchedulerTest) without needing a live
 * Capacitor Bridge/Activity -- WorkManager itself is the thing worth
 * verifying actually runs, not the plugin glue around it.
 */
final class RateAlertsScheduler {

    /** Unique work name -- re-scheduling (e.g. every time the alert list
     *  changes) reuses this same slot rather than stacking duplicate jobs. */
    static final String UNIQUE_WORK_NAME = "rate-alerts-check";

    private RateAlertsScheduler() {}

    /** (Re)schedules the periodic check. Safe to call every time the
     *  alert list changes -- ExistingPeriodicWorkPolicy.UPDATE swaps in
     *  any changed constraints/worker without resetting an
     *  already-running interval's countdown the way REPLACE/CANCEL_AND_REENQUEUE
     *  would, so adding a second alert doesn't push back a first alert's
     *  next check. */
    static void schedule(Context context) {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        // 15 minutes is WorkManager's own enforced minimum periodic
        // interval (PeriodicWorkRequest.MIN_PERIODIC_INTERVAL_MILLIS) --
        // requesting anything shorter is silently clamped up to it, so
        // this is the fastest a background check can realistically run.
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
                RateAlertsWorker.class, 15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build();

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, request);
    }

    /** Cancels the periodic check -- called once no enabled alerts remain,
     *  so a user with zero/all-disabled alerts costs nothing in the
     *  background (matches the foreground panel's own "no polling with no
     *  enabled alerts" rule in App.tsx). */
    static void cancel(Context context) {
        WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_WORK_NAME);
    }
}

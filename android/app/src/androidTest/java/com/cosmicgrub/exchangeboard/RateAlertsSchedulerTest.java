package com.cosmicgrub.exchangeboard;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.work.Configuration;
import androidx.work.WorkInfo;
import androidx.work.WorkManager;
import androidx.work.testing.SynchronousExecutor;
import androidx.work.testing.WorkManagerTestInitHelper;
import java.util.List;
import java.util.concurrent.ExecutionException;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Verifies RateAlertsScheduler actually drives a real WorkManager instance
 * on a real Android runtime -- not just that the scheduling code compiles
 * -- using WorkManager's own test harness (WorkManagerTestInitHelper).
 * Deliberately doesn't let RateAlertsWorker.doWork() itself run: a freshly
 * enqueued PeriodicWorkRequest isn't auto-triggered just by being
 * enqueued (Android's own WorkManager testing guide has you drive that
 * manually via TestDriver), so asserting ENQUEUED state here proves the
 * scheduling half of the background-alerts feature -- that a sync from
 * the JS side really results in a periodic job WorkManager knows about,
 * and that clearing it really removes that job -- without depending on
 * this CI job having live network access to open.er-api.com.
 */
@RunWith(AndroidJUnit4.class)
public class RateAlertsSchedulerTest {

    private Context context;

    @Before
    public void setUp() {
        context = ApplicationProvider.getApplicationContext();
        Configuration config = new Configuration.Builder()
                .setExecutor(new SynchronousExecutor())
                .build();
        WorkManagerTestInitHelper.initializeTestWorkManager(context, config);
    }

    @Test
    public void scheduleEnqueuesTheUniquePeriodicWork() throws ExecutionException, InterruptedException {
        RateAlertsScheduler.schedule(context);

        List<WorkInfo> infos = WorkManager.getInstance(context)
                .getWorkInfosForUniqueWork(RateAlertsScheduler.UNIQUE_WORK_NAME)
                .get();

        assertEquals(1, infos.size());
        assertEquals(WorkInfo.State.ENQUEUED, infos.get(0).getState());
    }

    @Test
    public void cancelRemovesTheUniquePeriodicWork() throws ExecutionException, InterruptedException {
        RateAlertsScheduler.schedule(context);
        RateAlertsScheduler.cancel(context);

        List<WorkInfo> infos = WorkManager.getInstance(context)
                .getWorkInfosForUniqueWork(RateAlertsScheduler.UNIQUE_WORK_NAME)
                .get();

        assertTrue(
                "cancelled work should no longer be enqueued",
                infos.isEmpty() || infos.get(0).getState() == WorkInfo.State.CANCELLED
        );
    }
}

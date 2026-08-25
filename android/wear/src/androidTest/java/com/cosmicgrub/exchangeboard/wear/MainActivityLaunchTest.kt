package com.cosmicgrub.exchangeboard.wear

import androidx.lifecycle.Lifecycle
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Real-runtime smoke test -- launches the actual companion MainActivity on
 * a real (emulated) Wear OS runtime, not just compiling it. This is
 * specifically what exercises the exact code CI's compile-only "android"
 * job caught wrong on an earlier run and this test verifies actually
 * works at runtime once fixed: MainActivity now extends FragmentActivity
 * (not plain Activity, see the class-level comment there) because
 * AmbientModeSupport.attach(this) requires one -- a class hierarchy
 * mismatch a compiler catches but nothing had ever confirmed actually
 * *runs* without throwing. onCreate() also wires up rotary input handling
 * and RateFetcher.readCache()/refresh() -- all of it executes here.
 *
 * What this does NOT prove: that the physical rotating bezel feels right
 * in hand, that ambient mode's redraw timing/palette looks correct on a
 * real always-on display, or that the watch-face complication actually
 * renders (RateComplicationService isn't exercised by launching
 * MainActivity at all -- it's a separate system-driven component). See
 * docs/DEVICE_VERIFICATION_CHECKLIST.md for what still needs a real
 * Watch6 Classic or a round, bezel-equipped Wear OS emulator profile in
 * Android Studio.
 */
@RunWith(AndroidJUnit4::class)
class MainActivityLaunchTest {

    @Test
    fun launchesAndReachesResumedWithoutCrashing() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            scenario.moveToState(Lifecycle.State.RESUMED)
            assertTrue(
                "MainActivity should reach RESUMED without AmbientModeSupport.attach() " +
                    "(or anything else in onCreate()) throwing",
                scenario.state.isAtLeast(Lifecycle.State.RESUMED)
            )
        }
    }
}

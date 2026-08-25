package com.cosmicgrub.exchangeboard;

import static org.junit.Assert.assertTrue;

import androidx.lifecycle.Lifecycle;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Real-runtime smoke test -- launches the actual MainActivity on a real
 * (emulated) Android runtime, not just compiling it. This is specifically
 * what exercises FoldStatePlugin.load() (registered in
 * MainActivity.onCreate(), before super.onCreate()) outside of a bare
 * javac compile check for the first time: WindowInfoTracker.Companion.
 * getOrCreate(), the WindowInfoTrackerCallbackAdapter wiring (the exact
 * class whose import package CI's compile check caught wrong on its first
 * real run -- see docs/DEVICE_FOLD5.md), and addWindowLayoutInfoListener()
 * all actually execute here. A crash in any of that -- a real possibility
 * CI's compile-only "android" job can't catch, since compiling
 * successfully doesn't mean a class loads or a method doesn't throw at
 * runtime -- fails this test immediately: ActivityScenario.launch()
 * surfaces any exception thrown during onCreate() as a test failure,
 * it doesn't swallow it.
 *
 * What this does NOT prove: that flex-mode's hinge-angle-driven layout
 * split looks right, or that a real hinge-state *change* is correctly
 * detected and reported to JS. This runs on a standard (non-foldable)
 * emulator profile in CI, so FoldStatePlugin correctly falls back to
 * reporting "no fold" here (isNativeFoldCapable()'s documented default) --
 * this test proves the native bridge initializes and runs without
 * crashing, not that real foldable hardware behaves a specific way. See
 * docs/DEVICE_VERIFICATION_CHECKLIST.md for what still needs a real
 * Fold5 or the Android Studio foldable emulator profile.
 */
@RunWith(AndroidJUnit4.class)
public class MainActivityLaunchTest {

    @Test
    public void launchesAndReachesResumedWithoutCrashing() {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.moveToState(Lifecycle.State.RESUMED);
            assertTrue(
                "MainActivity should reach RESUMED without FoldStatePlugin.load() (or anything else in onCreate()) throwing",
                scenario.getState().isAtLeast(Lifecycle.State.RESUMED)
            );
        }
    }
}

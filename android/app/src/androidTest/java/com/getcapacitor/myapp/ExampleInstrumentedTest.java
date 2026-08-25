package com.getcapacitor.myapp;

import static org.junit.Assert.*;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Instrumented test, which will execute on an Android device.
 *
 * @see <a href="http://d.android.com/tools/testing">Testing documentation</a>
 */
@RunWith(AndroidJUnit4.class)
public class ExampleInstrumentedTest {

    @Test
    public void useAppContext() throws Exception {
        // Context of the app under test.
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();

        // Was "com.getcapacitor.app" -- Capacitor's own template placeholder,
        // never updated to this app's real applicationId
        // (com.cosmicgrub.exchangeboard, see android/app/build.gradle). This
        // test lived in the repo asserting a value that could never be true
        // for this app, silently, because nothing had ever actually run
        // Android instrumented tests in CI until now -- see MainActivityLaunchTest
        // in this same source set for the real, actively-used smoke test.
        assertEquals("com.cosmicgrub.exchangeboard", appContext.getPackageName());
    }
}

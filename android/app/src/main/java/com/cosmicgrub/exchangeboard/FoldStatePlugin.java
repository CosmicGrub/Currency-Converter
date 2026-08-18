package com.cosmicgrub.exchangeboard;

import android.graphics.Rect;
import androidx.core.content.ContextCompat;
import androidx.core.util.Consumer;
import androidx.window.java.layout.WindowInfoTrackerCallbackAdapter;
import androidx.window.layout.DisplayFeature;
import androidx.window.layout.FoldingFeature;
import androidx.window.layout.WindowInfoTracker;
import androidx.window.layout.WindowLayoutInfo;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;
import java.util.concurrent.Executor;

/**
 * Bridges Jetpack WindowManager's real hinge-state detection
 * (FoldingFeature -- flat vs. half-opened, hinge orientation, hinge
 * bounds) to the web layer. This is deliberately *not* something a CSS
 * media query can replicate: a Fold5 half-opened at ~90 degrees in
 * "flex mode" (tabletop posture) reports the *same* viewport dimensions
 * as fully unfolded flat -- only the platform's hinge-angle sensor,
 * surfaced here via FoldingFeature, can tell those two postures apart.
 *
 * JS side: src/lib/foldState.ts / src/hooks/useFoldState.ts. Emits a
 * "foldStateChanged" event on every layout change and exposes a
 * getFoldState() pull method for the initial read.
 */
@CapacitorPlugin(name = "FoldState")
public class FoldStatePlugin extends Plugin {

    private WindowInfoTrackerCallbackAdapter adapter;
    private Consumer<WindowLayoutInfo> layoutConsumer;
    private JSObject lastState = defaultState();

    @Override
    public void load() {
        WindowInfoTracker tracker = WindowInfoTracker.Companion.getOrCreate(getActivity());
        adapter = new WindowInfoTrackerCallbackAdapter(tracker);
        Executor mainExecutor = ContextCompat.getMainExecutor(getActivity());

        layoutConsumer = windowLayoutInfo -> {
            lastState = toJSObject(windowLayoutInfo);
            notifyListeners("foldStateChanged", lastState);
        };

        adapter.addWindowLayoutInfoListener(getActivity(), mainExecutor, layoutConsumer);
    }

    @Override
    protected void handleOnDestroy() {
        if (adapter != null && layoutConsumer != null) {
            adapter.removeWindowLayoutInfoListener(layoutConsumer);
        }
        super.handleOnDestroy();
    }

    /** One-shot pull, for the initial render before the first
     *  "foldStateChanged" event has had a chance to arrive. */
    @PluginMethod
    public void getFoldState(PluginCall call) {
        call.resolve(lastState);
    }

    private JSObject toJSObject(WindowLayoutInfo info) {
        List<DisplayFeature> features = info.getDisplayFeatures();
        for (DisplayFeature feature : features) {
            if (feature instanceof FoldingFeature) {
                FoldingFeature folding = (FoldingFeature) feature;
                JSObject result = new JSObject();
                result.put("hasFold", true);
                // "FLAT" | "HALF_OPENED"
                result.put("state", folding.getState().toString());
                // "HORIZONTAL" | "VERTICAL" -- the hinge line's own
                // orientation, e.g. HORIZONTAL for the Fold5's book-style
                // hinge in tabletop/flex posture.
                result.put("orientation", folding.getOrientation().toString());
                result.put("isSeparating", folding.isSeparating());

                Rect bounds = folding.getBounds();
                JSObject boundsJs = new JSObject();
                boundsJs.put("left", bounds.left);
                boundsJs.put("top", bounds.top);
                boundsJs.put("right", bounds.right);
                boundsJs.put("bottom", bounds.bottom);
                result.put("bounds", boundsJs);
                return result;
            }
        }
        return defaultState();
    }

    private static JSObject defaultState() {
        JSObject state = new JSObject();
        state.put("hasFold", false);
        state.put("state", "FLAT");
        state.put("orientation", "VERTICAL");
        state.put("isSeparating", false);
        return state;
    }
}

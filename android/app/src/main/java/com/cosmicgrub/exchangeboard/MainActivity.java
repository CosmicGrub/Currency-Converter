package com.cosmicgrub.exchangeboard;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Custom plugins must be registered before super.onCreate() so
        // they're available to the WebView's JS bridge from first load.
        registerPlugin(FoldStatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}

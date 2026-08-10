package com.cosmicgrub.exchangeboard.wear

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.TextView
import java.util.concurrent.Executors

/**
 * Minimal native watch view -- not a WebView. Shows the cached rates
 * instantly (same cache the Tile reads/writes), then refreshes in the
 * background. Kept deliberately small: this is a glance-and-go companion
 * for the Tile, not a port of the phone app's full feature set.
 */
class MainActivity : Activity() {

    private val executor = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        render(RateFetcher.readCache(this))
        refresh()
    }

    private fun refresh() {
        executor.execute {
            val fresh = RateFetcher.fetch()
            if (fresh != null) {
                RateFetcher.writeCache(this, fresh)
                main.post { render(RateFetcher.readCache(this)) }
            }
        }
    }

    private fun render(cached: Pair<List<RateSnapshot>, String>) {
        val (rates, updated) = cached
        val fields = listOf(R.id.rate_1, R.id.rate_2, R.id.rate_3)
        rates.forEachIndexed { i, snapshot ->
            if (i < fields.size) {
                findViewById<TextView>(fields[i]).text =
                    "USD/${snapshot.code}  " + (snapshot.rate?.let { String.format("%.4f", it) } ?: "--")
            }
        }
        findViewById<TextView>(R.id.updated).text = updated
    }
}

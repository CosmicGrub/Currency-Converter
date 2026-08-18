package com.cosmicgrub.exchangeboard.wear

import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.InputDevice
import android.view.MotionEvent
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.fragment.app.FragmentActivity
import androidx.wear.ambient.AmbientModeSupport
import java.util.concurrent.Executors

/**
 * Minimal native watch view -- not a WebView. Shows the cached rates
 * instantly (same cache the Tile reads/writes), then refreshes in the
 * background. Kept deliberately small: this is a glance-and-go companion
 * for the Tile, not a port of the phone app's full feature set.
 *
 * Watch6 Classic branch additions:
 *  - Physical rotating bezel scrolls the (now longer) rate list, via the
 *    standard Wear OS rotary input API (MotionEvent.AXIS_SCROLL from
 *    InputDevice.SOURCE_ROTARY_ENCODER) -- this is the same unified API
 *    the Pixel Watch's crown and every other current Wear OS device use,
 *    not a Samsung-only code path, though the Classic's *physical*
 *    rotating bezel is the marquee reason to wire it up here.
 *  - Ambient mode (always-on display): a low-power, near-monochrome view
 *    while the wrist is down, refreshed from cache roughly once a minute
 *    per Wear OS's ambient update budget -- never a network fetch while
 *    ambient, per platform power guidelines.
 */
// FragmentActivity, not plain Activity: AmbientModeSupport.attach() requires
// one (it hooks the activity lifecycle via a headless Fragment internally).
// FragmentActivity extends Activity through the same androidx.activity
// lineage, so every plain-Activity API this class already uses (onCreate,
// setContentView, findViewById, window, resources, ...) still works
// unchanged -- this is a strict widening, not a rewrite.
class MainActivity : FragmentActivity(), AmbientModeSupport.AmbientCallbackProvider {

    private val executor = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())

    private lateinit var scrollView: ScrollView
    private lateinit var ratesContainer: LinearLayout
    private lateinit var headerLabel: TextView
    private lateinit var updatedView: TextView
    private lateinit var ambientController: AmbientModeSupport.AmbientController

    // Bezel "detent" scroll distance, tuned to roughly one text row at the
    // sizes used in activity_main.xml.
    private val rotaryScrollPx: Int by lazy { (resources.displayMetrics.density * 24).toInt() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        scrollView = findViewById(R.id.rates_scroll)
        ratesContainer = findViewById(R.id.rates_container)
        headerLabel = findViewById(R.id.header_label)
        updatedView = findViewById(R.id.updated)

        // Rotary events route to whichever view has input focus; the
        // ScrollView is the only scrollable element on screen, so make it
        // the focus target explicitly rather than relying on default
        // touch-focus (which wouldn't fire until the user first touches
        // the screen -- the bezel should work immediately on open).
        scrollView.requestFocus()

        ambientController = AmbientModeSupport.attach(this)

        render(RateFetcher.readCache(this))
        refresh()
    }

    override fun onGenericMotionEvent(event: MotionEvent): Boolean {
        if (event.action == MotionEvent.ACTION_SCROLL &&
            event.isFromSource(InputDevice.SOURCE_ROTARY_ENCODER)
        ) {
            // AXIS_SCROLL is positive for one rotation direction, negative
            // for the other; negate so "rotate down" scrolls the list down,
            // matching the platform convention other rotary-aware apps use.
            val delta = -event.getAxisValue(MotionEvent.AXIS_SCROLL) * rotaryScrollPx
            scrollView.scrollBy(0, delta.toInt())
            return true
        }
        return super.onGenericMotionEvent(event)
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
        ratesContainer.removeAllViews()
        rates.forEach { snapshot ->
            ratesContainer.addView(
                TextView(this).apply {
                    text = "USD/${snapshot.code}  " +
                        (snapshot.rate?.let { String.format("%.4f", it) } ?: "--")
                    setTextColor(TEXT_PRIMARY)
                    textSize = 13f
                    typeface = Typeface.MONOSPACE
                    setPadding(0, dp(3), 0, 0)
                }
            )
        }
        updatedView.text = updated
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    // -- Ambient mode ----------------------------------------------------

    override fun getAmbientCallback(): AmbientModeSupport.AmbientCallback =
        object : AmbientModeSupport.AmbientCallback() {
            override fun onEnterAmbient(ambientDetails: Bundle) {
                super.onEnterAmbient(ambientDetails)
                applyAmbientStyle(ambient = true)
            }

            override fun onExitAmbient() {
                super.onExitAmbient()
                applyAmbientStyle(ambient = false)
            }

            override fun onUpdateAmbient() {
                super.onUpdateAmbient()
                // Re-render from cache only -- no network I/O in ambient,
                // per Wear OS power guidelines. The system wakes this
                // roughly once a minute while ambient.
                render(RateFetcher.readCache(this@MainActivity))
            }
        }

    /** Flattens to near-monochrome and drops the accent color -- standard
     *  Wear OS ambient guidance, to limit battery draw and OLED burn-in
     *  risk on an always-on display. */
    private fun applyAmbientStyle(ambient: Boolean) {
        headerLabel.setTextColor(if (ambient) AMBIENT_LABEL else TEXT_ACCENT)
        updatedView.setTextColor(if (ambient) AMBIENT_MUTED else TEXT_MUTED)
        window.decorView.setBackgroundColor(if (ambient) Color.BLACK else BG)
        val rowColor = if (ambient) AMBIENT_TEXT else TEXT_PRIMARY
        for (i in 0 until ratesContainer.childCount) {
            (ratesContainer.getChildAt(i) as? TextView)?.setTextColor(rowColor)
        }
    }

    private companion object {
        const val BG = 0xFF0B1220.toInt()
        const val TEXT_PRIMARY = 0xFFEDEFF3.toInt()
        const val TEXT_ACCENT = 0xFFC9A227.toInt()
        const val TEXT_MUTED = 0xFF5C6885.toInt()
        // Ambient palette: desaturated, no accent color, per Wear OS
        // ambient-mode guidance (avoid saturated colors on always-on OLED).
        const val AMBIENT_TEXT = 0xFFAAAAAA.toInt()
        const val AMBIENT_LABEL = 0xFF888888.toInt()
        const val AMBIENT_MUTED = 0xFF666666.toInt()
    }
}

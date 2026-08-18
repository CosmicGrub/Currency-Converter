package com.cosmicgrub.exchangeboard.wear

import android.app.PendingIntent
import android.content.Intent
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService.ComplicationRequestListener
import androidx.wear.watchface.complications.datasource.ComplicationRequest

/**
 * Watch-face complication -- puts the top cached rate directly on the
 * watch face, no need to open the Tile or the app. Reads the same
 * SharedPreferences cache the Tile and MainActivity already read/write;
 * deliberately does *not* fetch over the network itself, since a
 * complication only asks for a refresh on the schedule declared in the
 * manifest (UPDATE_PERIOD_SECONDS) -- far too infrequent for a live fetch
 * here to be worthwhile. The Tile's and MainActivity's own background
 * refreshes keep the shared cache warm; this just reads it.
 *
 * Added for the Watch6 Classic branch, but nothing about it is actually
 * Classic-specific -- complications work identically on any Wear OS 3+
 * device. It's here because "let a rate live on the watch face" was one
 * of the requested Watch6 Classic enhancements.
 *
 * Requires the `androidx.wear.watchface:watchface-complications-data-
 * source-ktx` dependency (see android/wear/build.gradle) -- double-check
 * the pinned version against the current Google Maven index before
 * building; it couldn't be verified from the sandbox this was written in
 * (dl.google.com isn't reachable from there).
 */
class RateComplicationService : ComplicationDataSourceService() {

    override fun onComplicationRequest(
        request: ComplicationRequest,
        listener: ComplicationRequestListener
    ) {
        listener.onComplicationData(buildComplicationData())
    }

    override fun getPreviewData(type: ComplicationType): ComplicationData? {
        if (type != ComplicationType.SHORT_TEXT) return null
        return ShortTextComplicationData.Builder(
            text = PlainComplicationText.Builder("USD/EUR 0.8659").build(),
            contentDescription = PlainComplicationText.Builder("ExchangeBoard rate preview").build()
        ).build()
    }

    private fun buildComplicationData(): ComplicationData {
        val (rates, _) = RateFetcher.readCache(this)
        val primary = rates.firstOrNull { it.rate != null }
        val text = if (primary?.rate != null) {
            "USD/${primary.code} " + String.format("%.4f", primary.rate)
        } else {
            "USD/EUR --"
        }

        val tapAction = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return ShortTextComplicationData.Builder(
            text = PlainComplicationText.Builder(text).build(),
            contentDescription = PlainComplicationText.Builder("ExchangeBoard exchange rate").build()
        )
            .setTapAction(tapAction)
            .build()
    }
}
